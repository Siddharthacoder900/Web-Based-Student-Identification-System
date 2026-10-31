import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Teacher from '../models/Teacher.js';
import User from '../models/User.js';
import persistentStorage from './persistentStorage.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const teacherRepository = {
  async find({ search = '', department = '', status = '' } = {}) {
    const q = search.trim().toLowerCase();

    if (isDbConnected()) {
      const filter = {};
      if (department) filter.department = department;
      if (status) filter.accountStatus = status;
      if (q) {
        filter.$or = [
          { fullName: { $regex: q, $options: 'i' } },
          { employeeId: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { department: { $regex: q, $options: 'i' } },
          { designation: { $regex: q, $options: 'i' } }
        ];
      }
      return Teacher.find(filter).sort({ createdAt: -1 }).lean();
    }

    const teachers = persistentStorage.get('teachers');
    return teachers.filter((t) => {
      if (department && t.department !== department) return false;
      if (status && t.accountStatus !== status) return false;
      if (q) {
        const text = [t.fullName, t.employeeId, t.email, t.department, t.designation].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  },

  async findByEmployeeIdOrEmail(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();

    if (isDbConnected()) {
      return Teacher.findOne({
        $or: [
          { employeeId: clean.toUpperCase() },
          { email: clean.toLowerCase() }
        ]
      }).lean();
    }

    const teachers = persistentStorage.get('teachers');
    return teachers.find(
      (t) => t.employeeId.toUpperCase() === clean.toUpperCase() || t.email.toLowerCase() === clean.toLowerCase()
    ) || null;
  },

  async isEmployeeIdTaken(employeeId) {
    const normalized = employeeId.trim().toUpperCase();
    if (isDbConnected()) {
      return Teacher.findOne({ employeeId: normalized }).lean();
    }
    const teachers = persistentStorage.get('teachers');
    return teachers.find((t) => t.employeeId.toUpperCase() === normalized) || null;
  },

  async create(data) {
    const employeeId = data.employeeId.trim().toUpperCase();
    const userId = `usr-tch-${Date.now()}`;

    const doc = {
      employeeId,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      mobileNumber: data.mobileNumber.trim(),
      department: data.department.trim(),
      designation: data.designation?.trim() || 'Assistant Professor',
      joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString() : new Date().toISOString(),
      accountStatus: data.accountStatus || 'Active',
      photoUrl: data.photoUrl || '',
      userAccountId: userId,
      createdAt: new Date().toISOString()
    };

    const passwordHash = await bcrypt.hash(data.password || 'Teacher@2026', 10);
    const userAccount = {
      id: userId,
      fullName: doc.fullName,
      email: doc.email,
      identifier: doc.employeeId,
      passwordHash,
      role: 'teacher',
      adminRole: 'none',
      teacherId: doc.employeeId,
      accountStatus: 'active',
      authVersion: 0,
      createdAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      const created = await Teacher.create(doc);
      try {
        await User.create({
          fullName: userAccount.fullName,
          email: userAccount.email,
          identifier: userAccount.identifier,
          passwordHash: userAccount.passwordHash,
          role: 'teacher',
          teacherId: doc.employeeId,
          accountStatus: 'active'
        });
      } catch (err) {
        console.warn('Teacher user account creation note:', err.message);
      }
      return created.toObject();
    }

    const teachers = persistentStorage.get('teachers');
    teachers.unshift(doc);
    persistentStorage.set('teachers', teachers);

    const users = persistentStorage.get('users');
    users.push(userAccount);
    persistentStorage.set('users', users);

    return doc;
  },

  async update(employeeId, updates) {
    if (isDbConnected()) {
      return Teacher.findOneAndUpdate(
        { employeeId: employeeId.toUpperCase() },
        { $set: updates },
        { new: true }
      ).lean();
    }
    const teachers = persistentStorage.get('teachers');
    const index = teachers.findIndex((t) => t.employeeId.toUpperCase() === employeeId.toUpperCase());
    if (index === -1) return null;
    teachers[index] = { ...teachers[index], ...updates };
    persistentStorage.set('teachers', teachers);
    return teachers[index];
  },

  async delete(employeeId) {
    if (isDbConnected()) {
      await Teacher.findOneAndDelete({ employeeId: employeeId.toUpperCase() });
      await User.deleteMany({ teacherId: employeeId.toUpperCase() });
      return true;
    }
    const teachers = persistentStorage.get('teachers');
    const filtered = teachers.filter((t) => t.employeeId.toUpperCase() !== employeeId.toUpperCase());
    persistentStorage.set('teachers', filtered);

    const users = persistentStorage.get('users');
    persistentStorage.set('users', users.filter((u) => u.teacherId !== employeeId.toUpperCase()));
    return true;
  }
};

export default teacherRepository;

