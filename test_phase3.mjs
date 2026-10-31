// test_phase3.mjs
const BASE_URL = 'http://localhost:5001';

async function runPhase3Tests() {
  console.log('=== PHASE 3 REGISTRATION & OCR VERIFICATION SUITE ===\n');
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
    if (!adminCookie) throw new Error('No session cookie returned');
  });

  // 2. New Student Registration with Full Academic, Contact & Biometric Payload
  const testRoll = `2401010${Math.floor(10 + Math.random() * 89)}`;
  const testEmail = `vikram.${testRoll}@biet.ac.in`;
  const mock128Vector = Array.from({ length: 128 }, (_, i) => Math.round(Math.sin(i) * 1000) / 1000);

  let createdStudentId = '';

  await test(`2. Permanent Student Registration (Roll: ${testRoll})`, async () => {
    const payload = {
      fullName: 'Vikram Singh',
      rollNumber: testRoll,
      registrationNumber: `REG-${testRoll}`,
      email: testEmail,
      mobileNumber: '+91 98765 12345',
      course: 'B.Tech',
      branch: 'Mechanical Engineering',
      academicYear: '1st Year',
      currentSemester: 'Semester 1',
      admissionYear: 2024,
      dateOfBirth: '2005-08-15',
      gender: 'Male',
      address: 'Sitapur Road, Lucknow, Uttar Pradesh',
      studentStatus: 'Active',
      verificationStatus: 'Verified',
      photoUrl: '/assets/sample-student.jpg',
      biometric: {
        consentGiven: true,
        faceTemplate: mock128Vector
      }
    };

    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify(payload)
    });

    if (res.status !== 201) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Expected 201, got HTTP ${res.status}: ${errData.message || ''}`);
    }

    const data = await res.json();
    if (!data.student?.studentId) throw new Error('studentId was not generated');
    if (data.student.rollNumber !== testRoll) throw new Error(`Expected ${testRoll}, got ${data.student.rollNumber}`);
    if (!data.student.qrCode) throw new Error('qrCode token data URL missing');
    if (!data.student.biometric?.enrolled) throw new Error('biometric enrollment failed');

    createdStudentId = data.student.studentId;
  });

  // 3. Database Persistence & Retrieval
  await test('3. Query Registered Student Record by Roll Number', async () => {
    const res = await fetch(`${BASE_URL}/api/students/${testRoll}`, {
      headers: { Cookie: adminCookie }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.student) throw new Error('Student record not returned');
    if (data.student.studentId !== createdStudentId) throw new Error('studentId mismatch');
    if (data.student.course !== 'B.Tech') throw new Error('Course mismatch');
    if (data.student.branch !== 'Mechanical Engineering') throw new Error('Branch mismatch');
  });

  // 4. Automatic Login Account Provisioning
  await test('4. Automatic Student Login Account Provisioning', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: testRoll,
        password: 'BietStudent@2026',
        requestedRole: 'student'
      })
    });

    if (!loginRes.ok) throw new Error(`HTTP ${loginRes.status}`);
    const loginData = await loginRes.json();
    if (loginData.user?.role !== 'student') throw new Error(`Expected role student, got ${loginData.user?.role}`);
    if (loginData.user?.identifier !== testRoll) throw new Error(`Expected identifier ${testRoll}`);
  });

  // 5. Prevent Duplicate Roll Number
  await test('5. Prevent Duplicate Registration by Roll Number', async () => {
    const duplicatePayload = {
      fullName: 'Another Student',
      rollNumber: testRoll, // Same roll!
      email: `another.${Date.now()}@biet.ac.in`,
      mobileNumber: '+91 99999 11111',
      course: 'B.Tech',
      branch: 'Computer Science and Engineering',
      academicYear: '1st Year',
      currentSemester: 'Semester 1',
      admissionYear: 2024
    };

    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify(duplicatePayload)
    });

    if (res.status !== 409) {
      throw new Error(`Expected HTTP 409 Conflict, got ${res.status}`);
    }

    const data = await res.json();
    if (!data.message.includes('Your student account is already registered')) {
      throw new Error(`Unexpected error message: ${data.message}`);
    }
  });

  // 6. Prevent Duplicate Email Address
  await test('6. Prevent Duplicate Registration by Email Address', async () => {
    const duplicateEmailPayload = {
      fullName: 'Different Student Name',
      rollNumber: `240101999`, // Different roll
      email: testEmail, // Same email!
      mobileNumber: '+91 88888 22222',
      course: 'B.Tech',
      branch: 'Information Technology',
      academicYear: '1st Year',
      currentSemester: 'Semester 1',
      admissionYear: 2024
    };

    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify(duplicateEmailPayload)
    });

    if (res.status !== 409) {
      throw new Error(`Expected HTTP 409 Conflict, got ${res.status}`);
    }

    const data = await res.json();
    if (!data.message.includes('Your student account is already registered')) {
      throw new Error(`Unexpected error message: ${data.message}`);
    }
  });

  // 7. Verify Registered Student in Overall Roster Filter
  await test('7. Verify Student in Department Filter (/api/students?branch=Mechanical Engineering)', async () => {
    const res = await fetch(`${BASE_URL}/api/students?branch=Mechanical Engineering`, {
      headers: { Cookie: adminCookie }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const found = (data.students || []).find((s) => s.rollNumber === testRoll);
    if (!found) throw new Error(`Student ${testRoll} not found in Mechanical Engineering roster`);
  });

  console.log(`\n========================================`);
  console.log(`PHASE 3 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) process.exit(1);
}

runPhase3Tests().catch((e) => {
  console.error('Phase 3 test execution error:', e);
  process.exit(1);
});

