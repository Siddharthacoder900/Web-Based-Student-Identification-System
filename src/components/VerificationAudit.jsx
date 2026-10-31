import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Filter,
  History,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle
} from 'lucide-react';
import api from '../lib/api';

export default function VerificationAudit() {
  const [query, setQuery] = useState('');
  const [instantResult, setInstantResult] = useState(null);
  const [instantError, setInstantError] = useState('');
  const [searching, setSearching] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/verification/history', {
        params: {
          method: methodFilter || undefined,
          result: resultFilter || undefined,
          search: historySearch || undefined,
          limit: 100
        }
      });
      setHistory(res.data.history || []);
    } catch (err) {
      console.error('Unable to load verification history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [methodFilter, resultFilter]);

  const handleInstantVerify = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setInstantError('');
    setInstantResult(null);

    try {
      const res = await api.post('/verification/scan', { query: q });
      setInstantResult(res.data);
      fetchHistory(); // Refresh history
    } catch (err) {
      setInstantError(err.response?.data?.message || 'No matching student record found.');
      fetchHistory(); // Log entry recorded
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Instant Verification Query */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Access Control Query</p>
          <h2 className="mt-1 text-2xl font-bold text-textMain">Instant Student Verification</h2>
          <p className="mt-1 text-xs text-slate-500">
            Verify student identity manually using Student ID, Roll Number, or QR Token.
          </p>
        </div>

        <form onSubmit={handleInstantVerify} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Student ID (e.g. BIET-2024-1001) or Roll Number (e.g. 220101001)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <ShieldCheck className="h-4 w-4" />
            {searching ? 'Verifying...' : 'Verify Identity'}
          </button>
        </form>

        {/* Instant Verification Result Card */}
        {instantResult && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm">STUDENT VERIFIED</span>
              <span className="text-xs text-emerald-700">• {instantResult.message}</span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs">
              <div className="rounded-xl bg-white p-2.5 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Student</span>
                <p className="font-semibold text-textMain">{instantResult.student.fullName}</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Roll Number</span>
                <p className="font-mono font-bold text-indigo-700">{instantResult.student.rollNumber}</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Course & Branch</span>
                <p className="font-semibold text-textMain truncate">{instantResult.student.course} • {instantResult.student.branch}</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Verification Time</span>
                <p className="font-semibold text-indigo-700 text-[11px]">{instantResult.timestampKolkata}</p>
              </div>
            </div>
          </div>
        )}

        {instantError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{instantError}</span>
          </div>
        )}
      </div>

      {/* Section 2: Verification History Audit Log */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              <h3 className="text-2xl font-bold text-textMain">Verification Audit Log</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Complete chronological audit log of all biometric face scans, QR queries, and manual verifications.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh Log
          </button>
        </div>

        {/* History Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
              placeholder="Search audit log by student name, roll number, course..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="">All Methods</option>
              <option value="Face-1:N">Face (1:N Auto-Match)</option>
              <option value="Face-1:1">Face (1:1 Target Verify)</option>
              <option value="QR">QR Code Scanner</option>
              <option value="Manual">Manual Lookup</option>
            </select>

            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="">All Results</option>
              <option value="Verified">Verified Only</option>
              <option value="Not Verified">Not Verified Only</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Timestamp (Asia/Kolkata)</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Roll Number</th>
                <th className="px-4 py-3">Score / Notes</th>
                <th className="px-4 py-3">Verifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-xs text-slate-700">
              {historyLoading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-indigo-500 mb-1" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-slate-400">
                    No verification records match the selected criteria.
                  </td>
                </tr>
              ) : (
                history.map((log) => (
                  <tr key={log.logId || log._id} className="hover:bg-slate-50 transition">
                    {/* Timestamp */}
                    <td className="px-4 py-3 font-medium text-slate-800 text-[11px]">
                      {log.timestampKolkata}
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                        {log.method.startsWith('Face') ? (
                          <ScanFace className="h-3 w-3" />
                        ) : (
                          <QrCode className="h-3 w-3" />
                        )}
                        {log.method}
                      </span>
                    </td>

                    {/* Result */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          log.result === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
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

                    {/* Student Name */}
                    <td className="px-4 py-3 font-semibold text-textMain">
                      {log.studentName}
                    </td>

                    {/* Roll No */}
                    <td className="px-4 py-3 font-mono text-indigo-700">
                      {log.rollNumber || '—'}
                    </td>

                    {/* Score / Notes */}
                    <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                      {log.confidence ? `${log.confidence}% match` : log.notes || '—'}
                    </td>

                    {/* Verifier */}
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {log.verifierName || 'Administrator'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

