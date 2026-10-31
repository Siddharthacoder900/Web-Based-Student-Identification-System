import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  getDemoAdminCredentials,
  isDemoAdminId,
  isDemoAuthRequested
} from '../data/demoAuthProvider.js';
import User from '../models/User.js';
import persistentStorage from '../data/persistentStorage.js';

export const AUTH_COOKIE_NAME = 'biet_session';
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;

export const hasAuthConfiguration = () => Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
});

export const setAuthCookie = (res, user) => {
  const token = jwt.sign(
    {
      sub: String(user._id || user.id),
      role: user.role || 'admin',
      adminRole: user.adminRole || (user.role === 'admin' ? 'super_admin' : 'none'),
      identifier: user.identifier || null,
      studentId: user.studentId || null,
      teacherId: user.teacherId || null,
      staffId: user.staffId || null,
      version: user.authVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'biet-web-based-student-identification-system' }
  );
  res.cookie(AUTH_COOKIE_NAME, token, { ...cookieOptions(), maxAge: SESSION_MAX_AGE });
};

export const setDemoAuthCookie = (res, user) => {
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role || 'admin',
      adminRole: user.adminRole || 'super_admin',
      identifier: user.identifier || null,
      studentId: user.studentId || null,
      teacherId: user.teacherId || null,
      staffId: user.staffId || null,
      version: 0,
      provider: 'demo'
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'biet-web-based-student-identification-system' }
  );
  res.cookie(AUTH_COOKIE_NAME, token, { ...cookieOptions(), maxAge: SESSION_MAX_AGE });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
};

export const authenticate = async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  if (!hasAuthConfiguration()) {
    return res.status(503).json({ message: 'Authentication is not configured. Contact the system administrator.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'biet-web-based-student-identification-system'
    });
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }

  // 1. Demo Auth Provider Handler
  if (decoded.provider === 'demo') {
    // If it's a demo account (Admin, Student, Teacher, Staff)
    const users = persistentStorage.get('users');
    const persistentUser = users.find((u) => u.id === decoded.sub);

    if (persistentUser) {
      req.user = {
        id: persistentUser.id,
        email: persistentUser.email,
        identifier: persistentUser.identifier,
        fullName: persistentUser.fullName,
        role: persistentUser.role,
        adminRole: persistentUser.adminRole || (persistentUser.role === 'admin' ? 'super_admin' : 'none'),
        studentId: persistentUser.studentId || null,
        teacherId: persistentUser.teacherId || null,
        staffId: persistentUser.staffId || null,
        demoMode: true
      };
      req.authProvider = 'demo';
      return next();
    }

    const demo = getDemoAdminCredentials();
    if (demo && isDemoAdminId(decoded.sub)) {
      req.user = {
        id: demo.id,
        email: demo.email,
        identifier: 'ADMIN-001',
        role: demo.role,
        adminRole: 'super_admin',
        fullName: demo.fullName,
        demoMode: true
      };
      req.authProvider = 'demo';
      return next();
    }

    clearAuthCookie(res);
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }

  // 2. Database Connection Handler
  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.findById(decoded.sub);
      if (!user || decoded.version !== user.authVersion) {
        clearAuthCookie(res);
        return res.status(401).json({ message: 'Invalid or expired session.' });
      }

      req.user = {
        id: String(user._id),
        email: user.email,
        identifier: user.identifier,
        role: user.role,
        adminRole: user.adminRole || (user.role === 'admin' ? 'super_admin' : 'none'),
        studentId: user.studentId,
        teacherId: user.teacherId,
        staffId: user.staffId,
        fullName: user.fullName,
        demoMode: false
      };
      req.authProvider = 'mongodb';
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // 3. Persistent Local Store Fallback (When MongoDB Atlas is unconfigured in development)
  const users = persistentStorage.get('users');
  const user = users.find((u) => u.id === decoded.sub);
  if (!user || decoded.version !== user.authVersion) {
    clearAuthCookie(res);
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }

  req.user = {
    id: user.id,
    email: user.email,
    identifier: user.identifier,
    role: user.role,
    adminRole: user.adminRole || (user.role === 'admin' ? 'super_admin' : 'none'),
    studentId: user.studentId,
    teacherId: user.teacherId,
    staffId: user.staffId,
    fullName: user.fullName,
    demoMode: true
  };
  req.authProvider = 'local-persistent';
  return next();
};

export const authorize = (roles = []) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied. Requires one of [${roles.join(', ')}] role.` });
  }
  return next();
};

export const authorizeAdminRole = (adminRoles = []) => (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }

  // Super admin always has full privileges
  if (req.user.adminRole === 'super_admin') {
    return next();
  }

  if (!adminRoles.includes(req.user.adminRole)) {
    return res.status(403).json({
      message: `Access denied. Requires one of the following administrator privileges: [${adminRoles.join(', ')}].`
    });
  }

  return next();
};
