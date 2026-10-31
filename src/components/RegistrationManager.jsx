import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  IdCard,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Scan,
  ScanFace,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import api from '../lib/api';
import { extractFaceDescriptorFromMedia } from '../lib/faceUtils';

const COURSES = [
  'B.Tech',
  'MBA',
  'MCA',
  'M.Tech',
  'BBA',
  'BCA'
];

const BRANCHES = [
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies',
  'Computer Applications'
];

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];
const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8'
];

const initialForm = {
  fullName: '',
  rollNumber: '',
  registrationNumber: '',
  email: '',
  mobileNumber: '',
  course: 'B.Tech',
  branch: 'Computer Science and Engineering',
  academicYear: '1st Year',
  currentSemester: 'Semester 1',
  admissionYear: new Date().getFullYear(),
  dateOfBirth: '',
  gender: 'Not Specified',
  address: '',
  studentStatus: 'Active',
  verificationStatus: 'Verified'
};

const WIZARD_STEPS = [
  { id: 1, title: 'Document OCR', subtitle: 'Upload ID / Admission Document', icon: Scan },
  { id: 2, title: 'Student Records', subtitle: 'Academic & Personal Details', icon: User },
  { id: 3, title: 'Photograph', subtitle: 'Upload or Webcam Snapshot', icon: Camera },
  { id: 4, title: 'Biometrics', subtitle: 'Face Template with Consent', icon: ScanFace },
  { id: 5, title: 'Confirmation', subtitle: 'Review & Save to MongoDB', icon: ShieldCheck }
];

export default function RegistrationManager({ onStudentCreated }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);

  // Photograph & Webcam state
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');

  // Biometrics state
  const [consentGiven, setConsentGiven] = useState(true);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  // OCR state
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrPreview, setOcrPreview] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState(null);
  const [ocrApplied, setOcrApplied] = useState(false);

  // Status & Submission
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredStudent, setRegisteredStudent] = useState(null);

  const videoRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ==========================================
  // OCR PROCESSING ENGINE
  // ==========================================
  const handleOcrFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrFile(file);
    setErrorMsg('');
    setOcrApplied(false);
    setOcrExtractedData(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setOcrPreview(event.target?.result);
    };
    reader.readAsDataURL(file);

    // Run OCR
    runOcrOnDocument(file);
  };

  const runOcrOnDocument = async (file) => {
    setProcessingOcr(true);
    setOcrProgress(5);
    setOcrText('Initializing OCR optical recognition engine...');

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const p = Math.min(Math.round(m.progress * 100), 99);
            setOcrProgress(p);
            setOcrText(`Scanning Document OCR: ${p}% completed...`);
          }
        }
      });

      setOcrProgress(100);
      const rawText = result.data.text || '';
      setOcrText(rawText);

      // Intelligent field extraction
      const extracted = parseOcrText(rawText);
      setOcrExtractedData(extracted);
    } catch (err) {
      console.warn('OCR processing notice:', err);
      setErrorMsg('Could not extract text automatically from this file. You can enter details manually.');
    } finally {
      setProcessingOcr(false);
    }
  };

  const parseOcrText = (text) => {
    const findRegex = (re) => {
      const match = text.match(re);
      return match ? match[1]?.trim() || match[0]?.trim() || '' : '';
    };

    // Name detection
    let detectedName = findRegex(/(?:Student Name|Full Name|Name|Candidate)\s*[:\-]?\s*([A-Za-z .'-]{3,35})/i);
    if (!detectedName) {
      // Look for lines that look like a person's name
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(line) && !line.includes('Bansal') && !line.includes('Institute')) {
          detectedName = line;
          break;
        }
      }
    }

    // Roll Number detection
    let detectedRoll = findRegex(/(?:Roll No|Roll Number|Roll|University Roll|Univ Roll)\s*[:\-]?\s*([A-Z0-9-]{6,16})/i);
    if (!detectedRoll) {
      const numMatch = text.match(/\b(2[0-9]{8,11})\b/);
      if (numMatch) detectedRoll = numMatch[1];
    }

    // Registration / Enrollment
    const detectedReg = findRegex(/(?:Registration|Enrollment|Reg No|Enroll No|AKTU No)\s*[:\-]?\s*([A-Z0-9-]{6,20})/i);

    // Course detection
    let detectedCourse = 'B.Tech';
    if (/MBA/i.test(text)) detectedCourse = 'MBA';
    else if (/MCA/i.test(text)) detectedCourse = 'MCA';
    else if (/M\.?Tech/i.test(text)) detectedCourse = 'M.Tech';
    else if (/BBA/i.test(text)) detectedCourse = 'BBA';
    else if (/BCA/i.test(text)) detectedCourse = 'BCA';

    // Branch detection
    let detectedBranch = form.branch;
    if (/Computer Science|CSE/i.test(text)) detectedBranch = 'Computer Science and Engineering';
    else if (/Information Tech|IT/i.test(text)) detectedBranch = 'Information Technology';
    else if (/Electronics|ECE/i.test(text)) detectedBranch = 'Electronics and Communication Engineering';
    else if (/Mechanical|ME/i.test(text)) detectedBranch = 'Mechanical Engineering';
    else if (/Civil|CE/i.test(text)) detectedBranch = 'Civil Engineering';

    // Admission Year
    let detectedYear = form.admissionYear;
    const yearMatch = text.match(/\b(201[8-9]|202[0-9])\b/);
    if (yearMatch) detectedYear = Number(yearMatch[1]);

    // Email
    const detectedEmail = findRegex(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);

    // Mobile Phone
    const detectedPhone = findRegex(/((?:\+91[\s-]?)?[6-9]\d{9})/);

    return {
      fullName: detectedName || form.fullName,
      rollNumber: detectedRoll ? detectedRoll.toUpperCase() : form.rollNumber,
      registrationNumber: detectedReg ? detectedReg.toUpperCase() : form.registrationNumber,
      course: detectedCourse,
      branch: detectedBranch,
      admissionYear: detectedYear,
      email: detectedEmail || form.email,
      mobileNumber: detectedPhone || form.mobileNumber
    };
  };

  const handleSimulateSampleOcr = () => {
    setProcessingOcr(true);
    setOcrProgress(50);
    setOcrText('Simulating optical recognition on sample BIET Student ID Card...');

    setTimeout(() => {
      const mockResult = {
        fullName: 'Aman Sharma',
        rollNumber: '230101045',
        registrationNumber: 'BIET-2023-CSE-045',
        course: 'B.Tech',
        branch: 'Computer Science and Engineering',
        admissionYear: 2023,
        email: 'aman.sharma@biet.ac.in',
        mobileNumber: '+91 98112 34567'
      };
      setOcrExtractedData(mockResult);
      setOcrProgress(100);
      setOcrText(
        'BANSAL INSTITUTE OF ENGINEERING AND TECHNOLOGY, LUCKNOW\nStudent ID Card · 2023-2027\nName: Aman Sharma\nRoll No: 230101045\nBranch: Computer Science & Engineering\nEmail: aman.sharma@biet.ac.in\nPhone: +91 98112 34567\nValid through: June 2027'
      );
      setProcessingOcr(false);
    }, 600);
  };

  const applyOcrToForm = () => {
    if (!ocrExtractedData) return;
    setForm((prev) => ({
      ...prev,
      ...ocrExtractedData
    }));
    setOcrApplied(true);
    setCurrentStep(2);
  };

  // ==========================================
  // PHOTOGRAPH & WEBCAM HANDLERS
  // ==========================================
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Only JPEG, PNG, or WebP images are permitted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photograph file size must be less than 5MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result;
      setPhotoPreview(dataUri);

      // Auto-extract face vector if consent given
      if (consentGiven && dataUri) {
        const img = new Image();
        img.src = dataUri;
        img.onload = () => {
          const desc = extractFaceDescriptorFromMedia(img);
          if (desc && desc.length === 128) {
            setFaceDescriptor(desc);
            setFaceEnrolled(true);
          }
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const startWebcam = async () => {
    setCameraError('');
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
    } catch (err) {
      setCameraError('Unable to access webcam. Please check browser permissions.');
    }
  };

  // Synchronize webcam stream whenever camera modal opens
  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play?.().catch(() => {});
    }
  }, [showCameraModal, cameraStream]);

  // Automatically compute face descriptor when photoPreview is available
  useEffect(() => {
    if (consentGiven && photoPreview && !faceDescriptor) {
      const img = new Image();
      img.src = photoPreview;
      img.onload = () => {
        const desc = extractFaceDescriptorFromMedia(img);
        if (desc && desc.length === 128) {
          setFaceDescriptor(desc);
          setFaceEnrolled(true);
        }
      };
    }
  }, [consentGiven, photoPreview, faceDescriptor]);

  const stopWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg', 0.92);

    setPhotoPreview(dataUri);
    setPhotoFile(null); // Base64 payload

    // If biometric consent is active, generate descriptor
    if (consentGiven) {
      const desc = extractFaceDescriptorFromMedia(videoRef.current);
      if (desc && desc.length === 128) {
        setFaceDescriptor(desc);
        setFaceEnrolled(true);
      }
    }

    stopWebcam();
  };

  // ==========================================
  // STEP VALIDATION
  // ==========================================
  const validateStep2 = () => {
    if (!form.fullName.trim()) return 'Student full name is required.';
    if (!form.rollNumber.trim()) return 'Unique roll number is required.';
    if (!form.email.trim() || !form.email.includes('@')) return 'A valid institutional email is required.';
    if (!form.mobileNumber.trim() || form.mobileNumber.length < 8) return 'A valid mobile number is required.';
    if (!form.course) return 'Course selection is required.';
    if (!form.branch) return 'Branch selection is required.';
    return '';
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (currentStep === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
    }
    if (currentStep < 5) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  // ==========================================
  // FINAL SUBMISSION (STEP 5)
  // ==========================================
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      let finalPhotoUrl = photoPreview;

      // If photo is a file, upload to backend first
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        try {
          const uploadRes = await api.post('/students/upload-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          finalPhotoUrl = uploadRes.data.photoUrl;
        } catch {
          // Fall back to base64 preview
        }
      }

      const payload = {
        ...form,
        photoUrl: finalPhotoUrl || '',
        biometric: {
          consentGiven,
          faceTemplate: consentGiven && faceDescriptor ? faceDescriptor : undefined
        }
      };

      const res = await api.post('/students', payload);
      const created = res.data.student;
      setRegisteredStudent(created);

      if (onStudentCreated) {
        onStudentCreated(created);
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Failed to complete student registration.';
      setErrorMsg(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setForm(initialForm);
    setPhotoPreview('');
    setPhotoFile(null);
    setConsentGiven(false);
    setFaceEnrolled(false);
    setFaceDescriptor(null);
    setOcrFile(null);
    setOcrPreview('');
    setOcrText('');
    setOcrExtractedData(null);
    setOcrApplied(false);
    setRegisteredStudent(null);
    setErrorMsg('');
    setCurrentStep(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Admissions & Student Lifecycle
          </p>
          <h1 className="text-2xl font-bold text-[#20234A]">Student Registration & Onboarding</h1>
          <p className="text-sm text-slate-500">
            Multi-step institutional registration with optical OCR extraction, webcam photo capture, and biometric enrollment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <Building2 className="h-4 w-4" /> BIET Lucknow
          </span>
        </div>
      </div>

      {/* Stepper Wizard Navigation Header */}
      {!registeredStudent && (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
          <div className="flex min-w-[650px] items-center justify-between">
            {WIZARD_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPassed = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isPassed || step.id <= currentStep) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-2xl p-2.5 transition text-left ${
                      isActive
                        ? 'bg-indigo-50/80 ring-1 ring-indigo-300'
                        : isPassed
                        ? 'hover:bg-slate-50 cursor-pointer'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-[#4338CA] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isPassed ? <Check className="h-4 w-4 stroke-[3]" /> : step.id}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isActive ? 'text-[#4338CA]' : 'text-slate-800'}`}>
                        {step.title}
                      </div>
                      <div className="text-[10px] text-slate-400 hidden sm:block">{step.subtitle}</div>
                    </div>
                  </button>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition ${
                        currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION SCREEN */}
      {registeredStudent ? (
        <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white p-8 shadow-soft text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#20234A]">Student Registered Successfully!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Student record has been permanently committed to MongoDB and provisioned with an active BIET login account.
            </p>
          </div>

          {/* Quick Details Card */}
          <div className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-white bg-slate-200 shadow-sm">
                {registeredStudent.photoUrl ? (
                  <img
                    src={registeredStudent.photoUrl}
                    alt={registeredStudent.fullName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://ui-avatars.com/api/?name=' +
                        encodeURIComponent(registeredStudent.fullName) +
                        '&background=4338ca&color=fff';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-indigo-700">
                    {registeredStudent.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-[#20234A]">{registeredStudent.fullName}</h3>
                <p className="font-mono text-xs font-semibold text-indigo-700">
                  Roll: {registeredStudent.rollNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {registeredStudent.course} · {registeredStudent.branch} ({registeredStudent.academicYear})
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Institutional Student ID</span>
                <div className="font-bold font-mono text-slate-900 mt-0.5">{registeredStudent.studentId}</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Student Portal Password</span>
                <div className="font-bold font-mono text-emerald-700 mt-0.5">BietStudent@2026</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Official Email</span>
                <div className="font-medium text-slate-800 truncate mt-0.5">{registeredStudent.email}</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Biometric Enrollment</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {registeredStudent.biometric?.enrolled ? (
                    <span className="text-emerald-700">128-D Vector Enrolled</span>
                  ) : (
                    <span className="text-slate-500">Photo ID Only</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForAnother}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4338CA] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" /> Register Another Student
            </button>
            <a
              href="/admin/students"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Users className="h-4 w-4" /> View Student Directory
            </a>
            <a
              href="/admin/id-cards"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
            >
              <IdCard className="h-4 w-4" /> Issue Identity Card
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          {/* STEP 1: DOCUMENT UPLOAD & OCR EXTRACTION */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                    Step 1 of 5
                  </span>
                  <h2 className="text-xl font-bold text-[#20234A] mt-0.5">
                    Document Upload & Optical OCR Extraction
                  </h2>
                  <p className="text-xs text-slate-500">
                    Upload an existing student college ID card, admission slip, or document (PNG, JPG, PDF) to auto-extract fields.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateSampleOcr}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                    title="Simulate OCR from a sample BIET admission card"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Sample Card OCR
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Skip to Manual Entry &rarr;
                  </button>
                </div>
              </div>

              {/* Upload Zone */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/70 transition">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleOcrFileSelect}
                      className="hidden"
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-3">
                      <Scan className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-bold text-[#20234A]">Upload ID Card or Admission Document</span>
                    <span className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WebP, or Admission PDFs</span>
                    <span className="mt-3 inline-block rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white shadow-sm">
                      Choose File to Scan
                    </span>
                  </label>

                  {ocrPreview && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                        Uploaded Document Preview
                      </span>
                      <div className="max-h-48 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <img src={ocrPreview} alt="OCR Document" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>

                {/* OCR Status and Extracted Data Review */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        OCR Detection Status
                      </span>
                      {processingOcr && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {ocrProgress}%
                        </span>
                      )}
                    </div>

                    {processingOcr ? (
                      <div className="mt-6 space-y-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 text-center font-medium animate-pulse">{ocrText}</p>
                      </div>
                    ) : ocrExtractedData ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Optical OCR successfully extracted student credentials. Review below:</span>
                        </div>

                        <div className="divide-y divide-slate-200 text-xs bg-white rounded-xl border border-slate-200 p-3">
                          <div className="py-1.5 flex justify-between">
                            <span className="text-slate-500">Student Name:</span>
                            <span className="font-bold text-slate-900">{ocrExtractedData.fullName || '—'}</span>
                          </div>
                          <div className="py-1.5 flex justify-between">
                            <span className="text-slate-500">Roll Number:</span>
                            <span className="font-mono font-bold text-indigo-700">{ocrExtractedData.rollNumber || '—'}</span>
                          </div>
                          <div className="py-1.5 flex justify-between">
                            <span className="text-slate-500">Course / Branch:</span>
                            <span className="font-semibold text-slate-800">
                              {ocrExtractedData.course} · {ocrExtractedData.branch}
                            </span>
                          </div>
                          <div className="py-1.5 flex justify-between">
                            <span className="text-slate-500">Admission Year:</span>
                            <span className="font-semibold text-slate-800">{ocrExtractedData.admissionYear}</span>
                          </div>
                          <div className="py-1.5 flex justify-between">
                            <span className="text-slate-500">Email:</span>
                            <span className="text-slate-700 font-mono">{ocrExtractedData.email || '—'}</span>
                          </div>
                          <div className="py-1.5 flex justify-between">
                            <span className="text-slate-500">Phone:</span>
                            <span className="text-slate-700">{ocrExtractedData.mobileNumber || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-400">
                        <Scan className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        Upload a physical student ID card or click &quot;Sample Card OCR&quot; to test auto-extraction.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
                    {ocrExtractedData ? (
                      <button
                        type="button"
                        onClick={applyOcrToForm}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                      >
                        Apply Extracted Data & Continue &rarr;
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                      >
                        Enter Manually &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: STUDENT ACADEMIC & PERSONAL RECORDS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                    Step 2 of 5
                  </span>
                  <h2 className="text-xl font-bold text-[#20234A] mt-0.5">
                    Student Academic & Personal Information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verify student identity details. Roll numbers and official emails are enforced as strictly unique.
                  </p>
                </div>
                {ocrApplied && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Auto-populated from OCR
                  </span>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Rahul Kumar"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Unique Roll Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    University Roll Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={form.rollNumber}
                    onChange={handleChange}
                    required
                    placeholder="e.g. 220101001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono uppercase outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Registration Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration / Enrollment No. (Optional)
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={form.registrationNumber}
                    onChange={handleChange}
                    placeholder="e.g. BIET-2022-CSE-001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official College Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="e.g. rahul.kumar@biet.ac.in"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={form.mobileNumber}
                    onChange={handleChange}
                    required
                    placeholder="e.g. +91 9876543210"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Course */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Degree / Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  >
                    {COURSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch / Specialization <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="branch"
                    value={form.branch}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="academicYear"
                    value={form.academicYear}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Current Semester */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="currentSemester"
                    value={form.currentSemester}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Admission Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="admissionYear"
                    min="2015"
                    max="2035"
                    value={form.admissionYear}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  >
                    <option value="Not Specified">Not Specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Student Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enrollment Status
                  </label>
                  <select
                    name="studentStatus"
                    value={form.studentStatus}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>

                {/* Permanent Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Permanent Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="e.g. Sector B, Sitapur Road, Lucknow, Uttar Pradesh"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  &larr; Back to Step 1
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Continue to Photograph &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: STUDENT PHOTOGRAPH & WEBCAM */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                    Step 3 of 5
                  </span>
                  <h2 className="text-xl font-bold text-[#20234A] mt-0.5">
                    Student Photograph Upload & Webcam Capture
                  </h2>
                  <p className="text-xs text-slate-500">
                    Provide a clear front-facing photograph for student identity cards and automated biometric recognition.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Photo Display Card */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="relative flex h-48 w-44 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-200 shadow-md">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Student Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center p-4 text-xs text-slate-400">
                        <Camera className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                        No Photograph Captured Yet
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                      <Upload className="h-3.5 w-3.5" /> Upload File
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={startWebcam}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 transition"
                    >
                      <Camera className="h-3.5 w-3.5 text-indigo-600" /> Live Webcam
                    </button>

                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview('');
                          setPhotoFile(null);
                          setFaceEnrolled(false);
                          setFaceDescriptor(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  {photoError && <p className="mt-2 text-xs text-red-600 font-medium">{photoError}</p>}
                </div>

                {/* Quality Guidance */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#20234A] mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      Institutional Photograph Guidelines
                    </h3>
                    <ul className="space-y-2.5 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>High-resolution front-facing portrait with both ears visible.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Plain, neutral background with even illumination.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>No sunglasses, face coverings, or reflective tinted lenses.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Supports JPEG, PNG, or WebP files under 5MB.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 mt-4 text-xs text-indigo-900">
                    <span className="font-semibold">Notice: </span>
                    If biometric enrollment is selected in Step 4, this photograph will be used to extract the 128-dimensional facial embedding vector.
                  </div>
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  &larr; Back to Step 2
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Continue to Biometrics &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: BIOMETRIC FACE ENROLLMENT */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                    Step 4 of 5
                  </span>
                  <h2 className="text-xl font-bold text-[#20234A] mt-0.5">
                    Biometric Face Enrollment & Consent
                  </h2>
                  <p className="text-xs text-slate-500">
                    Informed biometric enrollment for instant gate access and classroom attendance verification.
                  </p>
                </div>

                <div>
                  {faceEnrolled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 128-D Vector Ready
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Standard Photo ID Only
                    </span>
                  )}
                </div>
              </div>

              {/* Consent Box */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setConsentGiven(checked);
                      if (checked && photoPreview) {
                        const img = new Image();
                        img.src = photoPreview;
                        img.onload = () => {
                          const desc = extractFaceDescriptorFromMedia(img);
                          if (desc && desc.length === 128) {
                            setFaceDescriptor(desc);
                            setFaceEnrolled(true);
                          }
                        };
                      } else if (!checked) {
                        setFaceEnrolled(false);
                        setFaceDescriptor(null);
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs text-slate-800 leading-relaxed">
                    <span className="font-bold text-[#20234A]">Informed Student Biometric Consent Statement:</span>
                    <p className="mt-1 text-slate-600">
                      I certify that the student has been duly informed and has provided written or digital consent for the collection and processing of their facial feature embeddings. Biometric feature vectors are encrypted, access-restricted, strictly isolated on institutional servers, and used solely for campus gate security, examination hall check-in, and lecture attendance tracking.
                    </p>
                  </div>
                </label>

                {consentGiven && (
                  <div className="rounded-xl border border-emerald-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#20234A] flex items-center gap-2">
                        <ScanFace className="h-4 w-4 text-emerald-600" />
                        Biometric Extraction Engine
                      </span>
                      {faceEnrolled ? (
                        <span className="text-xs font-bold text-emerald-700">Extraction Complete</span>
                      ) : (
                        <span className="text-xs text-amber-700">Requires Photo from Step 3</span>
                      )}
                    </div>
                    {faceEnrolled && faceDescriptor ? (
                      <p className="mt-1 text-[11px] text-slate-500 font-mono">
                        Vector: [{faceDescriptor.slice(0, 5).join(', ')}, ... 128 Normalized Spatial Gradients]
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Upload or capture a student photograph in Step 3 to automatically generate the 128-D vector.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  &larr; Back to Step 3
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Review & Final Confirmation &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW, ID PREVIEW & FINAL CONFIRMATION */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                    Step 5 of 5
                  </span>
                  <h2 className="text-xl font-bold text-[#20234A] mt-0.5">
                    Review & Final Confirmation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Carefully review all extracted and verified student information before committing to MongoDB.
                  </p>
                </div>
              </div>

              {/* Side-by-Side Review Grid */}
              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                {/* ID Card Simulation Preview */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Digital ID Card Preview
                  </span>
                  <div className="w-full max-w-sm overflow-hidden rounded-2xl border-2 border-[#20234A] bg-white shadow-lg">
                    <div className="bg-[#20234A] p-3 text-center text-white">
                      <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
                        <Building2 className="h-4 w-4 text-indigo-300" />
                        BIET LUCKNOW
                      </div>
                      <p className="text-[9px] text-indigo-200 uppercase mt-0.5">Student Identity Card</p>
                    </div>

                    <div className="p-4">
                      <div className="flex gap-3">
                        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Card Preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                              Photo
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-[#20234A] truncate">
                            {form.fullName || 'Student Name'}
                          </h4>
                          <p className="font-mono text-xs font-bold text-indigo-700 mt-0.5">
                            Roll: {form.rollNumber || '—'}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-1 truncate">
                            {form.course} · {form.branch}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {form.academicYear} · {form.currentSemester}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                        <span>Status: <strong className="text-emerald-700">{form.studentStatus}</strong></span>
                        <span className="font-mono">Batch: {form.admissionYear}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structured Review Roster */}
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Institutional Record Summary
                  </span>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 divide-y divide-slate-200 text-xs">
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Student Full Name:</span>
                      <span className="font-bold text-slate-900">{form.fullName}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Roll Number:</span>
                      <span className="font-mono font-bold text-indigo-700">{form.rollNumber}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Registration Number:</span>
                      <span className="font-mono text-slate-700">{form.registrationNumber || 'Pending'}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Official Email:</span>
                      <span className="font-mono text-slate-800">{form.email}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Mobile Phone:</span>
                      <span className="text-slate-800">{form.mobileNumber}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Degree & Branch:</span>
                      <span className="font-semibold text-slate-800">
                        {form.course} · {form.branch}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Academic Year / Semester:</span>
                      <span className="text-slate-800">{form.academicYear} · {form.currentSemester}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Admission Year:</span>
                      <span className="text-slate-800">{form.admissionYear}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500 font-medium">Biometric Enrollment:</span>
                      <span className="font-semibold text-emerald-700">
                        {faceEnrolled ? '128-D Vector Ready' : 'Photo ID Only'}
                      </span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      &larr; Back to Step 4
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleFinalSubmit}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
                    >
                      <UserCheck className="h-4 w-4" />
                      {submitting ? 'Registering in Database...' : 'Confirm & Register Student'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WEBCAM CAPTURE MODAL */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-[#20234A]">Live Webcam Photograph Capture</h3>
              </div>
              <button
                type="button"
                onClick={stopWebcam}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 relative overflow-hidden rounded-2xl bg-black aspect-video flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {/* Face Guide Oval */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-44 w-36 rounded-[50%] border-2 border-dashed border-indigo-400/80 bg-indigo-500/10" />
              </div>
            </div>

            {cameraError && <p className="mt-2 text-xs font-medium text-red-600">{cameraError}</p>}

            <div className="mt-4 flex justify-between items-center">
              <span className="text-xs text-slate-500">Center face inside oval frame</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={stopWebcam}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Capture Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
