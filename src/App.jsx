import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students = lazy(() => import('./pages/Students'))
const AddStudent = lazy(() => import('./pages/AddStudent'))
const StudentDetails = lazy(() => import('./pages/StudentDetails'))
const IDCards = lazy(() => import('./pages/IDCards'))
const QRScanner = lazy(() => import('./pages/QRScanner'))
const Verifications = lazy(() => import('./pages/Verifications'))
const Settings = lazy(() => import('./pages/Settings'))
const PublicVerification = lazy(() => import('./pages/PublicVerification'))

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="route-loading">Loading BIET portal…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/verify/:token" element={<PublicVerification />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/admin/students/add" element={<ProtectedRoute><AddStudent /></ProtectedRoute>} />
          <Route path="/admin/students/:studentId" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
          <Route path="/admin/id-cards" element={<ProtectedRoute><IDCards /></ProtectedRoute>} />
          <Route path="/admin/qr-scanner" element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />
          <Route path="/admin/verifications" element={<ProtectedRoute><Verifications /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}