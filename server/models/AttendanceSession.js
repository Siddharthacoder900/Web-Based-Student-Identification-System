import mongoose from 'mongoose';

const attendanceSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sessionName: {
    type: String,
    required: [true, 'Session name is required.'],
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
    required: [true, 'Semester is required.'],
    default: 'Semester 1'
  },
  subject: {
    type: String,
    trim: true,
    default: 'General Lecture'
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  startTime: {
    type: String, // HH:MM (e.g. "09:00")
    required: true
  },
  endTime: {
    type: String, // HH:MM (e.g. "10:30")
    required: true
  },
  lateGraceMinutes: {
    type: Number,
    default: 15
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Active', 'Closed'],
    default: 'Active',
    index: true
  },
  createdBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

export const AttendanceSession = mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', attendanceSessionSchema);
export default AttendanceSession;

