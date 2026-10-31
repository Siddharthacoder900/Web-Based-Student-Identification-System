import express from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import attendanceRepository from '../data/attendanceRepository.js';
import studentRepository from '../data/studentRepository.js';

const router = express.Router();

router.use(authenticate);

function calculateEuclideanDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Get All Attendance Sessions
router.get('/sessions', authorize(['admin', 'teacher', 'staff', 'student']), async (req, res, next) => {
  try {
    const { course, branch, date, status } = req.query;
    const sessions = await attendanceRepository.getSessions({ course, branch, date, status });
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// Get Session By ID with Attendance Records
router.get('/sessions/:sessionId', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const session = await attendanceRepository.getSessionById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Attendance session not found.' });
    }
    const records = await attendanceRepository.getSessionRecords(req.params.sessionId);
    return res.json({ session, records });
  } catch (err) {
    next(err);
  }
});

// Create Attendance Session (Admin & Teachers)
router.post('/sessions', authorize(['admin', 'teacher']), async (req, res, next) => {
  try {
    const sessionName = req.body.sessionName || req.body.title || 'Institutional Lecture';
    const course = req.body.course || 'B.Tech';
    const branch = req.body.branch || 'CSE';
    const academicYear = req.body.academicYear || req.body.year || '1st Year';
    const currentSemester = req.body.currentSemester || req.body.semester || '1st Semester';
    const subject = req.body.subject || sessionName;
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const startTime = req.body.startTime || '09:00';
    const endTime = req.body.endTime || '10:30';
    const lateGraceMinutes = req.body.lateGraceMinutes || 15;

    const created = await attendanceRepository.createSession({
      sessionName,
      title: sessionName,
      course,
      branch,
      academicYear,
      currentSemester,
      subject,
      date,
      startTime,
      endTime,
      lateGraceMinutes,
      createdBy: req.user?.fullName || req.body.teacherName || 'Faculty Instructor',
      teacherName: req.body.teacherName || req.user?.fullName || 'Faculty Instructor',
      teacherId: req.body.teacherId || req.user?.identifier || 'T-1001'
    });

    return res.status(201).json({
      message: 'Attendance session created successfully.',
      session: created
    });
  } catch (err) {
    next(err);
  }
});

// Close or Update Session Status
router.patch('/sessions/:sessionId/status', authorize(['admin', 'teacher']), async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await attendanceRepository.updateSessionStatus(req.params.sessionId, status || 'Closed');
    if (!updated) {
      return res.status(404).json({ message: 'Attendance session not found.' });
    }
    return res.json({ message: `Session status updated to ${updated.status}.`, session: updated });
  } catch (err) {
    next(err);
  }
});

router.patch('/sessions/:sessionId/close', authorize(['admin', 'teacher']), async (req, res, next) => {
  try {
    const updated = await attendanceRepository.updateSessionStatus(req.params.sessionId, 'Closed');
    if (!updated) {
      return res.status(404).json({ message: 'Attendance session not found.' });
    }
    return res.json({ message: 'Attendance session closed successfully.', session: updated });
  } catch (err) {
    next(err);
  }
});

// Check-In (Face, QR, or Manual)
const handleCheckIn = async (req, res) => {
  try {
    const {
      sessionId,
      studentId,
      rollNumber,
      identifier,
      faceTemplate,
      status: explicitStatus,
      override = false
    } = req.body;

    let method = req.body.method || req.body.verificationMethod || (faceTemplate ? 'Face' : 'QR');
    let confidenceScore = req.body.confidenceScore || 98.4;
    let student = null;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required for attendance.' });
    }

    // Live Face Check-in
    if (faceTemplate && Array.isArray(faceTemplate) && faceTemplate.length === 128) {
      const enrolled = await studentRepository.getEnrolledDescriptors();
      let bestStudent = null;
      let minDistance = Infinity;

      for (const s of enrolled) {
        const dist = calculateEuclideanDistance(faceTemplate, s.biometric.faceTemplate);
        if (dist < minDistance) {
          minDistance = dist;
          bestStudent = s;
        }
      }

      const threshold = Number(req.body.threshold || 0.52);
      if (!bestStudent || minDistance > threshold) {
        return res.status(404).json({
          message: 'Face not recognized among enrolled students. Please try QR or manual check-in.'
        });
      }

      student = bestStudent;
      method = 'Face';
      confidenceScore = Math.round(Math.max(80, (1 - minDistance / threshold * 0.18) * 100) * 10) / 10;
    } else {
      const query = (studentId || rollNumber || identifier || '').trim();
      if (!query) {
        return res.status(400).json({ message: 'Student roll number, ID, or face template is required.' });
      }
      student = await studentRepository.findByIdOrRoll(query);
      if (!student) {
        return res.status(404).json({ message: `Student record "${query}" not found.` });
      }
    }

    // If student is checking in themselves, verify it is their own account
    if (req.user?.role === 'student' && req.user?.identifier && req.user.identifier.toUpperCase() !== student.rollNumber.toUpperCase()) {
      return res.status(403).json({ message: 'You can only check-in for your own account.' });
    }

    const record = await attendanceRepository.markAttendance({
      sessionId,
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      studentName: student.fullName,
      course: student.course,
      branch: student.branch,
      method,
      status: explicitStatus,
      override,
      confidenceScore,
      markedBy: req.user?.fullName || 'Attendance Terminal',
      auditNote: `${method} verification check-in recorded.`
    });

    return res.status(201).json({
      message: `Attendance marked ${record.status} for ${student.fullName}.`,
      record,
      student: {
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        photoUrl: student.photoUrl,
        course: student.course,
        branch: student.branch
      }
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Unable to record attendance.' });
  }
};

router.post('/check-in', authorize(['admin', 'teacher', 'staff', 'student']), handleCheckIn);
router.post('/mark', authorize(['admin', 'teacher', 'staff', 'student']), handleCheckIn);

// Manual Attendance Override / Toggle
router.post('/manual-mark', authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { sessionId, studentId, rollNumber, status = 'Present' } = req.body;
    const student = await studentRepository.findByIdOrRoll(studentId || rollNumber);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const record = await attendanceRepository.markAttendance({
      sessionId,
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      studentName: student.fullName,
      course: student.course,
      branch: student.branch,
      method: 'Manual',
      status,
      override: true,
      markedBy: req.user?.fullName || 'Faculty Instructor',
      auditNote: `Manual status override to ${status}`
    });

    return res.json({ message: `Student marked ${status}.`, record });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Failed to update attendance.' });
  }
});

// Student Attendance History & Percentage
router.get('/student/:studentId', authorize(['admin', 'teacher', 'staff', 'student']), async (req, res, next) => {
  try {
    const student = await studentRepository.findByIdOrRoll(req.params.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    if (req.user?.role === 'student' && req.user?.identifier && req.user.identifier.toUpperCase() !== student.rollNumber.toUpperCase()) {
      return res.status(403).json({ message: 'Access denied to other student attendance records.' });
    }

    const report = await attendanceRepository.getStudentAttendance(student.studentId, student.course, student.branch);
    return res.json({ student: { fullName: student.fullName, rollNumber: student.rollNumber }, ...report });
  } catch (err) {
    next(err);
  }
});

// Attendance Shortage Alerts (< 75%)
router.get('/shortage-alerts', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const { threshold = 75, course, branch } = req.query;
    const alerts = await attendanceRepository.getShortageAlerts({
      threshold: Number(threshold),
      course,
      branch
    });
    return res.json({
      statutoryRule: 'AKTU Ordinance Rule 2.1 (75% Minimum Mandatory Attendance)',
      threshold: Number(threshold),
      alerts,
      count: alerts.length
    });
  } catch (err) {
    next(err);
  }
});

// Overall Campus Attendance Stats
router.get('/stats', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const stats = await attendanceRepository.getStats();
    return res.json({ stats });
  } catch (err) {
    next(err);
  }
});

export default router;

