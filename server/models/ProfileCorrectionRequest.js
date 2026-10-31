import mongoose from 'mongoose';

const profileCorrectionRequestSchema = new mongoose.Schema({
  requestId: {
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
    index: true
  },
  studentName: {
    type: String,
    required: true
  },
  fieldToUpdate: {
    type: String,
    required: true
  },
  currentValue: {
    type: String,
    default: ''
  },
  requestedValue: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  supportingDocUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export const ProfileCorrectionRequest = mongoose.models.ProfileCorrectionRequest || mongoose.model('ProfileCorrectionRequest', profileCorrectionRequestSchema);
export default ProfileCorrectionRequest;

