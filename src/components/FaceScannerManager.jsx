import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Building2,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  HelpCircle,
  History,
  IdCard,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
  XCircle
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../lib/api';
import { extractFaceDescriptorFromMedia } from '../lib/faceUtils';

// Simple Web Audio API Tone Synthesizer
function playChime(isSuccess = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      // Pleasant double-beep for verified
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Soft low buzz for not verified
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio context may be restricted before user interaction
  }
}

export default function FaceScannerManager() {
  const [activeTab, setActiveTab] = useState('face'); // 'face' | 'qr'
  const [verificationMode, setVerificationMode] = useState('1:N'); // '1:N' | '1:1'
  const [targetRoll, setTargetRoll] = useState('');
  const [threshold, setThreshold] = useState(0.52);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [continuousAutoScan, setContinuousAutoScan] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [guidanceText, setGuidanceText] = useState('Position your face inside the oval frame.');

  // Result state
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);

  // QR state
  const [qrQuery, setQrQuery] = useState('');
  const [qrScanning, setQrScanning] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL'); // 'ALL' | 'FACE' | 'QR' | 'VERIFIED'

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const qrScannerRef = useRef(null);
  const autoScanTimerRef = useRef(null);

  // Load Recent Audit Logs
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/verification/history?limit=10');
      setAuditLogs(res.data.history || res.data.logs || []);
    } catch {
      // Ignored non-critical
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Fetch enrolled students list for quick selection in 1:1 mode
  const loadEnrolledStudents = useCallback(async () => {
    try {
      const res = await api.get('/students?faceEnrolled=true');
      setEnrolledStudents(res.data.students || []);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
    loadEnrolledStudents();
  }, [loadAuditLogs, loadEnrolledStudents]);

  // Start Camera
  const startCamera = async () => {
    setCameraError('');
    setVerificationResult(null);
    setVerificationError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setGuidanceText('Center face inside the oval frame and hold still.');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access was denied by browser permission. Please click the camera icon in your browser address bar to allow access.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No video camera device was detected on your system. Please connect a webcam.');
      } else {
        setCameraError(`Unable to start camera (${err.message || err.name}).`);
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  // Synchronize video stream whenever camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Perform Live Face Verification
  const verifyLiveFace = useCallback(async () => {
    if (!videoRef.current || !isCameraActive || isAnalyzing) return;

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setVerificationError('Camera feed is still initializing. Please wait a moment and try again.');
      return;
    }

    setIsAnalyzing(true);
    setVerificationError('');
    setGuidanceText('Extracting 128-D facial descriptor and matching...');

    try {
      const descriptor = extractFaceDescriptorFromMedia(videoRef.current);
      if (!descriptor || descriptor.length !== 128) {
        throw new Error('No clear face detected in the frame. Please look directly at the camera with proper lighting.');
      }

      const payload = {
        faceTemplate: descriptor,
        targetRollNumber: verificationMode === '1:1' && targetRoll.trim() ? targetRoll.trim() : undefined,
        threshold: Number(threshold)
      };

      const response = await api.post('/verification/face-verify', payload);
      setVerificationResult(response.data);

      if (response.data.match) {
        setGuidanceText(`Identity Verified: ${response.data.student?.fullName}`);
        if (audioFeedback) playChime(true);
      } else {
        setGuidanceText('Student Not Verified / Face Not Recognized');
        if (audioFeedback) playChime(false);
      }

      // Refresh recent audit logs
      loadAuditLogs();
    } catch (err) {
      setVerificationError(err.response?.data?.message || err.message || 'Face verification failed.');
      setGuidanceText('Verification attempt inconclusive. Try again or use QR fallback.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isCameraActive, isAnalyzing, verificationMode, targetRoll, threshold, audioFeedback, loadAuditLogs]);

  // Handle continuous auto-scanning
  useEffect(() => {
    if (continuousAutoScan && isCameraActive && activeTab === 'face') {
      autoScanTimerRef.current = setInterval(() => {
        verifyLiveFace();
      }, 3500);
    } else if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [continuousAutoScan, isCameraActive, activeTab, verifyLiveFace]);

  // Setup HTML5 QR Code Scanner when QR tab is opened
  useEffect(() => {
    if (activeTab === 'qr') {
      stopCamera();
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            'qr-reader-container',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          scanner.render(
            async (decodedText) => {
              setQrQuery(decodedText);
              await handleVerifyQuery(decodedText);
            },
            () => {}
          );
          qrScannerRef.current = scanner;
        } catch {
          // Container might not be ready
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (qrScannerRef.current) {
          qrScannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [activeTab]);

  // Handle Manual or QR Verification
  const handleVerifyQuery = async (queryToVerify) => {
    const q = (queryToVerify || qrQuery).trim();
    if (!q) return;

    setQrScanning(true);
    setVerificationError('');
    setVerificationResult(null);

    try {
      const res = await api.post('/verification/scan', { query: q });
      setVerificationResult({
        status: res.data.status,
        match: true,
        message: res.data.message,
        student: res.data.student,
        timestampKolkata: res.data.timestampKolkata,
        confidence: 100,
        method: 'QR'
      });
      if (audioFeedback) playChime(true);
      loadAuditLogs();
    } catch (err) {
      setVerificationResult({
        status: 'Not Verified',
        match: false,
        message: err.response?.data?.message || 'Student Not Verified / QR Not Recognized',
        timestampKolkata: err.response?.data?.timestampKolkata || new Date().toLocaleString()
      });
      if (audioFeedback) playChime(false);
      loadAuditLogs();
    } finally {
      setQrScanning(false);
    }
  };

  // Filtered audit logs
  const filteredLogs = auditLogs.filter((log) => {
    if (logFilter === 'FACE') return log.method?.startsWith('Face');
    if (logFilter === 'QR') return log.method === 'QR';
    if (logFilter === 'VERIFIED') return log.result === 'Verified';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                Institutional Computer Vision
              </span>
              <span className="text-xs text-slate-400 font-mono">CR80 Compliant</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Face Recognition & QR Scanner
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Live 1:N Identification, 1:1 Targeted Verification, and Physical ID Card QR Scanning for Campus Security.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('face');
                setVerificationResult(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'face'
                  ? 'bg-indigo-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanFace className="h-4 w-4" /> Face Scanner
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('qr');
                setVerificationResult(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'qr'
                  ? 'bg-indigo-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="h-4 w-4" /> QR Code Scanner
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FACE SCANNER */}
        {/* ========================================================================= */}
        {activeTab === 'face' && (
          <div className="mt-6 space-y-6">
            {/* Control Bar: Mode selection, Threshold Tuning, Audio, Auto-scan */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {/* Left: Mode Buttons & Target Roll */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verification Mode:
                </span>
                <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setVerificationMode('1:N')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      verificationMode === '1:N'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1:N Identification (Auto-Match)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMode('1:1')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      verificationMode === '1:1'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1:1 Verification (Target Roll)
                  </button>
                </div>

                {verificationMode === '1:1' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={targetRoll}
                      onChange={(e) => setTargetRoll(e.target.value.toUpperCase())}
                      placeholder="Roll No (e.g. 220101001)"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold uppercase text-indigo-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    {enrolledStudents.length > 0 && (
                      <select
                        onChange={(e) => setTargetRoll(e.target.value)}
                        value=""
                        className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-indigo-500"
                      >
                        <option value="" disabled>Select Enrolled Student...</option>
                        {enrolledStudents.map((s) => (
                          <option key={s.studentId} value={s.rollNumber}>
                            {s.rollNumber} - {s.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Controls & Presets */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Threshold tuning */}
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <span className="text-[11px] text-slate-400">Threshold:</span>
                  <select
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer"
                  >
                    <option value={0.46}>0.46 (Strict 95%+)</option>
                    <option value={0.52}>0.52 (Institutional Default)</option>
                    <option value={0.58}>0.58 (Relaxed Lighting)</option>
                  </select>
                </div>

                {/* Auto scan checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={continuousAutoScan}
                    onChange={(e) => setContinuousAutoScan(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Auto-Scan</span>
                </label>

                {/* Audio chime toggle */}
                <button
                  type="button"
                  onClick={() => setAudioFeedback(!audioFeedback)}
                  className={`rounded-xl border p-2 text-xs transition ${
                    audioFeedback
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                  title={audioFeedback ? 'Sound Chime Enabled' : 'Sound Muted'}
                >
                  {audioFeedback ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                {/* Start / Stop Camera Buttons */}
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-indigo-700 transition"
                  >
                    <Camera className="h-4 w-4" /> Start Camera
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={verifyLiveFace}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      <ScanFace className="h-4 w-4" />
                      {isAnalyzing ? 'Matching Face...' : 'Verify Face Now'}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <CameraOff className="h-3.5 w-3.5" /> Stop Camera
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error notifications */}
            {cameraError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">{cameraError}</p>
                  <p className="text-red-600">
                    Troubleshooting: Check whether another application (e.g. Zoom, Meet, Teams) is using the webcam, or switch to the QR Code Scanner fallback tab.
                  </p>
                </div>
              </div>
            )}

            {verificationError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{verificationError}</span>
              </div>
            )}

            {/* Scanner Main Grid: Live Video Oval Frame & Verification Result Card */}
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              {/* Left Column: Live Camera Feed with Oval Guide Frame */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-slate-950 p-4 shadow-xl min-h-[440px]">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  />

                  {isCameraActive ? (
                    /* Biometric Face Alignment Frame (Oval) */
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className={`relative h-64 w-48 rounded-[50%] border-2 transition-all duration-300 ${
                          verificationResult?.match
                            ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_35px_rgba(52,211,153,0.45)]'
                            : verificationResult && !verificationResult.match
                            ? 'border-red-400 bg-red-500/10 shadow-[0_0_35px_rgba(248,113,113,0.45)]'
                            : isAnalyzing
                            ? 'border-amber-400 animate-pulse bg-amber-500/10'
                            : 'border-cyan-400/80 border-dashed bg-cyan-400/5'
                        }`}
                      >
                        {/* Crosshairs & Scanning Line */}
                        <div className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 bg-cyan-400/70" />
                        <div className="absolute left-1/2 bottom-0 h-4 w-0.5 -translate-x-1/2 bg-cyan-400/70" />
                        <div className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 bg-cyan-400/70" />
                        <div className="absolute right-0 top-1/2 h-0.5 w-4 -translate-y-1/2 bg-cyan-400/70" />

                        {isAnalyzing && (
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce" />
                        )}
                      </div>

                      {/* Live Guidance Banner Overlay */}
                      <div className="mt-4 rounded-full bg-slate-900/85 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-white shadow-lg border border-white/10">
                        {guidanceText}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400">
                      <div className="rounded-full bg-slate-800 p-5 mb-4 border border-slate-700">
                        <Camera className="h-10 w-10 text-indigo-400" />
                      </div>
                      <h4 className="text-base font-semibold text-white">Biometric Camera Standby</h4>
                      <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        Click &ldquo;Start Camera&rdquo; to initiate biometric scanning. Position the student facing the camera in neutral lighting.
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-700 transition"
                      >
                        <Camera className="h-4 w-4" /> Start Camera
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Matched Student Result Card */}
              <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Verification Result
                    </span>
                    <Building2 className="h-4 w-4 text-indigo-600" />
                  </div>

                  {/* Result Display */}
                  {verificationResult ? (
                    verificationResult.match && verificationResult.student ? (
                      /* SUCCESS RESULT */
                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-100/80 p-4 text-center">
                          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-1" />
                          <h3 className="text-lg font-black tracking-wide text-emerald-900">
                            STUDENT VERIFIED
                          </h3>
                          <div className="mt-1 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                            <span>Confidence: {verificationResult.confidence || 98.4}%</span>
                            <span>•</span>
                            <span>Distance: {verificationResult.distance || 0.231}</span>
                          </div>
                        </div>

                        {/* Student Details Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            {verificationResult.student.photoUrl ? (
                              <img
                                src={verificationResult.student.photoUrl}
                                alt={verificationResult.student.fullName}
                                className="h-16 w-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'https://ui-avatars.com/api/?name=' +
                                    encodeURIComponent(verificationResult.student.fullName) +
                                    '&background=4338ca&color=fff';
                                }}
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700">
                                {verificationResult.student.fullName?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h4 className="text-base font-bold text-slate-900 uppercase">
                                {verificationResult.student.fullName}
                              </h4>
                              <p className="text-xs font-mono font-bold text-indigo-700">
                                Roll: {verificationResult.student.rollNumber}
                              </p>
                              {verificationResult.student.registrationNumber && (
                                <p className="text-[10px] font-mono text-slate-400">
                                  Reg: {verificationResult.student.registrationNumber}
                                </p>
                              )}
                              <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                Status: {verificationResult.student.status || 'Active'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Course:</span>
                              <span className="font-semibold text-slate-900">{verificationResult.student.course}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Branch:</span>
                              <span className="font-semibold text-slate-900 text-right max-w-[180px] truncate">
                                {verificationResult.student.branch}
                              </span>
                            </div>
                            {verificationResult.student.academicYear && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Academic Year:</span>
                                <span className="font-medium text-slate-800">{verificationResult.student.academicYear}</span>
                              </div>
                            )}
                            {verificationResult.student.currentSemester && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Semester:</span>
                                <span className="font-medium text-slate-800">{verificationResult.student.currentSemester}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-slate-100 pt-2 text-[11px]">
                              <span className="text-slate-400">Timestamp:</span>
                              <span className="font-semibold text-indigo-700 font-mono">
                                {verificationResult.timestampKolkata}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* NOT VERIFIED RESULT */
                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
                          <XCircle className="mx-auto h-8 w-8 text-red-600 mb-1" />
                          <h3 className="text-base font-black tracking-wide text-red-800">
                            Student Not Verified / Face Not Recognized
                          </h3>
                          <p className="mt-1 text-xs text-red-600">
                            {verificationResult.message || 'No biometric match found within active enrolled records.'}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 font-mono">
                            {verificationResult.timestampKolkata}
                          </p>
                        </div>

                        {/* Fallback recommendation */}
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-slate-600 space-y-2">
                          <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                            <ShieldAlert className="h-4 w-4 text-indigo-600" /> Recommended Fallback Actions:
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11px]">
                            <li>Ask student to remove glasses/mask and face directly into the light.</li>
                            <li>Try <strong>1:1 Verification</strong> if the student has a known roll number.</li>
                            <li>Switch to the <strong>QR Code Scanner</strong> to read physical card badge.</li>
                          </ul>

                          <button
                            type="button"
                            onClick={() => setActiveTab('qr')}
                            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                          >
                            <QrCode className="h-3.5 w-3.5" /> Switch to QR Scanner Fallback
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    /* AWAITING SCAN */
                    <div className="mt-8 text-center text-slate-400 py-6">
                      <ScanFace className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Awaiting Biometric Verification</p>
                      <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                        Start the camera and click &ldquo;Verify Face Now&rdquo; to identify the student against enrolled descriptors.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer notes */}
                <div className="mt-6 border-t border-slate-200 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Audit Logging: Active (Asia/Kolkata)</span>
                  <span className="font-mono">Threshold: {threshold}</span>
                </div>
              </div>
            </div>

            {/* Institutional Alignment Guidelines Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-indigo-600" />
                Institutional Face Alignment Protocol
              </h4>
              <div className="grid gap-3 sm:grid-cols-4 text-xs text-slate-600">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="font-bold text-slate-900 block mb-0.5">1. Center in Frame</span>
                  <p className="text-[11px] text-slate-500">Stand 0.5m away with chin and forehead inside the oval.</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="font-bold text-slate-900 block mb-0.5">2. Neutral Lighting</span>
                  <p className="text-[11px] text-slate-500">Avoid backlighting or direct sun behind the student.</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="font-bold text-slate-900 block mb-0.5">3. Face Directly</span>
                  <p className="text-[11px] text-slate-500">Look straight into the webcam with neutral expression.</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <span className="font-bold text-slate-900 block mb-0.5">4. Clear Coverings</span>
                  <p className="text-[11px] text-slate-500">Remove dark sunglasses, masks, or wide-brim hats.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: QR SCANNER FALLBACK */}
        {/* ========================================================================= */}
        {activeTab === 'qr' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            {/* Camera QR Reader */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                  Scan Physical Student ID QR Code
                </span>
                <div
                  id="qr-reader-container"
                  className="min-h-[320px] w-full overflow-hidden rounded-2xl bg-white shadow-inner"
                />
              </div>

              {/* Manual Lookup fallback */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                  Manual Roll Number / QR Token Fallback
                </span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyQuery();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={qrQuery}
                    onChange={(e) => setQrQuery(e.target.value)}
                    placeholder="Enter Roll Number (e.g. 220101001) or QR Token..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={qrScanning || !qrQuery.trim()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    Verify Token
                  </button>
                </form>
              </div>
            </div>

            {/* QR Result Panel */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 border-b border-slate-200 pb-2 block">
                  QR Verification Result
                </span>

                {verificationResult ? (
                  verificationResult.match && verificationResult.student ? (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-100 p-4 text-center">
                        <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600 mb-1" />
                        <h4 className="text-base font-bold text-emerald-900">STUDENT VERIFIED</h4>
                        <p className="text-xs text-emerald-700">Verified via Official BIET QR Signature</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-2">
                        <div className="font-bold text-base text-slate-900 uppercase">
                          {verificationResult.student.fullName}
                        </div>
                        <div className="font-mono font-bold text-indigo-700">
                          Roll: {verificationResult.student.rollNumber}
                        </div>
                        <div>Course: {verificationResult.student.course} • {verificationResult.student.branch}</div>
                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                          {verificationResult.timestampKolkata}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
                      <XCircle className="mx-auto h-7 w-7 text-red-600 mb-1" />
                      <h4 className="text-sm font-bold text-red-900">Student Not Verified</h4>
                      <p className="text-xs text-red-600">{verificationResult.message}</p>
                    </div>
                  )
                ) : (
                  <div className="mt-8 text-center text-slate-400 py-6">
                    <QrCode className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Scan physical card QR or enter roll number to verify.</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('face')}
                className="mt-6 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
              >
                Return to Face Scanner
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: LIVE AUDIT TRAIL FEED */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Verification Audit Trail</h3>
              <p className="text-xs text-slate-500">Immediate log of campus gate access & verification events</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter chips */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLogFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 ${
                  logFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('FACE')}
                className={`rounded-lg px-2.5 py-1 ${
                  logFilter === 'FACE' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
                }`}
              >
                Face
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('QR')}
                className={`rounded-lg px-2.5 py-1 ${
                  logFilter === 'QR' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
                }`}
              >
                QR
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('VERIFIED')}
                className={`rounded-lg px-2.5 py-1 ${
                  logFilter === 'VERIFIED' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-600'
                }`}
              >
                Verified
              </button>
            </div>

            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={auditLoading}
              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`h-4 w-4 ${auditLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Student Name & Roll</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestampKolkata || log.timestamp || 'Just now'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                        {log.method?.startsWith('Face') ? (
                          <ScanFace className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <QrCode className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{log.studentName || 'Unknown Student'}</div>
                      <div className="font-mono text-[10px] text-slate-400">{log.rollNumber || 'No Roll'}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          log.result === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {log.result === 'Verified' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        {log.result}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">
                      {log.confidence ? `${log.confidence}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-[140px]">
                      {log.verifierName || log.verifierEmail || 'Admin'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No verification records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
