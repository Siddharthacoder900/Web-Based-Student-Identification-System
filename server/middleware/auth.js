import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import { config } from '../config/env.js'

export const cookieName = 'biet_session'

export function issueSessionCookie(res, adminId) {
  const token = jwt.sign({ sub: adminId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[cookieName]
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' })
    const payload = jwt.verify(token, config.jwtSecret)
    const admin = await Admin.findOne({ _id: payload.sub, isActive: true }).select('name email role')
    if (!admin) return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' })
    req.admin = admin
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
    }
    next(error)
  }
}

export async function optionalAuth(req, res, next) {
  const token = req.cookies[cookieName]
  if (!token) return next()
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.admin = await Admin.findOne({ _id: payload.sub, isActive: true }).select('name email role')
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return next()
    next(error)
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' })
    }
    next()
  }
}
