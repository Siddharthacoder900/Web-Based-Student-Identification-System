import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, UserPlus, ScanLine, Settings, LogOut, Menu, Bell, Home, ChevronDown, ChevronRight, IdCard, X, History } from 'lucide-react'
import { useState } from 'react'
import Brand from './Brand'
import { useAuth } from '../auth/AuthContext'
import { getApiError } from '../services/api'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Manage Students', icon: Users },
  { to: '/admin/students/add', label: 'Add Student', icon: UserPlus },
  { to: '/admin/id-cards', label: 'ID Cards', icon: IdCard },
  { to: '/admin/qr-scanner', label: 'QR Scanner', icon: ScanLine },
  { to: '/admin/verifications', label: 'Verification History', icon: History },
]

const pageDetails = {
  '/admin/dashboard': { label: 'Dashboard', title: 'Dashboard Overview', icon: LayoutDashboard },
  '/admin/students': { label: 'Manage Students', title: 'Manage Students', icon: Users },
  '/admin/students/add': { label: 'Add Student', title: 'Add Student', icon: UserPlus },
  '/admin/id-cards': { label: 'ID Cards', title: 'Student ID Cards', icon: IdCard },
  '/admin/qr-scanner': { label: 'QR Scanner', title: 'QR Verification', icon: ScanLine },
  '/admin/verifications': { label: 'Verification History', title: 'Verification History', icon: History },
  '/admin/settings': { label: 'Settings', title: 'Account Settings', icon: Settings },
}

export default function AdminLayout({ title, subtitle, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const detailPage = location.pathname.startsWith('/admin/students/') && location.pathname !== '/admin/students/add'
  const currentPage = pageDetails[location.pathname] || (detailPage ? {
    label: 'Student Details',
    title: 'Student Details',
    icon: Users,
  } : {
    label: title,
    title: title === 'Dashboard' ? 'Dashboard Overview' : title,
    icon: IdCard,
  })
  const pageDescription = location.pathname === '/admin/dashboard'
    ? 'Manage student records and identity verification from one place.'
    : subtitle
  const initials = user?.name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AD'

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/admin/login', { replace: true })
    } catch (error) {
      navigate('/admin/login', { replace: true, state: { message: 'Sign-out could not be confirmed with the server. ' + getApiError(error) } })
    }
  }

  return (
    <div className="admin-shell">
      {menuOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><Brand light /></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}>
              <Icon size={18} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/admin/settings"><Settings size={18}/> Settings</NavLink>
          <button className="sidebar-signout" type="button" onClick={handleSignOut}><LogOut size={18}/> Sign out</button>
          <div className="sidebar-note">BIET Student Identification System<br/><span>Administration portal</span></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-brand-strip">
            <div className="admin-brand-strip-inner">
              <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu size={21}/></button>
              <div className="admin-header-brand">
                <Brand light />
                <span className="admin-header-brand-divider" />
                <span className="admin-header-brand-label">BIET IDENTITY PORTAL</span>
              </div>
            </div>
          </div>
          <div className="topbar">
            <div className="admin-header-main">
              <div className="admin-header-topline">
                <nav className="breadcrumb" aria-label="Breadcrumb">
                  <Link className="breadcrumb-home" to="/admin/dashboard" aria-label="Dashboard home"><Home size={15}/></Link>
                  <ChevronRight className="breadcrumb-separator" size={14} aria-hidden="true"/>
                  <span className="breadcrumb-section">Administration</span>
                  <ChevronRight className="breadcrumb-separator" size={14} aria-hidden="true"/>
                  <span className="breadcrumb-current" aria-current="page">{currentPage.label}</span>
                </nav>
                <div className="topbar-actions">
                  <div className="notification-wrap">
                    <button
                      className="icon-button notification-button"
                      type="button"
                      aria-label="Notifications"
                      aria-expanded={notificationsOpen}
                      aria-controls="admin-notifications-menu"
                      onClick={() => setNotificationsOpen(!notificationsOpen)}
                    >
                      <Bell size={19}/>
                    </button>
                    {notificationsOpen ? (
                      <div className="admin-notifications-menu" id="admin-notifications-menu" role="status">
                        <div className="admin-notifications-heading">
                          <strong>Notifications</strong>
                          <button type="button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X size={15}/></button>
                        </div>
                        <p>No new notifications.</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="admin-profile-wrap">
                    <button
                      className="admin-profile"
                      type="button"
                      aria-label="Administrator profile menu"
                      aria-expanded={profileOpen}
                      aria-controls="admin-profile-menu"
                      onClick={() => setProfileOpen(!profileOpen)}
                    >
                      <span className="admin-avatar">{initials}</span>
                      <span className="admin-user"><strong>{user?.name || 'Administrator'}</strong><small>{user?.role || 'College Admin'}</small></span>
                      <ChevronDown className={`admin-profile-chevron ${profileOpen ? 'is-open' : ''}`} size={16}/>
                    </button>
                    {profileOpen ? (
                      <div className="admin-profile-menu" id="admin-profile-menu" role="menu">
                        <div className="admin-profile-menu-heading"><strong>{user?.name || 'Administrator'}</strong><span>{user?.email}</span></div>
                        <Link to="/admin/dashboard" role="menuitem" onClick={() => setProfileOpen(false)}><LayoutDashboard size={15}/> Dashboard</Link>
                        <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); handleSignOut() }}><LogOut size={15}/> Sign out</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="admin-header-title-row">
                <div>
                  <span className="admin-workspace-label">ADMINISTRATION WORKSPACE</span>
                  <h1>{currentPage.title}</h1>
                  <p>{pageDescription}</p>
                </div>
                <div className="admin-page-icon" aria-hidden="true"><currentPage.icon size={22}/></div>
              </div>
            </div>
          </div>
        </header>
        <section className="page-content">
          {children}
          <footer className="footer">© 2026 BIET · Smart Student Identification System <span>Made for secure student verification</span></footer>
        </section>
      </main>
    </div>
  )
}