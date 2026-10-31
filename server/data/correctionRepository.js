import mongoose from 'mongoose';
import ProfileCorrectionRequest from '../models/ProfileCorrectionRequest.js';
import persistentStorage from './persistentStorage.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const correctionRepository = {
  async create(data) {
    const requestId = `CORR-${Date.now()}`;
    const doc = {
      requestId,
      studentId: data.studentId,
      rollNumber: data.rollNumber,
      studentName: data.studentName,
      fieldToUpdate: data.fieldToUpdate,
      currentValue: data.currentValue || '',
      requestedValue: data.requestedValue,
      reason: data.reason,
      supportingDocUrl: data.supportingDocUrl || '',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      const created = await ProfileCorrectionRequest.create(doc);
      return created.toObject();
    }

    const list = persistentStorage.get('profileCorrections');
    list.unshift(doc);
    persistentStorage.set('profileCorrections', list);
    return doc;
  },

  async findByStudent(studentId) {
    if (isDbConnected()) {
      return ProfileCorrectionRequest.find({ studentId }).sort({ createdAt: -1 }).lean();
    }
    const list = persistentStorage.get('profileCorrections');
    return list.filter((c) => c.studentId === studentId);
  },

  async findAll({ status = '' } = {}) {
    if (isDbConnected()) {
      const filter = status ? { status } : {};
      return ProfileCorrectionRequest.find(filter).sort({ createdAt: -1 }).lean();
    }
    const list = persistentStorage.get('profileCorrections');
    return status ? list.filter((c) => c.status === status) : list;
  },

  async updateStatus(requestId, { status, reviewedBy, reviewNotes }) {
    if (isDbConnected()) {
      return ProfileCorrectionRequest.findOneAndUpdate(
        { requestId },
        { $set: { status, reviewedBy, reviewNotes, reviewedAt: new Date() } },
        { new: true }
      ).lean();
    }

    const list = persistentStorage.get('profileCorrections');
    const index = list.findIndex((c) => c.requestId === requestId);
    if (index === -1) return null;
    list[index] = {
      ...list[index],
      status,
      reviewedBy,
      reviewNotes,
      reviewedAt: new Date().toISOString()
    };
    persistentStorage.set('profileCorrections', list);
    return list[index];
  }
};

export default correctionRepository;

