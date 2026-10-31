import express from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import staffRepository from '../data/staffRepository.js';

const router = express.Router();

const staffSchema = z.object({
  staffId: z.string().trim().optional().transform((v) => v || `S-${Math.floor(2000 + Math.random() * 8000)}`),
  fullName: z.string().trim().min(2, 'Full name is required.'),
  email: z.string().trim().email('Invalid email address.'),
  mobileNumber: z.string().trim().min(8, 'Mobile number must be at least 8 digits.'),
  department: z.string().trim().min(2, 'Department is required.'),
  designation: z.string().trim().optional().default('Staff Assistant'),
  joiningDate: z.string().optional(),
  accountStatus: z.enum(['Active', 'Inactive']).default('Active'),
  photoUrl: z.string().optional().default(''),
  password: z.string().min(8).optional()
});

router.use(authenticate);

// Staff Self-Profile Endpoint
router.get('/profile/me', async (req, res, next) => {
  try {
    const sId = req.user.identifier || req.user.staffId || req.user.email;
    let staffMember = await staffRepository.findByStaffIdOrEmail(sId);
    if (!staffMember) {
      staffMember = {
        fullName: req.user.fullName || 'Staff Personnel',
        email: req.user.email,
        staffId: req.user.identifier || 'S-2001',
        department: 'Central Library',
        designation: 'Assistant Librarian'
      };
    }
    return res.json({ staff: staffMember });
  } catch (err) {
    next(err);
  }
});

// List / Filter Staff
router.get('/', authorize(['admin', 'staff', 'teacher']), async (req, res, next) => {
  try {
    const { search, department, status } = req.query;
    const staffMembers = await staffRepository.find({ search, department, status });
    return res.json({ staff: staffMembers });
  } catch (err) {
    next(err);
  }
});

// Get Single Staff Member
router.get('/:staffId', authorize(['admin', 'staff', 'teacher']), async (req, res, next) => {
  try {
    const member = await staffRepository.findByStaffIdOrEmail(req.params.staffId);
    if (!member) {
      return res.status(404).json({ message: 'Staff record not found.' });
    }
    return res.json({ staff: member });
  } catch (err) {
    next(err);
  }
});

// Create Staff Member (Admin only)
router.post('/', authorize(['admin']), async (req, res, next) => {
  try {
    const parsed = staffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || 'Invalid staff payload.'
      });
    }

    const payload = parsed.data;
    const existing = await staffRepository.isStaffIdTaken(payload.staffId);
    if (existing) {
      return res.status(409).json({
        message: `Staff ID "${payload.staffId.toUpperCase()}" is already assigned to ${existing.fullName}.`
      });
    }

    const created = await staffRepository.create(payload);
    return res.status(201).json({
      message: 'Staff member profile created successfully.',
      staff: created
    });
  } catch (err) {
    next(err);
  }
});

// Update Staff Member (Admin only)
router.put('/:staffId', authorize(['admin']), async (req, res, next) => {
  try {
    const member = await staffRepository.findByStaffIdOrEmail(req.params.staffId);
    if (!member) {
      return res.status(404).json({ message: 'Staff record not found.' });
    }

    const updated = await staffRepository.update(member.staffId, req.body);
    return res.json({
      message: 'Staff record updated successfully.',
      staff: updated
    });
  } catch (err) {
    next(err);
  }
});

// Toggle Staff Status (Admin only)
router.patch('/:staffId/status', authorize(['admin']), async (req, res, next) => {
  try {
    const { status } = req.body;
    const member = await staffRepository.findByStaffIdOrEmail(req.params.staffId);
    if (!member) {
      return res.status(404).json({ message: 'Staff record not found.' });
    }

    const updated = await staffRepository.update(member.staffId, { accountStatus: status });
    return res.json({
      message: `Staff status updated to ${status}.`,
      staff: updated
    });
  } catch (err) {
    next(err);
  }
});

// Delete Staff Member (Admin only)
router.delete('/:staffId', authorize(['admin']), async (req, res, next) => {
  try {
    const member = await staffRepository.findByStaffIdOrEmail(req.params.staffId);
    if (!member) {
      return res.status(404).json({ message: 'Staff record not found.' });
    }

    await staffRepository.delete(member.staffId);
    return res.json({ message: `Staff record "${member.fullName}" (${member.staffId}) deleted.` });
  } catch (err) {
    next(err);
  }
});

export default router;

