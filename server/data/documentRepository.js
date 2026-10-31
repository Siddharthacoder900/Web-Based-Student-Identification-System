import mongoose from 'mongoose';
import StudentDocument from '../models/StudentDocument.js';
import persistentStorage from './persistentStorage.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const documentRepository = {
  async create(data) {
    const documentId = data.documentId || `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const doc = {
      documentId,
      studentId: data.studentId,
      rollNumber: data.rollNumber.toUpperCase(),
      title: data.title.trim(),
      documentType: data.documentType,
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy: data.uploadedBy || 'admin',
      uploadedAt: new Date().toISOString(),
      verificationStatus: data.verificationStatus || 'Verified',
      notes: data.notes || ''
    };

    if (isDbConnected()) {
      const created = await StudentDocument.create(doc);
      return created.toObject();
    }

    const docs = persistentStorage.get('documents');
    docs.unshift(doc);
    persistentStorage.set('documents', docs);
    return doc;
  },

  async findByStudent(studentId) {
    if (isDbConnected()) {
      return StudentDocument.find({ studentId }).sort({ uploadedAt: -1 }).lean();
    }
    const docs = persistentStorage.get('documents');
    return docs.filter((d) => d.studentId === studentId);
  },

  async findAll({ documentType = '', verificationStatus = '', studentId = '', search = '' } = {}) {
    if (isDbConnected()) {
      const filter = {};
      if (documentType && documentType !== 'All Types') filter.documentType = documentType;
      if (verificationStatus && verificationStatus !== 'All Status') filter.verificationStatus = verificationStatus;
      if (studentId) filter.studentId = studentId;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
          { fileName: { $regex: search, $options: 'i' } }
        ];
      }
      return StudentDocument.find(filter).sort({ uploadedAt: -1 }).lean();
    }

    let docs = persistentStorage.get('documents');
    if (documentType && documentType !== 'All Types') {
      docs = docs.filter((d) => d.documentType === documentType);
    }
    if (verificationStatus && verificationStatus !== 'All Status') {
      docs = docs.filter((d) => d.verificationStatus === verificationStatus);
    }
    if (studentId) {
      docs = docs.filter((d) => d.studentId === studentId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter((d) =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.rollNumber || '').toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q)
      );
    }
    return docs;
  },

  async findById(documentId) {
    if (isDbConnected()) {
      return StudentDocument.findOne({ documentId }).lean();
    }
    const docs = persistentStorage.get('documents');
    return docs.find((d) => d.documentId === documentId) || null;
  },

  async updateStatus(documentId, { verificationStatus, notes = '' }) {
    if (isDbConnected()) {
      return StudentDocument.findOneAndUpdate(
        { documentId },
        { $set: { verificationStatus, notes, updatedAt: new Date() } },
        { new: true }
      ).lean();
    }
    const docs = persistentStorage.get('documents');
    const index = docs.findIndex((d) => d.documentId === documentId);
    if (index === -1) return null;
    docs[index] = {
      ...docs[index],
      verificationStatus,
      notes: notes || docs[index].notes,
      updatedAt: new Date().toISOString()
    };
    persistentStorage.set('documents', docs);
    return docs[index];
  },

  async delete(documentId) {
    if (isDbConnected()) {
      await StudentDocument.findOneAndDelete({ documentId });
      return true;
    }
    const docs = persistentStorage.get('documents');
    persistentStorage.set('documents', docs.filter((d) => d.documentId !== documentId));
    return true;
  }
};

export default documentRepository;

