// test_phase4.mjs
const BASE_URL = 'http://localhost:5001';

async function runPhase4Tests() {
  console.log('=== PHASE 4: STUDENT RECORDS & TEACHER/STAFF MANAGEMENT TEST SUITE ===\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Authenticate as Admin
  let adminCookie = '';
  await test('1. Authenticate as Administrator', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'admin@biet.ac.in',
        password: 'BietDemo@2026',
        requestedRole: 'admin'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    adminCookie = res.headers.get('set-cookie');
  });

  // 2. Student Records Search & Filters
  await test('2. Student Filter by Course (course=B.Tech)', async () => {
    const res = await fetch(`${BASE_URL}/api/students?course=B.Tech`, {
      headers: { Cookie: adminCookie }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.students)) throw new Error('Expected students array');
    data.students.forEach((s) => {
      if (s.course !== 'B.Tech') throw new Error(`Filter mismatch: ${s.course}`);
    });
  });

  await test('3. Student Filter by Face Biometric Enrollment (faceEnrolled=true)', async () => {
    const res = await fetch(`${BASE_URL}/api/students?faceEnrolled=true`, {
      headers: { Cookie: adminCookie }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    data.students.forEach((s) => {
      if (!s.biometric?.enrolled) throw new Error(`Expected biometric enrolled: true`);
    });
  });

  // 3. Student Record Lifecycle: Edit & Status Toggle
  await test('4. Update Student Details (PUT /api/students/:id)', async () => {
    const updateRes = await fetch(`${BASE_URL}/api/students/220101001`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        mobileNumber: '+91 98888 77777',
        address: 'Aliganj, Lucknow, UP'
      })
    });
    if (!updateRes.ok) throw new Error(`HTTP ${updateRes.status}`);
    const data = await updateRes.json();
    if (data.student?.mobileNumber !== '+91 98888 77777') {
      throw new Error(`Mobile not updated: ${data.student?.mobileNumber}`);
    }
  });

  await test('5. Toggle Student Status (PATCH /api/students/:id/status)', async () => {
    const patchRes = await fetch(`${BASE_URL}/api/students/220101001/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        status: 'Inactive',
        verificationStatus: 'Pending'
      })
    });
    if (!patchRes.ok) throw new Error(`HTTP ${patchRes.status}`);
    const data = await patchRes.json();
    if (data.student?.studentStatus !== 'Inactive') {
      throw new Error(`Status not inactive: ${data.student?.studentStatus}`);
    }

    // Reset back to Active
    await fetch(`${BASE_URL}/api/students/220101001/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        status: 'Active',
        verificationStatus: 'Verified'
      })
    });
  });

  // 4. Teacher Management Workflow
  let createdEmpId = '';
  const testTeacherEmail = `priya.mishra.${Date.now()}@biet.ac.in`;

  await test('6. Provision Faculty / Teacher Account (POST /api/teachers)', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        fullName: 'Dr. Priya Mishra',
        department: 'Computer Science and Engineering',
        email: testTeacherEmail,
        mobileNumber: '+91 98765 22222',
        designation: 'Associate Professor'
      })
    });
    if (res.status !== 201) throw new Error(`Expected 201, got HTTP ${res.status}`);
    const data = await res.json();
    if (!data.teacher?.employeeId) throw new Error('No employeeId assigned');
    createdEmpId = data.teacher.employeeId;
  });

  await test('7. Update Teacher Details (PUT /api/teachers/:id)', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers/${createdEmpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        designation: 'Professor & HOD'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.teacher?.designation !== 'Professor & HOD') {
      throw new Error('Designation was not updated');
    }
  });

  await test('8. Toggle Teacher Status (PATCH /api/teachers/:id/status)', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers/${createdEmpId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ status: 'Inactive' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.teacher?.accountStatus !== 'Inactive') {
      throw new Error(`Expected Inactive, got ${data.teacher?.accountStatus}`);
    }

    // Re-activate
    await fetch(`${BASE_URL}/api/teachers/${createdEmpId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ status: 'Active' })
    });
  });

  // 5. Staff Management Workflow
  let createdStaffId = '';
  const testStaffEmail = `rajesh.library.${Date.now()}@biet.ac.in`;

  await test('9. Provision Security & Staff Account (POST /api/staff)', async () => {
    const res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        fullName: 'Rajesh Kumar',
        department: 'Central Library',
        email: testStaffEmail,
        mobileNumber: '+91 98765 33333',
        designation: 'Chief Librarian'
      })
    });
    if (res.status !== 201) throw new Error(`Expected 201, got HTTP ${res.status}`);
    const data = await res.json();
    if (!data.staff?.staffId) throw new Error('No staffId assigned');
    createdStaffId = data.staff.staffId;
  });

  await test('10. Update Staff Details (PUT /api/staff/:id)', async () => {
    const res = await fetch(`${BASE_URL}/api/staff/${createdStaffId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        designation: 'Senior Librarian Head'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.staff?.designation !== 'Senior Librarian Head') {
      throw new Error('Designation not updated');
    }
  });

  await test('11. Toggle Staff Status (PATCH /api/staff/:id/status)', async () => {
    const res = await fetch(`${BASE_URL}/api/staff/${createdStaffId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ status: 'Inactive' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.staff?.accountStatus !== 'Inactive') {
      throw new Error(`Expected Inactive, got ${data.staff?.accountStatus}`);
    }

    // Re-activate
    await fetch(`${BASE_URL}/api/staff/${createdStaffId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({ status: 'Active' })
    });
  });

  console.log(`\n========================================`);
  console.log(`PHASE 4 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) process.exit(1);
}

runPhase4Tests().catch((e) => {
  console.error('Phase 4 test execution error:', e);
  process.exit(1);
});

