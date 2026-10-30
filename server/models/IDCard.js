import mongoose from 'mongoose'

const idCardSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  cardNumber: { type: String, required: true },
  qrTokenHash: { type: String, required: true, unique: true, select: false },
  issueDate: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, default: null },
  cardStatus: { type: String, enum: ['Pending', 'Active', 'Inactive', 'Expired', 'Revoked'], default: 'Active' },
  generatedAt: { type: Date, default: Date.now },
  cardVersion: { type: Number, required: true, default: 1 },
}, { timestamps: true })

idCardSchema.index({ studentId: 1, cardStatus: 1 })
idCardSchema.index({ cardNumber: 1 }, { unique: true })

export default mongoose.model('IDCard', idCardSchema)
