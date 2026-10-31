import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const provisionBootstrapAdmin = async () => {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error('Set both BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters.');
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must include lowercase, uppercase, and numeric characters.');
  }

  if (await User.exists({ role: 'admin' })) {
    console.info('Bootstrap administrator already exists; no account was changed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    fullName: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'BIET Administrator',
    email,
    passwordHash,
    role: 'admin'
  });
  console.info('Initial BIET administrator provisioned from environment configuration.');
};
