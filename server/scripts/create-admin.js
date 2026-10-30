import bcrypt from 'bcryptjs'
import { connectDatabase } from '../db.js'
import Admin from '../models/Admin.js'

function redactConnectionCredentials(message) {
  return String(message).replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi, '$1[REDACTED]@')
}

const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env
if (!name || !email || !password || password.length < 12) {
  console.error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters) in your environment before bootstrapping.')
  process.exit(1)
}

try {
  await connectDatabase()
  const normalizedEmail = email.trim().toLowerCase()
  if (await Admin.exists({ email: normalizedEmail })) {
    throw new Error('An administrator with that email already exists.')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await Admin.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: 'Super Admin' })
  console.info(`Created initial administrator: ${normalizedEmail}`)
} catch (error) {
  console.error(`Administrator setup failed: ${redactConnectionCredentials(error.message)}`)
  process.exitCode = 1
} finally {
  const mongoose = await import('mongoose')
  await mongoose.default.disconnect()
}
