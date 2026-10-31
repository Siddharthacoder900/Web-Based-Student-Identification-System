// Phase 7 Comprehensive Automated Test Suite
// Verifies Attendance Sessions, Live Biometric Face Check-In, QR Check-In,
// Manual Override, Session Closure, Student Dossiers, and AKTU <75% Shortage Alerts.

const BASE_URL = 'http://localhost:5001/api';

async function runPhase7Tests() {
  console.log('=== PHASE 7: ATTENDANCE MANAGEMENT WITH FACE & QR TEST SUITE ===\n');

  let passed = 0;
  let total = 0;
  let adminCookie = '';
  let enrolledStudent = null;
  let secondStudent = null;

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
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'admin@biet.ac.in',
        password: 'BietDemo@2026',
        requestedRole: 'admin'
      })
    });
    const setCookie = adminRes.headers.get('set-cookie');
    if (setCookie) adminCookie = setCookie.split(';')[0];
    const adminData = await adminRes.json();
    testResult('Administrator Authentication', adminRes.status === 200 && adminData.user?.role === 'admin');

    // 2. Fetch enrolled students with biometric templates
    const descRes = await fetch(`${BASE_URL}/verification/enrolled-descriptors`, {
      headers: { Cookie: adminCookie }
    });
    const descData = await descRes.json();
    const enrolledList = descData.enrolled || [];
    enrolledStudent = enrolledList[0];
    secondStudent = enrolledList[1] || { studentId: '220101001', rollNumber: '220101001', fullName: 'Rahul Kumar' };

    testResult(
      'Resolve Enrolled Biometric Students for Live Check-In',
      enrolledList.length > 0,
      `Primary: ${enrolledStudent?.fullName} (${enrolledStudent?.rollNumber})`
    );

    // 3. Create Attendance Lecture Session (POST /api/attendance/sessions)
    const newSessionRes = await fetch(`${BASE_URL}/attendance/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        sessionName: 'Cloud Computing & Distributed Systems Lecture 8',
        course: 'B.Tech',
        branch: 'CSE',
        academicYear: '4th Year',
        currentSemester: '7th Semester',
        subject: 'CS-701: Cloud Computing',
        startTime: '10:00',
        endTime: '11:30',
        teacherName: 'Prof. Ramesh Chandra'
      })
    });
    const newSessionData = await newSessionRes.json();
    const testSession = newSessionData.session;
    testResult(
      'Create Lecture Attendance Session (POST /api/attendance/sessions)',
      newSessionRes.status === 201 && !!testSession?.sessionId,
      `Session ID: ${testSession?.sessionId}, Title: ${testSession?.sessionName}`
    );

    // 4. Query Attendance Sessions List (GET /api/attendance/sessions)
    const sessionsListRes = await fetch(`${BASE_URL}/attendance/sessions?branch=CSE`, {
      headers: { Cookie: adminCookie }
    });
    const sessionsListData = await sessionsListRes.json();
    const foundSession = (sessionsListData.sessions || []).find((s) => s.sessionId === testSession.sessionId);
    testResult(
      'Query Sessions Filtered by Branch',
      sessionsListRes.status === 200 && !!foundSession,
      `Found session in CSE schedule`
    );

    // 5. Live Biometric Face Check-In (POST /api/attendance/check-in with 128-D vector)
    const faceCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        sessionId: testSession.sessionId,
        faceTemplate: enrolledStudent.descriptor,
        threshold: 0.52
      })
    });
    const faceCheckInData = await faceCheckInRes.json();
    testResult(
      'Live Biometric Face Check-In (Auto 1:N Identification & Attendance)',
      faceCheckInRes.status === 201 &&
        (faceCheckInData.record?.status === 'Present' || faceCheckInData.record?.status === 'Late') &&
        faceCheckInData.record?.method === 'Face' &&
        faceCheckInData.student?.rollNumber === enrolledStudent.rollNumber,
      `Checked in: ${faceCheckInData.student?.fullName} (${faceCheckInData.record?.status})`
    );

    // 6. Duplicate Check-In Prevention (HTTP 400)
    const dupCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        sessionId: testSession.sessionId,
        rollNumber: enrolledStudent.rollNumber,
        method: 'Face'
      })
    });
    const dupData = await dupCheckInRes.json();
    testResult(
      'Prevent Duplicate Check-In for Same Student in Session',
      dupCheckInRes.status === 400 && dupData.message?.includes('already marked'),
      dupData.message
    );

    // 7. QR / ID Card Token Check-In (POST /api/attendance/check-in with Roll Number)
    const qrCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        sessionId: testSession.sessionId,
        rollNumber: secondStudent.rollNumber,
        method: 'QR'
      })
    });
    const qrCheckInData = await qrCheckInRes.json();
    testResult(
      'ID Card QR Code Check-In',
      qrCheckInRes.status === 201 && qrCheckInData.record?.method === 'QR',
      `Marked ${qrCheckInData.record?.status} for ${qrCheckInData.student?.fullName}`
    );

    // 8. Manual Attendance Status Override (POST /api/attendance/manual-mark)
    const manualRes = await fetch(`${BASE_URL}/attendance/manual-mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        sessionId: testSession.sessionId,
        rollNumber: secondStudent.rollNumber,
        status: 'Late'
      })
    });
    const manualData = await manualRes.json();
    testResult(
      'Manual Attendance Status Override (Present -> Late)',
      manualRes.status === 200 && manualData.record?.status === 'Late',
      `Updated status to: ${manualData.record?.status}`
    );

    // 9. Close Attendance Session (PATCH /api/attendance/sessions/:id/close)
    const closeRes = await fetch(`${BASE_URL}/attendance/sessions/${testSession.sessionId}/close`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie }
    });
    const closeData = await closeRes.json();
    testResult(
      'Close Attendance Session (Status: Closed)',
      closeRes.status === 200 && closeData.session?.status === 'Closed',
      closeData.message
    );

    // 10. Student Cumulative Attendance Dossier (GET /api/attendance/student/:studentId)
    const dossierRes = await fetch(`${BASE_URL}/attendance/student/${enrolledStudent.studentId}`, {
      headers: { Cookie: adminCookie }
    });
    const dossierData = await dossierRes.json();
    testResult(
      'Student Cumulative Attendance Dossier & Percentage Calculation',
      dossierRes.status === 200 && typeof dossierData.percentage === 'number',
      `Attended: ${dossierData.attendedCount}/${dossierData.totalSessions} (${dossierData.percentage}%)`
    );

    // 11. AKTU Attendance Shortage Alerts (< 75% Risk)
    const alertsRes = await fetch(`${BASE_URL}/attendance/shortage-alerts?threshold=75`, {
      headers: { Cookie: adminCookie }
    });
    const alertsData = await alertsRes.json();
    const alertsList = alertsData.alerts || [];
    testResult(
      'AKTU Attendance Shortage Alerts (< 75% Debarment Risk Tracking)',
      alertsRes.status === 200 && Array.isArray(alertsList),
      `Identified ${alertsList.filter((a) => a.isShortage).length} students with shortage risk`
    );

    // 12. Overall Campus Attendance Stats (GET /api/attendance/stats)
    const statsRes = await fetch(`${BASE_URL}/attendance/stats`, {
      headers: { Cookie: adminCookie }
    });
    const statsData = await statsRes.json();
    testResult(
      'Campus Attendance Stats Aggregates',
      statsRes.status === 200 && statsData.stats?.totalSessions >= 1,
      `Sessions: ${statsData.stats?.totalSessions}, Records: ${statsData.stats?.totalRecords}`
    );

  } catch (err) {
    console.error('Phase 7 Test execution error:', err);
  }

  console.log('\n========================================');
  console.log(`PHASE 7 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase7Tests();
