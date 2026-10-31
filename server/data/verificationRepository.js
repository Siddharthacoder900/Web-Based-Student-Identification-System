import crypto from 'crypto';
import VerificationLog from '../models/VerificationLog.js';
import { isDbConnected } from './studentRepository.js';

const getKolkataTimestamp = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
    hour12: true
  }).format(date);
};

// Memory storage for verification logs when MongoDB is unconfigured
const memoryLogs = [
  {
    logId: 'VRF-LOG-1001',
    studentId: 'BIET-2024-1001',
    rollNumber: '220101001',
    studentName: 'Rahul Kumar',
    course: 'B.Tech',
    branch: 'Computer Science and Engineering',
    method: 'Face-1:N',
    result: 'Verified',
    confidence: 96.5,
    distance: 0.32,
    verifierEmail: 'admin@biet.ac.in',
    verifierName: 'BIET Administrator',
    notes: 'Campus Gate 1 Face Scanner Verification',
    timestamp: new Date(Date.now() - 3600000 * 2),
    timestampKolkata: getKolkataTimestamp(new Date(Date.now() - 3600000 * 2))
  },
  {
    logId: 'VRF-LOG-1002',
    studentId: 'BIET-2024-1002',
    rollNumber: '220101002',
    studentName: 'Priya Sharma',
    course: 'B.Tech',
    branch: 'Computer Science and Engineering',
    method: 'QR',
    result: 'Verified',
    confidence: 100,
    distance: null,
    verifierEmail: 'admin@biet.ac.in',
    verifierName: 'BIET Administrator',
    notes: 'Library Desk QR Scanner',
    timestamp: new Date(Date.now() - 3600000 * 5),
    timestampKolkata: getKolkataTimestamp(new Date(Date.now() - 3600000 * 5))
  }
];

export const verificationRepository = {
  getKolkataTimestamp,

  async findAll(query = {}) {
    return this.getHistory({ ...query, limit: 1000 });
  },

  async log({
    studentId = null,
    rollNumber = null,
    studentName = 'Unknown',
    course = '',
    branch = '',
    method,
    result,
    confidence = null,
    distance = null,
    verifierEmail = 'admin@biet.ac.in',
    verifierName = 'BIET Administrator',
    notes = ''
  }) {
    const logId = `VRF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const timestamp = new Date();
    const timestampKolkata = getKolkataTimestamp(timestamp);

    const record = {
      logId,
      studentId,
      rollNumber,
      studentName,
      course,
      branch,
      method,
      result,
      confidence,
      distance,
      verifierEmail,
      verifierName,
      notes,
      timestamp,
      timestampKolkata
    };

    if (isDbConnected()) {
      const created = await VerificationLog.create(record);
      return created.toObject();
    }

    memoryLogs.unshift(record);
    if (memoryLogs.length > 500) memoryLogs.pop();
    return record;
  },

  async getHistory({ method = '', result = '', search = '', limit = 50 } = {}) {
    const q = (search || '').trim().toLowerCase();

    if (isDbConnected()) {
      const filter = {};
      if (method) filter.method = method;
      if (result) filter.result = result;
      if (q) {
        filter.$or = [
          { studentName: { $regex: q, $options: 'i' } },
          { rollNumber: { $regex: q, $options: 'i' } },
          { studentId: { $regex: q, $options: 'i' } },
          { course: { $regex: q, $options: 'i' } },
          { branch: { $regex: q, $options: 'i' } }
        ];
      }
      return VerificationLog.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).lean();
    }

    return memoryLogs
      .filter((entry) => {
        if (method && entry.method !== method) return false;
        if (result && entry.result !== result) return false;
        if (q) {
          const haystack = [
            entry.studentName,
            entry.rollNumber,
            entry.studentId,
            entry.course,
            entry.branch
          ].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .slice(0, Number(limit));
  },

  async getVerificationStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (isDbConnected()) {
      const [total, verified, rejected, faceMethod, qrMethod, today] = await Promise.all([
        VerificationLog.countDocuments(),
        VerificationLog.countDocuments({ result: 'Verified' }),
        VerificationLog.countDocuments({ result: 'Not Verified' }),
        VerificationLog.countDocuments({ method: { $regex: '^Face' } }),
        VerificationLog.countDocuments({ method: 'QR' }),
        VerificationLog.countDocuments({ timestamp: { $gte: startOfToday } })
      ]);
      return { total, verified, rejected, faceMethod, qrMethod, today };
    }

    const todayCount = memoryLogs.filter((l) => new Date(l.timestamp) >= startOfToday).length;
    const verifiedCount = memoryLogs.filter((l) => l.result === 'Verified').length;
    const rejectedCount = memoryLogs.filter((l) => l.result === 'Not Verified').length;
    const faceCount = memoryLogs.filter((l) => l.method.startsWith('Face')).length;
    const qrCount = memoryLogs.filter((l) => l.method === 'QR').length;

    return {
      total: memoryLogs.length,
      verified: verifiedCount,
      rejected: rejectedCount,
      faceMethod: faceCount,
      qrMethod: qrCount,
      today: todayCount
    };
  }
};

export default verificationRepository;

