import mongoose from 'mongoose'

const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 160 },
  enrollmentNumber: { type: String, required: true, uppercase: true, trim: true, maxlength: 40 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  mobileNumber: { type: String, trim: true, maxlength: 30, default: '' },
  course: { type: String, required: true, trim: true, maxlength: 80 },
  branch: { type: String, required: true, trim: true, maxlength: 120 },
  currentSemester: { type: Number, min: 1, max: 20, default: null },
  admissionYear: { type: Number, min: 1900, max: 2200, default: null },
  photograph: { type: String, default: null, select: false },
  studentStatus: { type: String, enum: ['Active', 'Inactive', 'Archived'], default: 'Active' },
  verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Unverified'], default: 'Pending' },
}, { timestamps: true })

studentSchema.index({ enrollmentNumber: 1 }, { unique: true })
studentSchema.index({ fullName: 'text', branch: 'text', enrollmentNumber: 'text' })
studentSchema.index({ course: 1, branch: 1, currentSemester: 1, studentStatus: 1 })

export default mongoose.model('Student', studentSchema)
