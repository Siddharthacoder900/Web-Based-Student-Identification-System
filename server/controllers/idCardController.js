import { randomBytes } from 'node:crypto'
import Student from '../models/Student.js'
import IDCard from '../models/IDCard.js'
import { createQrToken } from '../services/qrService.js'

export async function listCards(req, res) {
  const cards = await IDCard.find({ cardStatus: { $ne: 'Revoked' } })
    .populate({ path: 'studentId', select: 'fullName enrollmentNumber course branch currentSemester admissionYear studentStatus' })
    .sort({ generatedAt: -1 }).lean()
  res.json({ cards })
}

export async function issueCard(req, res) {
  const student = await Student.findById(req.params.studentId)
  if (!student || student.studentStatus !== 'Active') {
    return res.status(404).json({ message: 'An active registered student is required to issue an identity card.' })
  }
  const previous = await IDCard.findOne({ studentId: student.id }).sort({ cardVersion: -1 })
  const version = (previous?.cardVersion || 0) + 1
  const { tokenHash, verificationUrl } = createQrToken()
  const cardNumber = `BIET-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
  await IDCard.updateMany({ studentId: student.id, cardStatus: 'Active' }, { cardStatus: 'Revoked' })
  const card = await IDCard.create({
    studentId: student.id,
    cardNumber,
    qrTokenHash: tokenHash,
    cardStatus: 'Active',
    cardVersion: version,
  })
  const cardRecord = card.toObject()
  delete cardRecord.qrTokenHash
  res.status(201).json({ card: { ...cardRecord, verificationUrl }, student })
}
