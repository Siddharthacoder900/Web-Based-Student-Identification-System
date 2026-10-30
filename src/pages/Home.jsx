import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  GraduationCap,
  IdCard,
  LockKeyhole,
  MapPin,
  QrCode,
  ScanLine,
  Sparkles,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Brand from '../components/Brand'
import { api } from '../services/api'

const impactCards = [
  { key: 'totalRegisteredStudents', label: 'Total Registered Students', tone: 'purple', icon: Users },
  { key: 'activeStudentIds', label: 'Active Student IDs', tone: 'yellow', icon: IdCard },
  { key: 'verifiedStudentRecords', label: 'Verified Student Records', tone: 'pink', icon: ShieldCheck },
  { key: 'qrCodesGenerated', label: 'QR Codes Generated', tone: 'peach', icon: QrCode },
  { key: 'totalIdentityVerifications', label: 'Identity Verifications', tone: 'blue', icon: ScanLine },
]

const infoCards = [
  {
    id: 'about-card',
    title: 'About BIET',
    description: 'Bansal Institute of Engineering and Technology is based in Lucknow, Uttar Pradesh.',
    tone: 'purple',
    icon: GraduationCap,
  },
  {
    id: 'student-identity',
    title: 'Student Identity',
    description: 'A central place for authorized college administrators to manage student identity records.',
    tone: 'yellow',
    icon: IdCard,
  },
  {
    id: 'student-verification',
    title: 'QR Verification',
    description: 'Student identity verification is designed around unique QR codes and permitted record details.',
    tone: 'pink',
    icon: QrCode,
  },
  {
    id: 'contact',
    title: 'Contact Us',
    description: 'Bansal Institute of Engineering and Technology, Lucknow, Uttar Pradesh.',
    tone: 'blue',
    icon: MapPin,
  },
]

export default function Home() {
  const [statistics, setStatistics] = useState(null)
  const [statsUnavailable, setStatsUnavailable] = useState(false)

  useEffect(() => {
    api.get('/public/stats')
      .then(({ data }) => setStatistics(data))
      .catch(() => setStatsUnavailable(true))
  }, [])

  return (
    <div className="public-page abc-home">
      <header className="public-header abc-header">
        <div className="wrap abc-header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#about-biet">About BIET</a>
            <a href="#student-verification">Student Verification</a>
            <a href="#contact">Contact Us</a>
            <Link className="nav-login" to="/admin/login">Administrator Login <ArrowRight size={15} /></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="abc-hero">
          <div className="wrap abc-hero-inner">
            <div className="abc-hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> BIET DIGITAL IDENTITY PORTAL</div>
              <h1>One College.<br /><span>One Secure Identity.</span></h1>
              <p className="hero-description">
                A smarter way to register, manage and verify student identities at Bansal Institute of Engineering and Technology, Lucknow.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#impact">Explore the System <ArrowDown size={16} /></a>
                <Link className="secondary-button" to="/admin/login">Administrator Login</Link>
                <a className="text-button" href="#student-verification">Verify Student <ArrowRight size={16} /></a>
              </div>
              <div className="hero-trust"><LockKeyhole size={16} /> College identity records, managed with care</div>
            </div>

            <div className="abc-hero-art" aria-label="Student identity portal illustration">
              <div className="hero-art-note note-purple"><CheckCircle2 size={17} /> Student record verified</div>
              <div className="hero-art-card">
                <div className="hero-card-top">
                  <div className="hero-card-brand"><Brand /></div>
                  <span className="hero-card-chip">STUDENT IDENTITY</span>
                </div>
                <div className="hero-card-body">
                  <div className="hero-card-avatar"><GraduationCap size={34} /></div>
                  <div className="hero-card-lines">
                    <span>STUDENT NAME</span><strong>Student identity record</strong>
                    <span>INSTITUTION</span><strong>BIET · Lucknow</strong>
                  </div>
                </div>
                <div className="hero-card-bottom">
                  <div><strong>ONE SECURE IDENTITY</strong><small>Digital student identity portal</small></div>
                  <div className="hero-qr"><QrCode size={42} /></div>
                </div>
              </div>
              <div className="hero-art-note note-yellow"><ShieldCheck size={17} /> Identity-first, college-managed</div>
              <span className="hero-art-spark spark-one" aria-hidden="true"><Sparkles size={25} /></span>
              <span className="hero-art-spark spark-two" aria-hidden="true"><Sparkles size={19} /></span>
            </div>
          </div>
        </section>

        <section className="impact-section" id="impact">
          <div className="wrap">
            <div className="abc-section-heading">
              <span className="abc-kicker">A CLEARER VIEW OF STUDENT IDENTITY</span>
              <h2>Our Digital Identity Impact</h2>
              <p>{statsUnavailable ? 'Live statistics are temporarily unavailable.' : 'Current counts from BIET student identity records.'}</p>
            </div>
            <div className="impact-grid">
              {impactCards.map(({ key, label, tone, icon: Icon }) => (
                <article className={`impact-card pastel-${tone}`} key={label}>
                  <div className="impact-card-top"><span className="impact-icon"><Icon size={21} /></span><span className="demo-tag">{statistics ? 'LIVE' : statsUnavailable ? 'OFFLINE' : '…'}</span></div>
                  <div className="impact-value">{statistics ? (statistics[key] ?? 0).toLocaleString() : '—'}</div>
                  <h3>{label}</h3>
                  <p>{statistics ? 'Current database count' : 'Live database statistics'}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="abc-info-section" id="about-biet">
          <div className="wrap">
            <div className="abc-section-heading">
              <span className="abc-kicker">BUILT FOR BIET</span>
              <h2>Student identity, made simpler.</h2>
              <p>A focused digital workflow for registering students, managing identity records and supporting verification.</p>
            </div>
            <div className="abc-info-grid">
              {infoCards.map(({ id, title, description, tone, icon: Icon }) => (
                <article className={`abc-info-card pastel-${tone}`} key={id} id={id}>
                  <span className="info-card-icon"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  {id === 'contact' ? <span className="info-card-location"><MapPin size={14} /> Lucknow, Uttar Pradesh</span> : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="abc-cta-section">
          <div className="wrap abc-cta">
            <div>
              <span className="abc-kicker">BIET IDENTITY PORTAL</span>
              <h2>Manage student identity with confidence.</h2>
              <p>Administrator access keeps student records within the college workflow.</p>
            </div>
            <Link className="primary-button" to="/admin/login">Go to Admin Portal <ArrowUpRight size={17} /></Link>
          </div>
        </section>
      </main>

      <footer className="public-footer abc-footer">
        <div className="wrap">
          <div className="abc-footer-main">
            <div className="abc-footer-brand"><Brand /><p>Bansal Institute of Engineering and Technology<br />Lucknow, Uttar Pradesh</p></div>
            <div className="abc-footer-links">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms and Conditions</a>
              <a href="#contact">Contact Us</a>
            </div>
          </div>
          <div className="abc-footer-bottom">
            <span>© 2026 Bansal Institute of Engineering and Technology, Lucknow.</span>
            <span>BIET Student Identification System</span>
          </div>
          <div className="abc-footer-legal">
            <p id="privacy"><strong>Privacy Policy:</strong> Policy details should be provided by BIET.</p>
            <p id="terms"><strong>Terms and Conditions:</strong> Terms should be provided by BIET.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
