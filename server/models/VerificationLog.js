import mongoose from 'mongoose'

const verificationLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
  cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'IDCard', default: null },
  verificationMethod: { type: String, enum: ['QR'], default: 'QR' },
  verificationStatus: { type: String, enum: ['Verified', 'Invalid', 'Inactive', 'Expired'], required: true },
  verifiedAt: { type: Date, default: Date.now, index: true },
  verifierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  failureReason: { type: String, maxlength: 200, default: '' },
}, { timestamps: false })

verificationLogSchema.index({ verifiedAt: -1 })

export default mongoose.model('VerificationLog', verificationLogSchema)
