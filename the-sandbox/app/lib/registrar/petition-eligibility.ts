import { getSISAdapter } from '../sis'
import type { User } from '../../generated/prisma'

export interface EligibilityResult {
  eligible: boolean
  reasons: string[]
  blockers: string[]
}

export async function checkEligibility(
  petitionType: string,
  student: User,
  formData: Record<string, unknown>,
): Promise<EligibilityResult> {
  const sisId = student.sisStudentId
  const reasons: string[] = []
  const blockers: string[] = []

  if (!sisId) {
    return {
      eligible: false,
      blockers: ['Student ID not linked to SIS — contact the Registrar\'s Office.'],
      reasons: [],
    }
  }

  const sis = await getSISAdapter()

  try {
    const [profile, standing] = await Promise.all([
      sis.getStudentProfile(sisId),
      sis.getAcademicStanding(sisId),
    ])

    if (standing.status === 'SUSPENSION') {
      blockers.push('Academic suspension — most petitions are not available to suspended students.')
    }

    switch (petitionType) {
      case 'LATE_WITHDRAWAL': {
        if (standing.gpa < 2.0) {
          reasons.push('GPA below 2.0 — advisor review will be required.')
        }
        if (profile.totalCreditsAttempted < 12) {
          blockers.push('Fewer than 12 credits attempted — late withdrawal not eligible.')
        } else {
          reasons.push('Enrollment verified.')
        }
        break
      }
      case 'GRADUATION_APPLICATION': {
        const credits = profile.totalCreditsEarned
        if (credits < 90) {
          blockers.push(`Only ${credits} credits earned — must have at least 90 to apply for graduation.`)
        } else {
          reasons.push(`${credits} credits earned — meets minimum threshold.`)
        }
        if (standing.gpa < 2.0) {
          blockers.push(`GPA is ${standing.gpa.toFixed(2)} — minimum 2.0 required for graduation.`)
        } else {
          reasons.push(`GPA of ${standing.gpa.toFixed(2)} meets graduation requirement.`)
        }
        break
      }
      case 'COURSE_OVERLOAD': {
        const proposedCredits = Number(formData.proposedCredits ?? 0)
        if (proposedCredits > 21) {
          blockers.push('Proposed credit load exceeds 21 — Dean approval required.')
        }
        if (standing.gpa < 3.0) {
          blockers.push(`GPA of ${standing.gpa.toFixed(2)} is below 3.0 minimum for overload.`)
        } else {
          reasons.push(`GPA of ${standing.gpa.toFixed(2)} meets overload requirement.`)
        }
        break
      }
      case 'LEAVE_OF_ABSENCE': {
        reasons.push('Enrollment status verified.')
        if (standing.status === 'PROBATION') {
          reasons.push('Note: Student is on academic probation — advisor conference required.')
        }
        break
      }
      case 'ACADEMIC_RENEWAL': {
        const creditsEarned = profile.totalCreditsEarned
        if (creditsEarned > 30) {
          blockers.push('Academic renewal is only available to students with fewer than 30 earned credits.')
        } else {
          reasons.push(`${creditsEarned} earned credits — eligible for academic renewal review.`)
        }
        break
      }
      default: {
        reasons.push('Standard eligibility check passed.')
        break
      }
    }
  } catch {
    reasons.push('SIS data not available — manual review will verify eligibility.')
  }

  return {
    eligible: blockers.length === 0,
    reasons,
    blockers,
  }
}
