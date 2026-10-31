import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarCheck,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  XCircle
} from 'lucide-react';
import api from '../lib/api';
import { extractFaceDescriptorFromMedia } from '../lib/faceUtils';

const BRANCHES = [
  'All Branches',
  'CSE',
  'IT',
  'ECE',
  'ME',
  'CE',
  'MBA',
  'MCA'
];

export default function AttendanceManager() {
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'shortage'
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({ totalSessions: 0, totalRecords: 0, todayRecords: 0 });
  const [shortageAlerts, setShortageAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBranch, setFilterBranch] = useState('All Branches');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New Session Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    title: '',
    subject: '',
    course: 'B.Tech',
    branch: 'CSE',
    academicYear: '1st Year',
    semester: '1st Semester',
    startTime: '09:00',
    endTime: '10:30',
    lateGraceMinutes: 15
  });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState({ error: '', success: '' });

  // Terminal / Live Session Check-In Drawer State
  const [activeTerminalSession, setActiveTerminalSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [terminalLoading, setTerminalLoading] = useState(false);

  // Live Check-in Controls
  const [checkInRoll, setCheckInRoll] = useState('');
  const [checkInMsg, setCheckInMsg] = useState({ text: '', success: false });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Load Main Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, statsRes, alertsRes] = await Promise.all([
        api.get('/attendance/sessions'),
        api.get('/attendance/stats'),
        api.get('/attendance/shortage-alerts')
      ]);
      setSessions(sessRes.data.sessions || []);
      setStats(statsRes.data.stats || {});
      setShortageAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.warn('Error loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Terminal Records for a selected session
  const openTerminal = async (session) => {
    setActiveTerminalSession(session);
    setTerminalLoading(true);
    setCheckInMsg({ text: '', success: false });
    try {
      const [recRes, studRes] = await Promise.all([
        api.get(`/attendance/sessions/${session.sessionId}`),
        api.get('/students', { params: { branch: session.branch, course: session.course } })
      ]);
      setSessionRecords(recRes.data.records || []);
      setSectionStudents(studRes.data.students || []);
    } catch (err) {
      console.error('Failed to load session details', err);
    } finally {
      setTerminalLoading(false);
    }
  };

  const closeTerminal = () => {
    stopCamera();
    setActiveTerminalSession(null);
    setSessionRecords([]);
    setSectionStudents([]);
    loadData();
  };

  // Start / Stop Camera for Terminal Face Check-In
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err) {
      setCameraError('Camera access denied or device unavailable.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsFaceScanning(false);
  };

  // Synchronize video stream whenever camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Live Face Check-in
  const handleFaceCheckIn = async () => {
    if (!videoRef.current || !activeTerminalSession) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setCheckInMsg({ text: 'Camera feed initializing. Please wait a moment and try again.', success: false });
      return;
    }
    setIsFaceScanning(true);
    setCheckInMsg({ text: '', success: false });
    try {
      const descriptor = extractFaceDescriptorFromMedia(videoRef.current);
      if (!descriptor || descriptor.length !== 128) {
        throw new Error('No clear face detected in frame. Center face inside the oval.');
      }

      const res = await api.post('/attendance/check-in', {
        sessionId: activeTerminalSession.sessionId,
        faceTemplate: descriptor,
        threshold: 0.52
      });

      setCheckInMsg({
        text: `Verified & Marked ${res.data.record?.status || 'Present'}: ${res.data.student?.fullName} (${res.data.student?.rollNumber})`,
        success: true
      });

      // Refresh terminal records
      const recRes = await api.get(`/attendance/sessions/${activeTerminalSession.sessionId}`);
      setSessionRecords(recRes.data.records || []);
    } catch (err) {
      setCheckInMsg({
        text: err.response?.data?.message || err.message || 'Face check-in failed.',
        success: false
      });
    } finally {
      setIsFaceScanning(false);
    }
  };

  // Quick Roll / QR Token Check-in
  const handleRollCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInRoll.trim() || !activeTerminalSession) return;
    setCheckInMsg({ text: '', success: false });
    try {
      const res = await api.post('/attendance/check-in', {
        sessionId: activeTerminalSession.sessionId,
        rollNumber: checkInRoll.trim(),
        method: 'QR'
      });

      setCheckInMsg({
        text: `Marked ${res.data.record?.status || 'Present'}: ${res.data.student?.fullName || checkInRoll.trim()}`,
        success: true
      });
      setCheckInRoll('');

      const recRes = await api.get(`/attendance/sessions/${activeTerminalSession.sessionId}`);
      setSessionRecords(recRes.data.records || []);
    } catch (err) {
      setCheckInMsg({
        text: err.response?.data?.message || 'Check-in failed.',
        success: false
      });
    }
  };

  // Manual Attendance Toggle (Present / Late / Absent)
  const handleManualStatusToggle = async (student, nextStatus) => {
    if (!activeTerminalSession) return;
    try {
      await api.post('/attendance/manual-mark', {
        sessionId: activeTerminalSession.sessionId,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        status: nextStatus
      });

      const recRes = await api.get(`/attendance/sessions/${activeTerminalSession.sessionId}`);
      setSessionRecords(recRes.data.records || []);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Close Session
  const handleCloseSession = async (sessionId) => {
    try {
      await api.patch(`/attendance/sessions/${sessionId}/close`);
      if (activeTerminalSession) {
        setActiveTerminalSession((s) => ({ ...s, status: 'Closed' }));
      }
      loadData();
    } catch (err) {
      console.error('Failed to close session', err);
    }
  };

  // Create Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setMsg({ error: '', success: '' });
    setCreating(true);
    try {
      await api.post('/attendance/sessions', {
        ...newSessionForm,
        teacherName: 'Institutional Administrator'
      });
      setMsg({ error: '', success: 'Attendance session launched successfully.' });
      setShowNewModal(false);
      setNewSessionForm({
        title: '',
        subject: '',
        course: 'B.Tech',
        branch: 'CSE',
        academicYear: '1st Year',
        semester: '1st Semester',
        startTime: '09:00',
        endTime: '10:30',
        lateGraceMinutes: 15
      });
      loadData();
    } catch (err) {
      setMsg({
        error: err.response?.data?.message || 'Failed to create session.',
        success: ''
      });
    } finally {
      setCreating(false);
    }
  };

  // Export Session CSV
  const handleExportCSV = () => {
    if (!activeTerminalSession) return;
    const headers = ['Student ID', 'Roll Number', 'Student Name', 'Course', 'Branch', 'Status', 'Method', 'Check-In Timestamp'];
    const rows = sessionRecords.map((r) => [
      r.studentId,
      r.rollNumber,
      `"${r.studentName}"`,
      r.course,
      r.branch,
      r.status,
      r.method,
      `"${r.timestampKolkata || r.timestamp}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTerminalSession.sessionId}_ROSTER.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const branchMatches = (b1, b2) => {
    if (!b1 || !b2 || b2 === 'All Branches' || b2 === 'All') return true;
    const s1 = b1.trim().toLowerCase();
    const s2 = b2.trim().toLowerCase();
    if (s1 === s2) return true;
    const map = {
      cse: 'computer science',
      me: 'mechanical',
      ece: 'electronics',
      it: 'information technology',
      ce: 'civil',
      ee: 'electrical',
      mba: 'master of business administration'
    };
    const e1 = map[s1] || s1;
    const e2 = map[s2] || s2;
    return e1.includes(e2) || e2.includes(e1) || s1.includes(s2) || s2.includes(s1);
  };

  // Filtered Sessions List
  const filteredSessions = sessions.filter((sess) => {
    const matchesBranch = filterBranch === 'All Branches' || branchMatches(sess.branch, filterBranch);
    const matchesStatus = filterStatus === 'All' || sess.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const title = (sess.sessionName || sess.title || '').toLowerCase();
    const subject = (sess.subject || '').toLowerCase();
    const sId = (sess.sessionId || '').toLowerCase();
    const matchesSearch = !q || title.includes(q) || subject.includes(q) || sId.includes(q);
    return matchesBranch && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                <CalendarCheck className="h-3.5 w-3.5 text-indigo-600" />
                Institutional Attendance System
              </span>
              <span className="text-xs text-slate-400 font-mono">AKTU Compliant</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Attendance Management & Shortage Tracking
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Live biometric face check-in, encrypted QR scanning, lecture roster terminals, and &lt; 75% examination eligibility alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Start Lecture Session
            </button>
          </div>
        </div>

        {/* Tab Switcher: Sessions vs Shortage Alerts */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'sessions'
                  ? 'bg-indigo-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="h-4 w-4" /> Lecture Sessions ({sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shortage')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'shortage'
                  ? 'bg-red-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="h-4 w-4" /> Shortage Alerts (&lt; 75%) ({shortageAlerts.filter(a => a.isShortage).length})
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span>Total Records: <strong className="text-slate-800">{stats.totalRecords || 0}</strong></span>
            <span>•</span>
            <span>Today Checked-In: <strong className="text-emerald-700">{stats.todayRecords || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SESSIONS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search session title, subject, ID..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Closed">Closed Only</option>
              </select>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Session Details</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Instructor</th>
                    <th className="px-6 py-3.5">Schedule</th>
                    <th className="px-6 py-3.5">Attendance</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600 mb-2" />
                        Loading classroom sessions...
                      </td>
                    </tr>
                  ) : filteredSessions.length > 0 ? (
                    filteredSessions.map((sess) => (
                      <tr key={sess.sessionId} className="hover:bg-slate-50/70 transition">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-900">{sess.sessionName || sess.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {sess.subject} · {sess.sessionId}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-700">{sess.branch}</span>
                          <span className="block text-[11px] text-slate-400">{sess.academicYear} · {sess.currentSemester || sess.semester}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-700 font-medium">
                          {sess.teacherName || sess.createdBy || 'Faculty Instructor'}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          <div>{sess.date}</div>
                          <span className="text-[10px] font-mono text-indigo-700">
                            {sess.startTime} – {sess.endTime}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-black text-emerald-700 text-sm">{sess.totalPresent || 0}</span>
                          <span className="text-[11px] text-slate-400 ml-1">Present</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              sess.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {sess.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openTerminal(sess)}
                              className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              <ScanFace className="h-3.5 w-3.5" /> Check-In Terminal
                            </button>
                            {sess.status === 'Active' && (
                              <button
                                type="button"
                                onClick={() => handleCloseSession(sess.sessionId)}
                                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                                title="Close Lecture Session"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No attendance sessions found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHORTAGE ALERTS (< 75% RISK) */}
      {/* ========================================================================= */}
      {activeTab === 'shortage' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-xs text-red-800 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">AKTU Statutory Requirement: Minimum 75% Classroom Attendance</p>
              <p className="mt-0.5 text-red-700">
                Students below 75% cumulative attendance are automatically flagged for examination debarment review. Critical Risk indicates attendance below 60%.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Roll Number</th>
                    <th className="px-6 py-3.5">Course & Branch</th>
                    <th className="px-6 py-3.5">Lectures Held</th>
                    <th className="px-6 py-3.5">Attended</th>
                    <th className="px-6 py-3.5">Percentage</th>
                    <th className="px-6 py-3.5">Deficit Needed</th>
                    <th className="px-6 py-3.5">Status Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shortageAlerts.length > 0 ? (
                    shortageAlerts.map((alt) => (
                      <tr key={alt.studentId} className={alt.isShortage ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50/50'}>
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-900">{alt.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{alt.studentId}</div>
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-indigo-700">
                          {alt.rollNumber}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-medium text-slate-800">{alt.course}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{alt.branch}</div>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-700">{alt.totalSessions}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{alt.attendedCount}</td>
                        <td className="px-6 py-3.5">
                          <span className={`font-black text-sm ${
                            alt.percentage < 60
                              ? 'text-red-600'
                              : alt.percentage < 75
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}>
                            {alt.percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {alt.shortageClasses > 0 ? (
                            <span className="font-bold text-red-700 font-mono">
                              +{alt.shortageClasses} classes
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Eligible</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              alt.percentage < 60
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : alt.percentage < 75
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {alt.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                        No students currently flagged below the attendance threshold.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHECK-IN TERMINAL MODAL (FACE + QR + MANUAL ROSTER)
          ========================================================================= */}
      {activeTerminalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeTerminalSession.sessionName || activeTerminalSession.title}
                  </h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    activeTerminalSession.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {activeTerminalSession.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {activeTerminalSession.course} · {activeTerminalSession.branch} ({activeTerminalSession.academicYear}) · ID: {activeTerminalSession.sessionId}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={closeTerminal}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Check-In Banner Notifications */}
            {checkInMsg.text && (
              <div className={`rounded-2xl p-3.5 text-xs font-semibold flex items-center gap-2 border ${
                checkInMsg.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {checkInMsg.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
                <span>{checkInMsg.text}</span>
              </div>
            )}

            {/* Verification Inputs Grid: Left Face Camera / Right Quick Roll Search */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Left: Camera Face Verification Check-in */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <ScanFace className="h-4 w-4" /> Live Face Check-In
                  </span>
                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                    >
                      Start Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>

                <div className="relative aspect-video w-full my-3 overflow-hidden rounded-xl bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  />
                  {isCameraActive ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-32 w-24 rounded-[50%] border-2 border-dashed border-cyan-400 bg-cyan-400/10 animate-pulse" />
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 p-4">
                      <Camera className="mx-auto h-8 w-8 text-slate-600 mb-1" />
                      <p className="text-xs">Camera is inactive</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!isCameraActive || isFaceScanning || activeTerminalSession.status === 'Closed'}
                  onClick={handleFaceCheckIn}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <ScanFace className="h-4 w-4" />
                  {isFaceScanning ? 'Matching Student...' : 'Scan & Mark Attendance'}
                </button>
              </div>

              {/* Right: Roll Number / QR Scanner Check-in */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-indigo-600" />
                    Roll Number / QR Code Check-In
                  </span>
                  <p className="text-xs text-slate-500 mb-4">
                    Scan student ID card or enter Roll Number manually to mark attendance instantly.
                  </p>

                  <form onSubmit={handleRollCheckIn} className="space-y-3">
                    <input
                      type="text"
                      value={checkInRoll}
                      onChange={(e) => setCheckInRoll(e.target.value.toUpperCase())}
                      placeholder="Enter Roll Number (e.g. 220101001)..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-indigo-700 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!checkInRoll.trim() || activeTerminalSession.status === 'Closed'}
                      className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      Mark Present
                    </button>
                  </form>
                </div>

                {/* Section Stats Mini-Card */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Marked Records</span>
                    <strong className="text-base text-emerald-700">{sessionRecords.length} Students</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Session Status</span>
                    <strong className="text-indigo-700">{activeTerminalSession.status}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Roster Table */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Classroom Roster & Verification Log ({sessionRecords.length} Checked-in)
                </h4>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 font-bold uppercase text-[10px] text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Roll Number</th>
                      <th className="px-4 py-2.5">Student Name</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Check-In Time</th>
                      <th className="px-4 py-2.5 text-right">Manual Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessionRecords.length > 0 ? (
                      sessionRecords.map((rec) => (
                        <tr key={rec.recordId} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2 font-mono font-bold text-indigo-700">{rec.rollNumber}</td>
                          <td className="px-4 py-2 font-semibold text-slate-900">{rec.studentName}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                              {rec.method === 'Face' ? <ScanFace className="h-3 w-3 text-indigo-600" /> : <QrCode className="h-3 w-3 text-slate-500" />}
                              {rec.method}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              rec.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : rec.status === 'Late'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                            {rec.timestampKolkata || new Date(rec.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleManualStatusToggle(rec, 'Present')}
                                className={`rounded px-1.5 py-0.5 ${rec.status === 'Present' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() => handleManualStatusToggle(rec, 'Late')}
                                className={`rounded px-1.5 py-0.5 ${rec.status === 'Late' ? 'bg-amber-500 text-white' : 'text-slate-600'}`}
                              >
                                L
                              </button>
                              <button
                                type="button"
                                onClick={() => handleManualStatusToggle(rec, 'Absent')}
                                className={`rounded px-1.5 py-0.5 ${rec.status === 'Absent' ? 'bg-red-600 text-white' : 'text-slate-600'}`}
                              >
                                A
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          No student attendances marked yet for this lecture.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unmarked / Remaining Students in Section */}
            {sectionStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Remaining Students in Section ({
                      sectionStudents.filter((s) => !sessionRecords.some((r) => r.studentId === s.studentId || r.rollNumber?.toUpperCase() === s.rollNumber?.toUpperCase())).length
                    })
                  </h4>
                  <span className="text-[10px] text-slate-400">Click to quickly mark present/late</span>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 font-bold uppercase text-[10px] text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Roll Number</th>
                        <th className="px-4 py-2">Student Name</th>
                        <th className="px-4 py-2">Course & Branch</th>
                        <th className="px-4 py-2 text-right">Quick Mark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sectionStudents.filter((s) => !sessionRecords.some((r) => r.studentId === s.studentId || r.rollNumber?.toUpperCase() === s.rollNumber?.toUpperCase())).length > 0 ? (
                        sectionStudents
                          .filter((s) => !sessionRecords.some((r) => r.studentId === s.studentId || r.rollNumber?.toUpperCase() === s.rollNumber?.toUpperCase()))
                          .map((stud) => (
                            <tr key={stud.studentId || stud.rollNumber} className="hover:bg-slate-50/70">
                              <td className="px-4 py-1.5 font-mono font-bold text-slate-700">{stud.rollNumber}</td>
                              <td className="px-4 py-1.5 font-semibold text-slate-900">{stud.fullName}</td>
                              <td className="px-4 py-1.5 text-slate-500">{stud.course} · {stud.branch}</td>
                              <td className="px-4 py-1.5 text-right">
                                <div className="inline-flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleManualStatusToggle(stud, 'Present')}
                                    className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                  >
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleManualStatusToggle(stud, 'Late')}
                                    className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100 border border-amber-200"
                                  >
                                    Late
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-xs text-emerald-600 font-semibold">
                            All students in this section have been marked for this lecture.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              {activeTerminalSession.status === 'Active' ? (
                <button
                  type="button"
                  onClick={() => handleCloseSession(activeTerminalSession.sessionId)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                >
                  Close Session
                </button>
              ) : (
                <span className="text-xs text-slate-400">Session Closed</span>
              )}

              <button
                type="button"
                onClick={closeTerminal}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          NEW SESSION MODAL
          ========================================================================= */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Start Institutional Attendance Session</h3>
            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Title</label>
                <input
                  type="text"
                  value={newSessionForm.title}
                  onChange={(e) => setNewSessionForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Operating Systems - Unit 3 Lecture"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newSessionForm.subject}
                  onChange={(e) => setNewSessionForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. CS-401: Operating Systems"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course</label>
                  <select
                    value={newSessionForm.course}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, course: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="MBA">MBA</option>
                    <option value="MCA">MCA</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="Polytechnic">Polytechnic</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch</label>
                  <select
                    value={newSessionForm.branch}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, branch: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                    <option value="MBA">MBA</option>
                    <option value="MCA">MCA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={newSessionForm.academicYear}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, academicYear: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={newSessionForm.semester}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, semester: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="3rd Semester">3rd Semester</option>
                    <option value="4th Semester">4th Semester</option>
                    <option value="5th Semester">5th Semester</option>
                    <option value="6th Semester">6th Semester</option>
                    <option value="7th Semester">7th Semester</option>
                    <option value="8th Semester">8th Semester</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSessionForm.startTime}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newSessionForm.endTime}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {msg.error ? <p className="text-xs text-red-600 font-medium">{msg.error}</p> : null}

              <div className="mt-4 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
