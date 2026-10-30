import Student from '../models/Student.js'
import IDCard from '../models/IDCard.js'
import VerificationLog from '../models/VerificationLog.js'

export async function dashboardOverview(req, res) {
  const active = { studentStatus: 'Active' }
  const [totalStudents, activeCards, verifiedRecords, pendingRegistrations, totalVerifications, recentStudents, registrations, verifications, qrCodesGenerated] = await Promise.all([
    Student.countDocuments({ studentStatus: { $ne: 'Archived' } }),
    IDCard.countDocuments({ cardStatus: 'Active' }),
    Student.countDocuments({ ...active, verificationStatus: 'Verified' }),
    Student.countDocuments({ ...active, verificationStatus: 'Pending' }),
    VerificationLog.countDocuments({ verificationStatus: 'Verified' }),
    Student.find({ studentStatus: { $ne: 'Archived' } }).select('fullName enrollmentNumber branch verificationStatus createdAt').sort({ createdAt: -1 }).limit(5).lean(),
    Student.aggregate([
      { $match: { studentStatus: { $ne: 'Archived' }, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    VerificationLog.aggregate([
      { $match: { verificationStatus: 'Verified', verifiedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } } },
      { $group: { _id: { year: { $year: '$verifiedAt' }, month: { $month: '$verifiedAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    IDCard.countDocuments(),
  ])
  const activityByMonth = new Map()
  for (const row of registrations) activityByMonth.set(`${row._id.year}-${row._id.month}`, { registrations: row.count, verifications: 0 })
  for (const row of verifications) {
    const key = `${row._id.year}-${row._id.month}`
    activityByMonth.set(key, { ...activityByMonth.get(key), verifications: row.count })
  }
  res.json({
    statistics: { totalStudents, activeCards, verifiedRecords, pendingRegistrations, totalVerifications, qrCodesGenerated },
    recentStudents,
    activity: [...activityByMonth.entries()].map(([key, counts]) => {
      const [year, month] = key.split('-').map(Number)
      return { _id: { year, month }, ...counts }
    }),
  })
}

export async function publicStatistics(req, res) {
  const [totalRegisteredStudents, activeStudentIds, verifiedStudentRecords, qrCodesGenerated, totalIdentityVerifications] = await Promise.all([
    Student.countDocuments({ studentStatus: { $ne: 'Archived' } }),
    IDCard.countDocuments({ cardStatus: 'Active' }),
    Student.countDocuments({ verificationStatus: 'Verified', studentStatus: 'Active' }),
    IDCard.countDocuments(),
    VerificationLog.countDocuments({ verificationStatus: 'Verified' }),
  ])
  res.json({ totalRegisteredStudents, activeStudentIds, verifiedStudentRecords, qrCodesGenerated, totalIdentityVerifications })
}
