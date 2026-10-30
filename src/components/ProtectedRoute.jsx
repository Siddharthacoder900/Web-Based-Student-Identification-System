import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <main className="page-content"><p className="muted">Checking administrator session…</p></main>
  return user ? children : <Navigate to="/admin/login" replace />
}
