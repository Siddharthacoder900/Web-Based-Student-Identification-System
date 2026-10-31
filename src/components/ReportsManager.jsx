import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  PieChart,
  Plus,
  Printer,
  RefreshCw,
  ScanFace,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../lib/api';

const COLORS = ['#4338CA', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const DOCUMENT_TYPES = [
  'All Types',
  'Admission Form',
  'ID Card Document',
  'Identity Proof (Aadhaar/Passport)',
  'Academic Marksheet/Certificate',
  'Transfer Certificate',
  'Fee Receipt',
  'Other'
];

const DOCUMENT_STATUSES = [
  'All Status',
  'Verified',
  'Pending',
  'Rejected'
];

export default function ReportsManager() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'documents' | 'exports'
  const [loading, setLoading] = useState(true);

  // Summary Metrics State
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [verificationStats, setVerificationStats] = useState({ total: 0, successful: 0, face: 0, qr: 0, today: 0 });

  // Document Repository State
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('All Types');
  const [docStatusFilter, setDocStatusFilter] = useState('All Status');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDocCandidate, setDeleteDocCandidate] = useState(null);

  // Upload Form Data
  const [uploadForm, setUploadForm] = useState({
    rollNumber: '',
    title: '',
    documentType: 'Academic Marksheet/Certificate',
    fileName: '',
    fileDataUrl: '',
    fileSize: 0,
    notes: '',
    verificationStatus: 'Verified'
  });

  // Action status
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load High-Level Analytics & Student Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, studRes, vrfRes, docRes] = await Promise.all([
        api.get('/reports/summary').catch(() => ({ data: null })),
        api.get('/students'),
        api.get('/verification/stats'),
        api.get('/documents').catch(() => ({ data: { documents: [] } }))
      ]);

      if (sumRes.data) {
        setSummary(sumRes.data);
      }
      setStudents(studRes.data.students || []);
      setVerificationStats(vrfRes.data.stats || {});
      setDocuments(docRes.data.documents || []);
    } catch (err) {
      console.warn('Error loading reports manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.warn('Error loading documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => {
      if (docTypeFilter !== 'All Types' && d.documentType !== docTypeFilter) return false;
      if (docStatusFilter !== 'All Status' && d.verificationStatus !== docStatusFilter) return false;
      if (docSearch.trim()) {
        const q = docSearch.toLowerCase();
        const text = [d.title, d.rollNumber, d.studentId, d.fileName, d.documentType].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [documents, docTypeFilter, docStatusFilter, docSearch]);

  // Branch Chart Data
  const branchChartData = useMemo(() => {
    if (summary?.students?.branchDistribution) {
      return summary.students.branchDistribution;
    }
    const branchMap = {};
    students.forEach((s) => {
      const b = s.branch ? s.branch.split(' ')[0] : s.course || 'Other';
      branchMap[b] = (branchMap[b] || 0) + 1;
    });
    return Object.keys(branchMap).map((k) => ({
      name: k,
      students: branchMap[k]
    }));
  }, [summary, students]);

  // Document File Input Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('File size exceeds 8MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        fileDataUrl: event.target.result,
        mimeType: file.type || 'application/pdf',
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    };
    reader.readAsDataURL(file);
  };

  // Upload Document Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.rollNumber.trim() || !uploadForm.title.trim()) {
      setErrorMsg('Student Roll Number and Document Title are required.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setFeedbackMsg('');

    try {
      const res = await api.post('/documents', uploadForm);
      setFeedbackMsg(res.data.message || 'Document successfully archived in repository.');
      setShowUploadModal(false);
      setUploadForm({
        rollNumber: '',
        title: '',
        documentType: 'Academic Marksheet/Certificate',
        fileName: '',
        fileDataUrl: '',
        fileSize: 0,
        notes: '',
        verificationStatus: 'Verified'
      });
      loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to archive document.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Document Status (Verify or Reject)
  const handleUpdateStatus = async (documentId, newStatus, notes = '') => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await api.patch(`/documents/${documentId}/status`, {
        verificationStatus: newStatus,
        notes: notes || `Marked as ${newStatus} by administrator`
      });
      setFeedbackMsg(res.data.message || `Document marked as ${newStatus}.`);
      if (previewDoc && previewDoc.documentId === documentId) {
        setPreviewDoc(res.data.document);
      }
      loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update document status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Document
  const handleDeleteConfirm = async () => {
    if (!deleteDocCandidate) return;
    setActionLoading(true);
    try {
      await api.delete(`/documents/${deleteDocCandidate.documentId}`);
      setFeedbackMsg(`Document "${deleteDocCandidate.title}" removed from repository.`);
      setDeleteDocCandidate(null);
      if (previewDoc?.documentId === deleteDocCandidate.documentId) {
        setPreviewDoc(null);
      }
      loadDocuments();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete document.');
    } finally {
      setActionLoading(false);
    }
  };

  // Print Page
  const handlePrint = () => {
    window.print();
  };

  // Export 1: Student Roster CSV
  const handleExportRosterCSV = async () => {
    try {
      const res = await api.get('/reports/export/roster');
      const data = res.data.data || [];
      if (!data.length) return;

      const headers = [
        'Student ID',
        'Roll Number',
        'Registration No',
        'Full Name',
        'Course',
        'Branch',
        'Academic Year',
        'Current Semester',
        'Email',
        'Mobile Number',
        'Status',
        'Biometric Enrolled'
      ];

      const rows = data.map((s) => [
        s.studentId,
        s.rollNumber,
        s.registrationNumber,
        `"${s.fullName}"`,
        s.course,
        `"${s.branch}"`,
        s.academicYear,
        s.currentSemester,
        s.email,
        s.mobileNumber,
        s.status,
        s.biometricEnrolled
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `BIET_Institutional_Student_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setFeedbackMsg('Student Master Roster exported successfully.');
    } catch {
      setErrorMsg('Unable to export Student Master Roster.');
    }
  };

  // Export 2: Attendance Compliance CSV
  const handleExportAttendanceCSV = async () => {
    try {
      const res = await api.get('/reports/export/attendance');
      const data = res.data.data || [];
      if (!data.length) return;

      const headers = [
        'Student ID',
        'Roll Number',
        'Full Name',
        'Course',
        'Branch',
        'Academic Year',
        'Total Sessions',
        'Attended Sessions',
        'Attendance Percentage',
        'Debarment Risk'
      ];

      const rows = data.map((a) => [
        a.studentId,
        a.rollNumber,
        `"${a.fullName}"`,
        a.course,
        `"${a.branch}"`,
        a.academicYear,
        a.totalSessions,
        a.attendedSessions,
        `${a.percentage}%`,
        `"${a.debarmentRisk}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `BIET_AKTU_Attendance_Compliance_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setFeedbackMsg('AKTU Attendance Compliance Dossier exported successfully.');
    } catch {
      setErrorMsg('Unable to export Attendance Compliance Dossier.');
    }
  };

  // Export 3: Document Repository Manifest CSV
  const handleExportDocumentsCSV = () => {
    if (!documents.length) return;
    const headers = ['Document ID', 'Roll Number', 'Student ID', 'Title', 'Document Type', 'File Name', 'Status', 'Uploaded At', 'Uploaded By'];
    const rows = documents.map((d) => [
      d.documentId,
      d.rollNumber,
      d.studentId,
      `"${d.title}"`,
      `"${d.documentType}"`,
      `"${d.fileName}"`,
      d.verificationStatus,
      d.uploadedAt ? new Date(d.uploadedAt).toISOString().slice(0, 10) : '—',
      `"${d.uploadedBy || 'Administration'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BIET_Document_Repository_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedbackMsg('Document Repository Manifest exported successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Institutional Intelligence & Records Center
          </p>
          <h1 className="text-2xl font-bold text-[#20234A]">Documents & Reports</h1>
          <p className="text-sm text-slate-500">
            Institutional document repository, biometric coverage analytics, AKTU compliance reports, and audit trail exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print Summary
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('documents');
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Document
          </button>
        </div>
      </div>

      {/* Messages */}
      {feedbackMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {feedbackMsg}
          </span>
          <button type="button" onClick={() => setFeedbackMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            {errorMsg}
          </span>
          <button type="button" onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Institutional Intelligence & Analytics
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('documents');
            loadDocuments();
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          Document Repository
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-semibold">
            {documents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exports')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'exports'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Compliance & Audit Exports
        </button>
      </div>

      {/* ============================================================
          TAB 1: INSTITUTIONAL INTELLIGENCE & ANALYTICS
          ============================================================ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Aggregate KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Enrolled</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-[#20234A]">
                {summary?.students?.total || students.length}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {summary?.students?.active || students.filter((s) => s.studentStatus === 'Active').length} Active Students
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Face Recognition</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <ScanFace className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-cyan-700">
                {summary?.students?.faceEnrolled || students.filter((s) => s.biometric?.enrolled).length}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {summary?.students?.biometricCoveragePercentage ||
                  Math.round(
                    ((students.filter((s) => s.biometric?.enrolled).length || 0) / (students.length || 1)) * 100
                  )}
                % Biometric Coverage
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verification Scans</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-700">
                {summary?.verifications?.total || verificationStats.total || 0}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {summary?.verifications?.securityClearanceRate || '100.0'}% Security Clearance
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">AKTU Debarment Risk</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-amber-700">
                {summary?.attendance?.shortageCount ?? 0}
              </div>
              <p className="mt-1 text-xs text-slate-500">Students with attendance &lt; 75%</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Branch Distribution Bar Chart */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-base font-bold text-[#20234A] mb-1">Student Enrollment by Engineering Branch</h2>
              <p className="text-xs text-slate-500 mb-6">Real-time enrollment count per college department</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchChartData.length ? branchChartData : [{ name: 'CSE', students: 3 }, { name: 'ECE', students: 1 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#20234A',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        border: 'none',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="students" fill="#4338CA" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Verification Modalities Comparison */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-base font-bold text-[#20234A] mb-1">Verification Modalities & Throughput</h2>
              <p className="text-xs text-slate-500 mb-6">Ratio of QR token verification vs AI face recognition scans</p>
              <div className="h-64 w-full flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full text-center">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">QR Scanner Checks</span>
                    <div className="text-3xl font-black text-indigo-700 mt-2">
                      {summary?.verifications?.qr ?? verificationStats.qr ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">High-speed badge scanning</p>
                  </div>

                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Face Recognition</span>
                    <div className="text-3xl font-black text-cyan-700 mt-2">
                      {summary?.verifications?.face ?? verificationStats.face ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">128-D Biometric matches</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Roster Summary */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#20234A]">Institutional Student Roster</h3>
                <p className="text-xs text-slate-500">Live registry of registered students across all departments</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{students.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Roll Number</th>
                    <th className="px-6 py-3">Full Name</th>
                    <th className="px-6 py-3">Course & Branch</th>
                    <th className="px-6 py-3">Academic Year</th>
                    <th className="px-6 py-3">Biometrics</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.studentId || s.rollNumber} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-mono font-bold text-indigo-700">{s.rollNumber}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{s.fullName}</td>
                      <td className="px-6 py-3.5 text-slate-600">
                        {s.course} · {s.branch}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{s.academicYear}</td>
                      <td className="px-6 py-3.5">
                        {s.biometric?.enrolled ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Enrolled
                          </span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                          {s.studentStatus || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: DOCUMENT REPOSITORY
          ============================================================ */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
            {/* Document Filters Bar */}
            <div className="border-b border-slate-100 p-5 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search by document title, student roll number, file name..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={docTypeFilter}
                    onChange={(e) => setDocTypeFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    value={docStatusFilter}
                    onChange={(e) => setDocStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {DOCUMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setDocSearch('');
                      setDocTypeFilter('All Types');
                      setDocStatusFilter('All Status');
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDocumentsCSV}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Download className="h-3.5 w-3.5" /> Export Manifest
                  </button>
                </div>
              </div>
            </div>

            {/* Document Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Document Details</th>
                    <th className="px-6 py-3.5">Student / Roll</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">File Metadata</th>
                    <th className="px-6 py-3.5">Verification</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.documentId} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{doc.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {doc.documentId}</div>
                          {doc.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-1">"{doc.notes}"</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono font-bold text-indigo-700">{doc.rollNumber}</div>
                          <div className="text-[10px] text-slate-400">ID: {doc.studentId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="font-mono text-[11px] text-slate-800 line-clamp-1">{doc.fileName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Standard PDF'} · {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              doc.verificationStatus === 'Verified'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : doc.verificationStatus === 'Rejected'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {doc.verificationStatus === 'Verified' && <CheckCircle2 className="h-3 w-3" />}
                            {doc.verificationStatus === 'Rejected' && <X className="h-3 w-3" />}
                            {doc.verificationStatus === 'Pending' && <Clock className="h-3 w-3" />}
                            {doc.verificationStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Inspect Document"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {doc.verificationStatus !== 'Verified' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(doc.documentId, 'Verified')}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                title="Approve & Mark Verified"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            {doc.verificationStatus !== 'Rejected' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(doc.documentId, 'Rejected')}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Reject Document"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteDocCandidate(doc)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete from Repository"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        {docsLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                            <span>Loading document repository...</span>
                          </div>
                        ) : (
                          <div>No institutional documents matching filter criteria.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: COMPLIANCE & AUDIT EXPORTS
          ============================================================ */}
      {activeTab === 'exports' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Export Card 1 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-[#20234A]">Institutional Student Roster</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Complete directory of all registered students including institutional roll numbers, course, branch, academic year, contact information, and biometric enrollment status.
                </p>
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Available Formats:</span> RFC-4180 CSV / Spreadsheet ready.
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportRosterCSV}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4338CA] px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-indigo-700 transition"
              >
                <Download className="h-4 w-4" /> Download Student Roster (.csv)
              </button>
            </div>

            {/* Export Card 2 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-[#20234A]">AKTU Attendance Compliance Dossier</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Aggregated lecture attendance records calculating cumulative percentages, attended lectures, and debarment alerts for students below the statutory 75% threshold.
                </p>
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Threshold:</span> 75% AKTU Examination Rule compliance.
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportAttendanceCSV}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-amber-700 transition"
              >
                <Download className="h-4 w-4" /> Download Attendance Dossier (.csv)
              </button>
            </div>

            {/* Export Card 3 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
                  <FileCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-[#20234A]">Document Repository Manifest</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Audit log of all student identity proofs, marksheet certificates, and admission files archived in the institutional cloud storage with verification timestamps.
                </p>
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Audit Trail:</span> Full document IDs &amp; verification statuses.
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportDocumentsCSV}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-emerald-700 transition"
              >
                <Download className="h-4 w-4" /> Download Document Manifest (.csv)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 1: UPLOAD DOCUMENT MODAL
          ============================================================ */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#20234A] flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                Archive Student Document
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Roll Number *</label>
                <input
                  type="text"
                  value={uploadForm.rollNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, rollNumber: e.target.value })}
                  placeholder="e.g. 220101001"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="e.g. Class 12 Intermediate Passing Marksheet"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category / Type</label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {DOCUMENT_TYPES.filter((t) => t !== 'All Types').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Verification Status</label>
                  <select
                    value={uploadForm.verificationStatus}
                    onChange={(e) => setUploadForm({ ...uploadForm, verificationStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Choose File (PDF, PNG, JPG) *</label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadForm.fileName && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Selected: <span className="font-mono text-slate-700">{uploadForm.fileName}</span> ({Math.round(uploadForm.fileSize / 1024)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="e.g. Verified against UP Board matriculation portal."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Archiving...' : 'Archive Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: INSPECT DOCUMENT PREVIEW
          ============================================================ */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#20234A] flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Document Dossier
              </h3>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Document Title:</span>
                <span className="font-bold text-slate-900">{previewDoc.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Student Roll:</span>
                <span className="font-mono font-bold text-indigo-700">{previewDoc.rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Category:</span>
                <span className="font-medium text-slate-800">{previewDoc.documentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">File Name:</span>
                <span className="font-mono text-slate-700">{previewDoc.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Uploaded At:</span>
                <span className="text-slate-700">
                  {previewDoc.uploadedAt ? new Date(previewDoc.uploadedAt).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-500">Verification Status:</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    previewDoc.verificationStatus === 'Verified'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : previewDoc.verificationStatus === 'Rejected'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {previewDoc.verificationStatus}
                </span>
              </div>
              {previewDoc.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-500">Administrative Notes:</span>
                  <p className="mt-1 text-slate-700 italic">"{previewDoc.notes}"</p>
                </div>
              )}
            </div>

            {/* Document Inline Preview (if Data URL image) */}
            {previewDoc.filePath && previewDoc.filePath.startsWith('data:image') && (
              <div className="max-h-48 overflow-hidden rounded-2xl border border-slate-200">
                <img src={previewDoc.filePath} alt={previewDoc.title} className="w-full object-contain max-h-48" />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                {previewDoc.verificationStatus !== 'Verified' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(previewDoc.documentId, 'Verified')}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                {previewDoc.verificationStatus !== 'Rejected' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(previewDoc.documentId, 'Rejected')}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: DELETE DOCUMENT CONFIRMATION
          ============================================================ */}
      {deleteDocCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Remove Document</h3>
                <p className="text-xs text-slate-500">This action will delete the archived record.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-slate-900">"{deleteDocCandidate.title}"</span> ({deleteDocCandidate.rollNumber}) from the institutional document repository?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteDocCandidate(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
