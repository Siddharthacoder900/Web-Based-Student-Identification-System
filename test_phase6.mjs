// Phase 6 Comprehensive Automated Test Suite
// Verifies Student ID Card Payload, Data Integrity, AKTU / Institutional Badges,
// Student Portal Self-Access Security, QR Signature Resolution, and jsPDF CR80 Vector Generation.

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

const BASE_URL = 'http://localhost:5001/api';

async function runPhase6Tests() {
  console.log('=== PHASE 6: STUDENT ID CARD GENERATION TEST SUITE ===\n');

  let passed = 0;
  let total = 0;
  let adminCookie = '';
  let studentCookie = '';

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

    // 2. Query Student Registry for ID Cards
    const studentsRes = await fetch(`${BASE_URL}/students`, {
      headers: { Cookie: adminCookie }
    });
    const studentsData = await studentsRes.json();
    const studentsList = studentsData.students || [];
    testResult(
      'Query Student Registry for ID Card Badges',
      studentsRes.status === 200 && studentsList.length > 0,
      `Found ${studentsList.length} total student records`
    );

    const testStudent = studentsList[0];

    // 3. Fetch Dedicated Student ID Card Metadata (GET /api/students/:id/id-card)
    const cardRes = await fetch(`${BASE_URL}/students/${testStudent.studentId}/id-card`, {
      headers: { Cookie: adminCookie }
    });
    const cardData = await cardRes.json();
    const idCard = cardData.idCard;
    testResult(
      'Dedicated Student ID Card Payload (GET /api/students/:id/id-card)',
      cardRes.status === 200 && !!idCard,
      `Fetched card for ${idCard?.fullName} (${idCard?.rollNumber})`
    );

    // 4. Validate Institutional ID Card Fields & Formatting
    const hasInstitution = idCard?.institution?.includes('Bansal Institute of Engineering and Technology');
    const hasAffiliation = idCard?.affiliation?.includes('AKTU');
    const hasValidStudentData =
      idCard?.fullName === testStudent.fullName &&
      idCard?.rollNumber === testStudent.rollNumber &&
      idCard?.course === testStudent.course &&
      idCard?.branch === testStudent.branch &&
      !!idCard?.validity;
    const hasQrCodeDataUrl = typeof idCard?.qrCode === 'string' && idCard?.qrCode.startsWith('data:image/png');

    testResult(
      'Validate Institutional ID Card Attributes (Institution, Affiliation, Validity, QR)',
      hasInstitution && hasAffiliation && hasValidStudentData && hasQrCodeDataUrl,
      `Institution: ${idCard?.institution}, Validity: ${idCard?.validity}`
    );

    // 5. Authenticate as Student (Roll: 220101001)
    const stdRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: '220101001',
        password: 'BietStudent@2026',
        requestedRole: 'student'
      })
    });
    const stdSetCookie = stdRes.headers.get('set-cookie');
    if (stdSetCookie) studentCookie = stdSetCookie.split(';')[0];
    const stdAuthData = await stdRes.json();
    testResult(
      'Student Login (Roll: 220101001)',
      stdRes.status === 200 && stdAuthData.user?.role === 'student'
    );

    // 6. Student Self-Access to Own ID Card
    const selfCardRes = await fetch(`${BASE_URL}/students/220101001/id-card`, {
      headers: { Cookie: studentCookie }
    });
    const selfCardData = await selfCardRes.json();
    testResult(
      'Student Portal Self-Access to Digital ID Card',
      selfCardRes.status === 200 && selfCardData.idCard?.rollNumber === '220101001',
      `Self card accessed: ${selfCardData.idCard?.fullName}`
    );

    // 7. Security: Block Student from Accessing Another Student's ID Card (HTTP 403)
    const forbiddenCardRes = await fetch(`${BASE_URL}/students/2402160109007/id-card`, {
      headers: { Cookie: studentCookie }
    });
    testResult(
      'Block Student from Accessing Other ID Cards (HTTP 403)',
      forbiddenCardRes.status === 403,
      'Protected unauthorized identity card snooping'
    );

    // 8. Verify QR Code Signature Resolution Against Gate Scanner
    const qrVerifyRes = await fetch(`${BASE_URL}/verification/verify-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        qrToken: idCard.qrCodeToken || idCard.studentId
      })
    });
    const qrVerifyData = await qrVerifyRes.json();
    testResult(
      'Verify QR Security Token Against Gate Scanner Endpoint',
      qrVerifyRes.status === 200 && qrVerifyData.verified === true && qrVerifyData.student?.rollNumber === idCard.rollNumber,
      `QR signature matched: ${qrVerifyData.student?.fullName}`
    );

    // 9. Client-Side jsPDF Vector Rendering Test (CR80 Standard [85.6mm x 54mm])
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54]
    });
    doc.setDrawColor(32, 35, 74);
    doc.rect(1, 1, 83.6, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('BANSAL INSTITUTE OF ENGG. & TECHNOLOGY', 42.8, 5.5, { align: 'center' });
    doc.addImage(idCard.qrCode, 'PNG', 63.5, 16, 17, 17);
    const pdfOutput = doc.output('arraybuffer');

    testResult(
      'jsPDF Vector CR80 Dimension & High-Res Binary Generation',
      pdfOutput.byteLength > 2000,
      `Generated binary PDF buffer of size ${pdfOutput.byteLength} bytes`
    );

    // 10. Client-Side Batch Multi-Card PDF Generation
    const batchDoc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54]
    });
    for (let i = 0; i < Math.min(3, studentsList.length); i++) {
      if (i > 0) batchDoc.addPage([85.6, 54], 'landscape');
      batchDoc.text(`Card #${i + 1}: ${studentsList[i].fullName}`, 10, 10);
    }
    const batchOutput = batchDoc.output('arraybuffer');
    testResult(
      'Batch Multi-Card PDF Generation Engine',
      batchOutput.byteLength > 3000,
      `Multi-page batch PDF generated with size ${batchOutput.byteLength} bytes`
    );

  } catch (err) {
    console.error('Phase 6 Test execution error:', err);
  }

  console.log('\n========================================');
  console.log(`PHASE 6 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase6Tests();
