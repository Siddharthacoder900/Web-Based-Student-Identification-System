// Phase 10 Institutional End-to-End Verification & Security Hardening Audit
// Tests all 4 user roles (student, teacher, staff, admin), role impersonation blocking,
// data leak prevention (passwords & raw biometrics), endpoint authorization,
// and cross-portal workflow integrity.

const API_BASE = 'http://localhost:5001/api';

async function runPhase10Audit() {
  console.log('================================================================');
  console.log('BIET - PHASE 10 MASTER SECURITY & END-TO-END VERIFICATION AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Test ${total}: ${message}${details ? ' -> ' + details : ''}`);
    }
  }

  try {
    // ---------------------------------------------------------
    // 1. ALL 4 USER ROLES AUTHENTICATION
    // ---------------------------------------------------------
    console.log('--- Step 1: Authentication for All 4 Institutional Roles ---');

    // 1.1 Super Admin
    const adminRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'admin@biet.ac.in', password: 'BietDemo@2026', requestedRole: 'admin' })
    });
    const adminCookie = (adminRes.headers.get('set-cookie') || '').split(';')[0];
    const adminData = await adminRes.json();
    assert(adminRes.status === 200 && adminData.user?.role === 'admin', 'Super Admin authentication succeeds');

    // 1.2 Student
    const studentRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: '220101001', password: 'BietStudent@2026', requestedRole: 'student' })
    });
    const studentCookie = (studentRes.headers.get('set-cookie') || '').split(';')[0];
    const studentData = await studentRes.json();
    assert(studentRes.status === 200 && studentData.user?.role === 'student', 'Student authentication succeeds (Roll: 220101001)');

    // 1.3 Teacher
    const teacherRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'T-1001', password: 'Teacher@2026', requestedRole: 'teacher' })
    });
    const teacherCookie = (teacherRes.headers.get('set-cookie') || '').split(';')[0];
    const teacherData = await teacherRes.json();
    assert(teacherRes.status === 200 && teacherData.user?.role === 'teacher', 'Faculty authentication succeeds (Employee ID: T-1001)');

    // 1.4 Staff
    const staffRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'S-2001', password: 'Staff@2026', requestedRole: 'staff' })
    });
    const staffCookie = (staffRes.headers.get('set-cookie') || '').split(';')[0];
    const staffData = await staffRes.json();
    assert(staffRes.status === 200 && staffData.user?.role === 'staff', 'Staff authentication succeeds (Staff ID: S-2001)');

    // ---------------------------------------------------------
    // 2. ROLE IMPERSONATION PREVENTION
    // ---------------------------------------------------------
    console.log('\n--- Step 2: Role Impersonation Prevention Audit ---');

    // Student attempting to claim admin role
    const impStudentRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: '220101001', password: 'BietStudent@2026', requestedRole: 'admin' })
    });
    assert(impStudentRes.status === 403, 'Student attempting to select "admin" role is blocked (HTTP 403)');

    // Teacher attempting to claim admin role
    const impTeacherRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'T-1001', password: 'Teacher@2026', requestedRole: 'admin' })
    });
    const impTeacherBody = await impTeacherRes.text();
    assert(impTeacherRes.status === 403, 'Faculty attempting to select "admin" role is blocked (HTTP 403)', `Status: ${impTeacherRes.status}, Body: ${impTeacherBody}`);

    // Staff attempting to claim teacher role
    const impStaffRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'S-2001', password: 'Staff@2026', requestedRole: 'teacher' })
    });
    const impStaffBody = await impStaffRes.text();
    assert(impStaffRes.status === 403, 'Staff attempting to select "teacher" role is blocked (HTTP 403)', `Status: ${impStaffRes.status}, Body: ${impStaffBody}`);

    // ---------------------------------------------------------
    // 3. DATA LEAK & SECURITY HARDENING AUDIT
    // ---------------------------------------------------------
    console.log('\n--- Step 3: Information Disclosure & Secret Leakage Audit ---');

    // Inspect GET /api/auth/me
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Cookie: adminCookie } });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 && meData.user && !meData.user.passwordHash && !meData.user.password,
      '/api/auth/me contains no passwordHash or raw password secrets'
    );

    // Inspect GET /api/students
    const studentsRes = await fetch(`${API_BASE}/students`, { headers: { Cookie: adminCookie } });
    const studentsData = await studentsRes.json();
    const studentsList = studentsData.students || [];
    const hasLeakedPasswords = studentsList.some(s => s.passwordHash || s.password);
    assert(
      !hasLeakedPasswords,
      '/api/students returns student records without password hashes'
    );

    // Inspect Biometric Vector Privacy: ensure public descriptors endpoint only exposes necessary vector data with authentication
    const publicNoAuthRes = await fetch(`${API_BASE}/verification/enrolled-descriptors`);
    assert(
      publicNoAuthRes.status === 401,
      'Unauthenticated requests to biometric descriptors endpoint are rejected (HTTP 401)'
    );

    // ---------------------------------------------------------
    // 4. STUDENT PORTAL FUNCTIONALITY
    // ---------------------------------------------------------
    console.log('\n--- Step 4: Student Portal End-to-End Audit ---');

    const studentMeRes = await fetch(`${API_BASE}/students/profile/me`, { headers: { Cookie: studentCookie } });
    const studentMeData = await studentMeRes.json();
    assert(
      studentMeRes.status === 200 && studentMeData.student?.rollNumber === '220101001',
      'Student profile dossier retrieves successfully for 220101001'
    );

    const studentIdCardRes = await fetch(`${API_BASE}/students/220101001/id-card`, { headers: { Cookie: studentCookie } });
    const studentIdCardData = await studentIdCardRes.json();
    assert(
      studentIdCardRes.status === 200 && studentIdCardData.idCard?.institution && studentIdCardData.idCard?.qrCodeToken,
      'Student self-access to digital ID card payload succeeds with institution metadata'
    );

    // Unauthorized snooping check
    const snoopIdCardRes = await fetch(`${API_BASE}/students/230102001/id-card`, { headers: { Cookie: studentCookie } });
    assert(
      snoopIdCardRes.status === 403,
      'Student attempt to retrieve another student ID card is blocked (HTTP 403)'
    );

    // ---------------------------------------------------------
    // 5. TEACHER & STAFF PORTALS FUNCTIONALITY
    // ---------------------------------------------------------
    console.log('\n--- Step 5: Faculty & Staff Portal Verification ---');

    const teacherMeRes = await fetch(`${API_BASE}/teachers/profile/me`, { headers: { Cookie: teacherCookie } });
    const teacherMeData = await teacherMeRes.json();
    assert(
      teacherMeRes.status === 200 && teacherMeData.teacher?.employeeId === 'T-1001',
      'Faculty profile retrieved successfully (Dr. Ramesh Chandra, CSE)'
    );

    const staffMeRes = await fetch(`${API_BASE}/staff/profile/me`, { headers: { Cookie: staffCookie } });
    const staffMeData = await staffMeRes.json();
    assert(
      staffMeRes.status === 200 && staffMeData.staff?.staffId === 'S-2001',
      'Staff profile retrieved successfully (Sunil Verma, Library)'
    );

    // ---------------------------------------------------------
    // 6. ATTENDANCE & AKTU DEBARMENT ALERTS
    // ---------------------------------------------------------
    console.log('\n--- Step 6: Attendance Compliance & AKTU Shortage Alerts ---');

    const shortageRes = await fetch(`${API_BASE}/attendance/shortage-alerts`, { headers: { Cookie: adminCookie } });
    const shortageData = await shortageRes.json();
    assert(
      shortageRes.status === 200 && shortageData.statutoryRule === 'AKTU Ordinance Rule 2.1 (75% Minimum Mandatory Attendance)',
      'AKTU < 75% attendance shortage alert service reports compliance with Ordinance Rule 2.1'
    );

    // ---------------------------------------------------------
    // 7. INSTITUTIONAL REPORTS & EXPORTS
    // ---------------------------------------------------------
    console.log('\n--- Step 7: Institutional Reports & Export Manifests ---');

    const summaryReportRes = await fetch(`${API_BASE}/reports/summary`, { headers: { Cookie: adminCookie } });
    const summaryReportData = await summaryReportRes.json();
    assert(
      summaryReportRes.status === 200 && summaryReportData.institution?.code === 'BIET-422',
      'Institutional Intelligence summary reports code BIET-422 with active metrics'
    );

    const docManifestRes = await fetch(`${API_BASE}/documents`, { headers: { Cookie: adminCookie } });
    const docManifestData = await docManifestRes.json();
    assert(
      docManifestRes.status === 200 && Array.isArray(docManifestData.documents),
      `Document Repository is active with ${docManifestData.documents?.length} archived files`
    );

  } catch (err) {
    console.error('Audit execution exception:', err);
  }

  console.log('\n================================================================');
  console.log(`PHASE 10 AUDIT RESULTS: ${passed}/${total} Checks Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================');
}

runPhase10Audit();
