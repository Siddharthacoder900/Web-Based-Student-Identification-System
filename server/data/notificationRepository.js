import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import persistentStorage from './persistentStorage.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const notificationRepository = {
  async find({ audience = 'all' } = {}) {
    if (isDbConnected()) {
      const filter = audience === 'all' ? {} : { audience: { $in: ['all', audience] } };
      return Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    }
    const notifs = persistentStorage.get('notifications');
    return notifs.filter((n) => n.audience === 'all' || n.audience === audience);
  },

  async create(data) {
    const notificationId = `NOTIF-${Date.now()}`;
    const doc = {
      notificationId,
      title: data.title.trim(),
      message: data.message.trim(),
      audience: data.audience || 'all',
      department: data.department || 'All',
      priority: data.priority || 'Normal',
      createdBy: data.createdBy || 'Administration',
      createdAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      const created = await Notification.create(doc);
      return created.toObject();
    }

    const notifs = persistentStorage.get('notifications');
    notifs.unshift(doc);
    persistentStorage.set('notifications', notifs);
    return doc;
  }
};

export default notificationRepository;

