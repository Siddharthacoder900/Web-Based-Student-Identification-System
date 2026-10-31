import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Filter,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  UserCheck,
  Users
} from 'lucide-react';
import api from '../lib/api';

export default function TeacherPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('CSE');

  // New Session Modal / Form
  const [newSession, setNewSession] = useState({
    title: 'Data Structures & Algorithms - Lecture 14',
    subject: 'CS-501: Data Structures',
    branch: 'CSE',
    semester: '5th Semester',
    sessionType: 'Lecture'
  });
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionMsg, setSessionMsg] = useState({ error: '', success: '' });

  // Quick Attendance Simulation
  const [markingRoll, setMarkingRoll] = useState('');
  const [markingStatus, setMarkingStatus] = useState({ msg: '', success: false });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessRes, studRes] = await Promise.all([
        api.get('/attendance/sessions'),
        api.get('/students?branch=' + selectedBranch)
      ]);
      setSessions(sessRes.data.sessions || []);
      setStudents(studRes.data.students || []);
    } catch (err) {
      console.warn('Error loading teacher portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSessionMsg({ error: '', success: '' });
    setCreatingSession(true);
    try {
      const res = await api.post('/attendance/sessions', {
        ...newSession,
        teacherId: user.teacherId || user.identifier || 'T-1001',
        teacherName: user.fullName || 'Prof. Ramesh Chandra'
      });
      setSessionMsg({ error: '', success: 'Attendance session launched successfully!' });
      loadData();
    } catch (err) {
      setSessionMsg({
        error: err.response?.data?.message || 'Failed to start attendance session.',
        success: ''
      });
    } finally {
      setCreatingSession(false);
    }
  };

  const handleQuickMark = async (e) => {
    e.preventDefault();
    if (!markingRoll.trim()) return;
    const activeSession = sessions[0];
    if (!activeSession) {
      setMarkingStatus({ msg: 'Please start an attendance session first.', success: false });
      return;
    }

    try {
      const res = await api.post('/attendance/mark', {
        sessionId: activeSession.sessionId,
        identifier: markingRoll.trim(),
        verificationMethod: 'Face',
        status: 'Present',
        confidenceScore: 0.96
      });
      setMarkingStatus({
        msg: `Attendance recorded for ${res.data.student?.fullName || markingRoll} (${res.data.record?.verificationMethod}).`,
        success: true
      });
      setMarkingRoll('');
      loadData();
    } catch (err) {
      setMarkingStatus({
        msg: err.response?.data?.message || 'Failed to record attendance.',
        success: false
      });
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#202124]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#20234A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Building2 className="h-6 w-6 text-indigo-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white">BIET LUCKNOW</span>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-400/30">
                  Faculty Portal
                </span>
              </div>
              <p className="text-xs text-indigo-200 hidden sm:block">
                Department of Computer Science & Engineering · Faculty ID: {user.identifier || 'T-1001'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold">{user.fullName || 'Prof. Ramesh Chandra'}</div>
              <div className="text-xs text-cyan-200">Assistant Professor</div>
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
              { id: 'sessions', label: 'Attendance Sessions', icon: CalendarCheck },
              { id: 'scanner', label: 'Quick Attendance Scanner', icon: ScanFace },
              { id: 'students', label: 'Department Student Directory', icon: Users }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium whitespace-nowrap transition ${
                  activeTab === id
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
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
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-cyan-600" />
            <span className="ml-2 text-sm font-medium">Loading faculty workspace...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: Attendance Sessions */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#20234A]">Classroom Attendance Sessions</h2>
                    <p className="text-sm text-slate-500">
                      Create lecture sessions and capture student attendance via high-accuracy Face & QR verification.
                    </p>
                  </div>
                </div>

                {/* Session Creation Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                  <h3 className="font-bold text-base text-[#20234A] mb-3 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-cyan-600" /> Start New Lecture Attendance Session
                  </h3>
                  <form onSubmit={handleCreateSession} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Session Title</label>
                      <input
                        type="text"
                        value={newSession.title}
                        onChange={(e) => setNewSession((s) => ({ ...s, title: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-cyan-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={newSession.subject}
                        onChange={(e) => setNewSession((s) => ({ ...s, subject: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-cyan-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Branch & Semester</label>
                      <select
                        value={newSession.branch}
                        onChange={(e) => setNewSession((s) => ({ ...s, branch: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-cyan-500 focus:bg-white"
                      >
                        <option value="CSE">CSE (Computer Science)</option>
                        <option value="IT">IT (Information Tech)</option>
                        <option value="ECE">ECE (Electronics)</option>
                        <option value="ME">ME (Mechanical)</option>
                        <option value="CE">CE (Civil)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={creatingSession}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-800 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        {creatingSession ? 'Launching...' : 'Launch Session'}
                      </button>
                    </div>
                  </form>
                  {sessionMsg.error ? <p className="mt-2 text-xs text-red-600">{sessionMsg.error}</p> : null}
                  {sessionMsg.success ? <p className="mt-2 text-xs text-emerald-700">{sessionMsg.success}</p> : null}
                </div>

                {/* Sessions List */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                  <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="font-bold text-[#20234A]">Active & Recent Attendance Sessions</h3>
                    <span className="text-xs text-slate-500">{sessions.length} sessions recorded</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {sessions.length > 0 ? (
                      sessions.map((sess) => (
                        <div key={sess.sessionId} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{sess.title}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  sess.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {sess.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {sess.subject} · {sess.branch} ({sess.semester}) · Teacher: {sess.teacherName}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Session ID: <span className="font-mono">{sess.sessionId}</span> · Started:{' '}
                              {new Date(sess.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-lg font-black text-cyan-700">{sess.totalPresent || 0}</span>
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase">Present</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('scanner')}
                              className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                            >
                              Scan & Check-in
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No active sessions. Launch one above to start recording attendance.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Quick Session Scanner */}
            {activeTab === 'scanner' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#20234A]">Quick Attendance Check-in</h2>
                  <p className="text-sm text-slate-500">
                    Mark attendance for students present in the current active session.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                    <h3 className="font-bold text-base text-[#20234A] mb-4 flex items-center gap-2">
                      <ScanFace className="h-5 w-5 text-cyan-600" /> Direct Roll Check-in
                    </h3>
                    <form onSubmit={handleQuickMark} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Active Lecture Session
                        </label>
                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
                          {sessions[0] ? (
                            <span className="font-semibold text-slate-800">
                              {sessions[0].title} ({sessions[0].branch})
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">No active session found. Please launch one.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Student Roll Number or Scan Token
                        </label>
                        <input
                          type="text"
                          value={markingRoll}
                          onChange={(e) => setMarkingRoll(e.target.value)}
                          placeholder="e.g. 220101001"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-cyan-500 focus:bg-white font-mono"
                        />
                      </div>

                      {markingStatus.msg ? (
                        <p
                          className={`text-xs font-medium ${
                            markingStatus.success ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {markingStatus.msg}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-800"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Record Verified Attendance
                      </button>
                    </form>
                  </div>

                  {/* Instructions */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft space-y-4">
                    <h3 className="font-bold text-base text-[#20234A]">Attendance Verification Workflow</h3>
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px]">
                          1
                        </span>
                        <span>Ensure your lecture session is launched before checking in students.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px]">
                          2
                        </span>
                        <span>Students display their Digital ID QR card or align with the high-precision face scanner.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px]">
                          3
                        </span>
                        <span>
                          The system records timestamp, 128-D biometric confidence score, and updates the student’s semester progress immediately.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Department Student Directory */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#20234A]">Department Student Directory</h2>
                    <p className="text-sm text-slate-500">
                      Enrolled students eligible for attendance in your department.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student or roll..."
                        className="rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-cyan-500"
                      />
                    </div>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
                    >
                      <option value="CSE">CSE</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="ME">ME</option>
                      <option value="CE">CE</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-6 py-3">Student</th>
                          <th className="px-6 py-3">Roll Number</th>
                          <th className="px-6 py-3">Branch & Year</th>
                          <th className="px-6 py-3">Biometrics</th>
                          <th className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((stud) => (
                            <tr key={stud.studentId || stud.rollNumber} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 font-semibold text-slate-800 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-[10px]">
                                  {stud.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                {stud.fullName}
                              </td>
                              <td className="px-6 py-3 font-mono font-semibold text-cyan-800">{stud.rollNumber}</td>
                              <td className="px-6 py-3 text-slate-600">
                                {stud.course} · {stud.branch} ({stud.academicYear})
                              </td>
                              <td className="px-6 py-3">
                                {stud.biometric?.enrolled ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                    <CheckCircle2 className="h-3 w-3" /> Enrolled
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Pending</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                                  {stud.studentStatus || 'Active'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                              No students found for branch {selectedBranch}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

