import mongoose from 'mongoose';

const studentDocumentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  rollNumber: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  documentType: {
    type: String,
    enum: [
      'Admission Form',
      'ID Card Document',
      'Identity Proof (Aadhaar/Passport)',
      'Academic Marksheet/Certificate',
      'Transfer Certificate',
      'Fee Receipt',
      'Other'
    ],
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    default: 'admin'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verificationStatus: {
    type: String,
    enum: ['Verified', 'Pending', 'Rejected'],
    default: 'Verified',
    index: true
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export const StudentDocument = mongoose.models.StudentDocument || mongoose.model('StudentDocument', studentDocumentSchema);
export default StudentDocument;

