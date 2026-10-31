// Phase 9 Automated Verification Script
// Tests Institutional Analytics & Intelligence, Document Repository Lifecycle,
// Document Upload/Archive, Status Updates, Role-Safe Student Document Isolation,
// and Compliance Export Generation (Roster & Attendance).

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('====================================================');
  console.log('BIET - PHASE 9 DOCUMENTS, REPORTS & ANALYTICS AUDIT');
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
    console.log('--- Step 1: Authentication ---');
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
      adminLoginRes.status === 200 && adminData.user?.role === 'admin',
      'Administrator authenticates successfully',
      JSON.stringify(adminData)
    );

    // 2. Authenticate as Student Rahul Kumar (220101001)
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
      'Student Rahul Kumar authenticates successfully'
    );

    // 3. Query Institutional Summary & Analytics Endpoint
    console.log('\n--- Step 2: Institutional Analytics Summary ---');
    const summaryRes = await fetch(`${API_BASE}/reports/summary`, {
      headers: { Cookie: adminCookie }
    });
    const summaryData = await summaryRes.json();
    assert(
      summaryRes.status === 200 &&
      summaryData.institution?.code === 'BIET-422' &&
      summaryData.students?.total > 0 &&
      Array.isArray(summaryData.students?.branchDistribution) &&
      summaryData.verifications?.total !== undefined,
      'GET /api/reports/summary returns comprehensive institutional analytics dossier',
      JSON.stringify(summaryData)
    );

    // 4. Query Student Master Roster Export Data
    console.log('\n--- Step 3: Compliance & Roster Exports ---');
    const rosterExportRes = await fetch(`${API_BASE}/reports/export/roster`, {
      headers: { Cookie: adminCookie }
    });
    const rosterData = await rosterExportRes.json();
    assert(
      rosterExportRes.status === 200 && rosterData.count > 0 && Array.isArray(rosterData.data),
      `GET /api/reports/export/roster delivers RFC-compliant student dataset (${rosterData.count} records)`
    );

    // 5. Query AKTU Attendance Compliance Export Data
    const attExportRes = await fetch(`${API_BASE}/reports/export/attendance`, {
      headers: { Cookie: adminCookie }
    });
    const attData = await attExportRes.json();
    assert(
      attExportRes.status === 200 && attData.count > 0 && Array.isArray(attData.data),
      `GET /api/reports/export/attendance delivers AKTU attendance audit dossier (${attData.count} students)`
    );

    // 6. Query Document Repository Listing
    console.log('\n--- Step 4: Document Repository Operations ---');
    const docsRes = await fetch(`${API_BASE}/documents`, {
      headers: { Cookie: adminCookie }
    });
    const docsData = await docsRes.json();
    assert(
      docsRes.status === 200 && Array.isArray(docsData.documents) && docsData.documents.length > 0,
      `GET /api/documents returns institutional document repository (${docsData.documents.length} archived files)`
    );

    // 7. Query Document Repository with Category Filter
    const typeFilterRes = await fetch(`${API_BASE}/documents?documentType=Admission Form`, {
      headers: { Cookie: adminCookie }
    });
    const typeFilterData = await typeFilterRes.json();
    const allMatch = typeFilterData.documents?.every(d => d.documentType === 'Admission Form');
    assert(
      typeFilterRes.status === 200 && allMatch,
      'GET /api/documents?documentType=Admission Form correctly filters by category'
    );

    // 8. Query Student Documents by Roll Number
    console.log('\n--- Step 5: Student Document Dossier & Access Control ---');
    const studentDocsRes = await fetch(`${API_BASE}/documents/student/220101001`, {
      headers: { Cookie: adminCookie }
    });
    const studentDocsData = await studentDocsRes.json();
    assert(
      studentDocsRes.status === 200 &&
      studentDocsData.student?.rollNumber === '220101001' &&
      Array.isArray(studentDocsData.documents),
      'GET /api/documents/student/220101001 returns student-specific archived documents'
    );

    // 9. Unauthorized Student Document Snooping Check (HTTP 403)
    const unauthorizedSnoopRes = await fetch(`${API_BASE}/documents/student/230102001`, {
      headers: { Cookie: studentCookie }
    });
    assert(
      unauthorizedSnoopRes.status === 403,
      'Student attempt to inspect documents of another student (230102001) is blocked (HTTP 403)'
    );

    // 10. Admin Archives New Student Document
    console.log('\n--- Step 6: Document Lifecycle (Upload, Verify, Delete) ---');
    const newDocRes = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        rollNumber: '220101001',
        title: 'AKTU Odd Semester Examination Hall Ticket 2026',
        documentType: 'Academic Marksheet/Certificate',
        fileName: 'hall_ticket_2026.pdf',
        fileSize: 154000,
        mimeType: 'application/pdf',
        notes: 'Verified against university examination clearance portal.'
      })
    });
    const newDocData = await newDocRes.json();
    const testDocId = newDocData.document?.documentId;
    assert(
      newDocRes.status === 201 && testDocId && newDocData.document?.verificationStatus === 'Verified',
      `Document archived successfully with Document ID: ${testDocId}`
    );

    // 11. Update Document Verification Status
    const updateStatusRes = await fetch(`${API_BASE}/documents/${testDocId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        verificationStatus: 'Pending',
        notes: 'Flagged for seal re-inspection by Examination Controller'
      })
    });
    const updateStatusData = await updateStatusRes.json();
    assert(
      updateStatusRes.status === 200 && updateStatusData.document?.verificationStatus === 'Pending',
      'PATCH /api/documents/:id/status updates verification status and audit remarks'
    );

    // 12. Delete Test Document
    const deleteRes = await fetch(`${API_BASE}/documents/${testDocId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    assert(
      deleteRes.status === 200,
      'DELETE /api/documents/:id safely purges test document from repository'
    );

  } catch (err) {
    console.error('Test execution exception:', err);
  }

  console.log('\n====================================================');
  console.log(`PHASE 9 RESULTS: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');
}

runTests();

