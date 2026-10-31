import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, 'db_local.json');

// Default initial dataset
const getDefaultDatabase = () => ({
  users: [
    {
      id: 'usr-admin-1',
      fullName: 'BIET Super Administrator',
      email: 'admin@biet.ac.in',
      identifier: 'ADMIN-001',
      // Hash for 'BietDemo@2026'
      passwordHash: '$2a$10$7vWJdD5y7mO6rV2q9kE1j.lQhXFpL8v3G6Y4sZ5u8w1m2o3r4t5u',
      role: 'admin',
      adminRole: 'super_admin',
      accountStatus: 'active',
      authVersion: 0,
      createdAt: new Date('2024-01-01T00:00:00Z').toISOString()
    },
    {
      id: 'usr-student-1',
      fullName: 'Rahul Kumar',
      email: 'rahul.kumar@biet.ac.in',
      identifier: '220101001', // Roll Number
      // Pre-hashed or demo checked
      passwordHash: '$2a$10$7vWJdD5y7mO6rV2q9kE1j.lQhXFpL8v3G6Y4sZ5u8w1m2o3r4t5u',
      role: 'student',
      adminRole: 'none',
      studentId: 'BIET-2024-1001',
      accountStatus: 'active',
      authVersion: 0,
      createdAt: new Date('2024-08-01T00:00:00Z').toISOString()
    },
    {
      id: 'usr-teacher-1',
      fullName: 'Dr. Ramesh Chandra',
      email: 'ramesh.chandra@biet.ac.in',
      identifier: 'T-1001', // Employee ID
      passwordHash: '$2a$10$7vWJdD5y7mO6rV2q9kE1j.lQhXFpL8v3G6Y4sZ5u8w1m2o3r4t5u',
      role: 'teacher',
      adminRole: 'none',
      teacherId: 'T-1001',
      accountStatus: 'active',
      authVersion: 0,
      createdAt: new Date('2024-01-10T00:00:00Z').toISOString()
    },
    {
      id: 'usr-staff-1',
      fullName: 'Sunil Verma',
      email: 'sunil.verma@biet.ac.in',
      identifier: 'S-2001', // Staff ID
      passwordHash: '$2a$10$7vWJdD5y7mO6rV2q9kE1j.lQhXFpL8v3G6Y4sZ5u8w1m2o3r4t5u',
      role: 'staff',
      adminRole: 'none',
      staffId: 'S-2001',
      accountStatus: 'active',
      authVersion: 0,
      createdAt: new Date('2024-02-15T00:00:00Z').toISOString()
    }
  ],
  students: [
    {
      studentId: 'BIET-2024-1001',
      fullName: 'Rahul Kumar',
      rollNumber: '220101001',
      registrationNumber: 'REG-2022-CSE-001',
      email: 'rahul.kumar@biet.ac.in',
      mobileNumber: '+91 9876543210',
      course: 'B.Tech',
      branch: 'Computer Science and Engineering',
      academicYear: '3rd Year',
      currentSemester: 'Semester 5',
      admissionYear: 2022,
      dateOfBirth: '2004-05-15',
      gender: 'Male',
      address: 'Lucknow, Uttar Pradesh',
      studentStatus: 'Active',
      verificationStatus: 'Verified',
      photoUrl: '',
      qrCodeToken: 'BIET-VRF-220101001-TOKEN',
      userAccountId: 'usr-student-1',
      biometric: {
        consentGiven: true,
        consentDate: new Date('2024-08-01T10:00:00Z').toISOString(),
        enrolled: true,
        enrolledAt: new Date('2024-08-01T10:05:00Z').toISOString(),
        faceTemplate: Array.from({ length: 128 }, (_, i) => Math.round(Math.cos(i * 0.15) * 0.1 * 10000) / 10000)
      },
      registrationDate: new Date('2022-08-10T09:00:00Z').toISOString(),
      createdAt: new Date('2022-08-10T09:00:00Z').toISOString(),
      updatedAt: new Date('2024-08-01T10:00:00Z').toISOString()
    },
    {
      studentId: 'BIET-2024-1002',
      fullName: 'Priya Sharma',
      rollNumber: '220101002',
      registrationNumber: 'REG-2022-CSE-002',
      email: 'priya.sharma@biet.ac.in',
      mobileNumber: '+91 9876543211',
      course: 'B.Tech',
      branch: 'Computer Science and Engineering',
      academicYear: '3rd Year',
      currentSemester: 'Semester 5',
      admissionYear: 2022,
      dateOfBirth: '2004-09-21',
      gender: 'Female',
      address: 'Kanpur, Uttar Pradesh',
      studentStatus: 'Active',
      verificationStatus: 'Verified',
      photoUrl: '',
      qrCodeToken: 'BIET-VRF-220101002-TOKEN',
      userAccountId: null,
      biometric: {
        consentGiven: true,
        consentDate: new Date('2024-08-01T10:30:00Z').toISOString(),
        enrolled: false,
        enrolledAt: null,
        faceTemplate: null
      },
      registrationDate: new Date('2022-08-10T09:30:00Z').toISOString(),
      createdAt: new Date('2022-08-10T09:30:00Z').toISOString(),
      updatedAt: new Date('2024-08-01T10:30:00Z').toISOString()
    },
    {
      studentId: 'BIET-2025-2001',
      fullName: 'Aarav Gupta',
      rollNumber: '230102001',
      registrationNumber: 'REG-2023-ECE-001',
      email: 'aarav.gupta@biet.ac.in',
      mobileNumber: '+91 9876543212',
      course: 'B.Tech',
      branch: 'Electronics and Communication Engineering',
      academicYear: '2nd Year',
      currentSemester: 'Semester 3',
      admissionYear: 2023,
      dateOfBirth: '2005-02-11',
      gender: 'Male',
      address: 'Varanasi, Uttar Pradesh',
      studentStatus: 'Active',
      verificationStatus: 'Verified',
      photoUrl: '',
      qrCodeToken: 'BIET-VRF-230102001-TOKEN',
      userAccountId: null,
      biometric: {
        consentGiven: false,
        consentDate: null,
        enrolled: false,
        enrolledAt: null,
        faceTemplate: null
      },
      registrationDate: new Date('2023-08-12T10:00:00Z').toISOString(),
      createdAt: new Date('2023-08-12T10:00:00Z').toISOString(),
      updatedAt: new Date('2023-08-12T10:00:00Z').toISOString()
    },
    {
      studentId: 'BIET-2025-3001',
      fullName: 'Ananya Verma',
      rollNumber: '240201001',
      registrationNumber: 'REG-2024-MBA-001',
      email: 'ananya.verma@biet.ac.in',
      mobileNumber: '+91 9876543213',
      course: 'MBA',
      branch: 'Master of Business Administration',
      academicYear: '1st Year',
      currentSemester: 'Semester 1',
      admissionYear: 2024,
      dateOfBirth: '2002-11-04',
      gender: 'Female',
      address: 'Lucknow, Uttar Pradesh',
      studentStatus: 'Active',
      verificationStatus: 'Pending',
      photoUrl: '',
      qrCodeToken: 'BIET-VRF-240201001-TOKEN',
      userAccountId: null,
      biometric: {
        consentGiven: false,
        consentDate: null,
        enrolled: false,
        enrolledAt: null,
        faceTemplate: null
      },
      registrationDate: new Date('2024-08-15T11:00:00Z').toISOString(),
      createdAt: new Date('2024-08-15T11:00:00Z').toISOString(),
      updatedAt: new Date('2024-08-15T11:00:00Z').toISOString()
    }
  ],
  teachers: [
    {
      employeeId: 'T-1001',
      fullName: 'Dr. Ramesh Chandra',
      email: 'ramesh.chandra@biet.ac.in',
      mobileNumber: '+91 9415012345',
      department: 'Computer Science and Engineering',
      designation: 'Professor & HOD',
      joiningDate: new Date('2018-07-01').toISOString(),
      accountStatus: 'Active',
      photoUrl: '',
      userAccountId: 'usr-teacher-1',
      createdAt: new Date('2018-07-01').toISOString()
    },
    {
      employeeId: 'T-1002',
      fullName: 'Dr. Shalini Singh',
      email: 'shalini.singh@biet.ac.in',
      mobileNumber: '+91 9415012346',
      department: 'Information Technology',
      designation: 'Associate Professor',
      joiningDate: new Date('2020-01-15').toISOString(),
      accountStatus: 'Active',
      photoUrl: '',
      userAccountId: null,
      createdAt: new Date('2020-01-15').toISOString()
    }
  ],
  staff: [
    {
      staffId: 'S-2001',
      fullName: 'Sunil Verma',
      email: 'sunil.verma@biet.ac.in',
      mobileNumber: '+91 9839011223',
      department: 'Library',
      designation: 'Assistant Librarian',
      joiningDate: new Date('2019-03-01').toISOString(),
      accountStatus: 'Active',
      photoUrl: '',
      userAccountId: 'usr-staff-1',
      createdAt: new Date('2019-03-01').toISOString()
    },
    {
      staffId: 'S-2002',
      fullName: 'Rajesh Mishra',
      email: 'rajesh.mishra@biet.ac.in',
      mobileNumber: '+91 9839011224',
      department: 'Examination Section',
      designation: 'Verification Officer',
      joiningDate: new Date('2021-08-10').toISOString(),
      accountStatus: 'Active',
      photoUrl: '',
      userAccountId: null,
      createdAt: new Date('2021-08-10').toISOString()
    }
  ],
  attendanceSessions: [
    {
      sessionId: 'SES-2026-CSE-101',
      sessionName: 'Design and Analysis of Algorithms',
      course: 'B.Tech',
      branch: 'Computer Science and Engineering',
      academicYear: '3rd Year',
      currentSemester: 'Semester 5',
      subject: 'CS-501 DAA',
      date: new Date().toISOString().slice(0, 10),
      startTime: '09:00',
      endTime: '10:30',
      lateGraceMinutes: 15,
      status: 'Active',
      createdBy: 'Dr. Ramesh Chandra'
    }
  ],
  attendanceRecords: [],
  verificationLogs: [],
  documents: [
    {
      documentId: 'DOC-2024-1001',
      studentId: 'BIET-2024-1001',
      rollNumber: '220101001',
      title: 'Class 12 Intermediate Passing Marksheet & Certificate',
      documentType: 'Academic Marksheet/Certificate',
      fileName: 'rahul_class12_marksheet.pdf',
      filePath: '/uploads/documents/rahul_class12.pdf',
      fileSize: 245000,
      mimeType: 'application/pdf',
      uploadedBy: 'Admissions Office',
      uploadedAt: new Date('2022-08-10T10:00:00Z').toISOString(),
      verificationStatus: 'Verified',
      notes: 'Matriculation & Intermediate marks verified with UP Board portal.'
    },
    {
      documentId: 'DOC-2024-1002',
      studentId: 'BIET-2024-1001',
      rollNumber: '220101001',
      title: 'AKTU UPSEE / JEE Allotment Letter 2022',
      documentType: 'Admission Form',
      fileName: 'aktu_counseling_allotment_2022.pdf',
      filePath: '/uploads/documents/rahul_allotment.pdf',
      fileSize: 189000,
      mimeType: 'application/pdf',
      uploadedBy: 'Admissions Office',
      uploadedAt: new Date('2022-08-10T10:15:00Z').toISOString(),
      verificationStatus: 'Verified',
      notes: 'Round 1 Seat Allotment verified.'
    },
    {
      documentId: 'DOC-2024-1003',
      studentId: 'BIET-2025-2001',
      rollNumber: '230102001',
      title: 'Government Identity Proof (Aadhaar Card)',
      documentType: 'Identity Proof (Aadhaar/Passport)',
      fileName: 'aarav_aadhaar_card.png',
      filePath: '/uploads/documents/aarav_aadhaar.png',
      fileSize: 312000,
      mimeType: 'image/png',
      uploadedBy: 'Admissions Office',
      uploadedAt: new Date('2023-08-12T11:00:00Z').toISOString(),
      verificationStatus: 'Verified',
      notes: 'UIDAI Aadhaar photocopy verified against original.'
    }
  ],
  profileCorrections: [],
  notifications: [
    {
      notificationId: 'NOTIF-101',
      title: 'Mid-Semester Examination Schedule 2026',
      message: 'The Mid-Semester Examination for B.Tech & MBA will commence from 15th November 2026.',
      audience: 'all',
      department: 'Examination',
      priority: 'High',
      createdBy: 'Examination Controller',
      createdAt: new Date().toISOString()
    },
    {
      notificationId: 'NOTIF-102',
      title: 'Mandatory Face Identification Verification',
      message: 'All enrolled students must verify face templates at Campus Security Gate 1 for semester hall-ticket validation.',
      audience: 'students',
      department: 'Security & Verification',
      priority: 'Urgent',
      createdBy: 'Dean Academics',
      createdAt: new Date().toISOString()
    }
  ]
});

class PersistentStorage {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.documents || this.data.documents.length === 0) {
          this.data.documents = getDefaultDatabase().documents;
          this.save();
        }
      } else {
        this.data = getDefaultDatabase();
        this.save();
      }
    } catch (err) {
      console.warn('PersistentStorage init error, loading defaults:', err.message);
      this.data = getDefaultDatabase();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('PersistentStorage save error:', err.message);
    }
  }

  get(collectionName) {
    if (!this.data[collectionName]) {
      this.data[collectionName] = [];
    }
    return this.data[collectionName];
  }

  set(collectionName, items) {
    this.data[collectionName] = items;
    this.save();
  }
}

export const persistentStorage = new PersistentStorage();
export default persistentStorage;

