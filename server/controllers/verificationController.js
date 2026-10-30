import IDCard from '../models/IDCard.js'
import Student from '../models/Student.js'
import VerificationLog from '../models/VerificationLog.js'
import { hashQrToken } from '../services/qrService.js'

export async function verifyQr(req, res) {
  const token = String(req.params.token || '')
  const card = token.length <= 100
    ? await IDCard.findOne({ qrTokenHash: hashQrToken(token) })
    : null
  const student = card ? await Student.findById(card.studentId) : null
  const now = new Date()
  let status = 'Verified'
  let failureReason = ''
  if (!card || !student) {
    status = 'Invalid'
    failureReason = 'Invalid or unknown QR token.'
  } else if (card.cardStatus !== 'Active' || student.studentStatus !== 'Active') {
    status = 'Inactive'
    failureReason = 'The student or identity card is not active.'
  } else if (card.expiryDate && card.expiryDate < now) {
    status = 'Expired'
    failureReason = 'The identity card has expired.'
  }
  await VerificationLog.create({
    studentId: student?._id || null,
    cardId: card?._id || null,
    verificationMethod: 'QR',
    verificationStatus: status,
    verifierId: req.admin?._id || null,
    failureReason,
  })
  if (status === 'Verified' && student.verificationStatus !== 'Verified') {
    await Student.updateOne({ _id: student._id }, { verificationStatus: 'Verified' })
  }
  res.json({
    verified: status === 'Verified',
    status,
    message: status === 'Verified' ? 'This BIET student identity is valid.' : failureReason,
    ...(student && card && {
      student: {
        fullName: student.fullName,
        enrollmentNumber: `${student.enrollmentNumber.slice(0, Math.max(0, student.enrollmentNumber.length - 4)).replace(/./g, '•')}${student.enrollmentNumber.slice(-4)}`,
        course: student.course,
        branch: student.branch,
        currentSemester: student.currentSemester,
        studentStatus: student.studentStatus,
      },
      card: { cardNumber: card.cardNumber, issueDate: card.issueDate, expiryDate: card.expiryDate, cardStatus: card.cardStatus },
    }),
  })
}

export async function listVerifications(req, res) {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
  const logs = await VerificationLog.find()
    .populate('studentId', 'fullName enrollmentNumber branch')
    .populate('verifierId', 'name')
    .sort({ verifiedAt: -1 }).limit(limit).lean()
  res.json({ verifications: logs })
}
