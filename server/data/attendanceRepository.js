import mongoose from 'mongoose';
import AttendanceSession from '../models/AttendanceSession.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import persistentStorage from './persistentStorage.js';
import { branchMatches } from './studentRepository.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

const getKolkataTimestamp = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
    hour12: true
  }).format(date);
};

export const attendanceRepository = {
  getKolkataTimestamp,

  // --- SESSIONS ---
  async createSession(data) {
    const sessionId = data.sessionId || `SES-${Date.now()}`;
    const sessionName = (data.sessionName || data.title || 'Institutional Lecture').trim();
    const course = (data.course || 'B.Tech').trim();
    const branch = (data.branch || 'CSE').trim();
    const academicYear = data.academicYear || data.year || '1st Year';
    const currentSemester = data.currentSemester || data.semester || '1st Semester';
    const subject = (data.subject || data.sessionName || data.title || 'General Lecture').trim();
    const date = data.date || new Date().toISOString().slice(0, 10);
    const startTime = data.startTime || '09:00';
    const endTime = data.endTime || '10:30';

    const doc = {
      sessionId,
      sessionName,
      title: sessionName, // Alias for frontend compatibility
      course,
      branch,
      academicYear,
      currentSemester,
      semester: currentSemester, // Alias for frontend compatibility
      subject,
      date,
      startTime,
      endTime,
      lateGraceMinutes: Number(data.lateGraceMinutes) || 15,
      status: data.status || 'Active',
      createdBy: data.createdBy || data.teacherName || 'Administration',
      teacherName: data.teacherName || data.createdBy || 'Faculty Instructor',
      teacherId: data.teacherId || 'T-1001',
      totalPresent: 0,
      createdAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      const created = await AttendanceSession.create(doc);
      return created.toObject();
    }

    const sessions = persistentStorage.get('attendanceSessions');
    sessions.unshift(doc);
    persistentStorage.set('attendanceSessions', sessions);
    return doc;
  },

  async updateSessionStatus(sessionId, status) {
    if (isDbConnected()) {
      const updated = await AttendanceSession.findOneAndUpdate(
        { sessionId },
        { $set: { status, updatedAt: new Date() } },
        { new: true }
      ).lean();
      return updated;
    }

    const sessions = persistentStorage.get('attendanceSessions');
    const index = sessions.findIndex((s) => s.sessionId === sessionId);
    if (index === -1) return null;
    sessions[index].status = status;
    sessions[index].updatedAt = new Date().toISOString();
    persistentStorage.set('attendanceSessions', sessions);
    return sessions[index];
  },

  async getSessions({ course = '', branch = '', date = '', status = '' } = {}) {
    if (isDbConnected()) {
      const filter = {};
      if (course && course !== 'All Courses' && course !== 'All') filter.course = course;
      if (branch && branch !== 'All Branches' && branch !== 'All') {
        const map = {
          cse: 'computer science',
          me: 'mechanical',
          ece: 'electronics',
          it: 'information technology',
          ce: 'civil',
          ee: 'electrical',
          mba: 'business',
          mca: 'computer applications'
        };
        const bLower = branch.trim().toLowerCase();
        const pattern = map[bLower] || branch.trim();
        filter.branch = { $regex: pattern, $options: 'i' };
      }
      if (date) filter.date = date;
      if (status && status !== 'All') filter.status = status;
      return AttendanceSession.find(filter).sort({ date: -1, startTime: -1 }).lean();
    }

    const sessions = persistentStorage.get('attendanceSessions');
    return sessions.filter((s) => {
      if (course && course !== 'All Courses' && course !== 'All' && s.course !== course) return false;
      if (branch && !branchMatches(s.branch, branch)) return false;
      if (date && s.date !== date) return false;
      if (status && status !== 'All' && s.status !== status) return false;
      return true;
    });
  },

  async getSessionById(sessionId) {
    if (isDbConnected()) {
      return AttendanceSession.findOne({ sessionId }).lean();
    }
    const sessions = persistentStorage.get('attendanceSessions');
    return sessions.find((s) => s.sessionId === sessionId) || null;
  },

  // --- CHECK-IN & RECORDS ---
  async markAttendance({
    sessionId,
    studentId,
    rollNumber,
    studentName,
    course,
    branch,
    method = 'Face',
    status: explicitStatus = null,
    override = false,
    confidenceScore = null,
    markedBy = 'system',
    auditNote = ''
  }) {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Attendance session not found or has been closed.');
    }

    // Check duplicate check-in
    const existing = await this.findRecord(sessionId, studentId);
    if (existing) {
      if (override && explicitStatus) {
        return this.updateRecordStatus(existing.recordId, explicitStatus, markedBy);
      }
      throw new Error(`Student ${studentName} (${rollNumber}) is already marked ${existing.status} for this session.`);
    }

    // Determine status (Present vs Late)
    let status = explicitStatus || 'Present';
    const now = new Date();
    const sessionDateStr = session.date;
    const sessionStart = new Date(`${sessionDateStr}T${session.startTime}:00`);
    const graceMs = (session.lateGraceMinutes || 15) * 60 * 1000;

    if (!explicitStatus && !isNaN(sessionStart.getTime()) && now.getTime() > (sessionStart.getTime() + graceMs)) {
      status = 'Late';
    }

    const recordId = `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestampKolkata = getKolkataTimestamp(now);

    const doc = {
      recordId,
      sessionId,
      studentId,
      rollNumber: rollNumber.toUpperCase(),
      studentName,
      course,
      branch,
      method,
      status,
      confidenceScore,
      timestamp: now.toISOString(),
      timestampKolkata,
      markedBy,
      auditNote
    };

    if (isDbConnected()) {
      const created = await AttendanceRecord.create(doc);
      if (status === 'Present' || status === 'Late') {
        await AttendanceSession.updateOne({ sessionId }, { $inc: { totalPresent: 1 } });
      }
      return created.toObject();
    }

    const records = persistentStorage.get('attendanceRecords');
    records.unshift(doc);
    persistentStorage.set('attendanceRecords', records);

    // Increment session present count
    const sessions = persistentStorage.get('attendanceSessions');
    const sIndex = sessions.findIndex((s) => s.sessionId === sessionId);
    if (sIndex !== -1 && (status === 'Present' || status === 'Late')) {
      sessions[sIndex].totalPresent = (sessions[sIndex].totalPresent || 0) + 1;
      persistentStorage.set('attendanceSessions', sessions);
    }

    return doc;
  },

  async updateRecordStatus(recordId, status, markedBy = 'Instructor') {
    if (isDbConnected()) {
      return AttendanceRecord.findOneAndUpdate(
        { recordId },
        { $set: { status, markedBy, updatedAt: new Date() } },
        { new: true }
      ).lean();
    }
    const records = persistentStorage.get('attendanceRecords');
    const index = records.findIndex((r) => r.recordId === recordId);
    if (index === -1) return null;
    records[index].status = status;
    records[index].markedBy = markedBy;
    persistentStorage.set('attendanceRecords', records);
    return records[index];
  },

  async findRecord(sessionId, studentId) {
    if (isDbConnected()) {
      return AttendanceRecord.findOne({ sessionId, studentId }).lean();
    }
    const records = persistentStorage.get('attendanceRecords');
    return records.find((r) => r.sessionId === sessionId && r.studentId === studentId) || null;
  },

  async getSessionRecords(sessionId) {
    if (isDbConnected()) {
      return AttendanceRecord.find({ sessionId }).sort({ timestamp: -1 }).lean();
    }
    const records = persistentStorage.get('attendanceRecords');
    return records.filter((r) => r.sessionId === sessionId);
  },

  // Student history & percentage
  async getStudentAttendance(studentId, course, branch) {
    let studentRecords = [];
    let relevantSessions = [];

    if (isDbConnected()) {
      [studentRecords, relevantSessions] = await Promise.all([
        AttendanceRecord.find({ studentId }).sort({ timestamp: -1 }).lean(),
        AttendanceSession.find({ course, branch }).lean()
      ]);
    } else {
      const allRecords = persistentStorage.get('attendanceRecords');
      studentRecords = allRecords.filter((r) => r.studentId === studentId);
      const allSessions = persistentStorage.get('attendanceSessions');
      relevantSessions = allSessions.filter((s) => s.course === course && s.branch === branch);
    }

    const totalSessions = Math.max(relevantSessions.length, studentRecords.length, 1);
    const presentCount = studentRecords.filter((r) => r.status === 'Present').length;
    const lateCount = studentRecords.filter((r) => r.status === 'Late').length;
    const attendedCount = presentCount + lateCount;
    const percentage = Math.round((attendedCount / totalSessions) * 100 * 10) / 10;

    return {
      totalSessions,
      attendedCount,
      presentCount,
      lateCount,
      percentage: Math.min(percentage, 100),
      records: studentRecords
    };
  },

  // Overall attendance stats
  async getStats() {
    const today = new Date().toISOString().slice(0, 10);
    if (isDbConnected()) {
      const [totalSessions, totalRecords, todayRecords] = await Promise.all([
        AttendanceSession.countDocuments(),
        AttendanceRecord.countDocuments(),
        AttendanceRecord.countDocuments({ timestampKolkata: { $regex: today } })
      ]);
      return { totalSessions, totalRecords, todayRecords };
    }

    const sessions = persistentStorage.get('attendanceSessions');
    const records = persistentStorage.get('attendanceRecords');
    return {
      totalSessions: sessions.length,
      totalRecords: records.length,
      todayRecords: records.filter((r) => r.timestamp && r.timestamp.startsWith(today)).length
    };
  },

  // Student Attendance Shortage Alerts (< 75% AKTU examination requirement)
  async getShortageAlerts({ threshold = 75, course = '', branch = '' } = {}) {
    const students = persistentStorage.get('students') || [];
    const allRecords = persistentStorage.get('attendanceRecords') || [];
    const allSessions = persistentStorage.get('attendanceSessions') || [];

    const activeStudents = students.filter((s) => {
      if (s.studentStatus && s.studentStatus !== 'Active') return false;
      if (course && s.course !== course) return false;
      if (branch && s.branch !== branch) return false;
      return true;
    });

    const alerts = [];

    for (const student of activeStudents) {
      const studentSessions = allSessions.filter(
        (sess) => sess.course === student.course && sess.branch === student.branch
      );
      const studentRecords = allRecords.filter((r) => r.studentId === student.studentId);
      const attendedCount = studentRecords.filter((r) => r.status === 'Present' || r.status === 'Late').length;
      const totalSessions = Math.max(studentSessions.length, studentRecords.length, 1);
      const percentage = Math.round((attendedCount / totalSessions) * 100 * 10) / 10;

      // Calculate how many more sessions needed to reach threshold
      const shortageClasses = Math.max(0, Math.ceil((0.75 * totalSessions - attendedCount) / 0.25));

      let riskLevel = 'Good Standing';
      if (percentage < 60) {
        riskLevel = 'Critical Risk (< 60%)';
      } else if (percentage < 75) {
        riskLevel = 'Shortage Warning (60-74%)';
      }

      alerts.push({
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        course: student.course,
        branch: student.branch,
        academicYear: student.academicYear,
        currentSemester: student.currentSemester,
        photoUrl: student.photoUrl,
        totalSessions,
        attendedCount,
        percentage,
        shortageClasses,
        riskLevel,
        isShortage: percentage < threshold
      });
    }

    alerts.sort((a, b) => a.percentage - b.percentage);
    return alerts;
  }
};

export default attendanceRepository;

