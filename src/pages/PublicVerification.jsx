import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react'
import Brand from '../components/Brand'
import { api, getApiError } from '../services/api'

export default function PublicVerification() {
  const { token } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get(`/verify/${encodeURIComponent(token)}`)
      .then(({ data }) => { if (active) setResult(data) })
      .catch(reason => { if (active) setError(getApiError(reason)) })
    return () => { active = false }
  }, [token])

  return <main className="verification-page">
    <header className="login-header"><Brand/><span className="verification-header-label">BIET IDENTITY VERIFICATION</span></header>
    <section className="verification-card">
      {result?.verified ? <BadgeCheck size={48} className="verification-success-icon"/> : <ShieldAlert size={48} className="verification-error-icon"/>}
      <span className="form-kicker">BIET STUDENT IDENTITY</span>
      <h1>{error ? 'Verification unavailable' : result?.verified ? 'Identity verified' : result ? 'Identity not verified' : 'Checking identity…'}</h1>
      <p className="muted">{error || result?.message || 'Contacting BIET verification service.'}</p>
      {result?.student && <dl className="verification-details">
        <div><dt>Student</dt><dd>{result.student.fullName}</dd></div>
        <div><dt>Enrollment</dt><dd>{result.student.enrollmentNumber}</dd></div>
        <div><dt>Course</dt><dd>{result.student.course}</dd></div>
        <div><dt>Branch</dt><dd>{result.student.branch}</dd></div>
        <div><dt>Card number</dt><dd>{result.card.cardNumber}</dd></div>
        <div><dt>Card status</dt><dd>{result.card.cardStatus}</dd></div>
      </dl>}
      <div className="login-security"><ShieldCheck size={16}/> Verification is provided by Bansal Institute of Engineering and Technology.</div>
    </section>
  </main>
}
