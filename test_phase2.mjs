// test_phase2.mjs
const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('=== PHASE 2 COMPREHENSIVE VERIFICATION SUITE ===\n');
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

  // 1. Multi-Role Authentication Tests
  await test('1. Administrator Login (role: admin)', async () => {
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
    const data = await res.json();
    if (data.user?.role !== 'admin') throw new Error(`Expected admin, got ${data.user?.role}`);
    if (data.user?.adminRole !== 'super_admin') throw new Error(`Expected super_admin, got ${data.user?.adminRole}`);
  });

  await test('2. Student Login via Roll Number (role: student)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: '220101001',
        password: 'BietStudent@2026',
        requestedRole: 'student'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.user?.role !== 'student') throw new Error(`Expected student, got ${data.user?.role}`);
    if (data.user?.identifier !== '220101001') throw new Error(`Expected 220101001, got ${data.user?.identifier}`);
  });

  await test('3. Teacher Login via Employee ID (role: teacher)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'T-1001',
        password: 'Teacher@2026',
        requestedRole: 'teacher'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.user?.role !== 'teacher') throw new Error(`Expected teacher, got ${data.user?.role}`);
    if (data.user?.identifier !== 'T-1001') throw new Error(`Expected T-1001, got ${data.user?.identifier}`);
  });

  await test('4. Staff Login via Staff ID (role: staff)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'S-2001',
        password: 'Staff@2026',
        requestedRole: 'staff'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.user?.role !== 'staff') throw new Error(`Expected staff, got ${data.user?.role}`);
    if (data.user?.identifier !== 'S-2001') throw new Error(`Expected S-2001, got ${data.user?.identifier}`);
  });

  // 2. Role Impersonation Safeguards
  await test('5. Prevent Role Impersonation: Student attempting Admin login', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: '220101001',
        password: 'BietStudent@2026',
        requestedRole: 'admin' // Impersonation!
      })
    });
    if (res.status !== 403) throw new Error(`Expected HTTP 403, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('Unauthorized role selection')) {
      throw new Error(`Unexpected message: ${data.message}`);
    }
  });

  await test('6. Prevent Role Impersonation: Teacher attempting Student login', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'T-1001',
        password: 'Teacher@2026',
        requestedRole: 'student' // Impersonation!
      })
    });
    if (res.status !== 403) throw new Error(`Expected HTTP 403, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('Unauthorized role selection')) {
      throw new Error(`Unexpected message: ${data.message}`);
    }
  });

  // 3. Student Self-Profile & Correction Flow
  let studentCookie = '';
  await test('7. Student Session & Self-Profile (/api/students/profile/me)', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: '220101001',
        password: 'BietStudent@2026',
        requestedRole: 'student'
      })
    });
    studentCookie = loginRes.headers.get('set-cookie');

    const profileRes = await fetch(`${BASE_URL}/api/students/profile/me`, {
      headers: { Cookie: studentCookie }
    });
    if (!profileRes.ok) throw new Error(`HTTP ${profileRes.status}`);
    const data = await profileRes.json();
    if (!data.student) throw new Error('Expected linked student document in response');
    if (data.student.rollNumber !== '220101001') {
      throw new Error(`Expected 220101001, got ${data.student.rollNumber}`);
    }
    if (!data.student.qrCode || !data.student.qrCode.startsWith('data:image/png')) {
      throw new Error('Expected QR Code data URL');
    }
    if (typeof data.attendance?.percentage !== 'number') {
      throw new Error('Expected attendance percentage');
    }
  });

  await test('8. Student Profile Correction Submission', async () => {
    const res = await fetch(`${BASE_URL}/api/students/profile/correction-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie
      },
      body: JSON.stringify({
        fieldToUpdate: 'mobileNumber',
        requestedValue: '+91 99999 88888',
        reason: 'Updated primary contact number'
      })
    });
    if (res.status !== 201) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.correction?.requestId) throw new Error('Expected requestId');
  });

  // 4. Verification Check
  await test('9. Staff QR Gate Verification (/api/verification/verify-qr)', async () => {
    // 1. Login as staff
    const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'S-2001',
        password: 'Staff@2026',
        requestedRole: 'staff'
      })
    });
    if (!staffLoginRes.ok) throw new Error(`Staff login failed: HTTP ${staffLoginRes.status}`);
    const staffCookie = staffLoginRes.headers.get('set-cookie');

    // 2. Perform QR Verification
    const res = await fetch(`${BASE_URL}/api/verification/verify-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: staffCookie
      },
      body: JSON.stringify({ qrToken: '220101001' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.verified !== true) throw new Error('Expected verified === true');
    if (data.student?.rollNumber !== '220101001') throw new Error('Roll mismatch');
  });

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) process.exit(1);
}

runTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
