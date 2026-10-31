import bcrypt from 'bcryptjs';

const DEMO_ADMIN_ID = 'development-demo-admin';
let demoPasswordHash = null;
let demoMongoUserReady = false;

export const isDemoAuthRequested = () => (
  process.env.NODE_ENV === 'development'
  && process.env.DEMO_AUTH_ENABLED === 'true'
);

export const initializeDemoAuthProvider = async () => {
  demoPasswordHash = null;
  demoMongoUserReady = false;

  if (process.env.DEMO_AUTH_ENABLED === 'true' && process.env.NODE_ENV !== 'development') {
    console.warn('Demo authentication was requested outside development and has been disabled.');
    return false;
  }
  if (!isDemoAuthRequested()) return false;

  const email = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    console.error('Demo authentication is enabled but DEMO_ADMIN_EMAIL or a 12-character DEMO_ADMIN_PASSWORD is missing.');
    return false;
  }

  demoPasswordHash = await bcrypt.hash(password, 12);
  return true;
};

export const getDemoAdminCredentials = () => {
  if (!isDemoAuthRequested() || !demoPasswordHash) return null;

  return {
    id: DEMO_ADMIN_ID,
    email: process.env.DEMO_ADMIN_EMAIL.trim().toLowerCase(),
    fullName: process.env.DEMO_ADMIN_NAME?.trim() || 'BIET Development Demo Administrator',
    role: 'admin',
    authVersion: 0,
    passwordHash: demoPasswordHash
  };
};

export const setDemoMongoUserReady = (ready) => {
  demoMongoUserReady = ready;
};

export const isDemoAuthAvailable = ({ databaseConnected }) => {
  if (
    !getDemoAdminCredentials()
    || !process.env.JWT_SECRET
    || process.env.JWT_SECRET.length < 32
  ) return false;
  return !databaseConnected || demoMongoUserReady;
};

export const verifyDemoAdminCredentials = async (email, password) => {
  const user = getDemoAdminCredentials();
  if (!user || email.trim().toLowerCase() !== user.email) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role
  };
};

export const isDemoAdminId = (id) => id === DEMO_ADMIN_ID;
