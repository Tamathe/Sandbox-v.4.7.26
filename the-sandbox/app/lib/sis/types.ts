// SIS (Student Information System) shared types
// These model data that would come from Banner/Ellucian in production.

export interface StudentProfile {
  studentId: string
  name: string
  email: string
  program: string          // e.g. "ENG-BA"
  catalogYear: string      // e.g. "2024-2025"
  college: string
  department: string
  academicStanding: 'GOOD' | 'PROBATION' | 'SUSPENSION'
  totalCreditsAttempted: number
  totalCreditsEarned: number
  gpa: number
  expectedGraduationTerm: string
}

export interface CompletedCourse {
  courseCode: string       // e.g. "ENG 101"
  courseName: string
  credits: number
  grade: string            // e.g. "A", "B+", "W", "I"
  term: string             // e.g. "Fall 2023"
  transferCredit: boolean
  sourceInstitution?: string
}

export interface TransferCredit {
  externalCourseCode: string
  externalCourseName: string
  sourceInstitution: string
  ukEquivalent: string | null  // null = not yet evaluated
  credits: number
  status: 'APPROVED' | 'PENDING' | 'DENIED'
}

export interface EnrolledCourse {
  courseCode: string
  courseName: string
  credits: number
  term: string
  status: 'ENROLLED' | 'WAITLISTED' | 'DROPPED'
}

export interface AcademicStanding {
  status: 'GOOD' | 'PROBATION' | 'SUSPENSION'
  gpa: number
  lastUpdated: string
  notes?: string
}
