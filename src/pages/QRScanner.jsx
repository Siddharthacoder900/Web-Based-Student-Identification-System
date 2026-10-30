import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, ShieldCheck } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { api, getApiError } from '../services/api'

export default function QRScanner() {
  const scanner = useRef(null)
  const scanning = useRef(false)
  const verificationInProgress = useRef(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function stopCamera() {
    if (scanner.current && scanning.current) {
      await scanner.current.stop()
      scanning.current = false
      setCameraActive(false)
    }
  }

  async function verifyValue(value) {
    if (verificationInProgress.current) return
    const trimmed = value.trim()
    if (!trimmed) return setError('Scan a BIET QR code or paste its verification URL.')
    let token = trimmed
    try {
      const url = new URL(trimmed)
      token = url.pathname.split('/').filter(Boolean).pop() || ''
    } catch {
      // The input may be the token itself rather than a full URL.
    }
    setError('')
    setResult(null)
    verificationInProgress.current = true
    try {
      const { data } = await api.get(`/verify/${encodeURIComponent(token)}`)
      setResult(data)
    } catch (reason) {
      setError(getApiError(reason))
    } finally {
      verificationInProgress.current = false
    }
    if (scanning.current) {
      try {
        await stopCamera()
      } catch {
        setError('Verification completed, but the camera could not be stopped. Please stop it manually.')
      }
    }
  }

  async function startCamera() {
    setError('')
    setResult(null)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      scanner.current = new Html5Qrcode('biet-qr-reader')
      await scanner.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        decodedText => { void verifyValue(decodedText) },
        () => {},
      )
      scanning.current = true
      setCameraActive(true)
    } catch (reason) {
      setError(reason.message || 'Camera access is unavailable. Check your browser permissions or enter the verification URL manually.')
    }
  }

  useEffect(() => () => {
    if (scanner.current && scanning.current) void scanner.current.stop().catch(() => {})
  }, [])

  return <AdminLayout title="QR Verification" subtitle="Scan a BIET identity card or enter its verification URL.">
    {error && <div className="form-message error" role="alert">{error}</div>}
    <div className="verification-tools">
      <section className="panel scanner-panel">
        <div className="overview-panel-heading"><div><span className="abc-kicker">IDENTITY CHECK</span><h3>Scan a student ID</h3><p>Camera access is used only while this scanner is active.</p></div></div>
        <div id="biet-qr-reader" className="qr-reader" />
        <div className="form-actions"><button type="button" className="primary-button" onClick={startCamera} disabled={cameraActive}><Camera size={17}/>{cameraActive ? 'Camera active' : 'Start camera'}</button><button type="button" className="outline-button" onClick={() => stopCamera()} disabled={!cameraActive}><CameraOff size={17}/> Stop camera</button></div>
        <form className="manual-verify-form" onSubmit={event => { event.preventDefault(); verifyValue(manualValue) }}>
          <label htmlFor="verification-url">Or paste a verification URL / token</label>
          <div className="search-box"><input id="verification-url" value={manualValue} onChange={event => setManualValue(event.target.value)} placeholder="https://…/verify/your-token"/></div>
          <button type="submit" className="outline-button">Verify identity</button>
        </form>
      </section>
      <section className="panel scanner-result">
        <div className="overview-panel-heading"><div><span className="abc-kicker">VERIFICATION RESULT</span><h3>{result?.verified ? 'Identity verified' : result ? 'Verification failed' : 'No result yet'}</h3></div></div>
        {result ? <><div className={`verification-result-icon ${result.verified ? 'is-valid' : 'is-invalid'}`}><ShieldCheck size={27}/></div><p>{result.message}</p>{result.student && <dl className="verification-details">
          <div><dt>Student</dt><dd>{result.student.fullName}</dd></div><div><dt>Enrollment</dt><dd>{result.student.enrollmentNumber}</dd></div><div><dt>Course</dt><dd>{result.student.course}</dd></div><div><dt>Branch</dt><dd>{result.student.branch}</dd></div><div><dt>Card number</dt><dd>{result.card.cardNumber}</dd></div><div><dt>Card status</dt><dd>{result.card.cardStatus}</dd></div>
        </dl>}</> : <p className="muted">Verification outcomes are recorded securely in the identity verification history.</p>}
      </section>
    </div>
  </AdminLayout>
}
