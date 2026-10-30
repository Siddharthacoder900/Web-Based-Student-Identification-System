import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Download, Filter, Plus, Search, Eye } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api, getApiError } from '../services/api'

export default function Students() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStudents = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/students', {
        params: {
          search: search || undefined,
          course: course || undefined,
          branch: branch || undefined,
          currentSemester: semester || undefined,
          studentStatus: status || undefined,
          page,
        },
        signal,
      })
      setStudents(data.students)
      setPages(data.pages)
      setTotal(data.total)
    } catch (reason) {
      if (reason.code !== 'ERR_CANCELED') setError(getApiError(reason))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [search, course, branch, semester, status, page])

  useEffect(() => {
    const controller = new AbortController()
    loadStudents(controller.signal)
    return () => controller.abort()
  }, [loadStudents])

  async function exportCsv() {
    try {
      const { data } = await api.get('/students/export.csv', {
        responseType: 'blob',
        params: { search: search || undefined, course: course || undefined, branch: branch || undefined, currentSemester: semester || undefined, studentStatus: status || undefined },
      })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'biet-students.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      setError(getApiError(reason))
    }
  }

  async function archiveStudent(student) {
    if (!window.confirm(`Archive ${student.fullName}? Active cards will be revoked.`)) return
    try {
      await api.delete(`/students/${student._id}`)
      setNotice(`${student.fullName} was archived.`)
      await loadStudents()
    } catch (reason) {
      setError(getApiError(reason))
    }
  }

  return <AdminLayout title="Manage Students" subtitle="Search and manage registered student identity records.">
    <div className="toolbar">
      <div className="search-box"><Search size={18}/><input aria-label="Search students" placeholder="Search by name, enrollment number or branch..." value={search} onChange={event => { setSearch(event.target.value); setPage(1) }}/></div>
      <button className="outline-button" type="button" onClick={() => { setCourse(''); setBranch(''); setSemester(''); setStatus(''); setPage(1) }}><Filter size={16}/> Clear filters</button>
      <button className="outline-button" type="button" onClick={exportCsv}><Download size={16}/> Export CSV</button>
      <Link className="primary-button" to="/admin/students/add"><Plus size={17}/> Add student</Link>
    </div>
    <div className="student-filters">
      <label>Course<select value={course} onChange={event => { setCourse(event.target.value); setPage(1) }}><option value="">All courses</option><option>B.Tech</option><option>M.Tech</option><option>MBA</option><option>Diploma</option><option>Other</option></select></label>
      <label>Branch<input value={branch} onChange={event => { setBranch(event.target.value); setPage(1) }} placeholder="Filter by branch"/></label>
      <label>Semester<select value={semester} onChange={event => { setSemester(event.target.value); setPage(1) }}><option value="">All semesters</option>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
      <label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option>Active</option><option>Inactive</option></select></label>
    </div>
    {error && <div className="form-message error" role="alert">{error}</div>}
    {notice && <div className="form-message success" role="status">{notice}</div>}
    <section className="panel students-panel">
      <div className="panel-heading"><div><h3>Student directory</h3><p>{loading ? 'Loading records…' : `${total} student records`}</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ENROLLMENT NO.</th><th>BRANCH</th><th>ADMISSION YEAR</th><th>STATUS</th><th>VERIFICATION</th><th>ACTION</th></tr></thead><tbody>
        {students.map(student => <tr key={student._id}>
          <td><div className="student-cell"><span className="student-avatar blue">{student.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><b>{student.fullName}</b></div></td>
          <td>{student.enrollmentNumber}</td><td>{student.branch}</td><td>{student.admissionYear || '—'}</td>
          <td><span className={`pill ${student.studentStatus.toLowerCase()}`}>{student.studentStatus}</span></td>
          <td><span className={`pill ${student.verificationStatus.toLowerCase()}`}>{student.verificationStatus}</span></td>
          <td className="student-actions"><Link className="table-more" to={`/admin/students/${student._id}`} aria-label={`View ${student.fullName}`}><Eye size={17}/></Link><button className="table-more" type="button" onClick={() => archiveStudent(student)} aria-label={`Archive ${student.fullName}`}><Archive size={16}/></button></td>
        </tr>)}
      </tbody></table>
      {!loading && !students.length && <div className="empty-state">No student records match those filters.</div>}
      {loading && <div className="empty-state">Loading student records…</div>}
      </div>
      {pages > 1 && <div className="student-pagination"><span>Page {page} of {pages}</span><div><button type="button" className="outline-button" disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</button><button type="button" className="outline-button" disabled={page >= pages || loading} onClick={() => setPage(current => current + 1)}>Next</button></div></div>}
    </section>
  </AdminLayout>
}
