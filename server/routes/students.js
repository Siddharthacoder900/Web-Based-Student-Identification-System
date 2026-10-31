import express from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import uploadPhoto from '../middleware/upload.js';
import studentRepository from '../data/studentRepository.js';
import correctionRepository from '../data/correctionRepository.js';
import attendanceRepository from '../data/attendanceRepository.js';

const router = express.Router();

const studentInputSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  rollNumber: z.string().trim().min(2, 'Roll number must be at least 2 characters.'),
  registrationNumber: z.string().trim().optional().default(''),
  email: z.string().trim().email('Invalid email address format.'),
  mobileNumber: z.string().trim().min(8, 'Mobile number must be at least 8 digits.'),
  course: z.string().trim().min(2, 'Course is required.'),
  branch: z.string().trim().min(2, 'Branch is required.'),
  academicYear: z.enum(['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate']).default('1st Year'),
  currentSemester: z.string().trim().min(1, 'Current semester is required.'),
  admissionYear: z.union([z.number(), z.string().regex(/^\d{4}$/)]).transform(Number),
  dateOfBirth: z.string().optional().default(''),
  gender: z.enum(['Male', 'Female', 'Other', 'Not Specified']).default('Not Specified'),
  address: z.string().optional().default(''),
  studentStatus: z.enum(['Active', 'Inactive', 'Graduated']).default('Active'),
  verificationStatus: z.enum(['Verified', 'Pending']).default('Verified'),
  photoUrl: z.string().optional().default(''),
  biometric: z.object({
    consentGiven: z.boolean().default(false),
    faceTemplate: z.array(z.number()).length(128).optional()
  }).optional()
});

router.use(authenticate);

// Student Self-Profile Endpoint (For Student Portal)
router.get('/profile/me', async (req, res, next) => {
  try {
    const rollOrId = req.user.identifier || req.user.studentId || req.user.email;
    let student = null;

    if (rollOrId) {
      student = await studentRepository.findByIdOrRoll(rollOrId);
    }
    if (!student && req.user.email) {
      student = await studentRepository.findByEmail(req.user.email);
    }

    if (!student) {
      // Return user profile shell if student record is pending enrollment
      return res.json({
        user: req.user,
        student: null,
        message: 'No student record linked to this account yet.'
      });
    }

    const qrDataUrl = await QRCode.toDataURL(student.qrCodeToken || student.studentId);
    let attendanceHistory = [];
    let attendancePercentage = 88; // Default initial metric

    try {
      attendanceHistory = await attendanceRepository.getStudentHistory(student.studentId);
      if (attendanceHistory.length > 0) {
        const presentCount = attendanceHistory.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        attendancePercentage = Math.round((presentCount / attendanceHistory.length) * 100);
      }
    } catch {
      // Fallback
    }

    let pendingCorrections = [];
    try {
      pendingCorrections = await correctionRepository.findByStudent(student.studentId);
    } catch {
      // Non-critical
    }

    return res.json({
      user: req.user,
      student: {
        ...student,
        qrCode: qrDataUrl
      },
      attendance: {
        percentage: attendancePercentage,
        history: attendanceHistory.slice(0, 10)
      },
      pendingCorrections
    });
  } catch (err) {
    next(err);
  }
});

// Student Profile Correction Request
router.post('/profile/correction-request', async (req, res, next) => {
  try {
    const { fieldToUpdate, requestedValue, reason } = req.body;
    if (!fieldToUpdate || !requestedValue || !reason) {
      return res.status(400).json({ message: 'Field to update, requested value, and reason are required.' });
    }

    const rollOrId = req.user.identifier || req.user.studentId || req.user.email;
    const student = await studentRepository.findByIdOrRoll(rollOrId);
    if (!student) {
      return res.status(404).json({ message: 'Linked student record not found.' });
    }

    const correction = await correctionRepository.create({
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      studentName: student.fullName,
      fieldToUpdate,
      currentValue: String(student[fieldToUpdate] || ''),
      requestedValue: String(requestedValue),
      reason: String(reason)
    });

    return res.status(201).json({
      message: 'Correction request submitted successfully. Institutional administrators have been notified.',
      correction
    });
  } catch (err) {
    next(err);
  }
});

// Admin: Query All Profile Correction Requests
router.get('/corrections', authorize(['admin']), async (req, res, next) => {
  try {
    const { status } = req.query;
    const corrections = await correctionRepository.findAll({ status });
    return res.json({ corrections });
  } catch (err) {
    next(err);
  }
});

// Admin: Approve Correction Request & Auto-Update Student Profile
router.patch('/corrections/:requestId/approve', authorize(['admin']), async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reviewNotes = 'Approved by administrator' } = req.body;
    const all = await correctionRepository.findAll();
    const target = all.find((c) => c.requestId === requestId);
    if (!target) {
      return res.status(404).json({ message: 'Correction request not found.' });
    }
    if (target.status !== 'Pending') {
      return res.status(400).json({ message: `Correction request is already ${target.status}.` });
    }

    // Automatically update student record with the approved value
    const student = await studentRepository.findByIdOrRoll(target.studentId);
    let updatedStudent = null;
    if (student && target.fieldToUpdate) {
      updatedStudent = await studentRepository.update(student.studentId, {
        [target.fieldToUpdate]: target.requestedValue
      });
    }

    const updated = await correctionRepository.updateStatus(requestId, {
      status: 'Approved',
      reviewedBy: req.user?.fullName || 'Administrator',
      reviewNotes
    });

    return res.json({
      message: `Correction request approved. Student record "${target.studentName}" updated.`,
      correction: updated,
      student: updatedStudent
    });
  } catch (err) {
    next(err);
  }
});

// Admin: Reject Correction Request
router.patch('/corrections/:requestId/reject', authorize(['admin']), async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reviewNotes = 'Documentation insufficient or verification rejected.' } = req.body;
    const all = await correctionRepository.findAll();
    const target = all.find((c) => c.requestId === requestId);
    if (!target) {
      return res.status(404).json({ message: 'Correction request not found.' });
    }

    const updated = await correctionRepository.updateStatus(requestId, {
      status: 'Rejected',
      reviewedBy: req.user?.fullName || 'Administrator',
      reviewNotes
    });

    return res.json({
      message: 'Correction request rejected.',
      correction: updated
    });
  } catch (err) {
    next(err);
  }
});

// Photo Upload Endpoint (Admin only)
router.post('/upload-photo', authorize(['admin']), (req, res) => {
  uploadPhoto.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Error uploading photograph.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No photograph file was provided.' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({
      message: 'Photograph uploaded successfully.',
      photoUrl,
      filename: req.file.filename
    });
  });
});

// Dashboard aggregates (Admin, Teacher, Staff)
router.get('/stats', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const stats = await studentRepository.getStats();
    return res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// List / Search / Filter Students (Admin, Teacher, Staff)
router.get('/', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const { q, search, course, branch, academicYear, status, verificationStatus, faceEnrolled } = req.query;
    const students = await studentRepository.find({
      search: q || search || '',
      course,
      branch,
      academicYear,
      status,
      verificationStatus,
      faceEnrolled
    });

    return res.json({ students });
  } catch (err) {
    next(err);
  }
});

// Get Single Student by ID or Roll Number
router.get('/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // If student role, ensure they are accessing only their own profile
    if (req.user.role === 'student') {
      const isSelf =
        (req.user.identifier && req.user.identifier.toUpperCase() === studentId.toUpperCase()) ||
        req.user.studentId === studentId;
      if (!isSelf) {
        return res.status(403).json({ message: 'Access denied. You can only view your own student record.' });
      }
    }

    const student = await studentRepository.findByIdOrRoll(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    // Generate QR Data URL if needed
    const qrDataUrl = await QRCode.toDataURL(student.qrCodeToken || student.studentId);

    return res.json({
      student: {
        ...student,
        qrCode: qrDataUrl
      }
    });
  } catch (err) {
    next(err);
  }
});

// Dedicated Official ID Card Payload Endpoint
router.get('/:studentId/id-card', async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (req.user.role === 'student') {
      const isSelf =
        (req.user.identifier && req.user.identifier.toUpperCase() === studentId.toUpperCase()) ||
        req.user.studentId === studentId;
      if (!isSelf) {
        return res.status(403).json({ message: 'Access denied. You can only view your own ID card.' });
      }
    }

    const student = await studentRepository.findByIdOrRoll(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const qrDataUrl = await QRCode.toDataURL(student.qrCodeToken || student.studentId, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 250
    });

    const admYear = Number(student.admissionYear || 2024);
    const gradYear = admYear + (student.course === 'MBA' || student.course === 'M.Tech' ? 2 : student.course === 'MCA' || student.course === 'Polytechnic' ? 3 : 4);

    return res.json({
      idCard: {
        institution: 'Bansal Institute of Engineering and Technology, Lucknow',
        shortName: 'BIET LUCKNOW',
        affiliation: 'Affiliated to Dr. A.P.J. Abdul Kalam Technical University (AKTU Code: 422)',
        campusAddress: 'NH-24, Sitapur Road, Lucknow, Uttar Pradesh - 226201',
        studentId: student.studentId,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        registrationNumber: student.registrationNumber || '',
        course: student.course,
        branch: student.branch,
        academicYear: student.academicYear,
        currentSemester: student.currentSemester,
        admissionYear: student.admissionYear,
        photoUrl: student.photoUrl,
        validity: `${admYear} – ${gradYear}`,
        studentStatus: student.studentStatus || 'Active',
        verificationStatus: student.verificationStatus || 'Verified',
        qrCode: qrDataUrl,
        qrCodeToken: student.qrCodeToken,
        cardIssuedAt: student.createdAt || new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

// Register New Student
router.post('/', authorize(['admin']), async (req, res, next) => {
  try {
    const parsed = studentInputSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message);
      return res.status(400).json({
        message: issues[0] || 'Invalid student registration data.',
        issues
      });
    }

    const payload = parsed.data;

    // Check duplicate roll number
    const existing = await studentRepository.isRollNumberTaken(payload.rollNumber);
    if (existing) {
      return res.status(409).json({
        message: `Your student account is already registered. Please log in using your existing credentials. (Roll number "${payload.rollNumber.toUpperCase()}" belongs to ${existing.fullName}).`
      });
    }

    // Check duplicate email
    const existingEmail = await studentRepository.findByEmail(payload.email);
    if (existingEmail) {
      return res.status(409).json({
        message: `Your student account is already registered. Please log in using your existing credentials. (Email "${payload.email}" is already registered).`
      });
    }

    const student = await studentRepository.create(payload);
    const qrDataUrl = await QRCode.toDataURL(student.qrCodeToken || student.studentId);

    return res.status(201).json({
      message: 'Student registered successfully.',
      student: {
        ...student,
        qrCode: qrDataUrl
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update Student Record
router.put('/:studentId', authorize(['admin']), async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const existing = await studentRepository.findByIdOrRoll(studentId);
    if (!existing) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const parsed = studentInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message);
      return res.status(400).json({
        message: issues[0] || 'Invalid student update payload.',
        issues
      });
    }

    const updates = parsed.data;

    // If updating rollNumber, check uniqueness against OTHER students
    if (updates.rollNumber && updates.rollNumber.toUpperCase() !== existing.rollNumber.toUpperCase()) {
      const duplicate = await studentRepository.isRollNumberTaken(updates.rollNumber, existing.studentId);
      if (duplicate) {
        return res.status(409).json({
          message: `Roll number "${updates.rollNumber.toUpperCase()}" is already assigned to another student.`
        });
      }
    }

    const updated = await studentRepository.update(existing.studentId, updates);
    const qrDataUrl = await QRCode.toDataURL(updated.qrCodeToken || updated.studentId);

    return res.json({
      message: 'Student record updated successfully.',
      student: {
        ...updated,
        qrCode: qrDataUrl
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update Student Status (Active / Inactive / Graduated)
router.patch('/:studentId/status', authorize(['admin']), async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { status, verificationStatus } = req.body;

    const existing = await studentRepository.findByIdOrRoll(studentId);
    if (!existing) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const updated = await studentRepository.updateStatus(existing.studentId, {
      status,
      verificationStatus
    });

    return res.json({
      message: `Student status updated to ${updated.studentStatus}.`,
      student: updated
    });
  } catch (err) {
    next(err);
  }
});

// Delete / Archive Student Record
router.delete('/:studentId', authorize(['admin']), async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const existing = await studentRepository.findByIdOrRoll(studentId);
    if (!existing) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    await studentRepository.delete(existing.studentId);
    return res.json({
      message: `Student record "${existing.fullName}" (${existing.rollNumber}) deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

// Biometric Face Enrollment
router.post('/:studentId/biometric/enroll', authorize(['admin']), async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { faceTemplate, consentGiven } = req.body;

    const existing = await studentRepository.findByIdOrRoll(studentId);
    if (!existing) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    if (!consentGiven) {
      return res.status(400).json({
        message: 'Student biometric consent is required before face enrollment.'
      });
    }

    if (!faceTemplate || !Array.isArray(faceTemplate) || faceTemplate.length !== 128) {
      return res.status(400).json({
        message: 'Invalid face template. Expected a 128-dimensional embedding vector.'
      });
    }

    await studentRepository.enrollBiometric(existing.studentId, { faceTemplate, consentGiven });

    return res.json({
      message: `Biometric face template enrolled successfully for ${existing.fullName}.`,
      studentId: existing.studentId,
      enrolled: true
    });
  } catch (err) {
    next(err);
  }
});

// Delete Biometric Data
router.delete('/:studentId/biometric', authorize(['admin']), async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const existing = await studentRepository.findByIdOrRoll(studentId);
    if (!existing) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    await studentRepository.removeBiometric(existing.studentId);

    return res.json({
      message: `Biometric face data for ${existing.fullName} has been permanently deleted.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
