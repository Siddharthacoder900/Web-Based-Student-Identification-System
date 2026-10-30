import { Router } from 'express'
import { issueCard, listCards } from '../controllers/idCardController.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)
router.get('/', listCards)
router.post('/student/:studentId/issue', requireRoles('Super Admin', 'Administrator'), issueCard)

export default router
