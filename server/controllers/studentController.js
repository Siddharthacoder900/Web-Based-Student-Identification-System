import path from 'node:path'
import { access } from 'node:fs/promises'
import Student from '../models/Student.js'
import IDCard from '../models/IDCard.js'
import { createStudentSchema, updateStudentSchema } from '../validators/student.js'
import { removePhotograph, savePhotograph, uploadDirectory } from '../services/photoService.js'

const editableFields = ['fullName', 'enrollmentNumber', 'email', 'mobileNumber', 'course', 'branch', 'currentSemester', 'admissionYear', 'studentStatus']
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function buildStudentQuery(params) {
  const query = {}
  if (params.includeArchived !== 'true') query.studentStatus = { $ne: 'Archived' }
  if (params.search) {
    const search = new RegExp(escapeRegex(String(params.search).trim().slice(0, 100)), 'i')
    query.$or = [{ fullName: search }, { enrollmentNumber: search }, { branch: search }]
  }
  for (const key of ['course', 'studentStatus']) {
    if (params[key]) query[key] = String(params[key]).slice(0, 120)
  }
  if (params.branch) query.branch = new RegExp(escapeRegex(String(params.branch).trim().slice(0, 80)), 'i')
  if (params.currentSemester) {
    const semester = Number(params.currentSemester)
    if (!Number.isInteger(semester) || semester < 1 || semester > 20) {
      const error = new Error('Semester must be a whole number between 1 and 20.')
      error.status = 400
      throw error
    }
    query.currentSemester = semester
  }
  return query
}

export async function listStudents(req, res) {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1))
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 50)))
  const query = buildStudentQuery(req.query)
  const [storedStudents, total] = await Promise.all([
    Student.find(query).select('+photograph -__v').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Student.countDocuments(query),
  ])
  const students = storedStudents.map(({ photograph, ...student }) => ({ ...student, hasPhotograph: Boolean(photograph) }))
  res.json({ students, total, page, pages: Math.ceil(total / limit) })
}

export async function getStudent(req, res) {
  const student = await Student.findById(req.params.studentId).select('+photograph -__v')
  if (!student) return res.status(404).json({ message: 'Student not found.' })
  const record = student.toObject()
  const hasPhotograph = Boolean(record.photograph)
  delete record.photograph
  res.json({ student: { ...record, hasPhotograph } })
}

export async function createStudent(req, res) {
  const parsed = createStudentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Please check the student information.', details: parsed.error.issues.map(issue => issue.message) })
  if (await Student.exists({ enrollmentNumber: parsed.data.enrollmentNumber })) {
    return res.status(409).json({ message: 'That enrollment number is already registered.' })
  }
  let photograph
  try {
    photograph = await savePhotograph(req.file)
    const student = await Student.create({ ...parsed.data, ...(photograph && { photograph }) })
    const record = student.toObject()
    delete record.photograph
    res.status(201).json({ student: { ...record, hasPhotograph: Boolean(photograph) } })
  } catch (error) {
    await removePhotograph(photograph)
    throw error
  }
}

export async function updateStudent(req, res) {
  const parsed = updateStudentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Please check the student information.', details: parsed.error.issues.map(issue => issue.message) })
  const changes = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => editableFields.includes(key)))
  if (changes.enrollmentNumber && await Student.exists({ enrollmentNumber: changes.enrollmentNumber, _id: { $ne: req.params.studentId } })) {
    return res.status(409).json({ message: 'That enrollment number is already registered.' })
  }
  const student = await Student.findById(req.params.studentId).select('+photograph')
  if (!student) return res.status(404).json({ message: 'Student not found.' })
  const previousPhotograph = student.photograph
  let newPhotograph
  try {
    if (req.file) newPhotograph = await savePhotograph(req.file)
    Object.assign(student, changes)
    if (newPhotograph) student.photograph = newPhotograph
    await student.save()
    if (newPhotograph && previousPhotograph) await removePhotograph(previousPhotograph)
    const record = student.toObject()
    delete record.photograph
    res.json({ student: { ...record, hasPhotograph: Boolean(student.photograph) } })
  } catch (error) {
    await removePhotograph(newPhotograph)
    throw error
  }
}

export async function archiveStudent(req, res) {
  const student = await Student.findByIdAndUpdate(req.params.studentId, { studentStatus: 'Archived' }, { new: true })
  if (!student) return res.status(404).json({ message: 'Student not found.' })
  await IDCard.updateMany({ studentId: student.id, cardStatus: 'Active' }, { cardStatus: 'Revoked' })
  res.json({ student, message: 'Student archived; active identity cards were revoked.' })
}

export async function getStudentPhotograph(req, res) {
  const student = await Student.findById(req.params.studentId).select('+photograph')
  if (!student?.photograph) return res.status(404).json({ message: 'No photograph is available for this student.' })
  const file = path.join(uploadDirectory, path.basename(student.photograph))
  await access(file)
  res.sendFile(file)
}

export async function exportStudents(req, res) {
  const students = await Student.find(buildStudentQuery(req.query)).sort({ enrollmentNumber: 1 }).lean()
  const columns = ['fullName', 'enrollmentNumber', 'email', 'mobileNumber', 'course', 'branch', 'currentSemester', 'admissionYear', 'studentStatus', 'verificationStatus']
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [columns.join(','), ...students.map(student => columns.map(key => quote(student[key])).join(','))].join('\r\n')
  res.type('text/csv').attachment('biet-students.csv').send(csv)
}
