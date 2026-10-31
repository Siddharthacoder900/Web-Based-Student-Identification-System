// Phase 5 Comprehensive Automated Test Suite
// Verifies 1:N Face Identification, 1:1 Targeted Verification,
// Biometric Consent, Biometric Deletion & Re-enrollment, QR Fallback, and Audit Logging.

const BASE_URL = 'http://localhost:5001/api';

async function runPhase5Tests() {
  console.log('=== PHASE 5: BIOMETRIC FACE RECOGNITION & QR SCANNER TEST SUITE ===\n');

  let passed = 0;
  let total = 0;
  let adminCookie = '';

  function testResult(title, condition, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${total}. ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${total}. ${title}${details ? ` -> ${details}` : ''}`);
    }
  }

  try {
    // 1. Authenticate as Administrator
    const authRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'admin@biet.ac.in',
        password: 'BietDemo@2026',
        requestedRole: 'admin'
      })
    });
    const setCookie = authRes.headers.get('set-cookie');
    if (setCookie) {
      adminCookie = setCookie.split(';')[0];
    }
    const authData = await authRes.json();
    testResult('Administrator Authentication', authRes.status === 200 && authData.user?.role === 'admin');

    // 2. Query Enrolled Descriptors (Internal Access)
    const enrolledRes = await fetch(`${BASE_URL}/verification/enrolled-descriptors`, {
      headers: { Cookie: adminCookie }
    });
    const enrolledData = await enrolledRes.json();
    const enrolledList = enrolledData.enrolled || [];
    testResult(
      'Query Enrolled Face Descriptors',
      enrolledRes.status === 200 && enrolledList.length > 0 && enrolledList[0].descriptor.length === 128,
      `Found ${enrolledList.length} enrolled students with 128-D descriptors`
    );

    const testStudent = enrolledList[0];
    const testDescriptor = [...testStudent.descriptor];

    // 3. 1:N Live Face Identification (Matching Enrolled Student)
    // Add tiny realistic camera noise (e.g., jitter < 0.02)
    const noisyDescriptor = testDescriptor.map((v) => Math.round((v + (Math.random() - 0.5) * 0.01) * 10000) / 10000);
    const idRes = await fetch(`${BASE_URL}/verification/face-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        faceTemplate: noisyDescriptor,
        threshold: 0.52
      })
    });
    const idData = await idRes.json();
    testResult(
      '1:N Live Face Identification (Match Enrolled Student)',
      idRes.status === 200 &&
        idData.match === true &&
        idData.status === 'Verified' &&
        idData.student?.rollNumber === testStudent.rollNumber &&
        idData.confidence >= 80,
      `Matched: ${idData.student?.fullName} (${idData.student?.rollNumber}), Confidence: ${idData.confidence}%, Distance: ${idData.distance}`
    );

    // 4. 1:N Live Face Identification (Unknown Divergent Face)
    // Create an orthogonal/divergent vector (e.g. completely inverted)
    const unknownDescriptor = new Array(128).fill(0).map((_, i) => (i % 2 === 0 ? 0.125 : -0.125));
    const unknownRes = await fetch(`${BASE_URL}/verification/face-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        faceTemplate: unknownDescriptor,
        threshold: 0.52
      })
    });
    const unknownData = await unknownRes.json();
    testResult(
      '1:N Face Identification Rejection (Unknown Face / Non-Match)',
      unknownRes.status === 200 &&
        unknownData.match === false &&
        unknownData.status === 'Not Verified' &&
        unknownData.message?.includes('Not Verified'),
      `Rejected with distance: ${unknownData.bestDistance}`
    );

    // 5. 1:1 Targeted Face Verification (Matching Roll Number)
    const target11Res = await fetch(`${BASE_URL}/verification/face-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        faceTemplate: noisyDescriptor,
        targetRollNumber: testStudent.rollNumber,
        threshold: 0.52
      })
    });
    const target11Data = await target11Res.json();
    testResult(
      '1:1 Targeted Face Verification (Matching Target Roll)',
      target11Res.status === 200 &&
        target11Data.match === true &&
        target11Data.status === 'Verified' &&
        target11Data.student?.rollNumber === testStudent.rollNumber,
      `Confidence: ${target11Data.confidence}%, Distance: ${target11Data.distance}`
    );

    // 6. 1:1 Targeted Face Verification (Mismatched Face vs Target Roll)
    const mismatch11Res = await fetch(`${BASE_URL}/verification/face-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        faceTemplate: unknownDescriptor,
        targetRollNumber: testStudent.rollNumber,
        threshold: 0.52
      })
    });
    const mismatch11Data = await mismatch11Res.json();
    testResult(
      '1:1 Targeted Face Verification (Mismatched Face vs Roll)',
      mismatch11Res.status === 200 &&
        mismatch11Data.match === false &&
        mismatch11Data.status === 'Not Verified',
      `Correctly identified mismatch (Distance: ${mismatch11Data.distance})`
    );

    // 7. Delete Biometric Data (Reset without deleting student)
    const delBioRes = await fetch(`${BASE_URL}/students/${testStudent.studentId}/biometric`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    const delBioData = await delBioRes.json();

    // Check student record still exists but biometric.enrolled is false
    const checkStudentRes = await fetch(`${BASE_URL}/students/${testStudent.studentId}`, {
      headers: { Cookie: adminCookie }
    });
    const checkStudentData = await checkStudentRes.json();
    testResult(
      'Permanently Delete Biometric Face Template',
      delBioRes.status === 200 &&
        checkStudentData.student?.studentId === testStudent.studentId &&
        checkStudentData.student?.biometric?.enrolled === false,
      delBioData.message
    );

    // 8. Re-enroll Biometric Face Data (With Informed Consent)
    // First test consent required
    const noConsentRes = await fetch(`${BASE_URL}/students/${testStudent.studentId}/biometric/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        faceTemplate: testDescriptor,
        consentGiven: false
      })
    });
    testResult(
      'Reject Biometric Enrollment Without Student Consent (HTTP 400)',
      noConsentRes.status === 400
    );

    // Now re-enroll with consent
    const reEnrollRes = await fetch(`${BASE_URL}/students/${testStudent.studentId}/biometric/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        faceTemplate: testDescriptor,
        consentGiven: true
      })
    });
    const reEnrollData = await reEnrollRes.json();
    testResult(
      'Re-enroll Biometric Face Template With Consent',
      reEnrollRes.status === 200 && reEnrollData.enrolled === true,
      reEnrollData.message
    );

    // 9. QR Code Verification Fallback
    const qrRes = await fetch(`${BASE_URL}/verification/verify-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        qrToken: testStudent.rollNumber
      })
    });
    const qrData = await qrRes.json();
    testResult(
      'Physical ID Card QR Code Fallback Verification',
      qrRes.status === 200 && qrData.verified === true && qrData.student?.rollNumber === testStudent.rollNumber,
      `Verified via QR: ${qrData.student?.fullName}`
    );

    // 10. Live Verification Audit Trail History
    const historyRes = await fetch(`${BASE_URL}/verification/history?limit=15`, {
      headers: { Cookie: adminCookie }
    });
    const historyData = await historyRes.json();
    const historyList = historyData.history || historyData.logs || [];
    const hasFace1N = historyList.some((l) => l.method === 'Face-1:N');
    const hasFace11 = historyList.some((l) => l.method === 'Face-1:1');
    const hasQR = historyList.some((l) => l.method === 'QR');
    testResult(
      'Verification Audit Trail Logging (Face-1:N, Face-1:1, QR)',
      historyRes.status === 200 && hasFace1N && hasFace11 && hasQR,
      `Logged ${historyList.length} total verification events with IST timestamps`
    );

  } catch (err) {
    console.error('Test execution failed with error:', err);
  }

  console.log('\n========================================');
  console.log(`PHASE 5 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase5Tests();

