import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config/env.js'
import mongoose from 'mongoose'
import { optionalAuth, requireAuth } from './middleware/auth.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import authRoutes from './routes/authRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import idCardRoutes from './routes/idCardRoutes.js'
import verificationRoutes from './routes/verificationRoutes.js'
import { dashboardOverview, publicStatistics } from './controllers/dashboardController.js'
import { verifyQr } from './controllers/verificationController.js'
import rateLimit from 'express-rate-limit'

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.frontendOrigins.includes(origin)) return callback(null, true)
    const error = new Error('This origin is not allowed to access the BIET API.')
    error.status = 403
    callback(error)
  },
  credentials: true,
}))
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
app.use(cookieParser())
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'disconnected' })
})
app.get('/api/public/stats', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }), publicStatistics)
app.use('/api/auth', authRoutes)
app.get('/api/dashboard', requireAuth, dashboardOverview)
app.use('/api/students', studentRoutes)
app.use('/api/id-cards', idCardRoutes)
app.get('/api/verify/:token', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }), optionalAuth, verifyQr)
app.use('/api/verifications', verificationRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
