import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload, UserRound, Save } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api, getApiError } from '../services/api'

export default function AddStudent() {
  const [form, setForm] = useState({ fullName:'', enrollmentNumber:'', email:'', mobileNumber:'', course:'B.Tech', branch:'', currentSemester:'', admissionYear:'' })
  const [photo, setPhoto] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const update = e => setForm(current => ({ ...current, [e.target.name]:e.target.value }))
  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => payload.append(key, value))
    if (photo) payload.append('photograph', photo)
    try {
      const { data } = await api.post('/students', payload)
      setNotice({ type: 'success', text: `${data.student.fullName} was registered successfully.` })
      setForm({ fullName:'', enrollmentNumber:'', email:'', mobileNumber:'', course:'B.Tech', branch:'', currentSemester:'', admissionYear:'' })
      setPhoto(null)
      e.target.reset()
    } catch (error) {
      setNotice({ type: 'error', text: getApiError(error) })
    } finally {
      setSaving(false)
    }
  }
  return <AdminLayout title="Add Student" subtitle="Create a student profile for the BIET identification system.">
    <Link to="/admin/students" className="back-link"><ArrowLeft size={16}/> Back to student directory</Link>
    <form className="panel student-form" onSubmit={submit}>
      <div className="form-section-title"><div className="form-section-icon"><UserRound size={19}/></div><div><h3>Student information</h3><p>Enter the details exactly as recorded by the college.</p></div></div>
      <div className="form-grid">
        <div className="field full"><label>Full name <b>*</b></label><input name="fullName" value={form.fullName} onChange={update} placeholder="Enter student's full name" required/></div>
        <div className="field"><label>Enrollment number <b>*</b></label><input name="enrollmentNumber" value={form.enrollmentNumber} onChange={update} placeholder="e.g. 2301234567" required/></div>
        <div className="field"><label>Email address</label><input type="email" name="email" value={form.email} onChange={update} placeholder="student@example.com"/></div>
        <div className="field"><label>Mobile number</label><input name="mobileNumber" value={form.mobileNumber} onChange={update} placeholder="Enter mobile number"/></div>
        <div className="field"><label>Course <b>*</b></label><select name="course" value={form.course} onChange={update}><option>B.Tech</option><option>M.Tech</option><option>MBA</option><option>Diploma</option><option>Other</option></select></div>
        <div className="field"><label>Branch / Department <b>*</b></label><select name="branch" value={form.branch} onChange={update} required><option value="">Select department</option><option>Computer Science and Engineering</option><option>Information Technology</option><option>Electronics and Communication</option><option>Mechanical Engineering</option><option>Civil Engineering</option><option>Electrical Engineering</option></select></div>
        <div className="field"><label>Current semester</label><select name="currentSemester" value={form.currentSemester} onChange={update}><option value="">Select semester</option>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></div>
        <div className="field"><label>Admission year</label><input name="admissionYear" value={form.admissionYear} onChange={update} placeholder="e.g. 2023"/></div>
        <div className="field full"><label>Student photograph</label><label className="upload-box"><Upload size={21}/><b>{photo?.name || 'Choose student photograph'}</b><small>JPG or PNG · 5 MB maximum</small><input type="file" accept="image/png,image/jpeg" onChange={e=>setPhoto(e.target.files?.[0] || null)}/></label></div>
      </div>
      {notice&&<div className={`form-message ${notice.type}`} role="status">{notice.text}</div>}
      <div className="form-actions"><button type="reset" className="outline-button" onClick={()=>{setForm({fullName:'',enrollmentNumber:'',email:'',mobileNumber:'',course:'B.Tech',branch:'',currentSemester:'',admissionYear:''});setPhoto(null);setNotice(null)}}>Clear form</button><button className="primary-button" type="submit" disabled={saving}><Save size={17}/> {saving ? 'Saving…' : 'Save student'}</button></div>
    </form>
  </AdminLayout>
}