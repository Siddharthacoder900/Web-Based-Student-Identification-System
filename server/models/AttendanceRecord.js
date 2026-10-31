import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema({
  recordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
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
  studentName: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  method: {
    type: String,
    enum: ['Face', 'QR', 'Manual'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent'],
    required: true,
    index: true
  },
  confidenceScore: {
    type: Number,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  timestampKolkata: {
    type: String,
    required: true
  },
  markedBy: {
    type: String,
    default: 'system'
  },
  auditNote: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Enforce compound unique constraint: One check-in per student per session!
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

export const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);
export default AttendanceRecord;

