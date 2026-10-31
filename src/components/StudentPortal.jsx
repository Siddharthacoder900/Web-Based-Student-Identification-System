import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  User
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import api from '../lib/api';

export default function StudentPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState({ percentage: 88, history: [] });
  const [corrections, setCorrections] = useState([]);
  const [correctionForm, setCorrectionForm] = useState({
    fieldToUpdate: 'fullName',
    requestedValue: '',
    reason: ''
  });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionMsg, setCorrectionMsg] = useState({ error: '', success: '' });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students/profile/me');
      setStudentData(res.data.student);
      if (res.data.attendance) {
        setAttendanceData(res.data.attendance);
      }
      if (res.data.pendingCorrections) {
        setCorrections(res.data.pendingCorrections);
      }
    } catch (err) {
      console.warn('Error loading student profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setCorrectionMsg({ error: '', success: '' });
    if (!correctionForm.requestedValue.trim() || !correctionForm.reason.trim()) {
      setCorrectionMsg({ error: 'Please enter both the requested value and reason.', success: '' });
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await api.post('/students/profile/correction-request', correctionForm);
      setCorrectionMsg({
        error: '',
        success: res.data.message || 'Correction request submitted for administrator verification.'
      });
      setCorrectionForm({ fieldToUpdate: 'fullName', requestedValue: '', reason: '' });
      loadProfile();
    } catch (err) {
      setCorrectionMsg({
        error: err.response?.data?.message || 'Failed to submit correction request.',
        success: ''
      });
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const printIdCard = () => {
    window.print();
  };

  const downloadIdCardPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54]
      });

      const qrDataUrl = await QRCode.toDataURL(student.qrCodeToken || student.studentId || student.rollNumber);

      // Outer border
      doc.setDrawColor(200, 205, 220);
      doc.setLineWidth(0.4);
      doc.roundedRect(1, 1, 83.6, 52, 2, 2, 'D');

      // Header bar (Navy)
      doc.setFillColor(32, 35, 74);
      doc.rect(1, 1, 83.6, 12, 'F');

      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('BANSAL INSTITUTE OF ENGG. & TECHNOLOGY', 42.8, 5.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.8);
      doc.setTextColor(220, 230, 255);
      doc.text('LUCKNOW, UTTAR PRADESH • AKTU CODE: 422', 42.8, 9, { align: 'center' });

      // Accent line
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.6);
      doc.line(1, 13, 84.6, 13);

      // Photo frame
      doc.setDrawColor(180, 190, 210);
      doc.setFillColor(240, 243, 250);
      doc.roundedRect(4, 16, 20, 24, 1.5, 1.5, 'FD');

      if (student.photoUrl && (student.photoUrl.startsWith('data:image') || student.photoUrl.startsWith('http'))) {
        try {
          doc.addImage(student.photoUrl, 'JPEG', 4.5, 16.5, 19, 23);
        } catch {
          doc.setTextColor(67, 56, 202);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(student.fullName.slice(0, 2).toUpperCase(), 14, 29, { align: 'center' });
        }
      } else {
        doc.setTextColor(67, 56, 202);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(student.fullName.slice(0, 2).toUpperCase(), 14, 29, { align: 'center' });
      }

      // Details
      const leftTextX = 26;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(20, 25, 45);
      doc.text(student.fullName.toUpperCase(), leftTextX, 18.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(67, 56, 202);
      doc.text(`ROLL: ${student.rollNumber}  |  ID: ${student.studentId || student.rollNumber}`, leftTextX, 22.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(60, 65, 80);
      doc.text(`Course: ${student.course}`, leftTextX, 26.5);
      doc.text(`Branch: ${(student.branch || '').slice(0, 28)}`, leftTextX, 30);
      doc.text(`Year/Sem: ${student.academicYear || ''} (${student.currentSemester || ''})`, leftTextX, 33.5);
      doc.text(`Status: ${student.studentStatus || 'Active'} • Official Verified`, leftTextX, 37);

      // QR Code
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 63.5, 16, 17, 17);
        doc.setFontSize(4);
        doc.setTextColor(120, 130, 150);
        doc.text('SCAN TO VERIFY', 72, 34.5, { align: 'center' });
      }

      // Footer
      doc.setFillColor(245, 247, 250);
      doc.rect(1, 44, 83.6, 9, 'F');
      doc.setDrawColor(220, 225, 235);
      doc.line(1, 44, 84.6, 44);

      doc.setFontSize(4.5);
      doc.setTextColor(80, 90, 110);
      doc.text('Valid: 2024–2028 Academic Session', 4, 48.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Authorized Signatory', 80, 50, { align: 'right' });

      doc.save(`${student.rollNumber}_BIET_ID_CARD.pdf`);
    } catch (err) {
      console.error('Failed to generate student ID card PDF', err);
    }
  };

  const student = studentData || {
    fullName: user.fullName || 'Rahul Kumar',
    rollNumber: user.identifier || '220101001',
    registrationNumber: 'BIET-2022-CSE-001',
    email: user.email || 'rahul.kumar@biet.ac.in',
    course: 'B.Tech',
    branch: 'Computer Science and Engineering',
    academicYear: '3rd Year',
    currentSemester: '5th Semester',
    admissionYear: 2022,
    mobileNumber: '+91 98765 43210',
    gender: 'Male',
    studentStatus: 'Active',
    verificationStatus: 'Verified',
    photoUrl: '/assets/sample-student.jpg'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#202124]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#20234A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Building2 className="h-6 w-6 text-indigo-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white">BIET LUCKNOW</span>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-400/30">
                  Student Portal
                </span>
              </div>
              <p className="text-xs text-indigo-200 hidden sm:block">
                Bansal Institute of Engineering and Technology
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold">{student.fullName}</div>
              <div className="text-xs text-indigo-200 font-mono">Roll: {student.rollNumber}</div>
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

        {/* Navigation Tabs */}
        <div className="border-t border-white/10 bg-[#1A1D3F]">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
            {[
              { id: 'overview', label: 'My Profile', icon: User },
              { id: 'idcard', label: 'Digital ID Card', icon: CreditCard },
              { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
              { id: 'correction', label: 'Correction Request', icon: Edit3 }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium whitespace-nowrap transition ${
                  activeTab === id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
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

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-sm font-medium">Loading student records...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: Profile & Academic Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hero Profile Banner */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                  <div className="h-28 bg-gradient-to-r from-[#20234A] to-[#4338CA] px-6 py-4 text-white sm:h-32">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-200" />
                      Academic Profile
                    </span>
                  </div>
                  <div className="relative px-6 pb-6 pt-0 sm:flex sm:items-end sm:justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
                      <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-md">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.fullName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.fullName) + '&background=4338ca&color=fff';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-indigo-50 font-bold text-indigo-700 text-2xl">
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 sm:mt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-2xl font-bold text-[#20234A]">{student.fullName}</h1>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            {student.studentStatus || 'Active'}
                          </span>
                          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                            {student.verificationStatus || 'Verified'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {student.course} · {student.branch} ({student.academicYear})
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-0 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('idcard')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> View Digital ID
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Academic Details */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft md:col-span-2">
                    <h2 className="text-base font-bold text-[#20234A] flex items-center gap-2 mb-4">
                      <GraduationCap className="h-5 w-5 text-indigo-600" />
                      Academic Information
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Roll Number</span>
                        <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{student.rollNumber}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Registration Number</span>
                        <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{student.registrationNumber || 'Pending'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Course & Degree</span>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">{student.course}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Branch / Specialization</span>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">{student.branch}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Academic Year & Semester</span>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">{student.academicYear} · {student.currentSemester}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Admission Batch</span>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">Year of Admission: {student.admissionYear}</div>
                      </div>
                    </div>

                    <h2 className="text-base font-bold text-[#20234A] flex items-center gap-2 mt-6 mb-4">
                      <User className="h-5 w-5 text-indigo-600" />
                      Contact & Personal Record
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Official Email</span>
                          <span className="text-xs font-medium text-slate-800 truncate block">{student.email}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Mobile Phone</span>
                          <span className="text-xs font-medium text-slate-800 block">{student.mobileNumber || 'Not provided'}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3">
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Gender</span>
                          <span className="text-xs font-medium text-slate-800 block">{student.gender || 'Not Specified'}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Permanent Address</span>
                          <span className="text-xs font-medium text-slate-800 truncate block">{student.address || 'Lucknow, Uttar Pradesh'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Biometric Summary Card */}
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-[#20234A] flex items-center gap-2">
                          <CalendarCheck className="h-5 w-5 text-indigo-600" />
                          Attendance
                        </h2>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          Good Standing
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-center">
                        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-8 border-indigo-100 bg-indigo-50/50">
                          <div className="text-center">
                            <span className="text-2xl font-black text-[#4338CA]">{attendanceData.percentage}%</span>
                            <span className="block text-[10px] font-bold uppercase text-slate-400">Total</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-center text-xs text-slate-500">
                        Institutional attendance threshold is 75%. You are currently eligible for exams.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                      <h2 className="text-base font-bold text-[#20234A] flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-5 w-5 text-indigo-600" />
                        Smart Security Status
                      </h2>
                      <div className="space-y-2.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                          <span>Face Biometric Enrolled:</span>
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                          <span>QR Digital Token:</span>
                          <span className="font-semibold text-indigo-700">Active</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                          <span>Campus Gate Clearance:</span>
                          <span className="font-semibold text-emerald-700">Authorized</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Digital Identity Card */}
            {activeTab === 'idcard' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#20234A]">Official Student ID Card</h2>
                    <p className="text-sm text-slate-500">
                      Standard CR80 Institutional Credential Card issued by BIET Lucknow.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={downloadIdCardPDF}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      <Download className="h-4 w-4" /> Download CR80 PDF
                    </button>
                    <button
                      type="button"
                      onClick={printIdCard}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      <Printer className="h-4 w-4" /> Print Card
                    </button>
                  </div>
                </div>

                {/* Realistic ID Card Preview */}
                <div className="flex justify-center py-4">
                  <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-[#20234A] bg-white shadow-xl">
                    {/* Header Banner */}
                    <div className="bg-[#20234A] p-4 text-center text-white">
                      <div className="flex items-center justify-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-300" />
                        <span className="font-black text-sm tracking-widest uppercase">
                          Bansal Institute of Engineering & Technology
                        </span>
                      </div>
                      <p className="text-[10px] text-indigo-200 uppercase tracking-widest mt-0.5">
                        NH-24, Sitapur Road, Lucknow, UP · AKTU Code: 422
                      </p>
                      <div className="mt-2 inline-block rounded-full bg-indigo-500/30 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 border border-indigo-400/30">
                        Student Identity Card
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                      <div className="flex gap-5">
                        <div className="h-32 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 shadow-inner">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.fullName}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.fullName) + '&background=4338ca&color=fff';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-indigo-50 font-bold text-indigo-700">
                              {student.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-lg text-[#20234A] truncate">{student.fullName}</h3>
                          <div className="mt-1 space-y-1 text-xs">
                            <p className="text-slate-600">
                              <span className="font-bold text-slate-400 uppercase text-[10px] block">Roll Number</span>
                              <span className="font-mono font-bold text-[#4338CA] text-sm">{student.rollNumber}</span>
                            </p>
                            <p className="text-slate-600">
                              <span className="font-bold text-slate-400 uppercase text-[10px] block">Course & Branch</span>
                              <span className="font-medium text-slate-800">{student.course} · {student.branch}</span>
                            </p>
                            <p className="text-slate-600">
                              <span className="font-bold text-slate-400 uppercase text-[10px] block">Academic Year</span>
                              <span className="font-medium text-slate-800">{student.academicYear} ({student.admissionYear})</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer with QR */}
                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="text-[11px] text-slate-500">
                          <p className="font-mono text-[10px] text-slate-400">Reg: {student.registrationNumber || 'BIET-2022'}</p>
                          <p className="mt-0.5 font-semibold text-emerald-700">Status: {student.studentStatus || 'Active'}</p>
                          <p className="text-[9px] text-slate-400 mt-1">Valid through graduation</p>
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-white p-1">
                          {student.qrCode ? (
                            <img src={student.qrCode} alt="Verification QR" className="h-full w-full object-contain" />
                          ) : (
                            <QrCode className="h-10 w-10 text-slate-700" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Attendance History */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#20234A]">My Attendance Records</h2>
                  <p className="text-sm text-slate-500">
                    Verified classroom and lab attendance captured by faculty via QR & face scanning.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">Cumulative Attendance</span>
                    <div className="text-2xl font-bold text-indigo-700 mt-1">{attendanceData.percentage}%</div>
                    <span className="text-[11px] text-emerald-600 font-medium">Eligible for Semester Examination</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">Classes Attended</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">42 / 48</div>
                    <span className="text-[11px] text-slate-400">Current Semester</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">Attendance Requirement</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">75.0%</div>
                    <span className="text-[11px] text-indigo-600 font-medium">AKTU Institutional Standard</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="font-bold text-[#20234A]">Recent Lecture Attendance Entries</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(attendanceData.history || []).length > 0 ? (
                      attendanceData.history.map((record, idx) => (
                        <div key={idx} className="flex items-center justify-between px-6 py-3.5 text-xs">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="font-semibold text-slate-800">
                                {record.sessionTitle || 'Classroom Lecture Session'}
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                {new Date(record.markedAt || Date.now()).toLocaleDateString()} · {record.verificationMethod}
                              </div>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700">
                            {record.status || 'Present'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-8 text-center text-xs text-slate-400">
                        No recent attendance entries recorded in this session.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Profile Correction Request */}
            {activeTab === 'correction' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#20234A]">Profile Correction Request</h2>
                  <p className="text-sm text-slate-500">
                    Found an error in your name, contact, or address? Submit a verified correction request for administrative approval.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Submit Form */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                    <h3 className="font-bold text-base text-[#20234A] mb-4">Request a Change</h3>
                    <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Field to Update</label>
                        <select
                          value={correctionForm.fieldToUpdate}
                          onChange={(e) => setCorrectionForm((f) => ({ ...f, fieldToUpdate: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                        >
                          <option value="fullName">Full Name (Spelling error)</option>
                          <option value="mobileNumber">Mobile Number</option>
                          <option value="address">Permanent Address</option>
                          <option value="dateOfBirth">Date of Birth</option>
                          <option value="gender">Gender</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Correct Value</label>
                        <input
                          type="text"
                          value={correctionForm.requestedValue}
                          onChange={(e) => setCorrectionForm((f) => ({ ...f, requestedValue: e.target.value }))}
                          placeholder="Enter the correct information"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Reason & Remarks</label>
                        <textarea
                          rows={3}
                          value={correctionForm.reason}
                          onChange={(e) => setCorrectionForm((f) => ({ ...f, reason: e.target.value }))}
                          placeholder="Explain why this correction is required (e.g. As per Class 10 High School Certificate)"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                        />
                      </div>

                      {correctionMsg.error ? (
                        <p className="text-xs font-medium text-red-600">{correctionMsg.error}</p>
                      ) : null}
                      {correctionMsg.success ? (
                        <p className="text-xs font-medium text-emerald-700">{correctionMsg.success}</p>
                      ) : null}

                      <button
                        type="submit"
                        disabled={submittingCorrection}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4338CA] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {submittingCorrection ? 'Submitting...' : 'Submit Request to Administration'}
                      </button>
                    </form>
                  </div>

                  {/* Previous Requests */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                    <h3 className="font-bold text-base text-[#20234A] mb-4">Request History</h3>
                    <div className="space-y-3">
                      {corrections.length > 0 ? (
                        corrections.map((corr) => (
                          <div key={corr.requestId} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 capitalize">{corr.fieldToUpdate}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  corr.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : corr.status === 'Rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {corr.status}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-600">Requested: <span className="font-semibold text-indigo-700">{corr.requestedValue}</span></p>
                            <p className="mt-0.5 text-[11px] text-slate-400">Reason: {corr.reason}</p>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center text-xs text-slate-400">
                          No profile correction requests submitted yet.
                        </div>
                      )}
                    </div>
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

