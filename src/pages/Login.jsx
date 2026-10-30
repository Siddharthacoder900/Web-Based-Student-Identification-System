import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LockKeyhole, Mail, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react'
import Brand from '../components/Brand'
import { useAuth } from '../auth/AuthContext'
import { getApiError } from '../services/api'

export default function Login() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, loading, sessionError, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      await signIn({ email, password })
      navigate('/admin/dashboard', { replace: true })
    } catch (error) {
      setMessage(getApiError(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="login-page"><p className="muted">Checking administrator session…</p></div>
  if (user) return <Navigate to="/admin/dashboard" replace />

  return (
    <div className="login-page">
      <header className="login-header"><Brand/><Link to="/" className="back-home"><ArrowLeft size={16}/> Back to website</Link></header>
      <main className="login-main">
        <div className="login-art">
          <div className="login-art-icon"><ShieldCheck size={42}/></div>
          <div className="eyebrow light-eyebrow">BIET ADMINISTRATION</div>
          <h1>Manage student identity from one place.</h1>
          <p>Access the administration workspace to manage student records and digital identity cards.</p>
          <div className="login-art-footer">Bansal Institute of Engineering and Technology<br/>Lucknow, Uttar Pradesh</div>
        </div>
        <div className="login-form-panel">
          <div className="login-form-wrap">
            <div className="form-kicker">WELCOME BACK</div><h2>Admin sign in</h2><p className="muted">Enter your administrator credentials to continue.</p>
            <form onSubmit={handleSubmit}>
              <label>Email address</label><div className="input-wrap"><Mail size={18}/><input type="email" placeholder="admin@bietlucknow.ac.in" value={email} onChange={e => setEmail(e.target.value)} required/></div>
              <label>Password</label><div className="input-wrap"><LockKeyhole size={18}/><input type={show ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required/><button type="button" className="show-password" onClick={() => setShow(!show)} aria-label="Toggle password visibility">{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
              {(message || sessionError || location.state?.message) && <div className="form-message error" role="alert">{message || sessionError || location.state.message}</div>}
              <button className="primary-button login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in to dashboard'}</button>
            </form>
            <div className="login-security"><ShieldCheck size={16}/> Authorized college administrators only</div>
            <p className="login-note">Administrator access is provisioned securely by your system administrator.</p>
          </div>
        </div>
      </main>
    </div>
  )
}