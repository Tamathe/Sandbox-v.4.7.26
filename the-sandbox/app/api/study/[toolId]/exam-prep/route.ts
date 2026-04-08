import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { generateStudyPlan } from '../../../../lib/study-plan-service'
import type { StudyPlan } from '../../../../lib/study-plan-service'

/**
 * POST /api/study/[toolId]/exam-prep
 *
 * Generates a personalized exam prep study plan.
 * Body: { courseId: string, examTopic?: string, examDate?: string, diagnosticResults?: { concept: string; correct: boolean }[] }
 *
 * Returns: StudyPlan with items prioritized for the exam context.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  await params

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { courseId?: string; examTopic?: string; examDate?: string; diagnosticResults?: { concept: string; correct: boolean }[] }
  const { courseId, examTopic, examDate, diagnosticResults } = body

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Generate the study plan using existing service
  const plan: StudyPlan = await generateStudyPlan(user.id, courseId)

  // If we have diagnostic results, re-prioritize: concepts the student got wrong
  // in the diagnostic should be bumped to "critical"
  if (diagnosticResults && Array.isArray(diagnosticResults)) {
    const wrongConcepts = new Set(
      diagnosticResults
        .filter((r: { correct: boolean }) => !r.correct)
        .map((r: { concept: string }) => r.concept.toLowerCase()),
    )

    for (const item of plan.items) {
      if (wrongConcepts.has(item.concept.toLowerCase())) {
        item.priority = 'critical'
        item.reason = `Missed in diagnostic quiz — ${item.reason}`
      }
    }

    // Re-sort: critical first, then high, medium, low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    plan.items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  // Update the StudyPlanLog with exam_prep type
  await prisma.studyPlanLog.create({
    data: {
      userId: user.id,
      courseId,
      planType: 'exam_prep',
      conceptsTargeted: plan.items.map(i => i.concept),
      toolsRecommended: [...new Set(plan.items.flatMap(i => i.recommendedActivities.map(a => a.toolName)))],
      stepsCount: plan.items.length,
    },
  }).catch(err => console.error('[exam-prep] Failed to log plan:', err))

  return NextResponse.json({
    ...plan,
    examTopic: examTopic || null,
    examDate: examDate || null,
    diagnosticAccuracy: diagnosticResults
      ? Math.round((diagnosticResults.filter((r: { correct: boolean }) => r.correct).length / diagnosticResults.length) * 100)
      : null,
  })
})
