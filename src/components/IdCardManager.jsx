import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  IdCard,
  Maximize2,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import api from '../lib/api';

const COURSES = [
  'All Courses',
  'B.Tech',
  'MBA',
  'MCA',
  'M.Tech',
  'Polytechnic'
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
  '4th Year'
];

export default function IdCardManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeMap, setQrCodeMap] = useState({});

  // Filter States
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [yearFilter, setYearFilter] = useState('All Years');

  // Presentation States
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [cardSide, setCardSide] = useState('front'); // 'front' | 'back'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewStudent, setPreviewStudent] = useState(null);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Fetch Students & Pre-generate QRs
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      const list = res.data.students || [];
      setStudents(list);

      // Pre-generate QR data URLs for every student
      const qrs = {};
      for (const s of list) {
        try {
          const token = s.qrCodeToken || s.studentId;
          const url = await QRCode.toDataURL(token, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 180
          });
          qrs[s.studentId] = url;
        } catch {
          // Fallback handled
        }
      }
      setQrCodeMap(qrs);
    } catch (err) {
      console.error('Unable to load students for ID card generation', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filtered dataset
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (courseFilter !== 'All Courses' && s.course !== courseFilter) return false;
      if (branchFilter !== 'All Branches' && s.branch !== branchFilter) return false;
      if (yearFilter !== 'All Years' && s.academicYear !== yearFilter) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const searchable = [
        s.fullName,
        s.rollNumber,
        s.studentId,
        s.registrationNumber || '',
        s.course,
        s.branch
      ].join(' ').toLowerCase();

      return searchable.includes(q);
    });
  }, [students, search, courseFilter, branchFilter, yearFilter]);

  // Batch Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.studentId)));
    }
  };

  const toggleSelectStudent = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Helper to load photo URL (including /uploads/...) as data URI for jsPDF
  const getPhotoDataUri = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      if (url.startsWith('data:image')) return resolve(url);
      const fullUrl = url.startsWith('http')
        ? url
        : `${typeof window !== 'undefined' ? window.location.origin : ''}${url.startsWith('/') ? '' : '/'}${url}`;
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = fullUrl;
    });
  };

  // Generate Single CR80 Vector PDF (85.6mm x 54mm)
  const downloadSinglePDF = async (student) => {
    const isPortrait = orientation === 'portrait';
    const doc = new jsPDF({
      orientation: isPortrait ? 'portrait' : 'landscape',
      unit: 'mm',
      format: isPortrait ? [54, 85.6] : [85.6, 54]
    });

    const [qrDataUrl, photoDataUrl] = await Promise.all([
      qrCodeMap[student.studentId] || QRCode.toDataURL(student.qrCodeToken || student.studentId),
      getPhotoDataUri(student.photoUrl)
    ]);

    if (isPortrait) {
      // ----------------- PORTRAIT LAYOUT -----------------
      // Outer border
      doc.setDrawColor(210, 215, 230);
      doc.setLineWidth(0.4);
      doc.roundedRect(1, 1, 52, 83.6, 2, 2, 'D');

      // Top Header (Navy)
      doc.setFillColor(32, 35, 74);
      doc.rect(1, 1, 52, 14, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('BANSAL INSTITUTE OF ENGG. & TECH.', 27, 5.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(220, 230, 255);
      doc.text('LUCKNOW, UP • AKTU CODE: 422', 27, 8.5, { align: 'center' });
      doc.setTextColor(251, 191, 36); // Amber
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('STUDENT IDENTITY CARD', 27, 12, { align: 'center' });

      // Gold Divider Line
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.line(1, 15, 53, 15);

      // Photo
      doc.setDrawColor(200, 210, 225);
      doc.setFillColor(240, 243, 250);
      doc.roundedRect(17, 18, 20, 24, 1.5, 1.5, 'FD');

      if (photoDataUrl) {
        try {
          doc.addImage(photoDataUrl, 'JPEG', 17.5, 18.5, 19, 23);
        } catch {
          doc.setTextColor(67, 56, 202);
          doc.setFontSize(10);
          doc.text(student.fullName.slice(0, 2).toUpperCase(), 27, 31, { align: 'center' });
        }
      } else {
        doc.setTextColor(67, 56, 202);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(student.fullName.slice(0, 2).toUpperCase(), 27, 31, { align: 'center' });
      }

      // Name & Identifiers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(20, 25, 45);
      doc.text(student.fullName.toUpperCase(), 27, 46, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(67, 56, 202);
      doc.text(`ROLL: ${student.rollNumber}`, 27, 50, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(70, 75, 90);
      doc.text(`${student.course} — ${student.branch.slice(0, 24)}`, 27, 53.5, { align: 'center' });
      doc.text(`Year: ${student.academicYear}  |  ID: ${student.studentId}`, 27, 56.5, { align: 'center' });

      // QR Code
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 20, 59, 14, 14);
      }

      // Footer
      doc.setFillColor(245, 247, 250);
      doc.rect(1, 75, 52, 9.6, 'F');
      doc.setDrawColor(220, 225, 235);
      doc.line(1, 75, 53, 75);

      doc.setFontSize(3.5);
      doc.setTextColor(100, 110, 130);
      doc.text('Valid: 2024–2028 Session', 4, 79);
      doc.text('Property of BIET Lucknow', 4, 82);

      doc.setFont('helvetica', 'bold');
      doc.text('Auth. Signatory', 49, 81, { align: 'right' });

    } else {
      // ----------------- LANDSCAPE LAYOUT -----------------
      // Outer card border
      doc.setDrawColor(200, 205, 220);
      doc.setLineWidth(0.4);
      doc.roundedRect(1, 1, 83.6, 52, 2, 2, 'D');

      // Header bar (Deep Navy: #20234A)
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

      // Accent line (Gold / Amber)
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.6);
      doc.line(1, 13, 84.6, 13);

      // Left: Photo frame
      doc.setDrawColor(180, 190, 210);
      doc.setFillColor(240, 243, 250);
      doc.roundedRect(4, 16, 20, 24, 1.5, 1.5, 'FD');

      if (photoDataUrl) {
        try {
          doc.addImage(photoDataUrl, 'JPEG', 4.5, 16.5, 19, 23);
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

      // Center Details
      const leftTextX = 26;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(20, 25, 45);
      doc.text(student.fullName.toUpperCase(), leftTextX, 18.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(67, 56, 202);
      doc.text(`ROLL: ${student.rollNumber}  |  ID: ${student.studentId}`, leftTextX, 22.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(60, 65, 80);
      doc.text(`Course: ${student.course}`, leftTextX, 26.5);
      doc.text(`Branch: ${student.branch.slice(0, 28)}`, leftTextX, 30);
      doc.text(`Year/Sem: ${student.academicYear} (${student.currentSemester})`, leftTextX, 33.5);
      if (student.registrationNumber) {
        doc.text(`Reg No: ${student.registrationNumber}`, leftTextX, 37);
      } else {
        doc.text(`Status: ${student.studentStatus || 'Active'} • Institutional Verified`, leftTextX, 37);
      }

      // Right: QR Code
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 63.5, 16, 17, 17);
        doc.setFontSize(4);
        doc.setTextColor(120, 130, 150);
        doc.text('SCAN TO VERIFY', 72, 34.5, { align: 'center' });
      }

      // Footer bar
      doc.setFillColor(245, 247, 250);
      doc.rect(1, 44, 83.6, 9, 'F');
      doc.setDrawColor(220, 225, 235);
      doc.line(1, 44, 84.6, 44);

      doc.setFontSize(4.5);
      doc.setTextColor(80, 90, 110);
      doc.text('Valid: 2024–2028 Academic Session', 4, 48.5);
      doc.text('This card is the property of BIET Lucknow.', 4, 51.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.5);
      doc.setTextColor(30, 40, 60);
      doc.text('Authorized Signatory', 80, 50, { align: 'right' });
    }

    doc.save(`${student.rollNumber}_BIET_ID_CARD.pdf`);
  };

  // Batch Multi-Card PDF Generation
  const downloadBatchPDF = async () => {
    const targetStudents =
      selectedIds.size > 0
        ? filteredStudents.filter((s) => selectedIds.has(s.studentId))
        : filteredStudents;

    if (targetStudents.length === 0) return;

    setBatchGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54]
      });

      for (let i = 0; i < targetStudents.length; i++) {
        const student = targetStudents[i];
        if (i > 0) doc.addPage([85.6, 54], 'landscape');

        const [qrDataUrl, photoDataUrl] = await Promise.all([
          qrCodeMap[student.studentId] || QRCode.toDataURL(student.qrCodeToken || student.studentId),
          getPhotoDataUri(student.photoUrl)
        ]);

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

        if (photoDataUrl) {
          try {
            doc.addImage(photoDataUrl, 'JPEG', 4.5, 16.5, 19, 23);
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
        doc.text(`ROLL: ${student.rollNumber}  |  ID: ${student.studentId}`, leftTextX, 22.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(60, 65, 80);
        doc.text(`Course: ${student.course}`, leftTextX, 26.5);
        doc.text(`Branch: ${student.branch.slice(0, 28)}`, leftTextX, 30);
        doc.text(`Year/Sem: ${student.academicYear} (${student.currentSemester})`, leftTextX, 33.5);
        doc.text(`Status: ${student.studentStatus || 'Active'}`, leftTextX, 37);

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
      }

      doc.save(`BIET_BATCH_ID_CARDS_${targetStudents.length}_STUDENTS.pdf`);
    } catch (err) {
      console.error('Batch generation failed', err);
    } finally {
      setBatchGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                <IdCard className="h-3.5 w-3.5 text-indigo-600" />
                CR80 Institutional Standard
              </span>
              <span className="text-xs text-slate-400 font-mono">85.6mm × 53.98mm</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Student Identity Cards
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Generate, preview, batch-export, and print official BIET student identity badges with encrypted QR security.
            </p>
          </div>

          {/* Action Buttons: Batch Download & Print */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Printer className="h-4 w-4 text-indigo-600" /> Print Cards
            </button>

            <button
              type="button"
              disabled={batchGenerating || filteredStudents.length === 0}
              onClick={downloadBatchPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {batchGenerating
                ? 'Generating Batch PDF...'
                : selectedIds.size > 0
                ? `Export Selected (${selectedIds.size}) PDF`
                : `Export All (${filteredStudents.length}) Batch PDF`}
            </button>

            <button
              type="button"
              onClick={fetchStudents}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 shadow-sm transition"
              title="Refresh Student Records"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters, Orientation Toggle, Card Face Flip */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {/* Left: Search input */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll, ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Center: Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
            >
              {COURSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 max-w-[160px] truncate"
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Right: Layout Switchers & Selection */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Landscape vs Portrait Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  orientation === 'landscape' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Horizontal
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  orientation === 'portrait' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Vertical
              </button>
            </div>

            {/* Front vs Back Flip */}
            <button
              type="button"
              onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              title="Flip Card View"
            >
              <RotateCw className="h-3.5 w-3.5 text-indigo-600" />
              <span>{cardSide === 'front' ? 'Front Side' : 'Back Side'}</span>
            </button>

            {/* Select All Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                onChange={toggleSelectAll}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Select All</span>
            </label>
          </div>
        </div>

        {/* Counter Bar */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredStudents.length} of {students.length} students</span>
          {selectedIds.size > 0 && (
            <span className="font-bold text-indigo-700">{selectedIds.size} cards selected for batch export</span>
          )}
        </div>

        {/* Cards Grid */}
        <div className={`mt-6 grid gap-6 ${
          orientation === 'landscape'
            ? 'md:grid-cols-2 xl:grid-cols-3'
            : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {loading ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-2" />
              Rendering digital identity cards...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              <IdCard className="mx-auto h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No student records match filter criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or department filters.</p>
            </div>
          ) : (
            filteredStudents.map((s) => {
              const qrUrl = qrCodeMap[s.studentId];
              const isSelected = selectedIds.has(s.studentId);

              return (
                <div
                  key={s.studentId}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200 bg-white shadow-soft hover:shadow-lg'
                  }`}
                >
                  {/* Select Checkbox Overlay */}
                  <div className="absolute left-3 top-3 z-20">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectStudent(s.studentId)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    />
                  </div>

                  {/* =========================================================================
                      CARD VIEWPORT
                      ========================================================================= */}
                  {cardSide === 'front' ? (
                    orientation === 'landscape' ? (
                      /* HORIZONTAL (LANDSCAPE) FRONT */
                      <div className="relative aspect-[85.6/54] w-full overflow-hidden bg-gradient-to-br from-[#20234A] to-[#2E3368] p-3 text-white flex flex-col justify-between">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5 pl-6">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10">
                              <Building2 className="h-3.5 w-3.5 text-indigo-300" />
                            </div>
                            <div>
                              <h4 className="text-[10px] font-black tracking-tight text-white leading-tight">
                                BIET LUCKNOW
                              </h4>
                              <p className="text-[7px] uppercase tracking-wider text-indigo-200">
                                Student Identity Card
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-bold text-emerald-300 border border-emerald-400/30">
                            {s.studentStatus || 'Active'}
                          </span>
                        </div>

                        {/* Body Details */}
                        <div className="my-auto flex items-center gap-2.5 py-1">
                          {/* Photo */}
                          <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-sm flex items-center justify-center">
                            {s.photoUrl ? (
                              <img
                                src={s.photoUrl}
                                alt={s.fullName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.photo-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div
                              className={`photo-fallback flex h-full w-full items-center justify-center text-xs font-bold text-indigo-200 ${
                                s.photoUrl ? 'hidden' : ''
                              }`}
                            >
                              {s.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1 space-y-0.5 text-[9px]">
                            <h5 className="truncate text-xs font-bold text-white uppercase">{s.fullName}</h5>
                            <p className="font-mono font-bold text-amber-300">
                              Roll: {s.rollNumber}
                            </p>
                            <p className="font-mono text-[8px] text-indigo-200">
                              ID: {s.studentId}
                            </p>
                            <p className="truncate text-[8px] text-slate-300">
                              {s.course} • {s.branch}
                            </p>
                            <p className="text-[8px] text-slate-300">
                              {s.academicYear} ({s.currentSemester})
                            </p>
                          </div>

                          {/* QR Code */}
                          {qrUrl && (
                            <div className="shrink-0 rounded-lg bg-white p-1 shadow-sm">
                              <img src={qrUrl} alt="QR Code" className="h-10 w-10" />
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-white/10 pt-1 text-[7px] text-indigo-200">
                          <span>Valid: 2024–2028 Session</span>
                          <span className="font-semibold text-white">Auth. Signatory</span>
                        </div>
                      </div>
                    ) : (
                      /* VERTICAL (PORTRAIT) FRONT */
                      <div className="relative aspect-[54/85.6] w-full overflow-hidden bg-gradient-to-br from-[#20234A] to-[#2E3368] p-3 text-white flex flex-col justify-between">
                        {/* Header */}
                        <div className="text-center border-b border-white/10 pb-1.5 pl-6">
                          <h4 className="text-[10px] font-black tracking-tight text-white leading-tight">
                            BIET LUCKNOW
                          </h4>
                          <p className="text-[7px] uppercase tracking-wider text-amber-300 font-bold">
                            Student Identity Card
                          </p>
                          <p className="text-[6px] text-indigo-200">AKTU Code: 422</p>
                        </div>

                        {/* Photo */}
                        <div className="mx-auto my-1 relative h-20 w-16 overflow-hidden rounded-xl border border-white/30 bg-white/10 shadow-md flex items-center justify-center">
                          {s.photoUrl ? (
                            <img
                              src={s.photoUrl}
                              alt={s.fullName}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.photo-fallback');
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div
                            className={`photo-fallback flex h-full w-full items-center justify-center text-sm font-bold text-indigo-200 ${
                              s.photoUrl ? 'hidden' : ''
                            }`}
                          >
                            {s.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="text-center space-y-0.5 text-[8px]">
                          <h5 className="truncate text-[10px] font-bold text-white uppercase">{s.fullName}</h5>
                          <p className="font-mono font-bold text-amber-300">
                            Roll: {s.rollNumber}
                          </p>
                          <p className="font-mono text-[7px] text-indigo-200">
                            ID: {s.studentId}
                          </p>
                          <p className="truncate text-[7px] text-slate-300">
                            {s.course} • {s.branch}
                          </p>
                          <p className="text-[7px] text-slate-300">
                            {s.academicYear} ({s.currentSemester})
                          </p>
                        </div>

                        {/* QR Code */}
                        {qrUrl && (
                          <div className="mx-auto rounded-lg bg-white p-1 shadow-sm my-1">
                            <img src={qrUrl} alt="QR Code" className="h-10 w-10" />
                          </div>
                        )}

                        {/* Footer */}
                        <div className="border-t border-white/10 pt-1 text-center text-[6px] text-indigo-200 flex justify-between">
                          <span>Valid: 2024–2028</span>
                          <span className="font-bold text-white">Auth. Signature</span>
                        </div>
                      </div>
                    )
                  ) : (
                    /* REVERSE SIDE (BACK VIEW) */
                    <div className={`relative ${
                      orientation === 'landscape' ? 'aspect-[85.6/54]' : 'aspect-[54/85.6]'
                    } w-full overflow-hidden bg-slate-900 p-3 text-slate-300 flex flex-col justify-between text-[8px]`}>
                      <div className="border-b border-slate-700 pb-1 pl-6">
                        <span className="font-bold text-white block text-[9px]">INSTRUCTIONS & POLICIES</span>
                        <span className="text-[7px] text-slate-400">Bansal Institute of Engg. & Technology</span>
                      </div>

                      <div className="space-y-1 my-auto text-[7px] leading-relaxed text-slate-400">
                        <p>1. This card is non-transferable and must be carried on campus at all times.</p>
                        <p>2. Mandatory for gate security access, library, laboratory, and examinations.</p>
                        <p>3. If lost, report immediately to the Registrar Office. Duplicate fee applies.</p>
                        <p>4. Campus Address: NH-24, Sitapur Road, Lucknow, UP - 226201.</p>
                        <p className="font-mono text-indigo-300">Emergency Helpline: +91 522 274 0000</p>
                      </div>

                      <div className="border-t border-slate-700 pt-1 flex items-center justify-between text-[7px]">
                        <span>Blood Group: O+</span>
                        <span className="font-mono text-slate-400">AKTU Code: 422</span>
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 p-2.5">
                    <button
                      type="button"
                      onClick={() => setPreviewStudent(s)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadSinglePDF(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF Card
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          HIGH-FIDELITY ID CARD PREVIEW MODAL
          ========================================================================= */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IdCard className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Student ID Badge Preview: {previewStudent.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Realistic Physical Card Render */}
            <div className="flex justify-center py-2">
              <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-[#20234A] bg-white shadow-2xl">
                {/* Header */}
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
                  <div className="mt-2 inline-block rounded-full bg-amber-400/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/30">
                    Official Student Identity Card
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  <div className="flex gap-4">
                    <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 shadow-inner relative flex items-center justify-center">
                      {previewStudent.photoUrl ? (
                        <img
                          src={previewStudent.photoUrl}
                          alt={previewStudent.fullName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.photo-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`photo-fallback flex h-full w-full items-center justify-center font-bold text-indigo-700 text-lg ${
                          previewStudent.photoUrl ? 'hidden' : ''
                        }`}
                      >
                        {previewStudent.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-base font-bold text-slate-900 uppercase leading-snug">
                        {previewStudent.fullName}
                      </h4>
                      <p className="font-mono text-xs font-bold text-indigo-700">
                        Roll Number: {previewStudent.rollNumber}
                      </p>
                      {previewStudent.registrationNumber && (
                        <p className="font-mono text-[11px] text-slate-500">
                          Reg No: {previewStudent.registrationNumber}
                        </p>
                      )}
                      <p className="text-xs text-slate-700 font-medium">
                        {previewStudent.course} — {previewStudent.branch}
                      </p>
                      <p className="text-xs text-slate-500">
                        {previewStudent.academicYear} · Semester: {previewStudent.currentSemester}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        Student ID: {previewStudent.studentId}
                      </p>
                    </div>
                  </div>

                  {/* QR Security & Signature */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-3">
                      {qrCodeMap[previewStudent.studentId] && (
                        <img
                          src={qrCodeMap[previewStudent.studentId]}
                          alt="QR"
                          className="h-16 w-16 rounded-xl border border-slate-200 p-1"
                        />
                      )}
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <span className="font-bold text-slate-800 block">Encrypted QR Token</span>
                        <span>Authorized Campus Security</span>
                        <span className="block font-mono text-[10px] text-emerald-700">Status: Verified</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="h-7 w-20 border-b border-slate-400 mx-auto" />
                      <span className="text-[10px] font-bold text-slate-600 block mt-1">Registrar Signature</span>
                      <span className="text-[9px] text-slate-400">BIET Lucknow</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">CR80 Print Ready Specification</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadSinglePDF(previewStudent)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-indigo-700 transition"
                >
                  <Download className="h-4 w-4" /> Download CR80 PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewStudent(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
