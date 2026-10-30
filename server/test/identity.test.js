import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { access } from 'node:fs/promises'

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/biet_identity_tests'
process.env.JWT_SECRET ||= 'test-only-secret-that-is-long-enough-for-tests'
process.env.PUBLIC_APP_URL ||= 'http://localhost:5173'

const { createQrToken, hashQrToken } = await import('../services/qrService.js')
const { createStudentSchema, updateStudentSchema } = await import('../validators/student.js')
const { removePhotograph, savePhotograph, uploadDirectory } = await import('../services/photoService.js')
const app = (await import('../app.js')).default

let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve))
})

test('student registration validates required fields and normalizes enrollment numbers', () => {
  const parsed = createStudentSchema.safeParse({
    fullName: '  Test Student ',
    enrollmentNumber: ' biet-1234 ',
    course: 'B.Tech',
    branch: 'Computer Science',
  })

  assert.equal(parsed.success, true)
  assert.equal(parsed.data.fullName, 'Test Student')
  assert.equal(parsed.data.enrollmentNumber, 'BIET-1234')
  assert.equal(parsed.data.currentSemester, null)
})

test('student registration rejects invalid email and does not accept client-set identity status', () => {
  const parsed = createStudentSchema.safeParse({
    fullName: 'Test Student',
    enrollmentNumber: 'BIET-1234',
    email: 'not-an-email',
    course: 'B.Tech',
    branch: 'Computer Science',
    verificationStatus: 'Verified',
  })

  assert.equal(parsed.success, false)
})

test('student updates require at least one editable field', () => {
  assert.equal(updateStudentSchema.safeParse({}).success, false)
  assert.equal(updateStudentSchema.safeParse({ studentStatus: 'Inactive' }).success, true)
  assert.equal(updateStudentSchema.safeParse({ studentStatus: 'Archived' }).success, false)
  const parsed = updateStudentSchema.safeParse({ currentSemester: '', admissionYear: '' })
  assert.equal(parsed.success, true)
  assert.equal(parsed.data.currentSemester, null)
  assert.equal(parsed.data.admissionYear, null)
})

test('QR tokens are random, URL-safe, and represented in storage only by a hash', () => {
  const first = createQrToken()
  const second = createQrToken()

  assert.match(first.token, /^[A-Za-z0-9_-]{40,}$/)
  assert.notEqual(first.token, second.token)
  assert.equal(first.tokenHash, hashQrToken(first.token))
  assert.notEqual(first.tokenHash, first.token)
  assert.match(first.verificationUrl, new RegExp(`/verify/${first.token}$`))
})

test('photograph uploads reject data without a supported image signature', async () => {
  await assert.rejects(
    savePhotograph({ buffer: Buffer.from('not an image') }),
    error => error.status === 400,
  )
})

test('valid JPEG/PNG signatures are stored under a random private filename', async () => {
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Jx8AAAAASUVORK5CYII=', 'base64')
  const filename = await savePhotograph({ buffer })
  try {
    assert.match(filename, /^[0-9a-f-]+\.png$/i)
    await access(path.join(uploadDirectory, filename))
  } finally {
    await removePhotograph(filename)
  }
})

test('HTTP admin data routes reject unauthenticated requests and health reports missing MongoDB', async () => {
  const [students, dashboard, health] = await Promise.all([
    fetch(`${baseUrl}/api/students`),
    fetch(`${baseUrl}/api/dashboard`),
    fetch(`${baseUrl}/api/health`),
  ])
  assert.equal(students.status, 401)
  assert.equal(dashboard.status, 401)
  assert.equal(health.status, 503)
  assert.equal((await health.json()).database, 'disconnected')
})
