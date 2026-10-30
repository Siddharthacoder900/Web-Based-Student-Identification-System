import { useEffect, useState } from 'react'
import { Server, ShieldCheck } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { useAuth } from '../auth/AuthContext'
import { api, getApiError } from '../services/api'

export default function Settings() {
  const { user } = useAuth()
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/health')
      .then(({ data }) => setHealth(data))
      .catch(reason => setError(getApiError(reason)))
  }, [])

  return <AdminLayout title="Account Settings" subtitle="Administrator account and BIET identity service status.">
    <div className="settings-grid">
      <section className="panel settings-card"><div className="settings-icon"><ShieldCheck size={21}/></div><span className="abc-kicker">SIGNED-IN ACCOUNT</span><h3>{user?.name}</h3><dl className="verification-details"><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Role</dt><dd>{user?.role}</dd></div></dl><p className="muted">Accounts are provisioned by a system administrator. Public registration is disabled.</p></section>
      <section className="panel settings-card"><div className="settings-icon"><Server size={21}/></div><span className="abc-kicker">SERVICE HEALTH</span><h3>BIET API</h3>{error ? <p className="form-message error" role="alert">{error}</p> : <p className={health?.status === 'ok' ? 'service-healthy' : 'muted'}>{health ? `API ${health.status} · Database ${health.database}` : 'Checking service…'}</p>}<p className="muted">Service health is reported by the running API and database connection.</p></section>
    </div>
  </AdminLayout>
}
