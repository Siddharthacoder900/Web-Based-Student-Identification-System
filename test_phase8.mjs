// Phase 8 Automated Verification Script
// Tests Multi-Administrator RBAC, Student Profile Correction Lifecycle,
// Administrative Approval/Rejection with Auto-Updating of Student Records,
// and Role Authorization Enforcement.

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('====================================================');
  console.log('BIET - PHASE 8 RBAC & PROFILE CORRECTION AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;
  let adminCookie = '';
  let studentCookie = '';

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
    // 1. Authenticate as Super Administrator
    console.log('--- Step 1: Administrator Authentication ---');
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'admin@biet.ac.in',
        password: 'BietDemo@2026',
        requestedRole: 'admin'
      })
    });
    const adminSetCookie = adminLoginRes.headers.get('set-cookie');
    if (adminSetCookie) adminCookie = adminSetCookie.split(';')[0];
    const adminData = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminData.user?.role === 'admin' && adminData.user?.adminRole === 'super_admin',
      'Super Administrator authentication succeeds with super_admin adminRole',
      JSON.stringify(adminData)
    );

    // 2. Authenticate as Student
    console.log('\n--- Step 2: Student Authentication ---');
    const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: '220101001',
        password: 'BietStudent@2026',
        requestedRole: 'student'
      })
    });
    const studentSetCookie = studentLoginRes.headers.get('set-cookie');
    if (studentSetCookie) studentCookie = studentSetCookie.split(';')[0];
    const studentData = await studentLoginRes.json();
    assert(
      studentLoginRes.status === 200 && studentData.user?.role === 'student',
      'Student Rahul Kumar (220101001) successfully authenticates',
      JSON.stringify(studentData)
    );

    // 3. Student Submits Profile Correction Request
    console.log('\n--- Step 3: Student Profile Correction Submission ---');
    const newPhone = `+91 98765${Math.floor(10000 + Math.random() * 90000)}`;
    const submitRes = await fetch(`${API_BASE}/students/profile/correction-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie
      },
      body: JSON.stringify({
        fieldToUpdate: 'mobileNumber',
        requestedValue: newPhone,
        reason: 'Updated primary contact mobile number as per student request'
      })
    });
    const submitData = await submitRes.json();
    assert(
      submitRes.status === 201 && submitData.correction?.requestId && submitData.correction?.status === 'Pending',
      `Student successfully submits profile correction request (ID: ${submitData.correction?.requestId})`,
      JSON.stringify(submitData)
    );
    const targetRequestId = submitData.correction?.requestId;

    // 4. Student Profile Me Sync
    console.log('\n--- Step 4: Student Self-Profile View Sync ---');
    const profileMeRes = await fetch(`${API_BASE}/students/profile/me`, {
      headers: { Cookie: studentCookie }
    });
    const profileMeData = await profileMeRes.json();
    const foundInMe = profileMeData.pendingCorrections?.some(c => c.requestId === targetRequestId);
    assert(
      profileMeRes.status === 200 && foundInMe,
      'Student profile query (/students/profile/me) reflects the pending correction request'
    );

    // 5. Unauthorized Access Blocking (Student trying to view / approve admin correction list)
    console.log('\n--- Step 5: Authorization Security Check ---');
    const unauthListRes = await fetch(`${API_BASE}/students/corrections`, {
      headers: { Cookie: studentCookie }
    });
    assert(
      unauthListRes.status === 403,
      'Student access to administrative corrections list is securely blocked (HTTP 403)'
    );

    const unauthApproveRes = await fetch(`${API_BASE}/students/corrections/${targetRequestId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie
      },
      body: JSON.stringify({ reviewNotes: 'Attempted self-approval' })
    });
    assert(
      unauthApproveRes.status === 403,
      'Student attempted self-approval of correction request is securely rejected (HTTP 403)'
    );

    // 6. Admin Queries Correction Requests
    console.log('\n--- Step 6: Admin Queries Corrections ---');
    const adminListRes = await fetch(`${API_BASE}/students/corrections`, {
      headers: { Cookie: adminCookie }
    });
    const adminListData = await adminListRes.json();
    const foundByAdmin = adminListData.corrections?.find(c => c.requestId === targetRequestId);
    assert(
      adminListRes.status === 200 && foundByAdmin && foundByAdmin.status === 'Pending',
      'Administrator retrieves corrections list including target pending request'
    );

    // 7. Admin Approves Correction & Auto-Updates Student Record
    console.log('\n--- Step 7: Admin Approval & Profile Auto-Sync ---');
    const approveRes = await fetch(`${API_BASE}/students/corrections/${targetRequestId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        reviewNotes: 'Verified with telecom declaration form. Approved.'
      })
    });
    const approveData = await approveRes.json();
    assert(
      approveRes.status === 200 && approveData.correction?.status === 'Approved',
      'Administrator approval succeeds with status "Approved"',
      JSON.stringify(approveData)
    );

    // 8. Verify Student Record was Automatically Updated in Database
    console.log('\n--- Step 8: Verification of Student Profile Update ---');
    const studentVerifyRes = await fetch(`${API_BASE}/students/220101001`, {
      headers: { Cookie: adminCookie }
    });
    const studentVerifyData = await studentVerifyRes.json();
    assert(
      studentVerifyData.student?.mobileNumber === newPhone,
      `Student record in database automatically updated to new mobileNumber: ${newPhone}`,
      `Current mobileNumber in DB: ${studentVerifyData.student?.mobileNumber}`
    );

    // 9. Student Submits Second Request to Test Rejection Workflow
    console.log('\n--- Step 9: Rejection Workflow ---');
    const secondSubmitRes = await fetch(`${API_BASE}/students/profile/correction-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie
      },
      body: JSON.stringify({
        fieldToUpdate: 'fullName',
        requestedValue: 'Totally Wrong Name',
        reason: 'Spelling update test'
      })
    });
    const secondSubmitData = await secondSubmitRes.json();
    const secondRequestId = secondSubmitData.correction?.requestId;

    const rejectRes = await fetch(`${API_BASE}/students/corrections/${secondRequestId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        reviewNotes: 'Rejected: Name change does not match official AKTU matriculation document.'
      })
    });
    const rejectData = await rejectRes.json();
    assert(
      rejectRes.status === 200 && rejectData.correction?.status === 'Rejected',
      'Administrator rejection workflow marks correction as "Rejected" with review notes'
    );

    // 10. Verify Student Record fullName was NOT altered by rejected request
    const studentAfterRejectRes = await fetch(`${API_BASE}/students/220101001`, {
      headers: { Cookie: adminCookie }
    });
    const studentAfterRejectData = await studentAfterRejectRes.json();
    assert(
      studentAfterRejectData.student?.fullName !== 'Totally Wrong Name' && studentAfterRejectData.student?.fullName === 'Rahul Kumar',
      'Student record fullName remains unchanged and protected after rejection',
      `Current name: ${studentAfterRejectData.student?.fullName}`
    );

  } catch (err) {
    console.error('Test execution exception:', err);
  }

  console.log('\n====================================================');
  console.log(`PHASE 8 RESULTS: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');
}

runTests();
