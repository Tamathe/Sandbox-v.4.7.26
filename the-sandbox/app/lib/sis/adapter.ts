import type { StudentProfile, CompletedCourse, TransferCredit, EnrolledCourse, AcademicStanding } from './types'

export interface SISAdapter {
  getStudentProfile(studentId: string): Promise<StudentProfile>
  getCourseHistory(studentId: string): Promise<CompletedCourse[]>
  getTransferCredits(studentId: string): Promise<TransferCredit[]>
  getCurrentEnrollment(studentId: string, term: string): Promise<EnrolledCourse[]>
  getAcademicStanding(studentId: string): Promise<AcademicStanding>
}
