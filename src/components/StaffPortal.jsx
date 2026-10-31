import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  IdCard,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import api from '../lib/api';

export default function StaffPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('verify');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gateLocation, setGateLocation] = useState('Main Campus Gate');

  // Verification Input
  const [inputRoll, setInputRoll] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Student directory search
  const [studentDirectory, setStudentDirectory] = useState([]);
  const [dirSearch, setDirSearch] = useState('');

  const loadLogs = async () => {
    try {
      const res = await api.get('/verification/logs');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.warn('Error loading verification logs:', err);
    }
  };

  const loadDirectory = async () => {
    try {
      const res = await api.get('/students');
      setStudentDirectory(res.data.students || []);
    } catch (err) {
      console.warn('Error loading student directory:', err);
    }
  };

  useEffect(() => {
    loadLogs();
    loadDirectory();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!inputRoll.trim()) return;
    setVerificationError('');
    setVerifiedStudent(null);
    setVerifying(true);

    try {
      const res = await api.post('/verification/verify-qr', {
        qrToken: inputRoll.trim()
      });
      setVerifiedStudent(res.data.student);
      loadLogs();
    } catch (err) {
      setVerificationError(
        err.response?.data?.message || 'Verification failed. Student not found or identity mismatch.'
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#202124]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#20234A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Building2 className="h-6 w-6 text-emerald-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white">BIET LUCKNOW</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-400/30">
                  Staff & Security Portal
                </span>
              </div>
              <p className="text-xs text-indigo-200 hidden sm:block">
                Campus Security & Gate Access · Staff ID: {user.identifier || 'S-2001'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold">{user.fullName || 'Sunil Verma'}</div>
              <div className="text-xs text-emerald-300">Security Officer</div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="border-t border-white/10 bg-[#1A1D3F]">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
            {[
              { id: 'verify', label: 'Gate Clearance Scanner', icon: ShieldCheck },
              { id: 'logs', label: 'Verification Audit Logs', icon: Clock },
              { id: 'directory', label: 'Student Quick Lookup', icon: Search }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium whitespace-nowrap transition ${
                  activeTab === id
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* TAB 1: Gate Clearance Scanner */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#20234A]">Gate Clearance & Verification</h2>
                <p className="text-sm text-slate-500">
                  Verify student credentials against official BIET records before allowing campus or hostel entry.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <select
                  value={gateLocation}
                  onChange={(e) => setGateLocation(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="Main Campus Gate">Main Campus Gate (Gate 1)</option>
                  <option value="Hostel Checkpoint">Hostel Checkpoint</option>
                  <option value="Central Library">Central Library Entrance</option>
                  <option value="Examination Hall">Examination Hall Desk</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Scan / Input Form */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <h3 className="font-bold text-base text-[#20234A] mb-4 flex items-center gap-2">
                  <ScanFace className="h-5 w-5 text-emerald-600" /> Scan or Enter Student Token
                </h3>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Roll Number or QR Token
                    </label>
                    <input
                      type="text"
                      value={inputRoll}
                      onChange={(e) => setInputRoll(e.target.value)}
                      placeholder="e.g. 220101001 or BIET-QR-TOKEN"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInputRoll('220101001')}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Fill Roll 220101001
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputRoll('220101002')}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Fill Roll 220101002
                    </button>
                  </div>

                  {verificationError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                      <span>{verificationError}</span>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={verifying}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {verifying ? 'Verifying...' : 'Verify Student Clearance'}
                  </button>
                </form>
              </div>

              {/* Verification Result Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <h3 className="font-bold text-base text-[#20234A] mb-4">Verification Result</h3>
                {verifiedStudent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-emerald-400 bg-slate-100 shadow-sm">
                        {verifiedStudent.photoUrl ? (
                          <img
                            src={verifiedStudent.photoUrl}
                            alt={verifiedStudent.fullName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://ui-avatars.com/api/?name=' +
                                encodeURIComponent(verifiedStudent.fullName) +
                                '&background=059669&color=fff';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-emerald-800 font-bold">
                            {verifiedStudent.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-[#20234A]">{verifiedStudent.fullName}</h4>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Clearance Approved
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">Roll: {verifiedStudent.rollNumber}</p>
                        <p className="text-xs text-slate-600">
                          {verifiedStudent.course} · {verifiedStudent.branch} ({verifiedStudent.academicYear})
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Enrollment Status</span>
                        <div className="font-semibold text-emerald-700">{verifiedStudent.studentStatus || 'Active'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Biometric Verification</span>
                        <div className="font-semibold text-emerald-700">Matched & Verified</div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Student is authorized for entry at {gateLocation}.</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Shield className="h-12 w-12 text-slate-300 mb-2" />
                    <p className="text-xs">Scan a QR card or enter a student roll number to see verification status.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Verification Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#20234A]">Gate Verification Audit Logs</h2>
                <p className="text-sm text-slate-500">Live timestamped record of security checks.</p>
              </div>
              <button
                type="button"
                onClick={loadLogs}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              <div className="divide-y divide-slate-100">
                {logs.length > 0 ? (
                  logs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">{log.studentName || log.rollNumber || 'Student'}</span>
                          <span className="text-slate-400 font-mono ml-2">({log.rollNumber || 'Verified'})</span>
                          <p className="text-[11px] text-slate-400">
                            {log.verificationType || 'QR Scan'} · Match Score: {log.confidenceScore || '1.0'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-emerald-700">{log.status || 'Verified'}</span>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-xs text-slate-400">No verification scans recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Student Directory */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#20234A]">Student Quick Directory</h2>
                <p className="text-sm text-slate-500">Search and lookup students by roll number or name.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                  placeholder="Search student..."
                  className="rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {studentDirectory
                .filter(
                  (s) =>
                    s.fullName.toLowerCase().includes(dirSearch.toLowerCase()) ||
                    s.rollNumber.toLowerCase().includes(dirSearch.toLowerCase())
                )
                .map((student) => (
                  <div
                    key={student.studentId || student.rollNumber}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.fullName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://ui-avatars.com/api/?name=' +
                                encodeURIComponent(student.fullName) +
                                '&background=059669&color=fff';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold text-xs text-emerald-700">
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{student.fullName}</h4>
                        <p className="text-[11px] font-mono font-semibold text-emerald-800">{student.rollNumber}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {student.course} · {student.branch}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {student.studentStatus || 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

