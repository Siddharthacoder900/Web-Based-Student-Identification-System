import mongoose from 'mongoose';

const biometricSchema = new mongoose.Schema({
  consentGiven: {
    type: Boolean,
    default: false
  },
  consentDate: {
    type: Date,
    default: null
  },
  enrolled: {
    type: Boolean,
    default: false
  },
  enrolledAt: {
    type: Date,
    default: null
  },
  faceTemplate: {
    type: [Number],
    default: undefined,
    select: false // Strict privacy: never expose face embedding in standard API responses
  }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Student full name is required.'],
    trim: true
  },
  rollNumber: {
    type: String,
    required: [true, 'Unique roll number is required.'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  registrationNumber: {
    type: String,
    trim: true,
    sparse: true,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Official student email is required.'],
    lowercase: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required.'],
    trim: true
  },
  course: {
    type: String,
    required: [true, 'Course is required.'],
    trim: true
  },
  branch: {
    type: String,
    required: [true, 'Branch is required.'],
    trim: true
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required.'],
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'],
    default: '1st Year'
  },
  currentSemester: {
    type: String,
    required: [true, 'Current semester is required.'],
    default: 'Semester 1'
  },
  admissionYear: {
    type: Number,
    required: [true, 'Admission year is required.'],
    default: () => new Date().getFullYear()
  },
  dateOfBirth: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Not Specified'],
    default: 'Not Specified'
  },
  address: {
    type: String,
    default: ''
  },
  studentStatus: {
    type: String,
    enum: ['Active', 'Inactive', 'Graduated'],
    default: 'Active',
    index: true
  },
  verificationStatus: {
    type: String,
    enum: ['Verified', 'Pending'],
    default: 'Verified',
    index: true
  },
  photoUrl: {
    type: String,
    default: ''
  },
  qrCodeToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  biometric: {
    type: biometricSchema,
    default: () => ({})
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search optimization
studentSchema.index({
  fullName: 'text',
  rollNumber: 'text',
  studentId: 'text',
  email: 'text',
  course: 'text',
  branch: 'text'
});

export const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
export default Student;

