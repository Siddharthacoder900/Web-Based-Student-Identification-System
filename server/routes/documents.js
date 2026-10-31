import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import documentRepository from '../data/documentRepository.js';
import studentRepository from '../data/studentRepository.js';

const router = express.Router();

router.use(authenticate);

// List all archived documents with filters
router.get('/', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const { documentType, status, search, studentId } = req.query;
    const documents = await documentRepository.findAll({
      documentType,
      verificationStatus: status,
      studentId,
      search
    });

    return res.json({
      total: documents.length,
      documents
    });
  } catch (err) {
    next(err);
  }
});

// Query documents for a specific student
router.get('/student/:rollOrId', authorize(['admin', 'teacher', 'staff', 'student']), async (req, res, next) => {
  try {
    const { rollOrId } = req.params;
    const student = await studentRepository.findByIdOrRoll(rollOrId);
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    // Role safety: Students may only view their own documents
    if (req.user.role === 'student') {
      const studentIdentifier = req.user.identifier || req.user.studentId;
      if (
        studentIdentifier !== student.rollNumber &&
        studentIdentifier !== student.studentId &&
        req.user.email !== student.email
      ) {
        return res.status(403).json({ message: 'Unauthorized access to student documents.' });
      }
    }

    const docs = await documentRepository.findByStudent(student.studentId);
    return res.json({
      student: {
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        fullName: student.fullName
      },
      documents: docs
    });
  } catch (err) {
    next(err);
  }
});

// Upload / Archive a new student document
router.post('/', authorize(['admin', 'student']), async (req, res, next) => {
  try {
    const {
      rollNumber,
      studentId,
      title,
      documentType,
      fileName,
      filePath,
      fileDataUrl,
      fileSize,
      mimeType,
      notes
    } = req.body;

    if (!title || !documentType) {
      return res.status(400).json({ message: 'Title and Document Type are required.' });
    }

    // Resolve student record
    const targetQuery = rollNumber || studentId || req.user.identifier;
    const student = await studentRepository.findByIdOrRoll(targetQuery);
    if (!student) {
      return res.status(404).json({ message: 'Linked student record not found.' });
    }

    // Student self-upload restrictions
    if (req.user.role === 'student') {
      const studentIdentifier = req.user.identifier || req.user.studentId;
      if (
        studentIdentifier !== student.rollNumber &&
        studentIdentifier !== student.studentId &&
        req.user.email !== student.email
      ) {
        return res.status(403).json({ message: 'You can only upload documents to your own record.' });
      }
    }

    const doc = await documentRepository.create({
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      title: title.trim(),
      documentType,
      fileName: fileName || `${student.rollNumber}_${documentType.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      filePath: filePath || fileDataUrl || `/uploads/documents/${student.rollNumber}_${Date.now()}.pdf`,
      fileSize: fileSize || 102400,
      mimeType: mimeType || 'application/pdf',
      uploadedBy: req.user.fullName || req.user.email || 'Administration',
      verificationStatus: req.user.role === 'admin' ? 'Verified' : 'Pending',
      notes: notes || ''
    });

    return res.status(201).json({
      message: `Document "${doc.title}" archived successfully.`,
      document: doc
    });
  } catch (err) {
    next(err);
  }
});

// Update document verification status
router.patch('/:documentId/status', authorize(['admin']), async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { verificationStatus, notes } = req.body;

    if (!['Verified', 'Pending', 'Rejected'].includes(verificationStatus)) {
      return res.status(400).json({ message: 'Invalid status. Must be Verified, Pending, or Rejected.' });
    }

    const updated = await documentRepository.updateStatus(documentId, {
      verificationStatus,
      notes
    });

    if (!updated) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    return res.json({
      message: `Document verification status updated to ${verificationStatus}.`,
      document: updated
    });
  } catch (err) {
    next(err);
  }
});

// Delete / Archive out document
router.delete('/:documentId', authorize(['admin']), async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const existing = await documentRepository.findById(documentId);
    if (!existing) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    await documentRepository.delete(documentId);
    return res.json({
      message: `Document "${existing.title}" deleted from repository.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
