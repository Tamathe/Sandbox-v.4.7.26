import type { SISAdapter } from './adapter'
import type { StudentProfile, CompletedCourse, TransferCredit, EnrolledCourse, AcademicStanding } from './types'

// Realistic demo data keyed by sisStudentId
const PROFILES: Record<string, StudentProfile> = {
  S001234: {
    studentId: 'S001234',
    name: 'Tiana The',
    email: 'tiana.the.student@uky.edu',
    program: 'LAW-JD',
    catalogYear: '2024-2025',
    college: 'J. David Rosenberg College of Law',
    department: 'Law',
    academicStanding: 'GOOD',
    totalCreditsAttempted: 32,
    totalCreditsEarned: 32,
    gpa: 3.4,
    expectedGraduationTerm: 'Spring 2027',
  },
  S005678: {
    studentId: 'S005678',
    name: 'Tiana The',
    email: 'tiana.the@uky.edu',
    program: 'ENG-BA',
    catalogYear: '2024-2025',
    college: 'College of Arts & Sciences',
    department: 'Department of English',
    academicStanding: 'GOOD',
    totalCreditsAttempted: 75,
    totalCreditsEarned: 72,
    gpa: 3.7,
    expectedGraduationTerm: 'Spring 2026',
  },
}

const COURSE_HISTORY: Record<string, CompletedCourse[]> = {
  S001234: [
    { courseCode: 'LAW 601', courseName: 'Civil Procedure', credits: 4, grade: 'A', term: 'Fall 2024', transferCredit: false },
    { courseCode: 'LAW 602', courseName: 'Contracts', credits: 4, grade: 'B+', term: 'Fall 2024', transferCredit: false },
    { courseCode: 'LAW 603', courseName: 'Torts', credits: 4, grade: 'A-', term: 'Fall 2024', transferCredit: false },
    { courseCode: 'LAW 604', courseName: 'Criminal Law', credits: 3, grade: 'B+', term: 'Fall 2024', transferCredit: false },
    { courseCode: 'LAW 605', courseName: 'Constitutional Law I', credits: 4, grade: 'A', term: 'Spring 2025', transferCredit: false },
    { courseCode: 'LAW 606', courseName: 'Legal Research & Writing I', credits: 2, grade: 'A', term: 'Fall 2024', transferCredit: false },
    { courseCode: 'LAW 607', courseName: 'Legal Research & Writing II', credits: 2, grade: 'A-', term: 'Spring 2025', transferCredit: false },
    { courseCode: 'LAW 608', courseName: 'Property', credits: 4, grade: 'B', term: 'Spring 2025', transferCredit: false },
    { courseCode: 'LAW 609', courseName: 'Administrative Law', credits: 3, grade: 'A-', term: 'Spring 2025', transferCredit: false },
  ],
  S005678: [
    { courseCode: 'ENG 101', courseName: 'Introduction to Literary Studies', credits: 3, grade: 'A', term: 'Fall 2022', transferCredit: false },
    { courseCode: 'ENG 201', courseName: 'Survey of British Literature I', credits: 3, grade: 'A-', term: 'Spring 2023', transferCredit: false },
    { courseCode: 'ENG 202', courseName: 'Survey of British Literature II', credits: 3, grade: 'B+', term: 'Fall 2023', transferCredit: false },
    { courseCode: 'ENG 210', courseName: 'Survey of American Literature I', credits: 3, grade: 'A', term: 'Spring 2023', transferCredit: false },
    { courseCode: 'ENG 215', courseName: 'Introduction to Creative Writing', credits: 3, grade: 'A', term: 'Fall 2022', transferCredit: false },
    { courseCode: 'ENG 301', courseName: 'Advanced Composition', credits: 3, grade: 'A-', term: 'Spring 2024', transferCredit: false },
    { courseCode: 'ENG 350', courseName: 'Shakespeare', credits: 3, grade: 'A', term: 'Fall 2024', transferCredit: false },
    { courseCode: 'ENG 360', courseName: 'Contemporary Fiction', credits: 3, grade: 'B+', term: 'Spring 2024', transferCredit: false },
    { courseCode: 'WRD 110', courseName: 'College Writing I', credits: 3, grade: 'A', term: 'Fall 2022', transferCredit: false },
    { courseCode: 'WRD 111', courseName: 'College Writing II', credits: 3, grade: 'A-', term: 'Spring 2023', transferCredit: false },
    { courseCode: 'MA 109', courseName: 'College Algebra', credits: 3, grade: 'B', term: 'Fall 2022', transferCredit: false },
    { courseCode: 'HIS 108', courseName: 'Western Civilization I', credits: 3, grade: 'B+', term: 'Fall 2022', transferCredit: false },
    { courseCode: 'PHI 100', courseName: 'Introduction to Philosophy', credits: 3, grade: 'A', term: 'Spring 2023', transferCredit: false },
    { courseCode: 'ART 100', courseName: 'Art Appreciation', credits: 3, grade: 'A-', term: 'Fall 2023', transferCredit: false },
    { courseCode: 'SOC 101', courseName: 'Principles of Sociology', credits: 3, grade: 'B+', term: 'Fall 2023', transferCredit: false },
    { courseCode: 'BIO 103', courseName: 'Concepts in Biology', credits: 3, grade: 'B', term: 'Spring 2024', transferCredit: false },
    { courseCode: 'BIO 103L', courseName: 'Concepts in Biology Lab', credits: 1, grade: 'A', term: 'Spring 2024', transferCredit: false },
    { courseCode: 'ENG 415', courseName: 'Victorian Literature', credits: 3, grade: 'A', term: 'Fall 2025', transferCredit: false },
    { courseCode: 'ENG 420', courseName: 'Postcolonial Literature', credits: 3, grade: 'A-', term: 'Fall 2025', transferCredit: false },
    // Transfer credit
    { courseCode: 'CC 101', courseName: 'Intro to Communication', credits: 3, grade: 'B+', term: 'Fall 2021', transferCredit: true, sourceInstitution: 'Bluegrass Community & Technical College' },
    { courseCode: 'CC 110', courseName: 'Fundamentals of Speech', credits: 3, grade: 'A-', term: 'Spring 2022', transferCredit: true, sourceInstitution: 'Bluegrass Community & Technical College' },
  ],
}

const TRANSFER_CREDITS: Record<string, TransferCredit[]> = {
  S005678: [
    {
      externalCourseCode: 'CC 101',
      externalCourseName: 'Intro to Communication',
      sourceInstitution: 'Bluegrass Community & Technical College',
      ukEquivalent: 'COM 181',
      credits: 3,
      status: 'APPROVED',
    },
    {
      externalCourseCode: 'CC 110',
      externalCourseName: 'Fundamentals of Speech',
      sourceInstitution: 'Bluegrass Community & Technical College',
      ukEquivalent: 'COM 252',
      credits: 3,
      status: 'APPROVED',
    },
  ],
  S001234: [],
}

export class MockSISAdapter implements SISAdapter {
  private findProfile(studentId: string): StudentProfile {
    const profile = PROFILES[studentId]
    if (!profile) {
      // Return a generic profile for unknown students
      return {
        studentId,
        name: 'Demo Student',
        email: 'student@uky.edu',
        program: 'UNDECLARED',
        catalogYear: '2024-2025',
        college: 'University of Kentucky',
        department: 'Undeclared',
        academicStanding: 'GOOD',
        totalCreditsAttempted: 0,
        totalCreditsEarned: 0,
        gpa: 0,
        expectedGraduationTerm: 'Unknown',
      }
    }
    return profile
  }

  async getStudentProfile(studentId: string): Promise<StudentProfile> {
    return this.findProfile(studentId)
  }

  async getCourseHistory(studentId: string): Promise<CompletedCourse[]> {
    return COURSE_HISTORY[studentId] ?? []
  }

  async getTransferCredits(studentId: string): Promise<TransferCredit[]> {
    return TRANSFER_CREDITS[studentId] ?? []
  }

  async getCurrentEnrollment(studentId: string, _term: string): Promise<EnrolledCourse[]> {
    if (studentId === 'S001234') {
      return [
        { courseCode: 'LAW 701', courseName: 'Evidence', credits: 3, term: 'Spring 2026', status: 'ENROLLED' },
        { courseCode: 'LAW 702', courseName: 'Business Organizations', credits: 3, term: 'Spring 2026', status: 'ENROLLED' },
        { courseCode: 'LAW 710', courseName: 'Trial Advocacy', credits: 2, term: 'Spring 2026', status: 'ENROLLED' },
      ]
    }
    if (studentId === 'S005678') {
      return [
        { courseCode: 'ENG 490', courseName: 'Senior Seminar in English', credits: 3, term: 'Spring 2026', status: 'ENROLLED' },
        { courseCode: 'ENG 452', courseName: 'Modern Poetry', credits: 3, term: 'Spring 2026', status: 'ENROLLED' },
      ]
    }
    return []
  }

  async getAcademicStanding(studentId: string): Promise<AcademicStanding> {
    const profile = this.findProfile(studentId)
    return {
      status: profile.academicStanding,
      gpa: profile.gpa,
      lastUpdated: new Date().toISOString(),
    }
  }
}
