import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { generateClarityQuestions, scoreClarityCheck, getClarityStats } from '../../../lib/ai-literacy/clarity-check-service'

// GET — generate clarity questions for a policy, or get stats
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const policyId = req.nextUrl.searchParams.get('policyId')
  const courseId = req.nextUrl.searchParams.get('courseId')
  const mode = req.nextUrl.searchParams.get('mode') // 'quiz' or 'stats'

  if (mode === 'stats' && courseId) {
    const stats = await getClarityStats(courseId)
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!policyId) {
    return NextResponse.json({ error: 'policyId required' }, { status: 400 })
  }

  const questions = await generateClarityQuestions(policyId)
  return NextResponse.json({ questions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST — submit clarity check responses
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { courseId: string; policyId: string; responses: { question: string; answer: string; correctAnswer: string; explanation: string }[] }
  const { courseId, policyId, responses } = body

  if (!courseId || !policyId || !responses || !Array.isArray(responses)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await scoreClarityCheck(auth.user.id, courseId, policyId, responses)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
