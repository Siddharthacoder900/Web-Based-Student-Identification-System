import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    index: true
  },
  identifier: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true,
    index: true
    // Holds Roll Number for students, Employee ID for teachers, Staff ID for staff
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'staff', 'student'],
    required: true,
    default: 'student',
    index: true
  },
  adminRole: {
    type: String,
    enum: ['super_admin', 'admission_admin', 'verification_operator', 'none'],
    default: function() {
      return this.role === 'admin' ? 'super_admin' : 'none';
    }
  },
  studentId: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  teacherId: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  staffId: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'pending_activation'],
    default: 'active',
    index: true
  },
  authVersion: {
    type: Number,
    default: 0
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
