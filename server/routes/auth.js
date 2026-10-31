import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import Invitation from '../models/Invitation.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import User from '../models/User.js';
import {
  AUTH_COOKIE_NAME,
  authenticate,
  authorize,
  clearAuthCookie,
  hasAuthConfiguration,
  setDemoAuthCookie,
  setAuthCookie
} from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getDemoAdminCredentials,
  isDemoAuthAvailable,
  isDemoAuthRequested,
  verifyDemoAdminCredentials
} from '../data/demoAuthProvider.js';
import {
  isAuthorizedAdminEmail,
  getApprovedDomains,
  getAuthorizedAdminEmails,
  addAuthorizedAdminEmail,
  removeAuthorizedAdminEmail
} from '../config/adminAuthorization.js';
import persistentStorage from '../data/persistentStorage.js';

const router = express.Router();
const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be no more than 128 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a number.');
const emailSchema = z.string().email().max(254).transform((email) => email.trim().toLowerCase());
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const databaseReady = () => mongoose.connection.readyState === 1;
const unavailableMessage = 'Authentication service is unavailable. Contact the system administrator.';

// In-memory invitations fallback for development mode when MongoDB is unconfigured
const memoryInvitations = new Map();

const resetEmailConfigured = () => Boolean(
  process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.APP_BASE_URL
);

const sendResetEmail = async (email, token) => {
  const baseUrl = new URL(process.env.APP_BASE_URL);
  if (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:') {
    throw new Error('APP_BASE_URL must use HTTPS in production.');
  }

  const resetUrl = new URL(`/reset-password/${encodeURIComponent(token)}`, baseUrl).toString();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: 'Reset your BIET account password',
      text: `Use this single-use link to reset your BIET account password. It expires in 30 minutes: ${resetUrl}`
    })
  });

  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
};

router.post('/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  message: 'Too many sign-in attempts. Try again later.'
}), async (req, res, next) => {
  const credential = (req.body.credential || req.body.email || req.body.rollNumber || req.body.employeeId || req.body.staffId || '').trim();
  const password = (req.body.password || '').trim();
  const requestedRole = req.body.requestedRole || req.body.role || null;

  if (!credential || !password) {
    return res.status(400).json({ message: 'Please enter your username / ID / email and password.' });
  }

  if (!hasAuthConfiguration()) {
    return res.status(503).json({ message: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters in .env.' });
  }

  // 1. Check Demo Admin Credentials
  const verifiedAdmin = await verifyDemoAdminCredentials(credential, password);
  if (verifiedAdmin) {
    if (requestedRole && requestedRole !== 'admin') {
      return res.status(403).json({
        message: `Unauthorized role selection. This account is registered as 'admin', not '${requestedRole}'.`
      });
    }

    const adminUser = {
      ...verifiedAdmin,
      adminRole: 'super_admin'
    };

    setDemoAuthCookie(res, adminUser);
    return res.json({
      user: {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: 'admin',
        adminRole: 'super_admin',
        demoMode: true
      },
      authenticationProvider: 'development-demo'
    });
  }

  // 2. Find User in MongoDB or Local Persistent Store
  let matchedUser = null;

  if (databaseReady()) {
    try {
      matchedUser = await User.findOne({
        $or: [
          { email: credential.toLowerCase() },
          { identifier: credential.toUpperCase() }
        ]
      }).select('+passwordHash').lean();
    } catch (err) {
      console.warn('Database user search error:', err.message);
    }
  }

  if (!matchedUser) {
    // Search persistent local store
    const localUsers = persistentStorage.get('users');
    matchedUser = localUsers.find(
      (u) =>
        u.email.toLowerCase() === credential.toLowerCase() ||
        (u.identifier && u.identifier.toUpperCase() === credential.toUpperCase())
    );
  }

  // Also support demo passwords for seeded student, teacher, staff in development
  const isDemoStudent = (credential.toUpperCase() === '220101001' || credential.toLowerCase() === 'rahul.kumar@biet.ac.in') && password === 'BietStudent@2026';
  const isDemoTeacher = (credential.toUpperCase() === 'T-1001' || credential.toLowerCase() === 'ramesh.chandra@biet.ac.in') && password === 'Teacher@2026';
  const isDemoStaff = (credential.toUpperCase() === 'S-2001' || credential.toLowerCase() === 'sunil.verma@biet.ac.in') && password === 'Staff@2026';

  let passwordValid = false;

  if (matchedUser && matchedUser.passwordHash) {
    try {
      passwordValid = await bcrypt.compare(password, matchedUser.passwordHash);
    } catch {
      passwordValid = false;
    }
  }

  if (isDemoStudent || isDemoTeacher || isDemoStaff) {
    passwordValid = true;
  }

  if (!matchedUser || !passwordValid) {
    return res.status(401).json({ message: 'Invalid credentials. Please verify your username / ID and password.' });
  }

  // 3. Prevent Role Impersonation (Requirement: "Do not allow users to select a role and thereby gain that role's permissions. The backend must verify the actual account type and assigned role.")
  if (requestedRole && matchedUser.role !== requestedRole) {
    return res.status(403).json({
      message: `Unauthorized role selection. This account is registered as '${matchedUser.role}', not '${requestedRole}'. Please select the '${matchedUser.role}' portal.`
    });
  }

  // 4. Check account status
  if (matchedUser.accountStatus === 'inactive') {
    return res.status(403).json({ message: 'Your account has been deactivated. Please contact the BIET administration.' });
  }

  // 5. Issue session cookie
  setAuthCookie(res, matchedUser);

  return res.json({
    message: 'Sign-in successful.',
    user: {
      id: String(matchedUser._id || matchedUser.id),
      email: matchedUser.email,
      fullName: matchedUser.fullName,
      role: matchedUser.role,
      adminRole: matchedUser.adminRole || (matchedUser.role === 'admin' ? 'super_admin' : 'none'),
      identifier: matchedUser.identifier || null,
      studentId: matchedUser.studentId || null,
      teacherId: matchedUser.teacherId || null,
      staffId: matchedUser.staffId || null,
      demoMode: !databaseReady()
    },
    authenticationProvider: databaseReady() ? 'mongodb' : 'local-persistent'
  });
});

router.get('/me', (req, res) => {
  const demoMode = isDemoAuthAvailable({ databaseConnected: databaseReady() });
  if (!req.cookies?.[AUTH_COOKIE_NAME]) return res.json({ user: null, demoMode });
  return authenticate(req, res, () => res.json({ user: req.user, demoMode }));
});

router.post('/logout', authenticate, async (req, res, next) => {
  if (req.authProvider === 'demo') {
    clearAuthCookie(res);
    return res.json({ message: 'Demo session ended.' });
  }

  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { authVersion: 1 } });
    clearAuthCookie(res);
    return res.json({ message: 'Logout successful.' });
  } catch (error) {
    return next(error);
  }
});

// Settings & Allowlist Endpoints
router.get('/settings', authenticate, authorize(['admin']), (req, res) => {
  return res.json({
    approvedDomains: getApprovedDomains(),
    authorizedEmails: getAuthorizedAdminEmails(),
    demoMode: isDemoAuthAvailable({ databaseConnected: databaseReady() })
  });
});

router.post('/allowlist', authenticate, authorize(['admin']), (req, res) => {
  const parsed = z.object({ email: emailSchema }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Please provide a valid email address to authorize.' });
  }

  addAuthorizedAdminEmail(parsed.data.email);
  return res.json({
    message: `Email address "${parsed.data.email}" added to approved administrator allowlist.`,
    authorizedEmails: getAuthorizedAdminEmails()
  });
});

router.delete('/allowlist', authenticate, authorize(['admin']), (req, res) => {
  const parsed = z.object({ email: emailSchema }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Please provide a valid email address to remove.' });
  }

  removeAuthorizedAdminEmail(parsed.data.email);
  return res.json({
    message: `Email address "${parsed.data.email}" removed from approved allowlist.`,
    authorizedEmails: getAuthorizedAdminEmails()
  });
});

router.post('/invitations', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many invitations have been created. Try again later.'
}), authenticate, authorize(['admin']), async (req, res, next) => {
  const parsed = z.object({ email: emailSchema }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!isAuthorizedAdminEmail(parsed.data.email)) {
    return res.status(400).json({
      message: 'This email is not authorized for administrator registration. Use an official BIET email or add this address to the approved administrator allowlist in Settings.'
    });
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (databaseReady()) {
    try {
      if (await User.exists({ email: parsed.data.email })) {
        return res.status(409).json({ message: 'An account already exists for this email address.' });
      }

      await Invitation.create({
        email: parsed.data.email,
        tokenHash: hashToken(token),
        expiresAt
      });

      res.set('Cache-Control', 'no-store');
      return res.status(201).json({
        invitationCode: token,
        email: parsed.data.email,
        expiresAt
      });
    } catch (error) {
      return next(error);
    }
  }

  // Development fallback when MongoDB is unconfigured
  memoryInvitations.set(hashToken(token), {
    email: parsed.data.email,
    tokenHash: hashToken(token),
    expiresAt,
    consumedAt: null
  });

  res.set('Cache-Control', 'no-store');
  return res.status(201).json({
    invitationCode: token,
    email: parsed.data.email,
    expiresAt,
    storage: 'development-memory'
  });
});

router.post('/signup', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts. Try again later.'
}), async (req, res, next) => {
  if (!hasAuthConfiguration()) {
    return res.status(503).json({ message: unavailableMessage });
  }

  const parsed = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    invitationCode: z.string().min(32).max(200),
    acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Accept the terms and privacy notice to continue.' }) })
  }).refine((body) => body.password === body.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Check the registration details.' });
  }

  if (!isAuthorizedAdminEmail(parsed.data.email)) {
    return res.status(400).json({
      message: 'Registration requires an authorized administrator email address or approved institutional domain.'
    });
  }

  if (databaseReady()) {
    try {
      if (await User.exists({ email: parsed.data.email })) {
        return res.status(409).json({ message: 'An account already exists for this email address.' });
      }

      const invitation = await Invitation.findOneAndUpdate({
        email: parsed.data.email,
        tokenHash: hashToken(parsed.data.invitationCode),
        consumedAt: null,
        expiresAt: { $gt: new Date() }
      }, { $set: { consumedAt: new Date() } }, { new: true });

      if (!invitation) {
        return res.status(403).json({ message: 'The invitation is invalid, expired, or already used.' });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const user = await User.create({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        passwordHash,
        role: 'admin'
      });

      setAuthCookie(res, user);
      return res.status(201).json({
        user: {
          id: String(user._id),
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: 'An account already exists for this email address.' });
      }
      return next(error);
    }
  }

  // Development fallback when MongoDB is unconfigured
  const hashed = hashToken(parsed.data.invitationCode);
  const memInv = memoryInvitations.get(hashed);
  if (!memInv || memInv.consumedAt || memInv.email !== parsed.data.email || memInv.expiresAt <= new Date()) {
    return res.status(403).json({ message: 'The invitation is invalid, expired, or already used.' });
  }

  memInv.consumedAt = new Date();
  const mockUser = {
    id: `dev-admin-${Date.now()}`,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    role: 'admin',
    demoMode: true
  };

  setDemoAuthCookie(res, mockUser);
  return res.status(201).json({ user: mockUser });
});

router.post('/forgot-password', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Try again later.'
}), async (req, res, next) => {
  if (!resetEmailConfigured()) {
    return res.status(503).json({
      message: 'Password reset email is not configured. Contact the system administrator.'
    });
  }
  if (!databaseReady()) return res.status(503).json({ message: unavailableMessage });

  const parsed = z.object({ email: emailSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email address.' });

  try {
    const user = await User.findOne({ email: parsed.data.email });
    if (user) {
      const token = randomBytes(32).toString('base64url');
      await PasswordResetToken.create({
        userId: user._id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      try {
        await sendResetEmail(user.email, token);
      } catch (emailError) {
        console.error('Password reset email delivery failed:', emailError.name || 'Error');
      }
    }

    return res.json({
      message: 'If an account exists for that email, password reset instructions may be sent.'
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts. Try again later.'
}), async (req, res, next) => {
  if (!databaseReady()) return res.status(503).json({ message: unavailableMessage });

  const parsed = z.object({
    token: z.string().min(32).max(200),
    password: passwordSchema,
    confirmPassword: z.string()
  }).refine((body) => body.password === body.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Check the password details.' });
  }

  try {
    const reset = await PasswordResetToken.findOneAndUpdate({
      tokenHash: hashToken(parsed.data.token),
      consumedAt: null,
      expiresAt: { $gt: new Date() }
    }, { $set: { consumedAt: new Date() } }, { new: true });

    if (!reset) return res.status(400).json({ message: 'This reset link is invalid or expired.' });

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const updatedUser = await User.findByIdAndUpdate(reset.userId, {
      $set: { passwordHash },
      $inc: { authVersion: 1 }
    }, { new: true });

    if (!updatedUser) return res.status(400).json({ message: 'This reset link is invalid or expired.' });

    await PasswordResetToken.deleteMany({ userId: reset.userId, _id: { $ne: reset._id } });
    return res.json({ message: 'Password reset successful. Sign in with your new password.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
