import mongoose from 'mongoose';

const verificationLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studentId: {
    type: String,
    default: null,
    index: true
  },
  rollNumber: {
    type: String,
    default: null,
    index: true
  },
  studentName: {
    type: String,
    default: 'Unknown'
  },
  course: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  method: {
    type: String,
    enum: ['Face-1:N', 'Face-1:1', 'QR', 'Manual'],
    required: true,
    index: true
  },
  result: {
    type: String,
    enum: ['Verified', 'Not Verified'],
    required: true,
    index: true
  },
  confidence: {
    type: Number,
    default: null
  },
  distance: {
    type: Number,
    default: null
  },
  verifierEmail: {
    type: String,
    default: 'system'
  },
  verifierName: {
    type: String,
    default: 'Administrator'
  },
  notes: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  timestampKolkata: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const VerificationLog = mongoose.models.VerificationLog || mongoose.model('VerificationLog', verificationLogSchema);
export default VerificationLog;

