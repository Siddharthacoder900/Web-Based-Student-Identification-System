import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { listVerifications, verifyQr } from '../controllers/verificationController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many verification requests. Please try again later.' },
})

router.get('/:token', verificationLimiter, verifyQr)
router.get('/', requireAuth, listVerifications)

export default router
