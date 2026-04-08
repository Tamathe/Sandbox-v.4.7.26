import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { submitCaseStudy, getApprovedCaseStudies, getPendingCaseStudies, reviewCaseStudy } from '../../../lib/ai-literacy/case-study-service'

// GET — approved case studies (+ pending for admins)
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const discipline = req.nextUrl.searchParams.get('discipline') ?? undefined
  const approved = await getApprovedCaseStudies(discipline)

  let pending: Awaited<ReturnType<typeof getPendingCaseStudies>> = []
  if (auth.user.role === 'ADMIN') {
    pending = await getPendingCaseStudies()
  }

  return NextResponse.json({ approved, pending })
})

// POST — submit or review a case study
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    action?: string
    id?: string
    status?: 'APPROVED' | 'REJECTED'
    title?: string
    discipline?: string
    stanceRange?: string
    challenge?: string
    approach?: string
    outcome?: string
    lessonsLearned?: string[]
  }

  // Review action (admin only)
  if (body.action === 'review') {
    if (auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }
    const result = await reviewCaseStudy(body.id, auth.user.id, body.status)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Submit new case study
  if (!body.title || !body.discipline || !body.challenge || !body.approach || !body.outcome) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const submission = await submitCaseStudy(auth.user.id, {
    discipline: body.discipline,
    stanceRange: body.stanceRange,
    title: body.title,
    challenge: body.challenge,
    approach: body.approach,
    outcome: body.outcome,
    lessonsLearned: body.lessonsLearned ?? [],
  })

  return NextResponse.json(submission, { status: 201 })
})
