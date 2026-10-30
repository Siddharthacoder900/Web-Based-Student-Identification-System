import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, IdCard } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import Brand from '../components/Brand'
import { api, getApiError } from '../services/api'

function blobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Student photograph could not be read.'))
    reader.readAsDataURL(blob)
  })
}

async function addOfficialLogo(doc) {
  const response = await fetch('/assets/biet-logo.jpg')
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return
  const logo = await blobAsDataUrl(await response.blob())
  const image = await new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('BIET logo could not be loaded.'))
    element.src = logo
  })
  const scale = Math.min(11 / image.naturalWidth, 10 / image.naturalHeight)
  doc.addImage(logo, 'JPEG', 82 - image.naturalWidth * scale, 1.5, image.naturalWidth * scale, image.naturalHeight * scale)
}

export default function IDCards() {
  const [students, setStudents] = useState([])
  const [cards, setCards] = useState([])
  const [issued, setIssued] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/id-cards')])
      .then(([studentResponse, cardResponse]) => {
        setStudents(studentResponse.data.students)
        setCards(cardResponse.data.cards)
      })
      .catch(reason => setError(getApiError(reason)))
      .finally(() => setLoading(false))
  }, [])

  const cardsByStudent = useMemo(() => new Map(cards.map(card => [card.studentId?._id, card])), [cards])

  async function issue(student) {
    setBusy(student._id)
    setError('')
    setNotice('')
    try {
      const { data } = await api.post(`/id-cards/student/${student._id}/issue`)
      const QRCode = (await import('qrcode')).default
      const qrData = await QRCode.toDataURL(data.card.verificationUrl, { width: 256, margin: 1 })
      setIssued(current => ({ ...current, [student._id]: { ...data.card, qrData, student: data.student } }))
      setCards(current => [{ ...data.card, studentId: { _id: student._id } }, ...current.filter(card => card.studentId?._id !== student._id)])
      setNotice(`Identity card ${data.card.cardNumber} is ready. Its new QR token invalidates any earlier card QR.`)
    } catch (reason) {
      setError(getApiError(reason))
    } finally {
      setBusy('')
    }
  }

  async function downloadCard(student, card) {
    setBusy(student._id)
    setError('')
    try {
      const [{ jsPDF }, QRCodeModule] = await Promise.all([import('jspdf'), import('qrcode')])
      const QRCode = QRCodeModule.default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] })
      const qr = await QRCode.toDataURL(card.verificationUrl, { width: 256, margin: 1 })
      doc.setFillColor(49, 46, 129)
      doc.rect(0, 0, 85.6, 13, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('BIET IDENTITY PORTAL', 5, 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      doc.text('Bansal Institute of Engineering and Technology', 5, 9)
      doc.text('Lucknow, Uttar Pradesh', 5, 12)
      await addOfficialLogo(doc)
      doc.setTextColor(32, 35, 74)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(student.fullName, 5, 20, { maxWidth: 49 })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      const details = [
        `Enrollment: ${student.enrollmentNumber}`,
        `Course: ${student.course}`,
        `Branch: ${student.branch}`,
        `Semester: ${student.currentSemester || '—'}  |  Year: ${student.admissionYear || '—'}`,
        `Card: ${card.cardNumber}`,
        `Status: ${card.cardStatus}`,
      ]
      details.forEach((line, index) => doc.text(line, 5, 26 + index * 4.2, { maxWidth: 50 }))
      if (student.hasPhotograph) {
        const { data: photo } = await api.get(`/students/${student._id}/photo`, { responseType: 'blob' })
        const photoData = await blobAsDataUrl(photo)
        const imageType = photo.type === 'image/png' ? 'PNG' : 'JPEG'
        doc.addImage(photoData, imageType, 58, 17, 12, 16)
      } else {
        doc.setDrawColor(170, 170, 170)
        doc.rect(58, 17, 12, 16)
        doc.setFontSize(4)
        doc.text('PHOTO', 61.5, 25.5)
      }
      doc.addImage(qr, 'PNG', 70, 17, 12, 12)
      doc.setFontSize(4.5)
      doc.text('Scan to verify identity', 70, 31)
      doc.setFontSize(4)
      doc.text('BIET issued student identification', 5, 51)
      doc.save(`${student.enrollmentNumber}-BIET-ID.pdf`)
      setNotice('Printable identity card PDF downloaded.')
    } catch (reason) {
      setError(getApiError(reason))
    } finally {
      setBusy('')
    }
  }

  return <AdminLayout title="Student ID Cards" subtitle="Issue, download, and print student identity cards.">
    {error && <div className="form-message error" role="alert">{error}</div>}
    {notice && <div className="form-message success" role="status">{notice}</div>}
    <section className="panel students-panel">
      <div className="panel-heading"><div><h3>Registered students</h3><p>Issue a card to an active student or create a fresh QR token for reprinting.</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ENROLLMENT</th><th>BRANCH</th><th>CARD STATUS</th><th>ACTION</th></tr></thead><tbody>
        {students.map(student => {
          const card = issued[student._id] || cardsByStudent.get(student._id)
          const freshCard = issued[student._id]
          return <tr key={student._id}>
            <td><div className="student-cell"><span className="student-avatar blue">{student.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><b>{student.fullName}</b></div></td>
            <td>{student.enrollmentNumber}</td><td>{student.branch}</td>
            <td><span className={`pill ${(card?.cardStatus || 'pending').toLowerCase()}`}>{card?.cardStatus || 'Not issued'}</span></td>
            <td className="student-actions">
              <button type="button" className="outline-button" disabled={busy === student._id || student.studentStatus !== 'Active'} onClick={() => issue(student)}><IdCard size={15}/>{busy === student._id ? 'Working…' : card ? 'Reissue / rotate QR' : 'Issue card'}</button>
              {freshCard && <button type="button" className="table-more" aria-label={`Download ID card for ${student.fullName}`} disabled={busy === student._id} onClick={() => downloadCard(student, freshCard)}><Download size={17}/></button>}
            </td>
          </tr>
        })}
      </tbody></table>
      {!loading && !students.length && <div className="empty-state">No registered students are available for card issuance.</div>}
      {loading && <div className="empty-state">Loading registered students…</div>}
      </div>
    </section>
    {Object.entries(issued).map(([studentId, card]) => <section className="digital-id-card" key={studentId} aria-label="Issued digital identity card">
      <div className="digital-id-brand"><Brand/><small>Student Identity</small></div>
      <div className="digital-id-body"><div><span className="abc-kicker">STUDENT</span><h2>{card.student.fullName}</h2><p>{card.student.course} · {card.student.branch}</p><p>Enrollment: {card.student.enrollmentNumber}</p><p>Card: {card.cardNumber}</p></div><img className="digital-id-qr" src={card.qrData} alt="QR code for secure student verification"/></div>
      <p className="digital-id-note">Download the PDF for a printable card. Reissuing rotates the QR token and invalidates the previous card QR.</p>
      <Link to={`/admin/students/${card.student._id}`} className="overview-view-all">View student record</Link>
    </section>)}
  </AdminLayout>
}
