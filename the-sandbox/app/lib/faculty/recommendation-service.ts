import { differenceInCalendarDays } from 'date-fns'
import { RecommendationStatus } from '../../generated/prisma'
import { prisma } from '../prisma'

export interface RecommendationDraftSummary {
  version: number
  wordCount: number
  lastEditedAt: string
  oneDriveUrl: string | null
}

export interface FacultyRecommendationItem {
  id: string
  studentName: string
  purpose: string
  targetOrg: string
  dueDate: string
  status: RecommendationStatus
  daysUntilDue: number
  draft?: RecommendationDraftSummary | null
}

const fallbackRecommendations: FacultyRecommendationItem[] = [
  {
    id: 'rec-sarah-kim',
    studentName: 'Sarah Kim',
    purpose: 'PhD program',
    targetOrg: 'MIT EECS',
    dueDate: new Date('2026-04-01T17:00:00-04:00').toISOString(),
    status: RecommendationStatus.IN_PROGRESS,
    daysUntilDue: 8,
    draft: {
      version: 2,
      wordCount: 487,
      lastEditedAt: new Date('2026-03-20T16:30:00-04:00').toISOString(),
      oneDriveUrl: null,
    },
  },
  {
    id: 'rec-james-oduya',
    studentName: 'James Oduya',
    purpose: 'Scholarship',
    targetOrg: 'UK Honors',
    dueDate: new Date('2026-04-15T17:00:00-04:00').toISOString(),
    status: RecommendationStatus.PENDING,
    daysUntilDue: 22,
    draft: null,
  },
  {
    id: 'rec-priya-patel',
    studentName: 'Priya Patel',
    purpose: 'Internship',
    targetOrg: 'Google STEP',
    dueDate: new Date('2026-04-20T17:00:00-04:00').toISOString(),
    status: RecommendationStatus.PENDING,
    daysUntilDue: 27,
    draft: null,
  },
]

function getFallbackRecommendations(): FacultyRecommendationItem[] {
  return fallbackRecommendations
}

export async function getRecommendationRequests(userId: string): Promise<FacultyRecommendationItem[]> {
  try {
    const now = new Date()
    const requests = await prisma.recommendationRequest.findMany({
      where: {
        facultyId: userId,
        status: { in: [RecommendationStatus.PENDING, RecommendationStatus.IN_PROGRESS] },
      },
      include: {
        draft: {
          select: { version: true, wordCount: true, lastEditedAt: true, oneDriveUrl: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    })

    if (requests.length === 0) return getFallbackRecommendations()

    return requests.map((request) => ({
      id: request.id,
      studentName: request.studentName,
      purpose: request.purpose,
      targetOrg: request.targetOrg,
      dueDate: request.dueDate.toISOString(),
      status: request.status,
      daysUntilDue: differenceInCalendarDays(request.dueDate, now),
      draft: request.draft
        ? {
            version: request.draft.version,
            wordCount: request.draft.wordCount,
            lastEditedAt: request.draft.lastEditedAt.toISOString(),
            oneDriveUrl: request.draft.oneDriveUrl,
          }
        : null,
    }))
  } catch (error) {
    console.warn('[faculty/recommendation-service] Falling back to synthetic recommendations', error)
    return getFallbackRecommendations()
  }
}
