import bcrypt from 'bcryptjs'
import Admin from '../models/Admin.js'
import { clearSessionCookie, issueSessionCookie } from '../middleware/auth.js'

export async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const admin = await Admin.findOne({ email }).select('+passwordHash')
  if (!admin || !admin.isActive || !(await admin.verifyPassword(password))) {
    return res.status(401).json({ message: 'The email or password is incorrect.' })
  }
  issueSessionCookie(res, admin.id)
  res.json({ user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } })
}

export function logout(req, res) {
  clearSessionCookie(res)
  res.status(204).end()
}

export async function currentUser(req, res) {
  res.json({ user: { id: req.admin.id, name: req.admin.name, email: req.admin.email, role: req.admin.role } })
}
