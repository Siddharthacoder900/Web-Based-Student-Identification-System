import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['Super Admin', 'Administrator', 'Verifier'], default: 'Administrator' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

adminSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash)
}

adminSchema.index({ email: 1 }, { unique: true })

export default mongoose.model('Admin', adminSchema)
