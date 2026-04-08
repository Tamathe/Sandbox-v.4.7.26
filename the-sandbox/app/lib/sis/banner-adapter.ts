import type { SISAdapter } from './adapter'
import type { StudentProfile, CompletedCourse, TransferCredit, EnrolledCourse, AcademicStanding } from './types'

/**
 * Banner/Ellucian SIS adapter stub.
 * Configure SIS_API_KEY and SIS_BASE_URL environment variables to enable.
 */
export class BannerSISAdapter implements SISAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async getStudentProfile(_studentId: string): Promise<StudentProfile> {
    throw new Error('Banner SIS adapter not yet configured — set SIS_API_KEY and SIS_BASE_URL')
  }

  async getCourseHistory(_studentId: string): Promise<CompletedCourse[]> {
    throw new Error('Banner SIS adapter not yet configured — set SIS_API_KEY and SIS_BASE_URL')
  }

  async getTransferCredits(_studentId: string): Promise<TransferCredit[]> {
    throw new Error('Banner SIS adapter not yet configured — set SIS_API_KEY and SIS_BASE_URL')
  }

  async getCurrentEnrollment(_studentId: string, _term: string): Promise<EnrolledCourse[]> {
    throw new Error('Banner SIS adapter not yet configured — set SIS_API_KEY and SIS_BASE_URL')
  }

  async getAcademicStanding(_studentId: string): Promise<AcademicStanding> {
    throw new Error('Banner SIS adapter not yet configured — set SIS_API_KEY and SIS_BASE_URL')
  }
}
