import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { recalculateProfile } from '../../../lib/progressive-profile-service'

// GET — quick-start progress (default) or module completion map (?view=progress)
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const view = req.nextUrl.searchParams.get('view')

  if (view === 'progress') {
    const [profile, policiesCount, promptLabCount, outputEvalCount] = await Promise.all([
      prisma.aILiteracyProfile.findUnique({
        where: { userId: auth.user.id },
        select: { stance: true, quickStartCompleted: true },
      }),
      prisma.courseAIPolicy.count({
        where: { course: { instructorId: auth.user.id } },
      }),
      prisma.promptLabAttempt.count({ where: { userId: auth.user.id } }),
      prisma.outputEvalAttempt.count({ where: { userId: auth.user.id } }),
    ])

    const moduleProgress: Record<string, string> = {
      stance: profile?.stance ? 'completed' : 'not-started',
      policy: policiesCount > 0 ? 'completed' : 'not-started',
      'prompt-lab': promptLabCount >= 5 ? 'completed' : promptLabCount > 0 ? 'in-progress' : 'not-started',
      'output-eval': outputEvalCount >= 3 ? 'completed' : outputEvalCount > 0 ? 'in-progress' : 'not-started',
      assignments: 'not-started',
      process: 'not-started',
      'starter-packs': 'not-started',
      'syllabus-drop': 'not-started',
      pedagogy: 'not-started',
      discipline: 'not-started',
      advising: 'not-started',
    }

    return NextResponse.json({ moduleProgress }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const profile = await prisma.aILiteracyProfile.findUnique({
    where: { userId: auth.user.id },
    select: { quickStartCompleted: true, quickStartStep: true, stance: true },
  })

  return NextResponse.json({
    quickStartCompleted: profile?.quickStartCompleted ?? false,
    quickStartStep: profile?.quickStartStep ?? 0,
    hasStance: !!profile?.stance,
    stance: profile?.stance ?? null,
  })
})

// POST — update step completion
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { step: number; completed?: boolean }
  const { step, completed } = body

  if (typeof step !== 'number' || step < 0 || step > 3) {
    return NextResponse.json({ error: 'Invalid step (0-3)' }, { status: 400 })
  }

  await prisma.aILiteracyProfile.upsert({
    where: { userId: auth.user.id },
    create: {
      userId: auth.user.id,
      quickStartStep: step,
      quickStartCompleted: !!completed,
    },
    update: {
      quickStartStep: step,
      ...(completed ? { quickStartCompleted: true } : {}),
    },
  })

  if (completed) void recalculateProfile(auth.user.id)

  return NextResponse.json({ step, completed: !!completed })
})
