import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Student from '../models/Student.js';
import User from '../models/User.js';
import persistentStorage from './persistentStorage.js';

export const isDbConnected = () => mongoose.connection.readyState === 1;

export const generateStudentId = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BIET-${year}-${rand}`;
};

export const generateQrToken = (rollNumber) => {
  const raw = `${rollNumber}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  return `BIET-VRF-${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24).toUpperCase()}`;
};

export const branchMatches = (studentBranch, queryBranch) => {
  if (!queryBranch || queryBranch === 'All Branches' || queryBranch === 'All') return true;
  if (!studentBranch) return false;
  const s = studentBranch.trim().toLowerCase();
  const q = queryBranch.trim().toLowerCase();
  if (s === q) return true;

  const map = {
    cse: 'computer science',
    me: 'mechanical',
    ece: 'electronics',
    it: 'information technology',
    ce: 'civil',
    ee: 'electrical',
    mba: 'master of business administration',
    mca: 'master of computer applications'
  };

  const sExp = map[s] || s;
  const qExp = map[q] || q;

  return sExp.includes(qExp) || qExp.includes(sExp) || s.includes(q) || q.includes(s);
};

export const studentRepository = {
  // Alias for finding all students
  async findAll(query = {}) {
    return this.find(query);
  },

  // Find all students matching query/filter
  async find({ search = '', course = '', branch = '', academicYear = '', status = '', verificationStatus = '', faceEnrolled = '' } = {}) {
    const q = search.trim().toLowerCase();

    if (isDbConnected()) {
      const filter = {};
      if (course && course !== 'All Courses' && course !== 'All') filter.course = course;
      if (branch && branch !== 'All Branches' && branch !== 'All') {
        const map = {
          cse: 'computer science',
          me: 'mechanical',
          ece: 'electronics',
          it: 'information technology',
          ce: 'civil',
          ee: 'electrical',
          mba: 'business',
          mca: 'computer applications'
        };
        const bLower = branch.trim().toLowerCase();
        const pattern = map[bLower] || branch.trim();
        filter.branch = { $regex: pattern, $options: 'i' };
      }
      if (academicYear && academicYear !== 'All Years' && academicYear !== 'All') filter.academicYear = academicYear;
      if (status) filter.studentStatus = status;
      if (verificationStatus) filter.verificationStatus = verificationStatus;
      if (faceEnrolled === 'true' || faceEnrolled === true) filter['biometric.enrolled'] = true;
      if (faceEnrolled === 'false' || faceEnrolled === false) filter['biometric.enrolled'] = { $ne: true };

      if (q) {
        filter.$or = [
          { fullName: { $regex: q, $options: 'i' } },
          { rollNumber: { $regex: q, $options: 'i' } },
          { registrationNumber: { $regex: q, $options: 'i' } },
          { studentId: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { course: { $regex: q, $options: 'i' } },
          { branch: { $regex: q, $options: 'i' } }
        ];
      }
      return Student.find(filter).sort({ createdAt: -1 }).lean();
    }

    const students = persistentStorage.get('students');
    return students.filter((s) => {
      if (course && course !== 'All Courses' && course !== 'All' && s.course !== course) return false;
      if (branch && !branchMatches(s.branch, branch)) return false;
      if (academicYear && academicYear !== 'All Years' && academicYear !== 'All' && s.academicYear !== academicYear) return false;
      if (status && s.studentStatus !== status) return false;
      if (verificationStatus && s.verificationStatus !== verificationStatus) return false;
      if ((faceEnrolled === 'true' || faceEnrolled === true) && !s.biometric?.enrolled) return false;
      if ((faceEnrolled === 'false' || faceEnrolled === false) && s.biometric?.enrolled) return false;

      if (q) {
        const text = [
          s.fullName,
          s.rollNumber,
          s.registrationNumber,
          s.studentId,
          s.email,
          s.course,
          s.branch
        ].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  },

  // Find by studentId or rollNumber
  async findByIdOrRoll(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();

    if (isDbConnected()) {
      return Student.findOne({
        $or: [
          { studentId: clean },
          { rollNumber: clean.toUpperCase() },
          { qrCodeToken: clean }
        ]
      }).lean();
    }

    const students = persistentStorage.get('students');
    return students.find(
      (s) =>
        s.studentId === clean ||
        s.rollNumber.toUpperCase() === clean.toUpperCase() ||
        s.qrCodeToken === clean
    ) || null;
  },

  // Check duplicate roll number
  async isRollNumberTaken(rollNumber, excludeStudentId = null) {
    const normalized = rollNumber.trim().toUpperCase();

    if (isDbConnected()) {
      const query = { rollNumber: normalized };
      if (excludeStudentId) query.studentId = { $ne: excludeStudentId };
      const existing = await Student.findOne(query).select('fullName rollNumber studentId').lean();
      return existing;
    }

    const students = persistentStorage.get('students');
    return students.find(
      (s) => s.rollNumber.toUpperCase() === normalized && s.studentId !== excludeStudentId
    ) || null;
  },

  // Check email
  async findByEmail(email, excludeStudentId = null) {
    const normalized = email.trim().toLowerCase();
    if (isDbConnected()) {
      const query = { email: normalized };
      if (excludeStudentId) query.studentId = { $ne: excludeStudentId };
      return Student.findOne(query).select('fullName rollNumber studentId email').lean();
    }
    const students = persistentStorage.get('students');
    return students.find(
      (s) => s.email.toLowerCase() === normalized && s.studentId !== excludeStudentId
    ) || null;
  },

  // Create student and automatically provision linked user account
  async create(data) {
    const studentId = data.studentId || generateStudentId();
    const qrCodeToken = data.qrCodeToken || generateQrToken(data.rollNumber);
    const userId = `usr-std-${Date.now()}`;

    const doc = {
      studentId,
      fullName: data.fullName.trim(),
      rollNumber: data.rollNumber.trim().toUpperCase(),
      registrationNumber: (data.registrationNumber || '').trim(),
      email: data.email.trim().toLowerCase(),
      mobileNumber: data.mobileNumber.trim(),
      course: data.course.trim(),
      branch: data.branch.trim(),
      academicYear: data.academicYear || '1st Year',
      currentSemester: data.currentSemester || 'Semester 1',
      admissionYear: Number(data.admissionYear) || new Date().getFullYear(),
      dateOfBirth: data.dateOfBirth || '',
      gender: data.gender || 'Not Specified',
      address: data.address || '',
      studentStatus: data.studentStatus || 'Active',
      verificationStatus: data.verificationStatus || 'Verified',
      photoUrl: data.photoUrl || '',
      qrCodeToken,
      userAccountId: userId,
      biometric: {
        consentGiven: Boolean(data.biometric?.consentGiven),
        consentDate: data.biometric?.consentGiven ? new Date().toISOString() : null,
        enrolled: Boolean(data.biometric?.faceTemplate && data.biometric.faceTemplate.length === 128),
        enrolledAt: data.biometric?.faceTemplate ? new Date().toISOString() : null,
        faceTemplate: data.biometric?.faceTemplate || null
      },
      registrationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Linked user account credentials
    const defaultPassword = data.password || 'BietStudent@2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const userAccount = {
      id: userId,
      fullName: doc.fullName,
      email: doc.email,
      identifier: doc.rollNumber,
      passwordHash,
      role: 'student',
      adminRole: 'none',
      studentId: doc.studentId,
      accountStatus: 'active',
      authVersion: 0,
      createdAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      const createdStudent = await Student.create(doc);
      try {
        await User.create({
          fullName: userAccount.fullName,
          email: userAccount.email,
          identifier: userAccount.identifier,
          passwordHash: userAccount.passwordHash,
          role: 'student',
          studentId: doc.studentId,
          accountStatus: 'active'
        });
      } catch (err) {
        console.warn('User account creation note:', err.message);
      }
      return createdStudent.toObject();
    }

    // Save to persistent local storage
    const students = persistentStorage.get('students');
    students.unshift(doc);
    persistentStorage.set('students', students);

    const users = persistentStorage.get('users');
    users.push(userAccount);
    persistentStorage.set('users', users);

    return doc;
  },

  // Update student
  async update(studentId, updates) {
    if (isDbConnected()) {
      const updated = await Student.findOneAndUpdate(
        { studentId },
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true, runValidators: true }
      ).lean();
      return updated;
    }

    const students = persistentStorage.get('students');
    const index = students.findIndex((s) => s.studentId === studentId);
    if (index === -1) return null;

    students[index] = {
      ...students[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    persistentStorage.set('students', students);
    return students[index];
  },

  // Update status (Active/Inactive/Graduated)
  async updateStatus(studentId, { status, verificationStatus }) {
    const updates = {};
    if (status) updates.studentStatus = status;
    if (verificationStatus) updates.verificationStatus = verificationStatus;
    return this.update(studentId, updates);
  },

  // Delete/Deactivate
  async delete(studentId) {
    if (isDbConnected()) {
      const deleted = await Student.findOneAndDelete({ studentId }).lean();
      await User.deleteMany({ studentId });
      return !!deleted;
    }

    const students = persistentStorage.get('students');
    const index = students.findIndex((s) => s.studentId === studentId);
    if (index === -1) return false;
    students.splice(index, 1);
    persistentStorage.set('students', students);

    const users = persistentStorage.get('users');
    const filteredUsers = users.filter((u) => u.studentId !== studentId);
    persistentStorage.set('users', filteredUsers);
    return true;
  },

  // Biometric template enrollment
  async enrollBiometric(studentId, { faceTemplate, consentGiven }) {
    if (!consentGiven) {
      throw new Error('Student biometric consent is required before face enrollment.');
    }
    if (!faceTemplate || !Array.isArray(faceTemplate) || faceTemplate.length !== 128) {
      throw new Error('Valid 128-dimensional face embedding is required.');
    }

    const biometricData = {
      consentGiven: true,
      consentDate: new Date().toISOString(),
      enrolled: true,
      enrolledAt: new Date().toISOString(),
      faceTemplate
    };

    if (isDbConnected()) {
      await Student.updateOne(
        { studentId },
        { $set: { biometric: biometricData, updatedAt: new Date() } }
      );
      return { success: true, enrolledAt: biometricData.enrolledAt };
    }

    const students = persistentStorage.get('students');
    const student = students.find((s) => s.studentId === studentId);
    if (!student) return null;
    student.biometric = biometricData;
    student.updatedAt = new Date().toISOString();
    persistentStorage.set('students', students);
    return { success: true, enrolledAt: biometricData.enrolledAt };
  },

  // Remove biometric enrollment
  async removeBiometric(studentId) {
    const biometricReset = {
      consentGiven: false,
      consentDate: null,
      enrolled: false,
      enrolledAt: null,
      faceTemplate: null
    };

    if (isDbConnected()) {
      await Student.updateOne(
        { studentId },
        { $set: { biometric: biometricReset, updatedAt: new Date() } }
      );
      return true;
    }

    const students = persistentStorage.get('students');
    const student = students.find((s) => s.studentId === studentId);
    if (!student) return false;
    student.biometric = biometricReset;
    persistentStorage.set('students', students);
    return true;
  },

  // Get enrolled face descriptors for verification (Protected internal access)
  async getEnrolledDescriptors() {
    if (isDbConnected()) {
      const records = await Student.find(
        { 'biometric.enrolled': true, studentStatus: 'Active' },
        '+biometric.faceTemplate'
      ).select('studentId rollNumber registrationNumber fullName course branch academicYear currentSemester photoUrl studentStatus verificationStatus biometric.faceTemplate').lean();

      return records.filter((r) => r.biometric?.faceTemplate && r.biometric.faceTemplate.length === 128);
    }

    const students = persistentStorage.get('students');
    return students
      .filter((s) => s.biometric?.enrolled && s.studentStatus === 'Active' && s.biometric?.faceTemplate)
      .map((s) => ({
        studentId: s.studentId,
        rollNumber: s.rollNumber,
        registrationNumber: s.registrationNumber,
        fullName: s.fullName,
        course: s.course,
        branch: s.branch,
        academicYear: s.academicYear,
        currentSemester: s.currentSemester,
        photoUrl: s.photoUrl,
        studentStatus: s.studentStatus,
        verificationStatus: s.verificationStatus,
        biometric: {
          faceTemplate: s.biometric.faceTemplate
        }
      }));
  },

  // Dashboard Aggregates
  async getStats() {
    if (isDbConnected()) {
      const [total, active, inactive, graduated, verified, pending, faceEnrolled] = await Promise.all([
        Student.countDocuments(),
        Student.countDocuments({ studentStatus: 'Active' }),
        Student.countDocuments({ studentStatus: 'Inactive' }),
        Student.countDocuments({ studentStatus: 'Graduated' }),
        Student.countDocuments({ verificationStatus: 'Verified' }),
        Student.countDocuments({ verificationStatus: 'Pending' }),
        Student.countDocuments({ 'biometric.enrolled': true })
      ]);
      return { total, active, inactive, graduated, verified, pending, faceEnrolled };
    }

    const students = persistentStorage.get('students');
    return {
      total: students.length,
      active: students.filter((s) => s.studentStatus === 'Active').length,
      inactive: students.filter((s) => s.studentStatus === 'Inactive').length,
      graduated: students.filter((s) => s.studentStatus === 'Graduated').length,
      verified: students.filter((s) => s.verificationStatus === 'Verified').length,
      pending: students.filter((s) => s.verificationStatus === 'Pending').length,
      faceEnrolled: students.filter((s) => s.biometric?.enrolled).length
    };
  }
};

export default studentRepository;
