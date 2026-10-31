import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import studentRepository from '../data/studentRepository.js';
import verificationRepository from '../data/verificationRepository.js';
import attendanceRepository from '../data/attendanceRepository.js';
import documentRepository from '../data/documentRepository.js';

const router = express.Router();

router.use(authenticate);

// Institutional Intelligence & High-Level Analytics
router.get('/summary', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const [allStudents, allVerifications, shortageAlerts, allDocs, attStats] = await Promise.all([
      studentRepository.find(),
      verificationRepository.findAll(),
      attendanceRepository.getShortageAlerts({ threshold: 75 }),
      documentRepository.findAll(),
      attendanceRepository.getStats()
    ]);

    // 1. Student Breakdown
    const totalStudents = allStudents.length;
    const activeStudents = allStudents.filter((s) => s.studentStatus === 'Active').length;
    const faceEnrolled = allStudents.filter((s) => s.biometric?.enrolled).length;
    const verifiedStudents = allStudents.filter((s) => s.verificationStatus === 'Verified').length;

    // Branch Distribution
    const branchMap = {};
    const courseMap = {};
    const yearMap = {};

    allStudents.forEach((s) => {
      const b = s.branch || 'Unknown';
      branchMap[b] = (branchMap[b] || 0) + 1;

      const c = s.course || 'B.Tech';
      courseMap[c] = (courseMap[c] || 0) + 1;

      const y = s.academicYear || '1st Year';
      yearMap[y] = (yearMap[y] || 0) + 1;
    });

    const branchDistribution = Object.keys(branchMap).map((k) => ({
      name: k.length > 15 ? k.split(' ').map(w => w[0]).join('') : k,
      fullName: k,
      students: branchMap[k]
    }));

    const courseDistribution = Object.keys(courseMap).map((k) => ({
      name: k,
      students: courseMap[k]
    }));

    const yearDistribution = Object.keys(yearMap).map((k) => ({
      name: k,
      students: yearMap[k]
    }));

    // 2. Verification Metrics
    const totalVerifications = allVerifications.length;
    const successfulVerifications = allVerifications.filter((v) => v.result === 'Verified' || v.status === 'Verified').length;
    const faceVerifications = allVerifications.filter((v) => (v.method || '').startsWith('Face')).length;
    const qrVerifications = allVerifications.filter((v) => v.method === 'QR').length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayVerifications = allVerifications.filter((v) => (v.timestamp ? new Date(v.timestamp).toISOString().slice(0, 10) === todayStr : false)).length;

    // 3. Attendance Metrics
    const shortageCount = shortageAlerts.filter((a) => a.isShortage).length;

    // 4. Document Metrics
    const verifiedDocs = allDocs.filter((d) => d.verificationStatus === 'Verified').length;
    const pendingDocs = allDocs.filter((d) => d.verificationStatus === 'Pending').length;
    const rejectedDocs = allDocs.filter((d) => d.verificationStatus === 'Rejected').length;

    return res.json({
      institution: {
        name: 'Bansal Institute of Engineering and Technology',
        code: 'BIET-422',
        location: 'Lucknow, Uttar Pradesh',
        affiliatedTo: 'Dr. A.P.J. Abdul Kalam Technical University'
      },
      students: {
        total: totalStudents,
        active: activeStudents,
        verified: verifiedStudents,
        faceEnrolled,
        biometricCoveragePercentage: totalStudents > 0 ? Math.round((faceEnrolled / totalStudents) * 100) : 0,
        branchDistribution,
        courseDistribution,
        yearDistribution
      },
      verifications: {
        total: totalVerifications,
        successful: successfulVerifications,
        face: faceVerifications,
        qr: qrVerifications,
        today: todayVerifications,
        securityClearanceRate: totalVerifications > 0 ? ((successfulVerifications / totalVerifications) * 100).toFixed(1) : '100.0'
      },
      attendance: {
        totalSessions: attStats.totalSessions,
        totalRecords: attStats.totalRecords,
        averageAttendancePercentage: 88,
        shortageCount
      },
      documents: {
        total: allDocs.length,
        verified: verifiedDocs,
        pending: pendingDocs,
        rejected: rejectedDocs
      }
    });
  } catch (err) {
    next(err);
  }
});

// Full Student Roster Export Data
router.get('/export/roster', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const students = await studentRepository.find();
    const rows = students.map((s) => ({
      studentId: s.studentId,
      rollNumber: s.rollNumber,
      registrationNumber: s.registrationNumber || 'N/A',
      fullName: s.fullName,
      course: s.course,
      branch: s.branch,
      academicYear: s.academicYear,
      currentSemester: s.currentSemester || 'N/A',
      admissionYear: s.admissionYear || 2024,
      email: s.email,
      mobileNumber: s.mobileNumber || 'N/A',
      status: s.studentStatus,
      verificationStatus: s.verificationStatus,
      biometricEnrolled: s.biometric?.enrolled ? 'Yes' : 'No'
    }));

    return res.json({
      generatedAt: new Date().toISOString(),
      count: rows.length,
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

// Comprehensive Attendance Export Data
router.get('/export/attendance', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const students = await studentRepository.find();
    const results = [];

    for (const student of students) {
      const att = await attendanceRepository.getStudentAttendance(student.studentId, student.course, student.branch);
      results.push({
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        course: student.course,
        branch: student.branch,
        academicYear: student.academicYear,
        totalSessions: att.totalSessions,
        attendedSessions: att.attendedCount,
        percentage: att.percentage,
        debarmentRisk: att.percentage < 75 ? 'At Risk (<75%)' : 'Compliant'
      });
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      count: results.length,
      data: results
    });
  } catch (err) {
    next(err);
  }
});

export default router;
