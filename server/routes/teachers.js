import express from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import teacherRepository from '../data/teacherRepository.js';

const router = express.Router();

const teacherSchema = z.object({
  employeeId: z.string().trim().optional().transform((v) => v || `T-${Math.floor(1000 + Math.random() * 9000)}`),
  fullName: z.string().trim().min(2, 'Full name is required.'),
  email: z.string().trim().email('Invalid email address.'),
  mobileNumber: z.string().trim().min(8, 'Mobile number must be at least 8 digits.'),
  department: z.string().trim().min(2, 'Department is required.'),
  designation: z.string().trim().optional().default('Assistant Professor'),
  joiningDate: z.string().optional(),
  accountStatus: z.enum(['Active', 'Inactive']).default('Active'),
  photoUrl: z.string().optional().default(''),
  password: z.string().min(8).optional()
});

router.use(authenticate);

// Faculty Self-Profile Endpoint
router.get('/profile/me', async (req, res, next) => {
  try {
    const empId = req.user.identifier || req.user.teacherId || req.user.email;
    let teacher = await teacherRepository.findByEmployeeIdOrEmail(empId);
    if (!teacher) {
      teacher = {
        fullName: req.user.fullName || 'Faculty Member',
        email: req.user.email,
        employeeId: req.user.identifier || 'T-1001',
        department: 'Computer Science and Engineering',
        designation: 'Assistant Professor'
      };
    }
    return res.json({ teacher });
  } catch (err) {
    next(err);
  }
});

// List / Filter Teachers (Admin and Teachers can view)
router.get('/', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const { search, department, status } = req.query;
    const teachers = await teacherRepository.find({ search, department, status });
    return res.json({ teachers });
  } catch (err) {
    next(err);
  }
});

// Get Single Teacher
router.get('/:employeeId', authorize(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const teacher = await teacherRepository.findByEmployeeIdOrEmail(req.params.employeeId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher record not found.' });
    }
    return res.json({ teacher });
  } catch (err) {
    next(err);
  }
});

// Create Teacher (Admin only)
router.post('/', authorize(['admin']), async (req, res, next) => {
  try {
    const parsed = teacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || 'Invalid teacher data.'
      });
    }

    const payload = parsed.data;
    const existing = await teacherRepository.isEmployeeIdTaken(payload.employeeId);
    if (existing) {
      return res.status(409).json({
        message: `Employee ID "${payload.employeeId.toUpperCase()}" is already assigned to ${existing.fullName}.`
      });
    }

    const teacher = await teacherRepository.create(payload);
    return res.status(201).json({
      message: 'Teacher profile created successfully.',
      teacher
    });
  } catch (err) {
    next(err);
  }
});

// Update Teacher (Admin only)
router.put('/:employeeId', authorize(['admin']), async (req, res, next) => {
  try {
    const teacher = await teacherRepository.findByEmployeeIdOrEmail(req.params.employeeId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher record not found.' });
    }

    const updated = await teacherRepository.update(teacher.employeeId, req.body);
    return res.json({
      message: 'Teacher record updated successfully.',
      teacher: updated
    });
  } catch (err) {
    next(err);
  }
});

// Toggle Teacher Status (Admin only)
router.patch('/:employeeId/status', authorize(['admin']), async (req, res, next) => {
  try {
    const { status } = req.body;
    const teacher = await teacherRepository.findByEmployeeIdOrEmail(req.params.employeeId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher record not found.' });
    }

    const updated = await teacherRepository.update(teacher.employeeId, { accountStatus: status });
    return res.json({
      message: `Teacher status updated to ${status}.`,
      teacher: updated
    });
  } catch (err) {
    next(err);
  }
});

// Delete Teacher (Admin only)
router.delete('/:employeeId', authorize(['admin']), async (req, res, next) => {
  try {
    const teacher = await teacherRepository.findByEmployeeIdOrEmail(req.params.employeeId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher record not found.' });
    }

    await teacherRepository.delete(teacher.employeeId);
    return res.json({ message: `Teacher record "${teacher.fullName}" (${teacher.employeeId}) deleted.` });
  } catch (err) {
    next(err);
  }
});

export default router;

