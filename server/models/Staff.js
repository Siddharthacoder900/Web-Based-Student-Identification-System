import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  staffId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Staff member full name is required.'],
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
    default: 'Staff Assistant'
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

export const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);
export default Staff;

