import mongoose from 'mongoose';

const idCardSchema = new mongoose.Schema({
  cardId: {
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
  cardNumber: {
    type: String,
    required: true,
    unique: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  qrCodeUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Revoked', 'Expired'],
    default: 'Active'
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

export const IDCard = mongoose.models.IDCard || mongoose.model('IDCard', idCardSchema);
export default IDCard;

