import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import {
  getDemoAdminCredentials,
  setDemoMongoUserReady
} from './demoAuthProvider.js';

export const provisionDemoAdmin = async () => {
  setDemoMongoUserReady(false);
  const demo = getDemoAdminCredentials();
  if (!demo) return false;

  const existing = await User.findOne({ email: demo.email }).select('+passwordHash');
  if (existing) {
    const matches = await bcrypt.compare(process.env.DEMO_ADMIN_PASSWORD, existing.passwordHash);
    if (!matches || existing.role !== 'admin') {
      console.warn('The configured demo email already belongs to a different account; that account was not changed.');
      return false;
    }

    setDemoMongoUserReady(true);
    return true;
  }

  await User.create({
    fullName: demo.fullName,
    email: demo.email,
    passwordHash: demo.passwordHash,
    role: 'admin'
  });
  setDemoMongoUserReady(true);
  console.info('Development demo administrator provisioned in MongoDB.');
  return true;
};
