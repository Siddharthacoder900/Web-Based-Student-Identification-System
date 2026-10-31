import express from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import studentRepository from '../data/studentRepository.js';
import verificationRepository from '../data/verificationRepository.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin', 'student', 'teacher', 'staff']));

// Euclidean distance calculation between two 128-D descriptor vectors
function calculateEuclideanDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Convert distance to percentage confidence (higher when distance is small relative to threshold)
function distanceToConfidence(distance, threshold = 0.52) {
  if (distance <= 0) return 99.9;
  if (distance <= threshold) {
    // Distance 0..threshold maps to 99%..82%
    const ratio = distance / threshold;
    const score = 99 - ratio * 17;
    return Math.round(score * 10) / 10;
  }
  // Distance > threshold maps below 75%
  const overRatio = Math.min(1, (distance - threshold) / (1.0 - threshold));
  return Math.max(5, Math.round((75 - overRatio * 70) * 10) / 10);
}

// QR / Code / ID Verification Endpoint (Supports both /scan and /verify-qr)
const handleQrScan = async (req, res, next) => {
  try {
    const query = (req.body.query || req.body.qrToken || req.body.rollNumber || '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Scan query or code token is required.' });
    }

    const student = await studentRepository.findByIdOrRoll(query);

    if (!student) {
      await verificationRepository.log({
        method: 'QR',
        result: 'Not Verified',
        notes: `Unrecognized query or token: "${query.slice(0, 32)}"`,
        verifierEmail: req.user?.email || 'admin@biet.ac.in',
        verifierName: req.user?.fullName || 'Administrator'
      });

      return res.status(404).json({
        verified: false,
        status: 'Not Verified',
        message: 'No matching student record found.',
        timestampKolkata: verificationRepository.getKolkataTimestamp()
      });
    }

    await verificationRepository.log({
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      studentName: student.fullName,
      course: student.course,
      branch: student.branch,
      method: 'QR',
      result: 'Verified',
      confidence: 100,
      notes: `QR scan verified for ${student.studentId}`,
      verifierEmail: req.user?.email || 'admin@biet.ac.in',
      verifierName: req.user?.fullName || 'Administrator'
    });

    return res.json({
      verified: true,
      status: 'Verified',
      message: 'Student identity verified successfully via QR code.',
      student: {
        id: student.studentId,
        studentId: student.studentId,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        registrationNumber: student.registrationNumber,
        course: student.course,
        branch: student.branch,
        academicYear: student.academicYear,
        currentSemester: student.currentSemester,
        photoUrl: student.photoUrl,
        verificationStatus: student.verificationStatus,
        studentStatus: student.studentStatus,
        status: student.studentStatus
      },
      timestampKolkata: verificationRepository.getKolkataTimestamp()
    });
  } catch (err) {
    next(err);
  }
};

router.post('/scan', handleQrScan);
router.post('/verify-qr', handleQrScan);

// Face Verification & Identification Endpoint
router.post('/face-verify', async (req, res, next) => {
  try {
    const { faceTemplate, targetRollNumber, threshold = 0.52 } = req.body;

    if (!faceTemplate || !Array.isArray(faceTemplate) || faceTemplate.length !== 128) {
      return res.status(400).json({
        message: 'Invalid live face embedding. Expected 128 numbers.'
      });
    }

    const enrolledStudents = await studentRepository.getEnrolledDescriptors();

    if (!enrolledStudents.length) {
      await verificationRepository.log({
        method: targetRollNumber ? 'Face-1:1' : 'Face-1:N',
        result: 'Not Verified',
        notes: 'No students have enrolled face templates yet.',
        verifierEmail: req.user?.email || 'admin@biet.ac.in',
        verifierName: req.user?.fullName || 'Administrator'
      });

      return res.status(404).json({
        status: 'Not Verified',
        match: false,
        message: 'No enrolled student face templates in the system. Please enroll students first.',
        timestampKolkata: verificationRepository.getKolkataTimestamp()
      });
    }

    // Method 1:1 if target specified
    if (targetRollNumber) {
      const target = enrolledStudents.find(
        (s) => s.rollNumber.toUpperCase() === targetRollNumber.trim().toUpperCase() ||
               s.studentId === targetRollNumber.trim()
      );

      if (!target) {
        return res.status(404).json({
          status: 'Not Verified',
          match: false,
          message: `Target student "${targetRollNumber}" is not enrolled for face recognition.`,
          timestampKolkata: verificationRepository.getKolkataTimestamp()
        });
      }

      const distance = calculateEuclideanDistance(faceTemplate, target.biometric.faceTemplate);
      const isMatch = distance <= Number(threshold);
      const confidence = distanceToConfidence(distance, Number(threshold));

      await verificationRepository.log({
        studentId: target.studentId,
        rollNumber: target.rollNumber,
        studentName: target.fullName,
        course: target.course,
        branch: target.branch,
        method: 'Face-1:1',
        result: isMatch ? 'Verified' : 'Not Verified',
        confidence: isMatch ? confidence : 0,
        distance: Math.round(distance * 1000) / 1000,
        notes: isMatch ? `1:1 Face match confirmed (d=${distance.toFixed(3)})` : `1:1 Face mismatch (d=${distance.toFixed(3)})`,
        verifierEmail: req.user?.email || 'admin@biet.ac.in',
        verifierName: req.user?.fullName || 'Administrator'
      });

      if (!isMatch) {
        return res.status(200).json({
          status: 'Not Verified',
          match: false,
          message: 'Student Not Verified / Face Not Recognized',
          distance: Math.round(distance * 1000) / 1000,
          confidence,
          timestampKolkata: verificationRepository.getKolkataTimestamp()
        });
      }

      return res.json({
        status: 'Verified',
        match: true,
        message: 'Student identity verified successfully.',
        confidence,
        distance: Math.round(distance * 1000) / 1000,
        student: {
          id: target.studentId,
          studentId: target.studentId,
          fullName: target.fullName,
          rollNumber: target.rollNumber,
          registrationNumber: target.registrationNumber || '',
          course: target.course,
          branch: target.branch,
          academicYear: target.academicYear || '',
          currentSemester: target.currentSemester || '',
          photoUrl: target.photoUrl,
          status: target.studentStatus || 'Active',
          verificationStatus: target.verificationStatus || 'Verified'
        },
        timestampKolkata: verificationRepository.getKolkataTimestamp()
      });
    }

    // Method 1:N Identification
    let bestStudent = null;
    let minDistance = Infinity;

    for (const student of enrolledStudents) {
      const dist = calculateEuclideanDistance(faceTemplate, student.biometric.faceTemplate);
      if (dist < minDistance) {
        minDistance = dist;
        bestStudent = student;
      }
    }

    const isMatch = minDistance <= Number(threshold);
    const confidence = distanceToConfidence(minDistance, Number(threshold));

    if (!isMatch || !bestStudent) {
      await verificationRepository.log({
        method: 'Face-1:N',
        result: 'Not Verified',
        distance: Math.round(minDistance * 1000) / 1000,
        confidence,
        notes: `No enrolled face matched threshold (min d=${minDistance.toFixed(3)})`,
        verifierEmail: req.user?.email || 'admin@biet.ac.in',
        verifierName: req.user?.fullName || 'Administrator'
      });

      return res.status(200).json({
        status: 'Not Verified',
        match: false,
        message: 'Student Not Verified / Face Not Recognized',
        bestDistance: Math.round(minDistance * 1000) / 1000,
        confidence,
        timestampKolkata: verificationRepository.getKolkataTimestamp()
      });
    }

    await verificationRepository.log({
      studentId: bestStudent.studentId,
      rollNumber: bestStudent.rollNumber,
      studentName: bestStudent.fullName,
      course: bestStudent.course,
      branch: bestStudent.branch,
      method: 'Face-1:N',
      result: 'Verified',
      confidence,
      distance: Math.round(minDistance * 1000) / 1000,
      notes: `1:N Face match identified ${bestStudent.studentId} (d=${minDistance.toFixed(3)})`,
      verifierEmail: req.user?.email || 'admin@biet.ac.in',
      verifierName: req.user?.fullName || 'Administrator'
    });

    return res.json({
      status: 'Verified',
      match: true,
      message: 'Student identity verified successfully.',
      confidence,
      distance: Math.round(minDistance * 1000) / 1000,
      student: {
        id: bestStudent.studentId,
        studentId: bestStudent.studentId,
        fullName: bestStudent.fullName,
        rollNumber: bestStudent.rollNumber,
        registrationNumber: bestStudent.registrationNumber || '',
        course: bestStudent.course,
        branch: bestStudent.branch,
        academicYear: bestStudent.academicYear || '',
        currentSemester: bestStudent.currentSemester || '',
        photoUrl: bestStudent.photoUrl,
        status: bestStudent.studentStatus || 'Active',
        verificationStatus: bestStudent.verificationStatus || 'Verified'
      },
      timestampKolkata: verificationRepository.getKolkataTimestamp()
    });
  } catch (err) {
    next(err);
  }
});

// Verification History Audit Trail
router.get('/history', async (req, res, next) => {
  try {
    const { method, result, search, limit } = req.query;
    const history = await verificationRepository.getHistory({
      method,
      result,
      search,
      limit
    });
    return res.json({ history, logs: history });
  } catch (err) {
    next(err);
  }
});

router.get('/logs', async (req, res, next) => {
  try {
    const { method, result, search, limit } = req.query;
    const history = await verificationRepository.getHistory({
      method,
      result,
      search,
      limit
    });
    return res.json({ history, logs: history });
  } catch (err) {
    next(err);
  }
});

// Verification Analytics Stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await verificationRepository.getVerificationStats();
    return res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// Protected: Get Enrolled Descriptors for Client-side Real-time Matching
router.get('/enrolled-descriptors', async (req, res, next) => {
  try {
    const enrolled = await studentRepository.getEnrolledDescriptors();
    const sanitized = enrolled.map((s) => ({
      studentId: s.studentId,
      rollNumber: s.rollNumber,
      fullName: s.fullName,
      course: s.course,
      branch: s.branch,
      photoUrl: s.photoUrl,
      descriptor: s.biometric.faceTemplate
    }));

    return res.json({ enrolled: sanitized });
  } catch (err) {
    next(err);
  }
});

export default router;
