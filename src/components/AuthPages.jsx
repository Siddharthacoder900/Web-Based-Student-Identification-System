import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck
} from 'lucide-react';
import api from '../lib/api';

const projectTitle = 'Smart Campus Student Identification & Management System';
const collegeName = 'Bansal Institute of Engineering and Technology, Lucknow';
const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#202124] outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100';
const primaryButtonClass = 'flex w-full items-center justify-center gap-2 rounded-xl bg-[#4338CA] px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60';

export const USER_ROLES = [
  {
    id: 'student',
    label: 'Student',
    shortLabel: 'Student',
    icon: GraduationCap,
    credentialLabel: 'Roll Number or Official Email',
    placeholder: 'e.g. 220101001 or rahul.kumar@biet.ac.in',
    description: 'Access digital ID card, academic attendance, and profile records.',
    demo: {
      credential: '220101001',
      password: 'BietStudent@2026',
      label: 'Demo Student (Roll: 220101001)'
    },
    redirectPath: '/student/dashboard'
  },
  {
    id: 'teacher',
    label: 'Teacher',
    shortLabel: 'Teacher',
    icon: BookOpen,
    credentialLabel: 'Employee ID or Official Email',
    placeholder: 'e.g. T-1001 or ramesh.chandra@biet.ac.in',
    description: 'Launch lecture attendance sessions, scan QR codes, and view branch directories.',
    demo: {
      credential: 'T-1001',
      password: 'Teacher@2026',
      label: 'Demo Teacher (ID: T-1001)'
    },
    redirectPath: '/teacher/dashboard'
  },
  {
    id: 'staff',
    label: 'Staff',
    shortLabel: 'Staff',
    icon: ShieldCheck,
    credentialLabel: 'Staff ID or Official Email',
    placeholder: 'e.g. S-2001 or sunil.verma@biet.ac.in',
    description: 'Campus gate security, library clearance, and instant identity verification.',
    demo: {
      credential: 'S-2001',
      password: 'Staff@2026',
      label: 'Demo Staff (ID: S-2001)'
    },
    redirectPath: '/staff/dashboard'
  },
  {
    id: 'admin',
    label: 'Administrator',
    shortLabel: 'Admin',
    icon: Lock,
    credentialLabel: 'Authorized BIET Administrator Email',
    placeholder: 'e.g. admin@biet.ac.in',
    description: 'Manage student registrations, face templates, verification audit, and institutional settings.',
    demo: {
      credential: 'admin@biet.ac.in',
      password: 'BietDemo@2026',
      label: 'Demo Super Admin (admin@biet.ac.in)'
    },
    redirectPath: '/admin/dashboard'
  }
];

export function getRedirectForRole(role) {
  if (role === 'student') return '/student/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'staff') return '/staff/dashboard';
  return '/admin/dashboard';
}

function Logo() {
  const [hasLogo, setHasLogo] = useState(true);

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#4338CA] text-white">
      {hasLogo ? (
        <img
          src="/assets/biet-logo.jpg"
          alt="BIET"
          className="h-full w-full object-contain"
          onError={() => setHasLogo(false)}
        />
      ) : (
        <Building2 aria-hidden="true" className="h-7 w-7" />
      )}
    </span>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-[#e9e2d7] py-5 text-center text-xs text-slate-500">
      <p className="font-medium text-[#20234A]">{projectTitle}</p>
      <p className="mt-1">{collegeName}</p>
      <p className="mt-1 text-slate-400">ISO 9001:2015 Certified · Affiliated with AKTU, Lucknow</p>
    </footer>
  );
}

function BrandHeader() {
  return (
    <header className="flex items-center gap-3">
      <Logo />
      <div className="min-w-0">
        <p className="font-bold text-[#20234A]">BIET</p>
        <p className="text-sm text-slate-600">{collegeName}</p>
      </div>
    </header>
  );
}

function AuthBrandPanel({ eyebrow = 'Smart Campus Identification', description }) {
  return (
    <div className="flex flex-col justify-between bg-[#20234A] p-7 text-white sm:p-10 lg:p-12">
      <div>
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-bold text-lg">BIET</p>
            <p className="text-xs leading-5 text-indigo-100">{collegeName}</p>
          </div>
        </div>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-200">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{projectTitle}</h2>
        <p className="mt-5 max-w-md text-sm leading-6 text-indigo-100 sm:text-base">{description}</p>
      </div>
      <div className="mt-10 space-y-2 border-t border-white/10 pt-6 text-xs text-indigo-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          Role-isolated authentication and session token verification
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-indigo-300" />
          Encrypted biometrics & single-use invite tokens
        </div>
      </div>
    </div>
  );
}

function AuthLayout({ children, narrow = false }) {
  return (
    <div className="min-h-screen bg-[#FFF9EF] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <BrandHeader />
        <main className={`flex flex-1 items-center justify-center py-8 ${narrow ? 'w-full' : ''}`}>
          <div className={`w-full ${narrow ? 'max-w-lg' : 'max-w-5xl'}`}>{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, autoComplete, required = true, ...props }) {
  return (
    <label className="block text-sm font-medium text-[#202124]">
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        className={inputClass}
        {...props}
      />
    </label>
  );
}

function PasswordField({ label, value, onChange, autoComplete = 'current-password', minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-[#202124]">
      {label}
      <span className="relative block">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={128}
          required
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-[#20234A]"
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

function FormNotice({ error, success }) {
  if (!error && !success) return null;

  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${
        error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      {error || success}
    </div>
  );
}

export function LandingPage() {
  return (
    <AuthLayout>
      <div className="space-y-8">
        <section className="grid overflow-hidden rounded-3xl border border-[#eee5d9] bg-white shadow-soft md:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-center bg-[#20234A] px-7 py-10 text-white sm:px-12 sm:py-14">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Smart Campus Identification Architecture
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">BIET · Lucknow</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{projectTitle}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-indigo-100">
              Unified institutional platform powering student identification, AI face recognition, high-speed QR verification, session attendance, and digital credential management for Bansal Institute of Engineering and Technology.
            </p>
          </div>

          <div className="flex flex-col justify-center px-7 py-9 sm:px-10">
            <h2 className="text-xl font-semibold text-[#20234A]">Select Your Portal</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose your institutional account type to sign in.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                to="/login?role=student"
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 transition hover:border-indigo-500 hover:bg-indigo-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-[#4338CA]">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[#20234A]">Student Portal</div>
                    <div className="text-xs text-slate-500">ID card, attendance & profile</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                to="/login?role=teacher"
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 transition hover:border-indigo-500 hover:bg-indigo-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[#20234A]">Faculty Portal</div>
                    <div className="text-xs text-slate-500">Lectures, attendance & classes</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                to="/login?role=staff"
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 transition hover:border-indigo-500 hover:bg-indigo-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[#20234A]">Staff & Security Portal</div>
                    <div className="text-xs text-slate-500">Gate scanning & ID verification</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                to="/login?role=admin"
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 transition hover:border-indigo-500 hover:bg-indigo-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[#20234A]">Administrator Portal</div>
                    <div className="text-xs text-slate-500">Registration, biometrics & settings</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <Link to="/signup" className="font-semibold text-[#4338CA] hover:underline">
                Have an invitation code? Sign up
              </Link>
              <Link to="/forgot-password" className="text-slate-500 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AuthLayout>
  );
}

export function LoginPage({ onLogin, user, demoMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role') || 'student';

  const [activeRole, setActiveRole] = useState(() => {
    const found = USER_ROLES.find((r) => r.id === initialRole);
    return found ? found.id : 'student';
  });

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  const currentRole = USER_ROLES.find((r) => r.id === activeRole) || USER_ROLES[0];

  const handleRoleChange = (roleId) => {
    setActiveRole(roleId);
    setError('');
  };

  const handleQuickFill = (demoData) => {
    if (!demoData) return;
    setCredential(demoData.credential);
    setPassword(demoData.password);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await onLogin(credential.trim(), password, activeRole);
      const destination = getRedirectForRole(loggedUser?.role || activeRole);
      navigate(destination, { replace: true });
    } catch (requestError) {
      if (!requestError.response) {
        setError('Authentication service is unavailable. Contact the system administrator or verify the backend is running.');
      } else {
        const { status, data } = requestError.response;
        if (status === 401) {
          setError(data?.message || 'Invalid credentials. Please verify your ID / email and password.');
        } else if (status === 403) {
          setError(data?.message || 'Unauthorized role selection. Please choose the correct role tab.');
        } else if (status === 400) {
          setError(data?.message || 'Please enter both your identifier / email and password.');
        } else if (status === 409) {
          setError(data?.message || 'Account conflict encountered.');
        } else if (status === 429) {
          setError(data?.message || 'Too many sign-in attempts. Please try again later.');
        } else if (status === 503) {
          setError(data?.message || 'Authentication service is unavailable. Contact the system administrator.');
        } else {
          setError(data?.message || 'Unable to sign in. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <section className="grid overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-soft md:grid-cols-[0.9fr_1.1fr]">
        <AuthBrandPanel
          eyebrow="Smart Campus Access"
          description="A unified and secure identification ecosystem for Bansal Institute of Engineering and Technology, Lucknow."
        />

        <div className="flex items-center justify-center bg-white px-6 py-9 sm:px-10 lg:px-12">
          <div className="w-full max-w-lg">
            <div className="mb-5 flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#4338CA]">
                <ArrowLeft className="h-4 w-4" /> Home
              </Link>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">BIET Lucknow</span>
            </div>

            {demoMode ? (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  DEMO MODE – One-Click Testing Available
                </span>
                <span className="text-[10px] uppercase tracking-wider bg-amber-200/80 px-2 py-0.5 rounded-full">Active</span>
              </div>
            ) : null}

            <h1 className="text-2xl font-bold leading-tight text-[#20234A] sm:text-3xl">Sign in to your account</h1>
            <p className="mt-1 text-sm text-slate-600">Select your role to access your dedicated campus portal.</p>

            {/* Role Selection Tabs */}
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 sm:grid-cols-4">
              {USER_ROLES.map((role) => {
                const Icon = role.icon;
                const isActive = activeRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleChange(role.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-white text-[#4338CA] shadow-sm ring-1 ring-slate-900/5'
                        : 'text-slate-600 hover:bg-white/60 hover:text-[#20234A]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#4338CA]' : 'text-slate-400'}`} />
                    <span>{role.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Description */}
            <div className="mt-3 rounded-xl border border-indigo-50 bg-indigo-50/40 px-3.5 py-2 text-xs text-indigo-900">
              <span className="font-semibold">{currentRole.label} Portal: </span>
              {currentRole.description}
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {location.state?.message ? <FormNotice success={location.state.message} /> : null}

              <Field
                label={currentRole.credentialLabel}
                type="text"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                autoComplete="username"
                maxLength={254}
                placeholder={currentRole.placeholder}
              />

              <PasswordField
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <div className="flex items-center justify-between">
                {/* Demo Quick-Fill Pill */}
                <button
                  type="button"
                  onClick={() => handleQuickFill(currentRole.demo)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
                  title="Quick-fill demo credentials for testing"
                >
                  <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                  Quick fill {currentRole.shortLabel} demo
                </button>

                <Link to="/forgot-password" className="text-xs font-medium text-[#4338CA] hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <FormNotice error={error} />

              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Authenticating...' : `Sign in as ${currentRole.label}`}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            {activeRole === 'admin' ? (
              <p className="mt-5 text-center text-xs text-slate-500">
                Have an invitation code?{' '}
                <Link to="/signup" className="font-semibold text-[#4338CA] hover:underline">
                  Register as Administrator
                </Link>
              </p>
            ) : (
              <p className="mt-5 text-center text-xs text-slate-500">
                Student, Faculty & Staff credentials are provisioned by BIET Administration.
              </p>
            )}
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}

export function SignUpPage({ user, onAuthenticated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    invitationCode: '',
    acceptedTerms: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/admin/dashboard" replace />;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/signup', form);
      onAuthenticated(response.data.user);
      navigate('/admin/dashboard', { replace: true });
    } catch (requestError) {
      if (!requestError.response) {
        setError('Authentication service is unavailable. Contact the system administrator or verify the backend is running.');
      } else {
        setError(requestError.response?.data?.message || 'Unable to complete registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <section className="grid overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-soft md:grid-cols-[0.85fr_1.15fr]">
        <AuthBrandPanel
          eyebrow="Invitation-only registration"
          description="Create an administrator account only with a valid invitation issued by an authorized BIET administrator."
        />
        <div className="flex items-center justify-center bg-white px-6 py-9 sm:px-10 lg:px-12">
          <div className="w-full max-w-lg">
            <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#4338CA]">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#4338CA]">Authorized officials only</p>
            <h1 className="mt-2 text-3xl font-bold text-[#20234A]">Create your account</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Registration requires an official college email and a single-use invitation.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="Full name" value={form.fullName} onChange={update('fullName')} autoComplete="name" minLength={2} maxLength={100} />
              <Field label="Official college email" type="email" value={form.email} onChange={update('email')} autoComplete="email" maxLength={254} placeholder="name@biet.ac.in" />
              <PasswordField label="Password" value={form.password} onChange={update('password')} autoComplete="new-password" minLength={12} />
              <p className="-mt-2 text-xs text-slate-500">Use at least 12 characters with uppercase, lowercase, and a number.</p>
              <PasswordField label="Confirm password" value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" minLength={12} />
              <Field
                label="Invitation code"
                value={form.invitationCode}
                onChange={update('invitationCode')}
                autoComplete="off"
                minLength={32}
                maxLength={200}
              />
              <label className="flex items-start gap-3 text-sm leading-5 text-[#64748B]">
                <input
                  type="checkbox"
                  checked={form.acceptedTerms}
                  onChange={(event) => setForm((current) => ({ ...current, acceptedTerms: event.target.checked }))}
                  required
                  className="mt-1 h-4 w-4 rounded border-[#E2E8F0] text-[#4338CA] focus:ring-indigo-500"
                />
                <span>I acknowledge the BIET administration portal terms and privacy notice.</span>
              </label>
              <FormNotice error={error} />
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-600">
              Already registered? <Link to="/login" className="font-semibold text-[#4338CA] hover:underline">Login</Link>
            </p>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccess(response.data.message);
    } catch (requestError) {
      if (!requestError.response) {
        setError('Authentication service is unavailable. Contact the system administrator or verify the backend is running.');
      } else {
        setError(requestError.response?.data?.message || 'Unable to request a password reset.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout narrow>
      <section className="rounded-3xl border border-[#eee5d9] bg-white p-6 shadow-soft sm:p-10">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#4338CA]">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
        <LockKeyhole className="h-9 w-9 text-[#4338CA]" />
        <h1 className="mt-4 text-3xl font-bold text-[#20234A]">Forgot Password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter your registered email address to request a secure reset link.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <Field label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} />
          <FormNotice error={error} success={success} />
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? 'Submitting...' : 'Request reset link'}
          </button>
        </form>
      </section>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password, confirmPassword });
      navigate('/login', { replace: true, state: { message: 'Password reset successful. Sign in with your new password.' } });
    } catch (requestError) {
      if (!requestError.response) {
        setError('Authentication service is unavailable. Contact the system administrator or verify the backend is running.');
      } else {
        setError(requestError.response?.data?.message || 'Unable to reset the password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout narrow>
      <section className="rounded-3xl border border-[#eee5d9] bg-white p-6 shadow-soft sm:p-10">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#4338CA]">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
        <h1 className="text-3xl font-bold text-[#20234A]">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a strong password for your BIET account.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <PasswordField label="New password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} />
          <p className="-mt-2 text-xs text-slate-500">Use at least 12 characters with uppercase, lowercase, and a number.</p>
          <FormNotice error={error} />
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? 'Updating password...' : 'Reset password'}
          </button>
        </form>
      </section>
    </AuthLayout>
  );
}
