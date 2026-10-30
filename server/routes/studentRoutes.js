import { Router } from 'express'
import { archiveStudent, createStudent, exportStudents, getStudent, getStudentPhotograph, listStudents, updateStudent } from '../controllers/studentController.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { photographUpload } from '../middleware/upload.js'

const router = Router()
router.use(requireAuth)
router.get('/export.csv', requireRoles('Super Admin', 'Administrator'), exportStudents)
router.get('/', listStudents)
router.post('/', requireRoles('Super Admin', 'Administrator'), photographUpload.single('photograph'), createStudent)
router.get('/:studentId/photo', getStudentPhotograph)
router.get('/:studentId', getStudent)
router.patch('/:studentId', requireRoles('Super Admin', 'Administrator'), photographUpload.single('photograph'), updateStudent)
router.delete('/:studentId', requireRoles('Super Admin', 'Administrator'), archiveStudent)

export default router
