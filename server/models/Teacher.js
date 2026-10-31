import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Teacher full name is required.'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Official email is required.'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required.'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required.'],
    trim: true
  },
  designation: {
    type: String,
    required: [true, 'Designation is required.'],
    trim: true,
    default: 'Assistant Professor'
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  accountStatus: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    index: true
  },
  photoUrl: {
    type: String,
    default: ''
  },
  userAccountId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

export const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
export default Teacher;

