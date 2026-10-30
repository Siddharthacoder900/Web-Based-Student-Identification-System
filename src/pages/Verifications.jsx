import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { api, getApiError } from '../services/api'

export default function Verifications() {
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/verifications')
      .then(({ data }) => setRecords(data.verifications))
      .catch(reason => setError(getApiError(reason)))
      .finally(() => setLoading(false))
  }, [])

  return <AdminLayout title="Verification History" subtitle="Review student identity checks recorded by the system.">
    {error && <div className="form-message error" role="alert">{error}</div>}
    <section className="panel students-panel">
      <div className="panel-heading"><div><h3>Recent verification activity</h3><p>QR checks are recorded without storing the QR token.</p></div><Link className="outline-button" to="/admin/qr-scanner">Open QR scanner</Link></div>
      <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ENROLLMENT</th><th>METHOD</th><th>RESULT</th><th>VERIFIED AT</th><th>VERIFIER</th></tr></thead><tbody>
        {records.map((record, index) => <tr key={`${record._id || record.verifiedAt}-${index}`}>
          <td>{record.studentId?.fullName || 'Unmatched QR code'}</td><td>{record.studentId?.enrollmentNumber || '—'}</td><td>{record.verificationMethod}</td>
          <td><span className={`pill ${record.verificationStatus.toLowerCase()}`}>{record.verificationStatus}</span>{record.failureReason && <small className="verification-failure">{record.failureReason}</small>}</td>
          <td>{new Date(record.verifiedAt).toLocaleString()}</td><td>{record.verifierId?.name || 'Public verification'}</td>
        </tr>)}
      </tbody></table>
      {!loading && !records.length && <div className="empty-state">No identity verifications have been recorded.</div>}
      {loading && <div className="empty-state">Loading verification history…</div>}
      </div>
    </section>
  </AdminLayout>
}
