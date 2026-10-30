import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { currentUser, login, logout } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
})

router.post('/login', loginLimiter, login)
router.post('/logout', logout)
router.get('/me', requireAuth, currentUser)

export default router
