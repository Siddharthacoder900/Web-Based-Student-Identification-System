import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  IdCard,
  Lock,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  ScanFace,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  X
} from 'lucide-react';
import api from '../lib/api';
import { extractFaceDescriptorFromMedia } from '../lib/faceUtils';

const FIELD_LABELS = {
  fullName: 'Full Name',
  rollNumber: 'Roll Number',
  registrationNumber: 'Registration Number',
  email: 'Official Email',
  mobileNumber: 'Mobile Number',
  course: 'Course',
  branch: 'Branch',
  academicYear: 'Academic Year',
  currentSemester: 'Current Semester',
  admissionYear: 'Admission Year',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  address: 'Permanent Address'
};

const COURSES = [
  'All Courses',
  'B.Tech',
  'MBA',
  'MCA',
  'M.Tech',
  'BBA',
  'BCA'
];

const BRANCHES = [
  'All Branches',
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies',
  'Computer Applications'
];

const ACADEMIC_YEARS = [
  'All Years',
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate'
];

const STATUS_FILTERS = [
  'All Status',
  'Active',
  'Inactive',
  'Graduated'
];

const BIOMETRIC_FILTERS = [
  'All Biometrics',
  'Enrolled',
  'Pending'
];

const ITEMS_PER_PAGE = 8;

export default function StudentsManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [biometricFilter, setBiometricFilter] = useState('All Biometrics');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Active Selections
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [idCardPreviewStudent, setIdCardPreviewStudent] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [statusToggleCandidate, setStatusToggleCandidate] = useState(null);
  const [biometricModalStudent, setBiometricModalStudent] = useState(null);

  // Biometric Management in Modal
  const [biometricConsent, setBiometricConsent] = useState(false);
  const [biometricCameraActive, setBiometricCameraActive] = useState(false);
  const [biometricProcessing, setBiometricProcessing] = useState(false);
  const [biometricDeleteConfirm, setBiometricDeleteConfirm] = useState(false);
  const [biometricCameraError, setBiometricCameraError] = useState('');
  const biometricVideoRef = useRef(null);
  const biometricStreamRef = useRef(null);

  // Action status
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Tabs & Profile Corrections State
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'corrections'
  const [corrections, setCorrections] = useState([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [correctionFilter, setCorrectionFilter] = useState('All'); // 'All' | 'Pending' | 'Approved' | 'Rejected'
  const [reviewModal, setReviewModal] = useState(null); // { request: {...}, action: 'approve' | 'reject', reviewNotes: '' }

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/students');
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Unable to load students', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrections = async () => {
    setCorrectionsLoading(true);
    try {
      const res = await api.get('/students/corrections');
      setCorrections(res.data.corrections || []);
    } catch (err) {
      console.warn('Unable to load correction requests:', err);
    } finally {
      setCorrectionsLoading(false);
    }
  };

  const handleApproveCorrection = async (requestId, reviewNotes) => {
    setActionLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const res = await api.patch(`/students/corrections/${requestId}/approve`, { reviewNotes });
      setFeedbackMessage(res.data.message || 'Correction request approved and student record updated.');
      setReviewModal(null);
      await Promise.all([fetchCorrections(), fetchStudents()]);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to approve correction request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCorrection = async (requestId, reviewNotes) => {
    setActionLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const res = await api.patch(`/students/corrections/${requestId}/reject`, { reviewNotes });
      setFeedbackMessage(res.data.message || 'Correction request has been rejected.');
      setReviewModal(null);
      await fetchCorrections();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to reject correction request.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCorrections();
  }, []);

  const filteredCorrections = useMemo(() => {
    return corrections.filter((c) => {
      if (correctionFilter !== 'All' && c.status !== correctionFilter) return false;
      return true;
    });
  }, [corrections, correctionFilter]);

  const pendingCorrectionsCount = useMemo(() => {
    return corrections.filter((c) => c.status === 'Pending').length;
  }, [corrections]);

  // Filtered dataset
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Course
      if (courseFilter !== 'All Courses' && s.course !== courseFilter) return false;
      // Branch
      if (branchFilter !== 'All Branches' && s.branch !== branchFilter) return false;
      // Academic Year
      if (yearFilter !== 'All Years' && s.academicYear !== yearFilter) return false;
      // Status
      if (statusFilter !== 'All Status' && s.studentStatus !== statusFilter) return false;
      // Biometric
      if (biometricFilter === 'Enrolled' && !s.biometric?.enrolled) return false;
      if (biometricFilter === 'Pending' && s.biometric?.enrolled) return false;

      // Text Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [
          s.fullName,
          s.rollNumber,
          s.studentId,
          s.registrationNumber,
          s.email,
          s.course,
          s.branch,
          s.mobileNumber
        ].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [students, search, courseFilter, branchFilter, yearFilter, statusFilter, biometricFilter]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, courseFilter, branchFilter, yearFilter, statusFilter, biometricFilter]);

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const handleResetFilters = () => {
    setSearch('');
    setCourseFilter('All Courses');
    setBranchFilter('All Branches');
    setYearFilter('All Years');
    setStatusFilter('All Status');
    setBiometricFilter('All Biometrics');
  };

  // Profile Completeness Calculator (Requirement from Master Prompt)
  const calculateCompleteness = (student) => {
    if (!student) return { percentage: 0, items: [] };

    const items = [
      {
        label: 'Student Details Saved',
        description: 'Full name, roll number, course & email recorded',
        completed: Boolean(student.fullName && student.rollNumber && student.course && student.email)
      },
      {
        label: 'Photograph Uploaded',
        description: 'Verified portrait photo attached to student profile',
        completed: Boolean(student.photoUrl && student.photoUrl.length > 5)
      },
      {
        label: 'Registration Document Reference',
        description: 'Unique institutional registration number assigned',
        completed: Boolean(student.registrationNumber || student.studentId)
      },
      {
        label: 'Biometric Face Enrolled',
        description: '128-D spatial gradient facial vector computed',
        completed: Boolean(student.biometric?.enrolled)
      },
      {
        label: 'Digital ID Card Generated',
        description: 'Cryptographic QR token generated and ready for print',
        completed: Boolean(student.qrCodeToken || student.studentId)
      },
      {
        label: 'Login Account Activated',
        description: 'Linked student user account active with credentials',
        completed: Boolean(student.userAccountId || student.studentStatus === 'Active')
      }
    ];

    const completedCount = items.filter((i) => i.completed).length;
    const percentage = Math.round((completedCount / items.length) * 100);

    return { percentage, completedCount, totalCount: items.length, items };
  };

  // Handle Edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editStudent) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      await api.put(`/students/${editStudent.studentId}`, editStudent);
      setFeedbackMessage(`Updated records for "${editStudent.fullName}".`);
      setEditStudent(null);
      await fetchStudents();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update student details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async () => {
    if (!statusToggleCandidate) return;
    const nextStatus = statusToggleCandidate.studentStatus === 'Active' ? 'Inactive' : 'Active';
    setActionLoading(true);
    setErrorMessage('');
    try {
      await api.patch(`/students/${statusToggleCandidate.studentId}/status`, {
        status: nextStatus,
        verificationStatus: nextStatus === 'Active' ? 'Verified' : 'Pending'
      });
      setFeedbackMessage(`Status updated to "${nextStatus}" for ${statusToggleCandidate.fullName}.`);
      setStatusToggleCandidate(null);
      await fetchStudents();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update student status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm delete / archive
  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      await api.delete(`/students/${deleteCandidate.studentId}`);
      setFeedbackMessage(`Student "${deleteCandidate.fullName}" removed from active registry.`);
      setDeleteCandidate(null);
      await fetchStudents();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete student.');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Biometric Camera in Modal
  const startBiometricCamera = async () => {
    setBiometricCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      biometricStreamRef.current = stream;
      if (biometricVideoRef.current) {
        biometricVideoRef.current.srcObject = stream;
      }
      setBiometricCameraActive(true);
    } catch (err) {
      setBiometricCameraError('Camera access denied or unavailable. Check browser permissions.');
      setBiometricCameraActive(false);
    }
  };

  // Stop Biometric Camera
  const stopBiometricCamera = () => {
    if (biometricStreamRef.current) {
      biometricStreamRef.current.getTracks().forEach((track) => track.stop());
      biometricStreamRef.current = null;
    }
    if (biometricVideoRef.current) {
      biometricVideoRef.current.srcObject = null;
    }
    setBiometricCameraActive(false);
  };

  // Enroll / Re-enroll Biometric Face Vector
  const handleEnrollBiometric = async () => {
    if (!biometricModalStudent) return;
    if (!biometricConsent) {
      setErrorMessage('Student informed biometric consent is mandatory before enrolling facial data.');
      return;
    }
    if (!biometricVideoRef.current) return;

    setBiometricProcessing(true);
    setErrorMessage('');
    try {
      const descriptor = extractFaceDescriptorFromMedia(biometricVideoRef.current);
      if (!descriptor || descriptor.length !== 128) {
        throw new Error('Unable to extract clear face geometry. Center face in oval with good illumination.');
      }

      await api.post(`/students/${biometricModalStudent.studentId}/biometric/enroll`, {
        faceTemplate: descriptor,
        consentGiven: true
      });

      setFeedbackMessage(`Biometric face template successfully enrolled for ${biometricModalStudent.fullName}.`);
      stopBiometricCamera();
      setBiometricModalStudent(null);
      await fetchStudents();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Face enrollment failed.');
    } finally {
      setBiometricProcessing(false);
    }
  };

  // Delete Biometric Face Data
  const handleDeleteBiometric = async () => {
    if (!biometricModalStudent) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      await api.delete(`/students/${biometricModalStudent.studentId}/biometric`);
      setFeedbackMessage(`Biometric face template permanently deleted for ${biometricModalStudent.fullName}.`);
      stopBiometricCamera();
      setBiometricModalStudent(null);
      setBiometricDeleteConfirm(false);
      await fetchStudents();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete biometric data.');
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredStudents.length) return;
    const headers = [
      'Student ID',
      'Roll Number',
      'Registration Number',
      'Full Name',
      'Course',
      'Branch',
      'Academic Year',
      'Semester',
      'Admission Year',
      'Official Email',
      'Mobile Number',
      'Status',
      'Face Enrolled'
    ];

    const rows = filteredStudents.map((s) => [
      s.studentId,
      s.rollNumber,
      s.registrationNumber || '',
      `"${s.fullName}"`,
      s.course,
      s.branch,
      s.academicYear,
      s.currentSemester,
      s.admissionYear,
      s.email,
      s.mobileNumber,
      s.studentStatus,
      s.biometric?.enrolled ? 'Yes' : 'No'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BIET_Students_Roster_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Student Lifecycle Registry
          </p>
          <h1 className="text-2xl font-bold text-[#20234A]">Student Records Management</h1>
          <p className="text-sm text-slate-500">
            Institutional student directory, profile completeness tracker, search filters, and record lifecycle operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchStudents}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 transition"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV ({filteredStudents.length})
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedbackMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {feedbackMessage}
          </span>
          <button
            type="button"
            onClick={() => setFeedbackMessage('')}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            {errorMessage}
          </span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'roster'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          Student Records Roster
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-semibold">
            {students.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('corrections');
            fetchCorrections();
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'corrections'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Profile Correction Requests
          {pendingCorrectionsCount > 0 ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
              {pendingCorrectionsCount} Pending
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-semibold">
              {corrections.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'roster' && (
      /* Main Roster Card */
      <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
        {/* Comprehensive Filters Bar */}
        <div className="border-b border-slate-100 p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Live Text Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, roll number, registration number, email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={biometricFilter}
                onChange={(e) => setBiometricFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
              >
                {BIOMETRIC_FILTERS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                title="Reset all filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900">{filteredStudents.length}</strong> enrolled students
              {filteredStudents.length !== students.length ? ` (filtered from ${students.length} total)` : ''}
            </span>
            <span className="text-slate-400">Page {currentPage} of {totalPages}</span>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Roll / Reg Number</th>
                <th className="px-6 py-3.5">Course & Branch</th>
                <th className="px-6 py-3.5">Academic Year</th>
                <th className="px-6 py-3.5">Biometric Face</th>
                <th className="px-6 py-3.5">Completeness</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600 mb-2" />
                    Loading student records...
                  </td>
                </tr>
              ) : paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => {
                  const comp = calculateCompleteness(student);
                  return (
                    <tr key={student.studentId || student.rollNumber} className="hover:bg-slate-50/60 transition">
                      {/* Photo & Name */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.fullName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'https://ui-avatars.com/api/?name=' +
                                    encodeURIComponent(student.fullName) +
                                    '&background=4338ca&color=fff';
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-bold text-xs text-indigo-700 bg-indigo-50">
                                {student.fullName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{student.fullName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{student.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Roll & Reg */}
                      <td className="px-6 py-3.5">
                        <div className="font-mono font-bold text-indigo-700">{student.rollNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {student.registrationNumber || 'No Reg No'}
                        </div>
                      </td>

                      {/* Course & Branch */}
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-800">{student.course}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{student.branch}</div>
                      </td>

                      {/* Academic Year & Semester */}
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-slate-700">{student.academicYear}</div>
                        <div className="text-[11px] text-slate-400">{student.currentSemester}</div>
                      </td>

                      {/* Biometrics */}
                      <td className="px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBiometricModalStudent(student);
                            setBiometricConsent(false);
                            setBiometricDeleteConfirm(false);
                          }}
                          className="group inline-flex items-center"
                          title="Manage Student Biometrics"
                        >
                          {student.biometric?.enrolled ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 transition">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Enrolled
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition">
                              Pending
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Completeness Tracker */}
                      <td className="px-6 py-3.5">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                            <span className={comp.percentage === 100 ? 'text-emerald-700' : 'text-slate-600'}>
                              {comp.percentage}%
                            </span>
                            <span className="text-slate-400 font-normal">
                              {comp.completedCount}/{comp.totalCount}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full transition-all duration-300 ${
                                comp.percentage === 100
                                  ? 'bg-emerald-500'
                                  : comp.percentage >= 70
                                  ? 'bg-indigo-600'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${comp.percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            student.studentStatus === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : student.studentStatus === 'Graduated'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {student.studentStatus || 'Active'}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewStudent(student)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="View Full Profile & Completeness"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdCardPreviewStudent(student)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="Preview Student ID Card"
                          >
                            <IdCard className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBiometricModalStudent(student);
                              setBiometricConsent(false);
                              setBiometricDeleteConfirm(false);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="Manage Biometric Face Data"
                          >
                            <ScanFace className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditStudent({ ...student })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Edit Student Information"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusToggleCandidate(student)}
                            className={`rounded-lg p-1.5 transition ${
                              student.studentStatus === 'Active'
                                ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                                : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                            title={student.studentStatus === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {student.studentStatus === 'Active' ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(student)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete Student Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No student records match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs">
          <span className="text-slate-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length} students
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="px-2 font-bold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ============================================================
          TAB 2: PROFILE CORRECTION REQUESTS WORKFLOW
          ============================================================ */}
      {activeTab === 'corrections' && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
          {/* Subheader and Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-5">
            <div>
              <h3 className="text-base font-bold text-[#20234A] flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-indigo-600" />
                Student Profile Correction Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, approve, or reject identity field corrections submitted by students from their portals.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter:</span>
              <div className="flex rounded-xl bg-slate-100 p-1">
                {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setCorrectionFilter(status)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      correctionFilter === status
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Corrections Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Request ID / Date</th>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Target Field</th>
                  <th className="px-6 py-3.5">Current vs Requested</th>
                  <th className="px-6 py-3.5">Reason & Review</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCorrections.length > 0 ? (
                  filteredCorrections.map((req) => (
                    <tr key={req.requestId} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-mono">
                        <div className="font-bold text-slate-800">{req.requestId}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {req.createdAt ? new Date(req.createdAt).toLocaleString() : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{req.studentName}</div>
                        <div className="font-mono text-[11px] text-indigo-700">Roll: {req.rollNumber}</div>
                        <div className="text-[10px] text-slate-400">ID: {req.studentId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {FIELD_LABELS[req.fieldToUpdate] || req.fieldToUpdate}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-400">Current:</span>
                            <span className="line-through">{req.currentValue || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <span className="font-semibold text-slate-600">New:</span>
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                              {req.requestedValue}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-slate-700 italic text-[11px]">"{req.reason}"</p>
                        {req.reviewNotes && (
                          <div className="mt-1 text-[10px] text-slate-500">
                            <span className="font-semibold">Review note:</span> {req.reviewNotes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            req.status === 'Approved'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : req.status === 'Rejected'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {req.status === 'Approved' && <CheckCircle2 className="h-3 w-3" />}
                          {req.status === 'Rejected' && <X className="h-3 w-3" />}
                          {req.status === 'Pending' && <Clock className="h-3 w-3" />}
                          {req.status}
                        </span>
                        {req.reviewedBy && (
                          <div className="text-[10px] text-slate-400 mt-1">by {req.reviewedBy}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setReviewModal({
                                  request: req,
                                  action: 'approve',
                                  reviewNotes: 'Verified and approved with official records.'
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setReviewModal({
                                  request: req,
                                  action: 'reject',
                                  reviewNotes: 'Documentation insufficient or verification rejected.'
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      {correctionsLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                          <span>Loading student correction requests...</span>
                        </div>
                      ) : (
                        <div>No profile correction requests matching filter "{correctionFilter}".</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW FULL PROFILE MODAL WITH COMPLETENESS TRACKER
          ============================================================ */}
      {viewStudent && (() => {
        const comp = calculateCompleteness(viewStudent);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
              {/* Profile Modal Header */}
              <div className="relative bg-[#20234A] p-6 text-white rounded-t-3xl">
                <button
                  type="button"
                  onClick={() => setViewStudent(null)}
                  className="absolute right-4 top-4 rounded-xl bg-white/10 p-1.5 text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-white/30 bg-slate-100 shadow-md">
                    {viewStudent.photoUrl ? (
                      <img src={viewStudent.photoUrl} alt={viewStudent.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-lg text-indigo-700 bg-indigo-50">
                        {viewStudent.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{viewStudent.fullName}</h3>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                        {viewStudent.studentStatus || 'Active'}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-indigo-200 mt-0.5">
                      Roll Number: {viewStudent.rollNumber} · ID: {viewStudent.studentId}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      {viewStudent.course} · {viewStudent.branch} ({viewStudent.academicYear})
                    </p>
                  </div>
                </div>
              </div>

              {/* Completeness Tracker Card */}
              <div className="p-6 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#20234A] flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-indigo-600" />
                      Student Profile Completeness Tracker
                    </span>
                    <span className="text-sm font-black text-indigo-700">{comp.percentage}%</span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        comp.percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${comp.percentage}%` }}
                    />
                  </div>

                  {/* 6 Checklist Items */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {comp.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 rounded-xl p-2.5 border ${
                          item.completed
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[10px] text-slate-500">{item.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Information Grid */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Institutional Record Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Registration No</span>
                      <span className="font-mono font-semibold text-slate-800">{viewStudent.registrationNumber || 'Pending'}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Current Semester</span>
                      <span className="font-semibold text-slate-800">{viewStudent.currentSemester}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Admission Year</span>
                      <span className="font-semibold text-slate-800">{viewStudent.admissionYear}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Official Email</span>
                      <span className="font-mono text-slate-800 truncate block">{viewStudent.email}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Mobile Phone</span>
                      <span className="text-slate-800 font-medium">{viewStudent.mobileNumber || 'Not provided'}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Gender</span>
                      <span className="text-slate-800 font-medium">{viewStudent.gender || 'Not Specified'}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Residential Address</span>
                    <span className="text-slate-700">{viewStudent.address || 'Lucknow, Uttar Pradesh'}</span>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIdCardPreviewStudent(viewStudent);
                        setViewStudent(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <IdCard className="h-4 w-4" /> Issue ID Card
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBiometricModalStudent(viewStudent);
                        setBiometricConsent(false);
                        setBiometricDeleteConfirm(false);
                        setViewStudent(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <ScanFace className="h-4 w-4" /> Manage Biometrics
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditStudent({ ...viewStudent });
                        setViewStudent(null);
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit Records
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewStudent(null)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================
          EDIT STUDENT MODAL
          ============================================================ */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#20234A]">Edit Student Record: {editStudent.fullName}</h3>
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editStudent.fullName}
                    onChange={(e) => setEditStudent((s) => ({ ...s, fullName: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={editStudent.rollNumber}
                    onChange={(e) => setEditStudent((s) => ({ ...s, rollNumber: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono uppercase outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editStudent.email}
                    onChange={(e) => setEditStudent((s) => ({ ...s, email: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={editStudent.mobileNumber}
                    onChange={(e) => setEditStudent((s) => ({ ...s, mobileNumber: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
                  <select
                    value={editStudent.course}
                    onChange={(e) => setEditStudent((s) => ({ ...s, course: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                  >
                    {COURSES.filter((c) => c !== 'All Courses').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
                  <select
                    value={editStudent.branch}
                    onChange={(e) => setEditStudent((s) => ({ ...s, branch: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                  >
                    {BRANCHES.filter((b) => b !== 'All Branches').map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStudent.studentStatus}
                    onChange={(e) => setEditStudent((s) => ({ ...s, studentStatus: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <input
                    type="text"
                    value={editStudent.currentSemester}
                    onChange={(e) => setEditStudent((s) => ({ ...s, currentSemester: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[#4338CA] px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          ID CARD INSTANT PREVIEW MODAL
          ============================================================ */}
      {idCardPreviewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-[#20234A] flex items-center gap-2">
                <IdCard className="h-4 w-4 text-indigo-600" /> Official CR80 Student ID Card
              </h3>
              <button
                type="button"
                onClick={() => setIdCardPreviewStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Render Card */}
            <div className="overflow-hidden rounded-2xl border-2 border-[#20234A] bg-white shadow-lg">
              <div className="bg-[#20234A] p-3 text-center text-white">
                <div className="flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="h-4 w-4 text-indigo-300" />
                  Bansal Institute of Engineering & Technology
                </div>
                <p className="text-[9px] text-indigo-200 uppercase mt-0.5">Sitapur Road, Lucknow · Student ID</p>
              </div>

              <div className="p-4">
                <div className="flex gap-3">
                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {idCardPreviewStudent.photoUrl ? (
                      <img
                        src={idCardPreviewStudent.photoUrl}
                        alt={idCardPreviewStudent.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-indigo-700 bg-indigo-50">
                        {idCardPreviewStudent.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-[#20234A] truncate">{idCardPreviewStudent.fullName}</h4>
                    <p className="font-mono text-xs font-bold text-indigo-700 mt-0.5">
                      Roll: {idCardPreviewStudent.rollNumber}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {idCardPreviewStudent.course} · {idCardPreviewStudent.branch}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {idCardPreviewStudent.academicYear} ({idCardPreviewStudent.admissionYear})
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                  <div>
                    <p className="font-semibold text-emerald-700">Status: {idCardPreviewStudent.studentStatus}</p>
                    <p className="font-mono text-[9px] text-slate-400">{idCardPreviewStudent.studentId}</p>
                  </div>
                  <QrCode className="h-10 w-10 text-slate-700" />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Printer className="h-3.5 w-3.5" /> Print Physical Card
              </button>
              <button
                type="button"
                onClick={() => setIdCardPreviewStudent(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          STATUS TOGGLE CONFIRMATION MODAL
          ============================================================ */}
      {statusToggleCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-[#20234A]">Confirm Account Status Change</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to change the status of <strong>{statusToggleCandidate.fullName}</strong> (Roll: {statusToggleCandidate.rollNumber}) to{' '}
              <strong className="text-indigo-700">
                {statusToggleCandidate.studentStatus === 'Active' ? 'Inactive' : 'Active'}
              </strong>
              ?
            </p>
            {statusToggleCandidate.studentStatus === 'Active' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Note: Inactive students are immediately blocked from logging into the Student Portal and flagged at gate checkpoints.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusToggleCandidate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleToggleStatus}
                className="rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {actionLoading ? 'Updating...' : 'Confirm Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          DELETE CONFIRMATION MODAL
          ============================================================ */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold text-base text-red-700">Confirm Student Record Deletion</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete the student record for{' '}
              <strong>{deleteCandidate.fullName}</strong> (Roll Number:{' '}
              <span className="font-mono">{deleteCandidate.rollNumber}</span>)?
            </p>
            <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              Warning: This action will delete the student profile and revoke the provisioned portal account.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          BIOMETRIC FACE MANAGEMENT MODAL (ENROLL / RE-ENROLL / DELETE)
          ============================================================ */}
      {biometricModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ScanFace className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-base text-[#20234A]">Manage Face Biometrics</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopBiometricCamera();
                  setBiometricModalStudent(null);
                  setBiometricDeleteConfirm(false);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Student Info Card */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {biometricModalStudent.photoUrl ? (
                  <img
                    src={biometricModalStudent.photoUrl}
                    alt={biometricModalStudent.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-sm text-indigo-700 bg-indigo-50">
                    {biometricModalStudent.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900">{biometricModalStudent.fullName}</div>
                <div className="text-xs font-mono text-indigo-700">Roll: {biometricModalStudent.rollNumber}</div>
                <div className="text-[11px] text-slate-500">{biometricModalStudent.course} • {biometricModalStudent.branch}</div>
              </div>
              <div>
                {biometricModalStudent.biometric?.enrolled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Enrolled
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                    Pending
                  </span>
                )}
              </div>
            </div>

            {/* Error & Alerts */}
            {biometricCameraError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{biometricCameraError}</span>
              </div>
            )}

            {/* Informed Consent Explanation */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Informed Biometric Consent & Institutional Policy
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Student biometric face geometry is extracted as a normalized 128-dimensional descriptor and stored securely for campus entry gates and lecture attendance. Raw photographs and templates are strictly protected under institutional guidelines.
              </p>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={biometricConsent}
                  onChange={(e) => setBiometricConsent(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Student has provided institutional consent for facial biometric processing
                </span>
              </label>
            </div>

            {/* Camera Viewport & Capture */}
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center">
                {biometricCameraActive ? (
                  <>
                    <video
                      ref={biometricVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                    {/* Oval Guide Overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-40 w-32 rounded-[50%] border-2 border-dashed border-cyan-400 bg-cyan-400/10 animate-pulse" />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <Camera className="mx-auto h-8 w-8 text-slate-500 mb-1" />
                    <p className="text-xs">Camera is inactive</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                {!biometricCameraActive ? (
                  <button
                    type="button"
                    onClick={startBiometricCamera}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
                  >
                    <Camera className="h-3.5 w-3.5" /> Start Biometric Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopBiometricCamera}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <CameraOff className="h-3.5 w-3.5" /> Stop Camera
                  </button>
                )}

                <button
                  type="button"
                  disabled={!biometricCameraActive || !biometricConsent || biometricProcessing}
                  onClick={handleEnrollBiometric}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <ScanFace className="h-3.5 w-3.5" />
                  {biometricProcessing
                    ? 'Processing Vector...'
                    : biometricModalStudent.biometric?.enrolled
                    ? 'Re-enroll Face Data'
                    : 'Enroll Biometrics'}
                </button>
              </div>
            </div>

            {/* Option to Delete Biometric Data */}
            {biometricModalStudent.biometric?.enrolled && (
              <div className="pt-3 border-t border-slate-100">
                {!biometricDeleteConfirm ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-red-700 block">Delete Biometric Template</span>
                      <span className="text-[11px] text-slate-500">Reset biometric status without deleting student record</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBiometricDeleteConfirm(true)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                    >
                      Delete Biometrics
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-red-50 p-3 border border-red-200 space-y-2">
                    <p className="text-xs text-red-800 font-bold">
                      Confirm deletion of facial biometric vector for {biometricModalStudent.fullName}?
                    </p>
                    <p className="text-[11px] text-red-600">
                      The student will no longer be recognized by campus face scanners until re-enrolled.
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setBiometricDeleteConfirm(false)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleDeleteBiometric}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
                      >
                        {actionLoading ? 'Deleting...' : 'Yes, Delete Biometrics'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  stopBiometricCamera();
                  setBiometricModalStudent(null);
                  setBiometricDeleteConfirm(false);
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CORRECTION REVIEW / APPROVAL / REJECTION MODAL
          ============================================================ */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#20234A] flex items-center gap-2">
                {reviewModal.action === 'approve' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Approve Profile Correction
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Reject Profile Correction
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">
                  {reviewModal.request.studentName} ({reviewModal.request.rollNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Field:</span>
                <span className="font-bold text-indigo-700">
                  {FIELD_LABELS[reviewModal.request.fieldToUpdate] || reviewModal.request.fieldToUpdate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Current Value:</span>
                <span className="text-slate-700 line-through">
                  {reviewModal.request.currentValue || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Requested Value:</span>
                <span className="font-bold text-emerald-700">
                  {reviewModal.request.requestedValue}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-500">Student Reason:</span>
                <p className="mt-1 text-slate-700 italic">"{reviewModal.request.reason}"</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Administrator Review Notes & Decision Justification
              </label>
              <textarea
                rows={3}
                value={reviewModal.reviewNotes}
                onChange={(e) => setReviewModal({ ...reviewModal, reviewNotes: e.target.value })}
                placeholder="Enter audit trail notes..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              {reviewModal.action === 'approve' ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleApproveCorrection(reviewModal.request.requestId, reviewModal.reviewNotes)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating Profile...' : 'Confirm & Apply Change'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleRejectCorrection(reviewModal.request.requestId, reviewModal.reviewNotes)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
