export const store = {
  students: []
};

export const seedDatabase = async () => {
  if (!store.students.length) {
    store.students.push({
      id: 'student-1001',
      studentId: 'BIET-2025-1001',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@biet.ac.in',
      phone: '+91 9876543210',
      course: 'B.Tech Computer Science',
      year: '2nd Year',
      branch: 'CSE',
      rollNumber: 'CS-2025-021',
      enrollmentNumber: 'BIET-CS-021',
      status: 'active',
      verificationStatus: 'verified',
      photo: '',
      qrCode: 'BIET-2025-1001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
};

export const generateStudentId = () => {
  const now = new Date();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `BIET-${now.getFullYear()}-${random}`;
};
