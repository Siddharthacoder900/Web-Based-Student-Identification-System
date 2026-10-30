import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, IdCard, MoreHorizontal, Plus, QrCode,
  ScanLine, ShieldCheck, UserPlus, Users,
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api, getApiError } from '../services/api'

const statisticCards = [
  { key: 'totalStudents', label: 'Total Students', icon: Users, tone: 'purple', note: 'Registered student records' },
  { key: 'activeCards', label: 'Active ID Cards', icon: IdCard, tone: 'yellow', note: 'Currently active identity cards' },
  { key: 'totalVerifications', label: 'QR Verifications', icon: QrCode, tone: 'pink', note: 'Successful identity checks' },
  { key: 'pendingRegistrations', label: 'Pending Registrations', icon: UserPlus, tone: 'blue', note: 'Awaiting identity verification' },
]

const actions = [
  { title: 'Register Student', detail: 'Open the student registration form', to: '/admin/students/add', icon: Plus, tone: 'purple' },
  { title: 'Scan College ID', detail: 'Verify an ID using its QR code', to: '/admin/qr-scanner', icon: ScanLine, tone: 'yellow' },
  { title: 'Generate ID Card', detail: 'Issue or print a student identity card', to: '/admin/id-cards', icon: IdCard, tone: 'pink' },
  { title: 'Verify Student', detail: 'Review recent verification activity', to: '/admin/verifications', icon: ShieldCheck, tone: 'blue' },
]

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function chartMonths(activity = []) {
  const counts = new Map(activity.map(item => [`${item._id.year}-${item._id.month}`, item]))
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - 5 + index)
    const month = date.getMonth() + 1
    return {
      label: date.toLocaleString('en', { month: 'short' }),
      registrations: counts.get(`${date.getFullYear()}-${month}`)?.registrations || 0,
      verifications: counts.get(`${date.getFullYear()}-${month}`)?.verifications || 0,
    }
  })
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data }) => setOverview(data))
      .catch(reason => setError(getApiError(reason)))
      .finally(() => setLoading(false))
  }, [])

  const months = chartMonths(overview?.activity)
  const maximum = Math.max(1, ...months.flatMap(month => [month.registrations, month.verifications]))

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of your college student identification system.">
      <div className="overview-welcome">
        <div>
          <span className="overview-eyebrow">BIET IDENTITY PORTAL</span>
          <h2>Welcome to BIET Identity Portal.</h2>
          <p>Manage student records and identity verification from one central platform.</p>
        </div>
        <div className="overview-welcome-mark"><IdCard size={35} /></div>
      </div>

      {error && <div className="form-message error" role="alert">{error}</div>}
      <section className="overview-stats" aria-label="Student identity statistics">
        {statisticCards.map(({ key, label, icon: Icon, tone, note }) => (
          <article className={`overview-stat pastel-${tone}`} key={key}>
            <div className="overview-stat-heading"><span className="overview-stat-icon"><Icon size={20} /></span><span className="demo-tag">LIVE</span></div>
            <div className="overview-stat-value">{loading ? '—' : (overview?.statistics[key] ?? 0).toLocaleString()}</div>
            <h3>{label}</h3>
            <p>{note}</p>
          </article>
        ))}
      </section>

      <div className="overview-main-grid">
        <section className="overview-panel activity-panel">
          <div className="overview-panel-heading">
            <div><span className="abc-kicker">DATABASE ACTIVITY</span><h3>Student registrations</h3><p>New records created in the last six months</p></div>
            <span className="activity-legend"><i /> Registrations <i className="legend-indigo" /> Verifications</span>
          </div>
          <div className="activity-chart" role="img" aria-label="Monthly student registrations from the database">
            {months.map(item => (
              <div className="activity-month" key={`${item.label}-${item.registrations}`}>
                <div className="activity-bars">
                  <span className="activity-bar registrations-bar" style={{ height: `${(item.registrations / maximum) * 100}%`, display: item.registrations ? 'block' : 'none' }} title={`${item.registrations} registrations`} />
                  <span className="activity-bar verifications-bar" style={{ height: `${(item.verifications / maximum) * 100}%`, display: item.verifications ? 'block' : 'none' }} title={`${item.verifications} verifications`} />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="activity-chart-note">{loading ? 'Loading activity…' : 'Registration counts are sourced from student records.'}</div>
        </section>

        <section className="overview-panel quick-actions-panel">
          <div className="overview-panel-heading">
            <div><span className="abc-kicker">GET STARTED</span><h3>Quick actions</h3><p>Common administration tasks</p></div>
          </div>
          <div className="overview-actions">
            {actions.map(({ title, detail, to, icon: Icon, tone }) => (
              <Link className="overview-action" to={to} key={title}>
                <span className={`overview-action-icon pastel-${tone}`}><Icon size={18} /></span>
                <span className="overview-action-copy"><strong>{title}</strong><small>{detail}</small></span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="overview-panel recent-overview-panel">
        <div className="overview-panel-heading">
          <div><span className="abc-kicker">LATEST RECORDS</span><h3>Recent students</h3><p>Most recently registered student records</p></div>
          <Link className="overview-view-all" to="/admin/students">View directory <ArrowRight size={15} /></Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>STUDENT</th><th>ENROLLMENT NUMBER</th><th>BRANCH</th><th>DATE ADDED</th><th>VERIFICATION</th><th /></tr></thead>
            <tbody>
              {overview?.recentStudents.map(student => (
                <tr key={student._id}>
                  <td><div className="student-cell"><span className="student-avatar blue">{initials(student.fullName)}</span><b>{student.fullName}</b></div></td>
                  <td>{student.enrollmentNumber}</td>
                  <td>{student.branch}</td>
                  <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td><span className={`pill ${student.verificationStatus.toLowerCase()}`}>{student.verificationStatus}</span></td>
                  <td><Link to={`/admin/students/${student._id}`} className="table-more" aria-label={`View ${student.fullName}`}><MoreHorizontal size={18} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !overview?.recentStudents.length && <div className="empty-state">No student records are registered yet.</div>}
          {loading && <div className="empty-state">Loading student records…</div>}
        </div>
      </section>
    </AdminLayout>
  )
}
