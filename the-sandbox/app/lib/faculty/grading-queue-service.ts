import { differenceInCalendarDays } from 'date-fns'
import { GradebookStatus } from '../../generated/prisma'
import { prisma } from '../prisma'

export interface GradingQueueItem {
  id: string
  studentName: string
  assignmentTitle: string
  courseCode: string
  courseId: string
  submittedAt: string
  status: 'AI_DRAFT' | 'PENDING_REVIEW'
  hasAiDraft: boolean
  aiDraftSummary: string | null
  daysWaiting: number
}

export interface GradingQueueSummary {
  total: number
  aiDrafted: number
  manualReview: number
  oldestDays: number
}

export interface GradingQueueResponse {
  items: GradingQueueItem[]
  summary: GradingQueueSummary
}

export async function getGradingQueue(userId: string): Promise<GradingQueueResponse> {
  const now = new Date()

  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: {
        assignment: {
          course: { instructorId: userId },
        },
      },
      status: { in: [GradebookStatus.AI_DRAFT, GradebookStatus.PENDING_REVIEW] },
    },
    include: {
      submission: {
        select: {
          student: { select: { name: true } },
          submittedAt: true,
          assignment: {
            select: {
              title: true,
              course: { select: { courseCode: true, id: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // PENDING_REVIEW before AI_DRAFT (needs more attention)
      { createdAt: 'asc' }, // Oldest first
    ],
  })

  const items: GradingQueueItem[] = entries.map((entry) => {
    const daysWaiting = differenceInCalendarDays(now, entry.submission.submittedAt)
    return {
      id: entry.id,
      studentName: entry.submission.student.name,
      assignmentTitle: entry.submission.assignment.title,
      courseCode: entry.submission.assignment.course.courseCode,
      courseId: entry.submission.assignment.course.id,
      submittedAt: entry.submission.submittedAt.toISOString(),
      status: entry.status as 'AI_DRAFT' | 'PENDING_REVIEW',
      hasAiDraft: entry.status === GradebookStatus.AI_DRAFT || !!entry.aiRawFeedback,
      aiDraftSummary: entry.aiRawFeedback ? entry.aiRawFeedback.slice(0, 100) : null,
      daysWaiting,
    }
  })

  const aiDrafted = items.filter((i) => i.status === 'AI_DRAFT').length
  const manualReview = items.filter((i) => i.status === 'PENDING_REVIEW').length
  const oldestDays = items.length > 0 ? Math.max(...items.map((i) => i.daysWaiting)) : 0

  return {
    items,
    summary: {
      total: items.length,
      aiDrafted,
      manualReview,
      oldestDays,
    },
  }
}
