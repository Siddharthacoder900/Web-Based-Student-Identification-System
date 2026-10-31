import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Staff from '../models/Staff.js';
import User from '../models/User.js';
import persistentStorage from './persistentStorage.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const staffRepository = {
  async find({ search = '', department = '', status = '' } = {}) {
    const q = search.trim().toLowerCase();

    if (isDbConnected()) {
      const filter = {};
      if (department) filter.department = department;
      if (status) filter.accountStatus = status;
      if (q) {
        filter.$or = [
          { fullName: { $regex: q, $options: 'i' } },
          { staffId: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { department: { $regex: q, $options: 'i' } },
          { designation: { $regex: q, $options: 'i' } }
        ];
      }
      return Staff.find(filter).sort({ createdAt: -1 }).lean();
    }

    const staffMembers = persistentStorage.get('staff');
    return staffMembers.filter((s) => {
      if (department && s.department !== department) return false;
      if (status && s.accountStatus !== status) return false;
      if (q) {
        const text = [s.fullName, s.staffId, s.email, s.department, s.designation].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  },

  async findByStaffIdOrEmail(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();

    if (isDbConnected()) {
      return Staff.findOne({
        $or: [
          { staffId: clean.toUpperCase() },
          { email: clean.toLowerCase() }
        ]
      }).lean();
    }

    const staffMembers = persistentStorage.get('staff');
    return staffMembers.find(
      (s) => s.staffId.toUpperCase() === clean.toUpperCase() || s.email.toLowerCase() === clean.toLowerCase()
    ) || null;
  },

  async isStaffIdTaken(staffId) {
    const normalized = staffId.trim().toUpperCase();
    if (isDbConnected()) {
      return Staff.findOne({ staffId: normalized }).lean();
    }
    const staffMembers = persistentStorage.get('staff');
    return staffMembers.find((s) => s.staffId.toUpperCase() === normalized) || null;
  },

  async create(data) {
    const staffId = data.staffId.trim().toUpperCase();
    const userId = `usr-stf-${Date.now()}`;

    const doc = {
      staffId,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      mobileNumber: data.mobileNumber.trim(),
      department: data.department.trim(),
      designation: data.designation?.trim() || 'Staff Assistant',
      joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString() : new Date().toISOString(),
      accountStatus: data.accountStatus || 'Active',
      photoUrl: data.photoUrl || '',
      userAccountId: userId,
      createdAt: new Date().toISOString()
    };

    const passwordHash = await bcrypt.hash(data.password || 'Staff@2026', 10);
    const userAccount = {
      id: userId,
      fullName: doc.fullName,
      email: doc.email,
      identifier: doc.staffId,
      passwordHash,
      role: 'staff',
      adminRole: 'none',
      staffId: doc.staffId,
      accountStatus: 'active',
      authVersion: 0,
      createdAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      const created = await Staff.create(doc);
      try {
        await User.create({
          fullName: userAccount.fullName,
          email: userAccount.email,
          identifier: userAccount.identifier,
          passwordHash: userAccount.passwordHash,
          role: 'staff',
          staffId: doc.staffId,
          accountStatus: 'active'
        });
      } catch (err) {
        console.warn('Staff user account creation note:', err.message);
      }
      return created.toObject();
    }

    const staffMembers = persistentStorage.get('staff');
    staffMembers.unshift(doc);
    persistentStorage.set('staff', staffMembers);

    const users = persistentStorage.get('users');
    users.push(userAccount);
    persistentStorage.set('users', users);

    return doc;
  },

  async update(staffId, updates) {
    if (isDbConnected()) {
      return Staff.findOneAndUpdate(
        { staffId: staffId.toUpperCase() },
        { $set: updates },
        { new: true }
      ).lean();
    }
    const staffMembers = persistentStorage.get('staff');
    const index = staffMembers.findIndex((s) => s.staffId.toUpperCase() === staffId.toUpperCase());
    if (index === -1) return null;
    staffMembers[index] = { ...staffMembers[index], ...updates };
    persistentStorage.set('staff', staffMembers);
    return staffMembers[index];
  },

  async delete(staffId) {
    if (isDbConnected()) {
      await Staff.findOneAndDelete({ staffId: staffId.toUpperCase() });
      await User.deleteMany({ staffId: staffId.toUpperCase() });
      return true;
    }
    const staffMembers = persistentStorage.get('staff');
    const filtered = staffMembers.filter((s) => s.staffId.toUpperCase() !== staffId.toUpperCase());
    persistentStorage.set('staff', filtered);

    const users = persistentStorage.get('users');
    persistentStorage.set('users', users.filter((u) => u.staffId !== staffId.toUpperCase()));
    return true;
  }
};

export default staffRepository;

