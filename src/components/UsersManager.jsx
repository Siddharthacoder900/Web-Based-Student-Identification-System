import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  Edit3,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X
} from 'lucide-react';
import api from '../lib/api';

const DEPARTMENTS = [
  'All Departments',
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies',
  'Campus Security & Main Gate',
  'Central Library',
  'Hostel & Student Welfare',
  'Examination Cell'
];

export default function UsersManager() {
  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' | 'staff' | 'admins'
  const [teachers, setTeachers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState({ approvedDomains: [], authorizedEmails: [] });
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('teacher'); // 'teacher' | 'staff'
  const [editCandidate, setEditCandidate] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Add Form Data
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    department: 'Computer Science and Engineering',
    role: 'Assistant Professor',
    mobileNumber: ''
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, setRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/staff'),
        api.get('/auth/settings')
      ]);
      setTeachers(tRes.data.teachers || []);
      setStaff(sRes.data.staff || []);
      setSettings(setRes.data || { approvedDomains: [], authorizedEmails: [] });
    } catch (err) {
      console.warn('Error loading users manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (deptFilter !== 'All Departments' && t.department !== deptFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [t.fullName, t.employeeId, t.email, t.department, t.designation].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [teachers, search, deptFilter]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (deptFilter !== 'All Departments' && s.department !== deptFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [s.fullName, s.staffId, s.email, s.department, s.designation].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [staff, search, deptFilter]);

  // Handle Account Provisioning
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFeedbackMsg('');
    setErrorMsg('');
    setActionLoading(true);

    try {
      if (addType === 'teacher') {
        const res = await api.post('/teachers', {
          employeeId: formData.employeeId || undefined,
          fullName: formData.fullName,
          email: formData.email,
          department: formData.department,
          designation: formData.role,
          mobileNumber: formData.mobileNumber
        });
        setFeedbackMsg(`Teacher account provisioned with Employee ID: ${res.data.teacher?.employeeId}`);
      } else {
        const res = await api.post('/staff', {
          staffId: formData.employeeId || undefined,
          fullName: formData.fullName,
          email: formData.email,
          department: formData.department,
          designation: formData.role,
          mobileNumber: formData.mobileNumber
        });
        setFeedbackMsg(`Staff account provisioned with Staff ID: ${res.data.staff?.staffId}`);
      }

      setShowAddModal(false);
      setFormData({
        employeeId: '',
        fullName: '',
        email: '',
        department: 'Computer Science and Engineering',
        role: 'Assistant Professor',
        mobileNumber: ''
      });
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to provision account.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Save
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editCandidate) return;
    setActionLoading(true);
    setErrorMsg('');

    try {
      if (editCandidate.type === 'teacher') {
        await api.put(`/teachers/${editCandidate.employeeId}`, editCandidate);
        setFeedbackMsg(`Updated details for faculty ${editCandidate.fullName}.`);
      } else {
        await api.put(`/staff/${editCandidate.staffId}`, editCandidate);
        setFeedbackMsg(`Updated details for staff member ${editCandidate.fullName}.`);
      }
      setEditCandidate(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update user record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Toggle (Active vs Inactive)
  const handleToggleStatus = async (item, type) => {
    setActionLoading(true);
    const nextStatus = item.accountStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      if (type === 'teacher') {
        await api.patch(`/teachers/${item.employeeId}/status`, { status: nextStatus });
        setFeedbackMsg(`Faculty ${item.fullName} is now ${nextStatus}.`);
      } else {
        await api.patch(`/staff/${item.staffId}/status`, { status: nextStatus });
        setFeedbackMsg(`Staff member ${item.fullName} is now ${nextStatus}.`);
      }
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to change account status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setActionLoading(true);
    try {
      if (deleteCandidate.type === 'teacher') {
        await api.delete(`/teachers/${deleteCandidate.employeeId}`);
        setFeedbackMsg(`Teacher profile "${deleteCandidate.fullName}" removed.`);
      } else {
        await api.delete(`/staff/${deleteCandidate.staffId}`);
        setFeedbackMsg(`Staff profile "${deleteCandidate.fullName}" removed.`);
      }
      setDeleteCandidate(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete record.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Access Control & Personnel Directory
          </p>
          <h1 className="text-2xl font-bold text-[#20234A]">Teacher & Staff Management</h1>
          <p className="text-sm text-slate-500">
            Provision faculty accounts, manage staff departments, edit assignments, and configure account access tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setAddType('teacher');
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <UserPlus className="h-4 w-4" /> Provision New Account
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

      {/* Main Container */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 p-4 gap-3">
          <div className="flex gap-2">
            {[
              { id: 'teachers', label: 'Faculty & Teachers', icon: BookOpen, count: teachers.length },
              { id: 'staff', label: 'Campus Security & Staff', icon: ShieldCheck, count: staff.length },
              { id: 'admins', label: 'System Administrators', icon: Lock, count: (settings.authorizedEmails?.length || 1) + 1 }
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setSearch('');
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === id
                    ? 'bg-indigo-50 text-[#4338CA] ring-1 ring-indigo-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] shadow-sm border border-slate-200 text-slate-600">
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Filters for Teachers and Staff */}
          {activeTab !== 'admins' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, ID, email..."
                  className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: FACULTY & TEACHERS */}
        {activeTab === 'teachers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Employee ID</th>
                  <th className="px-6 py-3.5">Faculty Name</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Designation</th>
                  <th className="px-6 py-3.5">Official Email</th>
                  <th className="px-6 py-3.5">Mobile Phone</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((t) => (
                    <tr key={t.employeeId} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5 font-mono font-bold text-indigo-700">{t.employeeId}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                          {t.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        {t.fullName}
                      </td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">{t.department}</td>
                      <td className="px-6 py-3.5 text-slate-500">{t.designation || 'Faculty'}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{t.email}</td>
                      <td className="px-6 py-3.5 text-slate-600">{t.mobileNumber || '—'}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            t.accountStatus === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {t.accountStatus || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditCandidate({ ...t, type: 'teacher' })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit Faculty Details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t, 'teacher')}
                            className={`rounded-lg p-1.5 ${
                              t.accountStatus === 'Active'
                                ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                                : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                            title={t.accountStatus === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {t.accountStatus === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate({ ...t, type: 'teacher' })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Remove Faculty Profile"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                      No faculty records match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: CAMPUS SECURITY & STAFF */}
        {activeTab === 'staff' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Staff ID</th>
                  <th className="px-6 py-3.5">Staff Member Name</th>
                  <th className="px-6 py-3.5">Department / Desk</th>
                  <th className="px-6 py-3.5">Designation</th>
                  <th className="px-6 py-3.5">Official Email</th>
                  <th className="px-6 py-3.5">Mobile Phone</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((s) => (
                    <tr key={s.staffId} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5 font-mono font-bold text-emerald-800">{s.staffId}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                          {s.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        {s.fullName}
                      </td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">{s.department}</td>
                      <td className="px-6 py-3.5 text-slate-500">{s.designation || 'Staff'}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{s.email}</td>
                      <td className="px-6 py-3.5 text-slate-600">{s.mobileNumber || '—'}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            s.accountStatus === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {s.accountStatus || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditCandidate({ ...s, type: 'staff' })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit Staff Member"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s, 'staff')}
                            className={`rounded-lg p-1.5 ${
                              s.accountStatus === 'Active'
                                ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                                : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                            title={s.accountStatus === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {s.accountStatus === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate({ ...s, type: 'staff' })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Remove Staff Profile"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                      No staff records match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: SYSTEM ADMINISTRATORS */}
        {activeTab === 'admins' && (
          <div className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Tier 1</span>
                <h4 className="font-bold text-sm text-[#20234A] mt-1">Super Administrator</h4>
                <p className="mt-2 text-xs text-slate-500">
                  Full control over institutional settings, allowlists, and access revocations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Tier 2</span>
                <h4 className="font-bold text-sm text-[#20234A] mt-1">Admission Admin</h4>
                <p className="mt-2 text-xs text-slate-500">
                  Authorized for student registrations, OCR imports, and identity card generation.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Tier 3</span>
                <h4 className="font-bold text-sm text-[#20234A] mt-1">Verification Operator</h4>
                <p className="mt-2 text-xs text-slate-500">
                  Authorized for scanning, gate clearance audits, and classroom attendance oversight.
                </p>
              </div>
            </div>

            {/* Admin accounts */}
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              <div className="p-4 px-6 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    SA
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">System Super Administrator</div>
                    <div className="text-slate-500 font-mono">admin@biet.ac.in</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-800 border border-amber-200">
                    Super Admin
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                    Active
                  </span>
                </div>
              </div>

              {(settings.authorizedEmails || []).map((email) => (
                <div key={email} className="p-4 px-6 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                      AD
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Approved Administrative Account</div>
                      <div className="text-slate-500 font-mono">{email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-bold text-indigo-700 border border-indigo-200">
                      Admission Admin
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                      Allowlisted
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          PROVISION NEW USER MODAL
          ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#20234A]">Provision Campus Account</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddType('teacher');
                      setFormData((f) => ({
                        ...f,
                        department: 'Computer Science and Engineering',
                        role: 'Assistant Professor'
                      }));
                    }}
                    className={`rounded-xl py-2 text-xs font-semibold border transition ${
                      addType === 'teacher'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Faculty / Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddType('staff');
                      setFormData((f) => ({
                        ...f,
                        department: 'Campus Security & Main Gate',
                        role: 'Security Officer'
                      }));
                    }}
                    className={`rounded-xl py-2 text-xs font-semibold border transition ${
                      addType === 'staff'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Security & Staff
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {addType === 'teacher' ? 'Employee ID (Optional - auto-generated)' : 'Staff ID (Optional - auto-generated)'}
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData((f) => ({ ...f, employeeId: e.target.value }))}
                  placeholder={addType === 'teacher' ? 'e.g. T-1002' : 'e.g. S-2002'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder={addType === 'teacher' ? 'e.g. Dr. Ramesh Chandra' : 'e.g. Sunil Verma'}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  placeholder={addType === 'teacher' ? 'e.g. faculty@biet.ac.in' : 'e.g. security@biet.ac.in'}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Post</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData((f) => ({ ...f, department: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                >
                  {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                  placeholder={addType === 'teacher' ? 'e.g. Assistant Professor' : 'e.g. Senior Security Supervisor'}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData((f) => ({ ...f, mobileNumber: e.target.value }))}
                  placeholder="e.g. +91 9876543210"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-[11px] text-indigo-900">
                <span className="font-semibold">Initial Password: </span>
                {addType === 'teacher' ? 'Teacher@2026' : 'Staff@2026'} (User will be prompted to reset upon first login).
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[#4338CA] px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          EDIT USER MODAL
          ============================================================ */}
      {editCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#20234A]">Edit Personnel Record: {editCandidate.fullName}</h3>
              <button
                type="button"
                onClick={() => setEditCandidate(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editCandidate.fullName}
                  onChange={(e) => setEditCandidate((c) => ({ ...c, fullName: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Post</label>
                <select
                  value={editCandidate.department}
                  onChange={(e) => setEditCandidate((c) => ({ ...c, department: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                >
                  {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={editCandidate.designation || ''}
                  onChange={(e) => setEditCandidate((c) => ({ ...c, designation: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={editCandidate.mobileNumber || ''}
                  onChange={(e) => setEditCandidate((c) => ({ ...c, mobileNumber: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editCandidate.accountStatus || 'Active'}
                  onChange={(e) => setEditCandidate((c) => ({ ...c, accountStatus: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditCandidate(null)}
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
          DELETE CONFIRMATION MODAL
          ============================================================ */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold text-base text-red-700">Confirm Account Revocation</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete the profile for{' '}
              <strong>{deleteCandidate.fullName}</strong> ({deleteCandidate.employeeId || deleteCandidate.staffId})?
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
                {actionLoading ? 'Revoking...' : 'Revoke Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
