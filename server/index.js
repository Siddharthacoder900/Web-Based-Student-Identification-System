import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedDatabase } from './data/store.js';
import { provisionBootstrapAdmin } from './data/bootstrapAdmin.js';
import { initializeDemoAuthProvider, isDemoAuthAvailable } from './data/demoAuthProvider.js';
import { provisionDemoAdmin } from './data/provisionDemoAdmin.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import verificationRoutes from './routes/verification.js';
import teacherRoutes from './routes/teachers.js';
import staffRoutes from './routes/staff.js';
import attendanceRoutes from './routes/attendance.js';
import documentRoutes from './routes/documents.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true
}));
app.use((req, res, next) => {
  res.set('Referrer-Policy', 'no-referrer');
  return next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const database = await connectDB();
await initializeDemoAuthProvider();
if (database) {
  await provisionBootstrapAdmin();
  await provisionDemoAdmin();
}
await seedDatabase();

app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    message: 'Web-Based Student Identification System API is running.',
    database: isDbConnected ? 'connected' : 'unavailable',
    demoMode: isDemoAuthAvailable({ databaseConnected: isDbConnected })
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);

app.use((error, req, res, next) => {
  console.error('Unhandled request error:', error.message || error.name || 'Error');
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const uploadsPath = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`BIET backend running on http://localhost:${port}`);
});
