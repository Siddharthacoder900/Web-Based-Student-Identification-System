import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save, UserRound } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api, getApiError } from '../services/api'

const emptyStudent = { fullName: '', enrollmentNumber: '', email: '', mobileNumber: '', course: '', branch: '', currentSemester: '', admissionYear: '', studentStatus: 'Active' }

export default function StudentDetails() {
  const { studentId } = useParams()
  const [student, setStudent] = useState(null)
  const [form, setForm] = useState(emptyStudent)
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get(`/students/${studentId}`)
      .then(({ data }) => {
        setStudent(data.student)
        setForm({ ...emptyStudent, ...data.student, currentSemester: data.student.currentSemester || '', admissionYear: data.student.admissionYear || '' })
      })
      .catch(reason => setError(getApiError(reason)))
      .finally(() => setLoading(false))
  }, [studentId])

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, value))
    if (photo) body.append('photograph', photo)
    try {
      const { data } = await api.patch(`/students/${studentId}`, body)
      setStudent(data.student)
      setNotice('Student information saved.')
      setPhoto(null)
    } catch (reason) {
      setError(getApiError(reason))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLayout title="Student Details"><div className="empty-state">Loading student record…</div></AdminLayout>
  if (error && !student) return <AdminLayout title="Student Details"><div className="form-message error" role="alert">{error}</div><Link className="back-link" to="/admin/students"><ArrowLeft size={16}/> Back to student directory</Link></AdminLayout>

  return <AdminLayout title="Student Details" subtitle="Review and update a registered student profile.">
    <Link to="/admin/students" className="back-link"><ArrowLeft size={16}/> Back to student directory</Link>
    {error && <div className="form-message error" role="alert">{error}</div>}
    {notice && <div className="form-message success" role="status">{notice}</div>}
    <form className="panel student-form" onSubmit={save}>
      <div className="form-section-title"><div className="form-section-icon"><UserRound size={19}/></div><div><h3>{student.fullName}</h3><p>Enrollment {student.enrollmentNumber} · Verification: {student.verificationStatus}</p></div></div>
      {student.hasPhotograph && <img className="student-detail-photo" src={`/api/students/${studentId}/photo`} alt={`${student.fullName} student photograph`} />}
      <div className="form-grid">
        <div className="field full"><label>Full name *</label><input value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} required/></div>
        <div className="field"><label>Enrollment number *</label><input value={form.enrollmentNumber} onChange={event => setForm({ ...form, enrollmentNumber: event.target.value })} required/></div>
        <div className="field"><label>Email address</label><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></div>
        <div className="field"><label>Mobile number</label><input value={form.mobileNumber} onChange={event => setForm({ ...form, mobileNumber: event.target.value })}/></div>
        <div className="field"><label>Course *</label><input value={form.course} onChange={event => setForm({ ...form, course: event.target.value })} required/></div>
        <div className="field"><label>Branch *</label><input value={form.branch} onChange={event => setForm({ ...form, branch: event.target.value })} required/></div>
        <div className="field"><label>Current semester</label><input type="number" min="1" max="20" value={form.currentSemester} onChange={event => setForm({ ...form, currentSemester: event.target.value })}/></div>
        <div className="field"><label>Admission year</label><input type="number" min="1900" max="2200" value={form.admissionYear} onChange={event => setForm({ ...form, admissionYear: event.target.value })}/></div>
        <div className="field"><label>Student status</label><select value={form.studentStatus} onChange={event => setForm({ ...form, studentStatus: event.target.value })}><option>Active</option><option>Inactive</option></select></div>
        <div className="field"><label>Replace photograph</label><input type="file" accept="image/png,image/jpeg" onChange={event => setPhoto(event.target.files?.[0] || null)}/></div>
      </div>
      <div className="form-actions"><Link className="outline-button" to="/admin/id-cards">Manage ID card</Link><button className="primary-button" type="submit" disabled={saving}><Save size={17}/>{saving ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  </AdminLayout>
}
