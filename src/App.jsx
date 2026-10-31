import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  Building2,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  IdCard,
  LogOut,
  Mail,
  Plus,
  QrCode,
  ScanFace,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  UserSquare2,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from './lib/api';
import {
  ForgotPasswordPage,
  getRedirectForRole,
  LandingPage,
  LoginPage,
  ResetPasswordPage,
  SignUpPage
} from './components/AuthPages';
import StudentsManager from './components/StudentsManager';
import RegistrationManager from './components/RegistrationManager';
import IdCardManager from './components/IdCardManager';
import FaceScannerManager from './components/FaceScannerManager';
import VerificationAudit from './components/VerificationAudit';
import AttendanceManager from './components/AttendanceManager';
import ReportsManager from './components/ReportsManager';
import UsersManager from './components/UsersManager';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import StaffPortal from './components/StaffPortal';

const navItems = [
  { to: '/admin/dashboard', label: 'Overview', icon: Activity },
  { to: '/admin/registration', label: 'Registration', icon: UserSquare2 },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/qr-scanner', label: 'Face Recognition & QR Scanner', icon: ScanFace },
  { to: '/admin/verification', label: 'Verification Audit', icon: ShieldCheck },
  { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/admin/id-cards', label: 'ID Cards', icon: IdCard },
  { to: '/admin/reports', label: 'Documents & Reports', icon: FileText },
  { to: '/admin/users', label: 'User & Role Management', icon: UserCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

const ROLE_NAV_PERMISSIONS = {
  super_admin: [
    '/admin/dashboard',
    '/admin/registration',
    '/admin/students',
    '/admin/qr-scanner',
    '/admin/verification',
    '/admin/attendance',
    '/admin/id-cards',
    '/admin/reports',
    '/admin/users',
    '/admin/settings'
  ],
  admission_admin: [
    '/admin/dashboard',
    '/admin/registration',
    '/admin/students',
    '/admin/id-cards',
    '/admin/reports'
  ],
  verification_operator: [
    '/admin/dashboard',
    '/admin/qr-scanner',
    '/admin/verification',
    '/admin/attendance'
  ]
};

const chartData = [
  { name: 'Jan', students: 90, verified: 78 },
  { name: 'Feb', students: 120, verified: 105 },
  { name: 'Mar', students: 150, verified: 132 },
  { name: 'Apr', students: 220, verified: 205 },
  { name: 'May', students: 260, verified: 239 },
  { name: 'Jun', students: 310, verified: 289 }
];

const defaultForm = {
  fullName: '',
  email: '',
  phone: '',
  course: '',
  year: '1st Year',
  branch: 'CSE',
  rollNumber: '',
  enrollmentNumber: '',
  status: 'active',
  verificationStatus: 'verified'
};

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((response) => {
        if (active) {
          setUser(response.data.user);
          setDemoMode(response.data.demoMode === true);
        }
      })
      .catch((error) => {
        if (active && error.response?.status !== 401 && error.response?.status !== 503) {
          console.error('Unable to verify the current session.', error);
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) setUser(null);
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const login = async (credential, password, requestedRole) => {
    const response = await api.post('/auth/login', { credential, password, requestedRole });
    const nextUser = response.data.user;
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <div>
      <Routes>
        <Route
          path="/"
          element={
            authLoading ? (
              <AuthLoading />
            ) : user ? (
              <Navigate to={getRedirectForRole(user.role)} replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="/login"
          element={
            authLoading ? (
              <AuthLoading />
            ) : user ? (
              <Navigate to={getRedirectForRole(user.role)} replace />
            ) : (
              <LoginPage onLogin={login} user={user} demoMode={demoMode} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            authLoading ? (
              <AuthLoading />
            ) : user ? (
              <Navigate to={getRedirectForRole(user.role)} replace />
            ) : (
              <SignUpPage user={user} onAuthenticated={setUser} />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Administrator Portal Routes */}
        <Route
          path="/admin/*"
          element={
            authLoading ? (
              <AuthLoading />
            ) : user ? (
              user.role === 'admin' ? (
                <AuthenticatedLayout user={user} onLogout={logout} />
              ) : (
                <Navigate to={getRedirectForRole(user.role)} replace />
              )
            ) : (
              <Navigate to="/login?role=admin" replace />
            )
          }
        />

        {/* Student Portal Routes */}
        <Route
          path="/student/*"
          element={
            authLoading ? (
              <AuthLoading />
            ) : user ? (
              user.role === 'student' ? (
                <StudentPortal user={user} onLogout={logout} />
              ) : (
                <Navigate to={getRedirectForRole(user.role)} replace />
              )
            ) : (
              <Navigate to="/login?role=student" replace />
            )
          }
        />

        {/* Faculty / Teacher Portal Routes */}
        <Route
          path="/teacher/*"
          element={
            authLoading ? (
              <AuthLoading />
            ) : user ? (
              user.role === 'teacher' ? (
                <TeacherPortal user={user} onLogout={logout} />
              ) : (
                <Navigate to={getRedirectForRole(user.role)} replace />
              )
            ) : (
              <Navigate to="/login?role=teacher" replace />
            )
          }
        />

        {/* Campus Staff Portal Routes */}
        <Route
          path="/staff/*"
          element={
            authLoading ? (
              <AuthLoading />
            ) : user ? (
              user.role === 'staff' ? (
                <StaffPortal user={user} onLogout={logout} />
              ) : (
                <Navigate to={getRedirectForRole(user.role)} replace />
              )
            ) : (
              <Navigate to="/login?role=staff" replace />
            )
          }
        />

        {/* Shortcuts for Backward-compatibility */}
        <Route path="/students" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/students" />} />
        <Route path="/registration" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/registration" />} />
        <Route path="/id-cards" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/id-cards" />} />
        <Route path="/qr-scanner" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/qr-scanner" />} />
        <Route path="/verification" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/verification" />} />
        <Route path="/attendance" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/attendance" />} />
        <Route path="/reports" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/reports" />} />
        <Route path="/users" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/users" />} />
        <Route path="/settings" element={<DashboardRedirect user={user} loading={authLoading} to="/admin/settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function AuthLoading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#FFF9EF] text-[#20234A]">Checking sign-in...</div>;
}

function DashboardRedirect({ user, loading, to }) {
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to={getRedirectForRole(user.role)} replace />;
  return <Navigate to={to} replace />;
}

function AccessDenied({ role, module }) {
  const roleTitle =
    role === 'admission_admin'
      ? 'Admission Administrator'
      : role === 'verification_operator'
      ? 'Verification Operator'
      : role;

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-soft my-12">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-[#20234A]">Institutional Access Restricted</h2>
      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
        Your assigned administrator profile (<span className="font-semibold text-amber-800">{roleTitle}</span>) does not have privileges to access the <span className="font-semibold text-[#20234A]">{module}</span> module.
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        Please contact a BIET Super Administrator if your operational duties require provisioning of this privilege.
      </p>
      <div className="mt-6">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-[#20234A] px-4 py-2.5 text-xs font-semibold text-white shadow-soft transition hover:bg-[#1a1c3d]"
        >
          Return to Operations Center
        </Link>
      </div>
    </div>
  );
}

function AuthenticatedLayout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const adminRole = user.adminRole || 'super_admin';
  const allowedNavs = ROLE_NAV_PERMISSIONS[adminRole] || ROLE_NAV_PERMISSIONS.super_admin;
  const visibleNavItems = navItems.filter((item) => allowedNavs.includes(item.to));

  return (
    <div className="flex min-h-screen bg-bgMain text-textMain">
      <aside className={`${collapsed ? 'w-20' : 'w-72'} hidden border-r border-slate-200 bg-[#20234A] p-4 text-white lg:flex lg:flex-col`}>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <LogoMark />
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">BIET</div>
                <div className="max-w-40 text-[9px] font-medium leading-tight text-slate-300">Web-Based Student Identification System</div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="space-y-2">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-500 text-white shadow-soft' : 'text-slate-200 hover:bg-white/5 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4" />
              {!collapsed ? label : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
              {(user.fullName || 'AD').slice(0, 2).toUpperCase()}
            </div>
            {!collapsed ? (
              <div>
                <div className="text-sm font-semibold">{user.fullName || 'Administrator'}</div>
                <div className="text-xs text-indigo-200 capitalize">
                  {user.adminRole === 'super_admin'
                    ? 'Super Administrator'
                    : user.adminRole === 'admission_admin'
                    ? 'Admission Administrator'
                    : user.adminRole === 'verification_operator'
                    ? 'Verification Operator'
                    : user.role || 'Administrator'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <LogoMark />
                  </div>
                  <div>
                    <div className="text-base font-bold text-textMain">BIET</div>
                    <div className="max-w-40 text-[9px] leading-tight text-textMuted">Smart Campus Identification</div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-indigo-600">Operations Center</p>
                <h1 className="text-2xl font-semibold text-textMain">Smart Campus Student Identification</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-slate-300 hover:text-textMain">
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLogoutError('');
                  try {
                    await onLogout();
                  } catch {
                    setLogoutError('Unable to end your server session. Please try again.');
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {logoutError ? (
          <div role="alert" className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {logoutError}
          </div>
        ) : null}

        <main className="p-6">
          <Routes>
            <Route path="dashboard" element={<OverviewPage />} />
            <Route
              path="registration"
              element={
                allowedNavs.includes('/admin/registration') ? (
                  <RegistrationManager />
                ) : (
                  <AccessDenied role={adminRole} module="Student Registration" />
                )
              }
            />
            <Route
              path="students"
              element={
                allowedNavs.includes('/admin/students') ? (
                  <StudentsManager />
                ) : (
                  <AccessDenied role={adminRole} module="Student Records" />
                )
              }
            />
            <Route
              path="qr-scanner"
              element={
                allowedNavs.includes('/admin/qr-scanner') ? (
                  <FaceScannerManager />
                ) : (
                  <AccessDenied role={adminRole} module="Biometric & QR Scanner" />
                )
              }
            />
            <Route
              path="verification"
              element={
                allowedNavs.includes('/admin/verification') ? (
                  <VerificationAudit />
                ) : (
                  <AccessDenied role={adminRole} module="Verification Audit" />
                )
              }
            />
            <Route
              path="attendance"
              element={
                allowedNavs.includes('/admin/attendance') ? (
                  <AttendanceManager />
                ) : (
                  <AccessDenied role={adminRole} module="Attendance Management" />
                )
              }
            />
            <Route
              path="id-cards"
              element={
                allowedNavs.includes('/admin/id-cards') ? (
                  <IdCardManager />
                ) : (
                  <AccessDenied role={adminRole} module="ID Card Center" />
                )
              }
            />
            <Route
              path="reports"
              element={
                allowedNavs.includes('/admin/reports') ? (
                  <ReportsManager />
                ) : (
                  <AccessDenied role={adminRole} module="Documents & Reports" />
                )
              }
            />
            <Route
              path="users"
              element={
                allowedNavs.includes('/admin/users') ? (
                  <UsersManager />
                ) : (
                  <AccessDenied role={adminRole} module="User & Role Management" />
                )
              }
            />
            <Route
              path="settings"
              element={
                allowedNavs.includes('/admin/settings') ? (
                  <SettingsPage />
                ) : (
                  <AccessDenied role={adminRole} module="System Settings" />
                )
              }
            />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function OverviewPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, verified: 0, faceEnrolled: 0, todayVerifications: 0 });
  const [students, setStudents] = useState([]);
  const [chartData, setChartData] = useState([
    { name: 'CSE', students: 3, verified: 3 },
    { name: 'ECE', students: 1, verified: 1 },
    { name: 'MBA', students: 1, verified: 0 }
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const [studentRes, statsRes, vrfStatsRes] = await Promise.all([
          api.get('/students'),
          api.get('/students/stats'),
          api.get('/verification/stats')
        ]);
        const list = studentRes.data.students || [];
        setStudents(list);

        const sStats = statsRes.data?.stats || {};
        const vStats = vrfStatsRes.data?.stats || {};

        setStats({
          total: sStats.total ?? list.length,
          active: sStats.active ?? list.filter((s) => s.studentStatus === 'Active').length,
          verified: sStats.verified ?? list.filter((s) => s.verificationStatus === 'Verified').length,
          faceEnrolled: sStats.faceEnrolled ?? list.filter((s) => s.biometric?.enrolled).length,
          todayVerifications: vStats.today ?? 0
        });

        // Compute real branch distribution for the chart
        const branchCounts = {};
        list.forEach((s) => {
          const dept = s.branch ? s.branch.split(' ')[0] : (s.course || 'General');
          branchCounts[dept] = (branchCounts[dept] || 0) + 1;
        });

        const dynamic = Object.keys(branchCounts).map((dept) => ({
          name: dept,
          students: branchCounts[dept],
          verified: Math.min(branchCounts[dept], list.filter((s) => (s.branch && s.branch.startsWith(dept)) && s.verificationStatus === 'Verified').length)
        }));

        if (dynamic.length > 0) {
          setChartData(dynamic);
        }
      } catch (error) {
        console.error('Unable to load overview stats', error);
      }
    };

    load();
  }, []);

  const recentStudents = students.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Students" value={stats.total} delta="Institutional Enrollment" tone="indigo" />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Verified Records" value={stats.verified} delta="Active Credentials" tone="green" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active Students" value={stats.active} delta="Current Academic Status" tone="teal" />
        <StatCard icon={<ScanFace className="h-5 w-5" />} label="Face Enrolled" value={stats.faceEnrolled} delta="Biometric Templates" tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Department Distribution</p>
              <h2 className="mt-2 text-2xl font-semibold text-textMain">Academic Program Density</h2>
            </div>
            <div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600">Live MongoDB</div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#4338CA" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#4338CA" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Area type="monotone" dataKey="students" stroke="#4338CA" fillOpacity={1} fill="url(#colorStudents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Security & Biometrics</p>
              <h2 className="mt-2 text-xl font-semibold text-textMain">System Overview</h2>
            </div>
            <FileText className="h-5 w-5 text-indigo-500" />
          </div>

          <div className="space-y-4">
            {[
              { label: 'Active Students', value: stats.active, color: 'bg-emerald-500' },
              { label: 'Verified Status', value: stats.verified, color: 'bg-indigo-500' },
              { label: 'Face Profiles Enrolled', value: stats.faceEnrolled, color: 'bg-purple-500' },
              { label: 'Today Verifications', value: stats.todayVerifications, color: 'bg-amber-400' }
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                  <span>{item.label}</span>
                  <span className="font-semibold text-textMain">{item.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`${item.color} h-full rounded-full`} style={{ width: `${Math.min((item.value / Math.max(stats.total, 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Latest records</p>
            <h2 className="mt-2 text-2xl font-semibold text-textMain">Recent student registrations</h2>
          </div>
          <NavLink to="/admin/students" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-textMain hover:bg-slate-100 transition">
            View All in Directory
          </NavLink>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Roll Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Course & Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Biometrics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {recentStudents.length ? (
                recentStudents.map((student) => (
                  <tr key={student.studentId || student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.fullName} className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-textMain text-xs">{student.fullName}</div>
                          <div className="text-[11px] text-slate-500">{student.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-indigo-700">{student.rollNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{student.course} • {student.branch}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.studentStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {student.studentStatus || student.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.biometric?.enrolled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        {student.biometric?.enrolled ? 'Enrolled' : 'Not Enrolled'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No student records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/students');
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Unable to Load students', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase();

    if (!query) return students;
    return students.filter((student) =>
      [student.fullName, student.studentId, student.rollNumber, student.enrollmentNumber, student.email]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [search, students]);

  const toggleStatus = async (student) => {
    const nextStatus = student.status === 'active' ? 'inactive' : 'active';

    try {
      await api.patch(`/students/${student.studentId}/status`, {
        status: nextStatus,
        verificationStatus: nextStatus === 'active' ? 'verified' : 'pending'
      });
      fetchStudents();
    } catch (error) {
      console.error('Unable to update status', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Manage records</p>
            <h2 className="mt-2 text-3xl font-semibold text-textMain">Students directory</h2>
          </div>
          <div className="relative max-w-md w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 outline-none transition focus:border-indigo-500 focus:bg-white"
              placeholder="Search by name, ID, roll number..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading student data...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ID Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredStudents.length ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-textMain">{student.fullName}</div>
                            <div className="text-sm text-slate-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.studentId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.course}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleStatus(student)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-textMain transition hover:border-indigo-300 hover:text-indigo-700"
                        >
                          {student.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No students match the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RegistrationPage() {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleExportOCR = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setProcessing(true);
    setError('');

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrText(`Processing OCR: ${Math.min(Math.round(m.progress * 100), 100)}%`);
          }
        }
      });

      const text = result.data.text;
      setOcrText(text || 'No text detected.');

      const extracted = {
        fullName: findByRegex(text, /name\s*[:\-]?\s*([A-Z][A-Za-z .'-]+)/i) || '',
        email: findByRegex(text, /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i) || '',
        phone: findByRegex(text, /(\+?91[\s-]?[0-9]{10}|[0-9]{10})/) || '',
        course: findByRegex(text, /(B\.Tech|M\.Tech|MBA|BCA|B\.Sc|B\.Com|MCA|B\.E)[^\n]*/i) || 'B.Tech Computer Science',
        branch: findByRegex(text, /(?:Branch|Department)\s*[:\-]?\s*([A-Za-z ]+)/i) || 'CSE',
        rollNumber: findByRegex(text, /(?:Roll|Roll Number|Roll No)\s*[:\-]?\s*([A-Z0-9-]+)/i) || '',
        enrollmentNumber: findByRegex(text, /(?:Enrollment|Enrollment Number|Enrolment)\s*[:\-]?\s*([A-Z0-9-]+)/i) || ''
      };

      setForm((current) => ({ ...current, ...extracted }));
    } catch (err) {
      setError('OCR extraction failed. Please try another image.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await api.post('/students', form);
      setMessage(`Student registered successfully: ${response.data.student.studentId}`);
      setForm(defaultForm);
      setOcrText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to register student.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Onboard</p>
          <h2 className="mt-2 text-3xl font-semibold text-textMain">Register student</h2>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-textMain">ID card scan</div>
                <div className="text-sm text-textMuted">Upload physical card for OCR extraction</div>
              </div>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-white px-4 py-8 text-center transition hover:border-indigo-400">
              <input type="file" accept="image/*" onChange={handleExportOCR} className="hidden" />
              <div className="mb-2 rounded-full bg-indigo-100 p-3 text-indigo-600">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-textMain">Choose image or photo</span>
              <span className="mt-1 text-xs text-textMuted">PNG, JPG, JPEG supported</span>
            </label>

            {processing ? <div className="mt-4 text-sm text-indigo-700">{ocrText || 'Extracting details...'}</div> : null}
            {ocrText && !processing ? <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">{ocrText}</div> : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} />
              <Field label="Email" type="email" name="email" value={form.email} onChange={handleChange} />
              <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
              <Field label="Course" name="course" value={form.course} onChange={handleChange} />
              <Field label="Year" name="year" value={form.year} onChange={handleChange} />
              <Field label="Branch" name="branch" value={form.branch} onChange={handleChange} />
              <Field label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={handleChange} />
              <Field label="Enrollment Number" name="enrollmentNumber" value={form.enrollmentNumber} onChange={handleChange} />
            </div>

            {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

            <div className="flex justify-end">
              <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500">
                Confirm registration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function IdCardsPage() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/students');
        setStudents(response.data.students || []);
      } catch (error) {
        console.error('Unable to load ID cards', error);
      }
    };

    load();
  }, []);

  const downloadCard = (student) => {
    const pdf = new jsPDF();
    pdf.setFillColor(32, 35, 74);
    pdf.rect(0, 0, 210, 60, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text('BIET Identity Card', 15, 25);
    pdf.setFontSize(10);
    pdf.text('Bansal Institute of Engineering and Technology', 15, 35);

    pdf.setTextColor(20, 20, 40);
    pdf.setFontSize(18);
    pdf.text(student.fullName, 15, 80);
    pdf.setFontSize(11);
    pdf.text(`Student ID: ${student.studentId}`, 15, 92);
    pdf.text(`Course: ${student.course}`, 15, 102);
    pdf.text(`Roll Number: ${student.rollNumber}`, 15, 112);
    pdf.text(`Branch: ${student.branch}`, 15, 122);
    pdf.text(`Verification: ${student.verificationStatus}`, 15, 132);

    pdf.save(`${student.fullName.replace(/\s+/g, '_')}_card.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Identity cards</p>
          <h2 className="mt-2 text-3xl font-semibold text-textMain">Digital student ID cards</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <div key={student.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#20234A] to-[#4338CA] p-5 text-white shadow-soft">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <LogoMark />
                  </div>
                  <div>
                    <div className="font-semibold">BIET</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-200">Student ID</div>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-100">
                  {student.status}
                </span>
              </div>

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white">
                  {student.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold">{student.fullName}</div>
                  <div className="text-xs text-indigo-100">{student.studentId}</div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-indigo-100">
                <div className="flex items-center justify-between gap-4"><span>Course</span><span className="font-medium text-white">{student.course}</span></div>
                <div className="flex items-center justify-between gap-4"><span>Branch</span><span className="font-medium text-white">{student.branch}</span></div>
                <div className="flex items-center justify-between gap-4"><span>Roll</span><span className="font-medium text-white">{student.rollNumber}</span></div>
              </div>

              <button
                type="button"
                onClick={() => downloadCard(student)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 font-medium text-indigo-700 transition hover:bg-indigo-50"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QRScannerPage() {
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const readerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 10,
      rememberLastUsedCamera: true
    }, false);

    const onScanSuccess = async (decodedText) => {
      setResult(decodedText);
      setStatus('Scanning record...');

      try {
        const response = await api.post('/verification/scan', { query: decodedText });
        setStatus(`Verified: ${response.data.student.fullName}`);
      } catch (error) {
        setStatus('Student not found.');
      }
    };

    scanner.render(onScanSuccess, () => {});
    readerRef.current = scanner;

    return () => {
      if (readerRef.current) {
        readerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Verification</p>
          <h2 className="mt-2 text-3xl font-semibold text-textMain">QR / card scanner</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div id="reader" className="min-h-[360px] w-full overflow-hidden rounded-2xl bg-white" />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Latest scan</div>
              <div className="mt-3 break-all text-lg font-semibold text-textMain">{result || 'Awaiting QR scan...'}</div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-700">
              {status || 'Camera is ready to capture a student QR code or campus ID scan.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/verification/scan', { query });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to verify identity.');
      setResult(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Verification</p>
          <h2 className="mt-2 text-3xl font-semibold text-textMain">Confirm identity</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Student ID, enrollment, or name"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:bg-white"
          />
          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500">
            Verify
          </button>
        </form>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        {result ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <div className="text-xl font-semibold text-emerald-800">{result.status}</div>
                <div className="text-sm text-emerald-700">{result.message}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoRow label="Student" value={result.student.fullName} />
              <InfoRow label="Student ID" value={result.student.id} />
              <InfoRow label="Course" value={result.student.course} />
              <InfoRow label="Branch" value={result.student.branch} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SettingsPage() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [invitationExpiresAt, setInvitationExpiresAt] = useState('');
  const [invitationError, setInvitationError] = useState('');
  const [invitationLoading, setInvitationLoading] = useState(false);

  // Allowlist & domains state
  const [approvedDomains, setApprovedDomains] = useState([]);
  const [authorizedEmails, setAuthorizedEmails] = useState([]);
  const [newAllowEmail, setNewAllowEmail] = useState('');
  const [allowlistError, setAllowlistError] = useState('');
  const [allowlistSuccess, setAllowlistSuccess] = useState('');
  const [allowlistLoading, setAllowlistLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/auth/settings');
      setApprovedDomains(response.data.approvedDomains || []);
      setAuthorizedEmails(response.data.authorizedEmails || []);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const createInvitation = async (event) => {
    event.preventDefault();
    setInvitationError('');
    setInvitationCode('');
    setInvitationLoading(true);

    try {
      const response = await api.post('/auth/invitations', { email: inviteEmail.trim() });
      setInvitationCode(response.data.invitationCode);
      setInvitationExpiresAt(response.data.expiresAt);
    } catch (error) {
      setInvitationError(error.response?.data?.message || 'Unable to create the invitation.');
    } finally {
      setInvitationLoading(false);
    }
  };

  const handleAddAllowlist = async (emailToAdd) => {
    const targetEmail = (typeof emailToAdd === 'string' && emailToAdd.trim()) || newAllowEmail.trim();
    if (!targetEmail) return;
    setAllowlistError('');
    setAllowlistSuccess('');
    setAllowlistLoading(true);
    try {
      const response = await api.post('/auth/allowlist', { email: targetEmail });
      setAuthorizedEmails(response.data.authorizedEmails || []);
      setAllowlistSuccess(`Authorized "${targetEmail}" for administrator invitations.`);
      setNewAllowEmail('');
      setInvitationError('');
    } catch (error) {
      setAllowlistError(error.response?.data?.message || 'Unable to authorize email address.');
    } finally {
      setAllowlistLoading(false);
    }
  };

  const handleRemoveAllowlist = async (emailToRemove) => {
    setAllowlistError('');
    setAllowlistSuccess('');
    try {
      const response = await api.delete('/auth/allowlist', { data: { email: emailToRemove } });
      setAuthorizedEmails(response.data.authorizedEmails || []);
      setAllowlistSuccess(`Removed "${emailToRemove}" from authorized allowlist.`);
    } catch (error) {
      setAllowlistError(error.response?.data?.message || 'Unable to remove email from allowlist.');
    }
  };

  const isEmailUnauthorized = invitationError && (
    invitationError.toLowerCase().includes('not authorized') ||
    invitationError.toLowerCase().includes('allowlist')
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Preferences</p>
          <h2 className="mt-2 text-3xl font-semibold text-textMain">System settings</h2>
        </div>

        {/* Section 1: Invite an Administrator */}
        <section className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <h3 className="font-semibold text-textMain">Invite an administrator</h3>
          <p className="mt-1 text-sm text-slate-600">
            Generate a single-use invitation code for an official institutional address (e.g. @biet.ac.in) or an explicitly approved administrator address (e.g. your approved Gmail). The link expires after 24 hours.
          </p>
          <form onSubmit={createInvitation} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="admin-invitation-email">Administrator email address</label>
            <input
              id="admin-invitation-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              placeholder="e.g. yourname@gmail.com or admin@biet.ac.in"
              required
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={invitationLoading}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {invitationLoading ? 'Creating...' : 'Create invitation'}
            </button>
          </form>

          {invitationError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>{invitationError}</p>
              {isEmailUnauthorized && inviteEmail.trim() ? (
                <button
                  type="button"
                  onClick={() => handleAddAllowlist(inviteEmail.trim())}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Authorize &ldquo;{inviteEmail.trim()}&rdquo; now
                </button>
              ) : null}
            </div>
          ) : null}

          {invitationCode ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-sm font-semibold text-emerald-800">Invitation code created for {inviteEmail.trim()}</p>
              <label className="mt-3 block text-sm font-medium text-textMain" htmlFor="admin-invitation-code">
                Share this single-use code with the invitee to register at <code>/signup</code>:
              </label>
              <input
                id="admin-invitation-code"
                readOnly
                value={invitationCode}
                onFocus={(event) => event.target.select()}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                Expires {new Date(invitationExpiresAt).toLocaleString()}. The single-use token cannot be viewed again once dismissed.
              </p>
            </div>
          ) : null}
        </section>

        {/* Section 2: Approved Administrator Email Configuration */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-textMain">Approved Administrator Email Authorization</h3>
              <p className="text-sm text-slate-600">
                Configure institutional domains and explicitly approved email addresses authorized for administrator registration.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Restrictive Access
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Approved Domains */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Institutional Email Domains</span>
              <p className="mt-1 text-xs text-slate-500">Any address under these domains can be invited by default.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {approvedDomains.length ? (
                  approvedDomains.map((dom) => (
                    <span key={dom} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      @{dom}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">@biet.ac.in (default)</span>
                )}
              </div>
            </div>

            {/* Explicitly Authorized Allowlist */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Approved External / Personal Accounts</span>
              <p className="mt-1 text-xs text-slate-500">Individual authorized emails (such as Gmail) approved for invitations.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {authorizedEmails.length ? (
                  authorizedEmails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllowlist(email)}
                        className="ml-1 text-slate-400 hover:text-red-600"
                        title={`Remove ${email}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No external emails in allowlist yet.</span>
                )}
              </div>
            </div>
          </div>

          {/* Add to Allowlist Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddAllowlist();
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="add-allowlist-email">Add approved email</label>
            <input
              id="add-allowlist-email"
              type="email"
              value={newAllowEmail}
              onChange={(e) => setNewAllowEmail(e.target.value)}
              placeholder="Enter approved Gmail address (e.g. user@gmail.com)"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={allowlistLoading || !newAllowEmail.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Authorize Email
            </button>
          </form>

          {allowlistSuccess ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">{allowlistSuccess}</p>
          ) : null}
          {allowlistError ? (
            <p className="mt-2 text-xs font-medium text-red-600">{allowlistError}</p>
          ) : null}
        </section>

        {/* Section 3: System & Security Configuration Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <SettingCard
            title="Security & Session Policy"
            description="Cryptographic JWT session tokens (8-hour expiry), HTTP-only SameSite cookies, bcrypt password hashing, and role-based access."
          />
          <SettingCard
            title="Administrator Registration Policy"
            description="Public registration is strictly disabled. Signups require a single-use 24-hour invitation code matching authorized domains or the allowlist."
          />
          <SettingCard
            title="Scanner & Verification Settings"
            description="Supports dual-mode verification: QR verification and upcoming high-precision face recognition with informed student biometric consent."
          />
          <SettingCard
            title="Student Records & Privacy"
            description="Comprehensive student lifecycle management, active/inactive overrides, encrypted biometric templates, and printable CR80 identity cards."
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, delta, tone }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-emerald-50 text-emerald-700',
    teal: 'bg-cyan-50 text-cyan-700',
    amber: 'bg-amber-50 text-amber-700'
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <div className="mt-3 text-3xl font-semibold text-textMain">{value}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      </div>
      <div className="mt-4 text-sm font-medium text-emerald-600">{delta}</div>
    </div>
  );
}

function Field({ label, type = 'text', name, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-textMain">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white"
      />
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
      <div className="text-xs uppercase tracking-[0.2em] text-emerald-600">{label}</div>
      <div className="mt-1 font-medium text-textMain">{value}</div>
    </div>
  );
}

function SettingCard({ title, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <div className="font-semibold text-textMain">{title}</div>
      </div>
      <div className="text-sm text-slate-600">{description}</div>
    </div>
  );
}

function findByRegex(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1]?.trim() || match[0]?.trim() || '' : '';
}

function LogoMark() {
  const [hasLogo, setHasLogo] = useState(true);

  if (!hasLogo) return <span className="font-bold text-indigo-100">BIET</span>;

  return (
    <img
      src="/assets/biet-logo.jpg"
      alt="BIET logo"
      className="h-8 w-8 object-contain"
      onError={() => setHasLogo(false)}
    />
  );
}

export default App;
