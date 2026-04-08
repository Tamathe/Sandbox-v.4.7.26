import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  requestMentorship, respondToMentorship, getMyMentorships, findPotentialMentors,
} from '../../../lib/together-service'
import type { MentorshipStatus } from '../../../generated/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'find-mentors') {
    const topic = searchParams.get('topic') ?? ''
    const mentors = await findPotentialMentors(auth.user.id, topic)
    return NextResponse.json({ mentors }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const mentorships = await getMyMentorships(auth.user.id)
  return NextResponse.json(mentorships, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    action?: string
    mentorshipId?: string
    status?: MentorshipStatus
    mentorId?: string
    topic?: string
    message?: string
  }

  if (body.action === 'respond') {
    if (!body.mentorshipId || !body.status) return NextResponse.json({ error: 'mentorshipId and status required' }, { status: 400 })
    const m = await respondToMentorship(auth.user.id, body.mentorshipId, body.status)
    if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ mentorship: m }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!body.mentorId || !body.topic) return NextResponse.json({ error: 'mentorId and topic required' }, { status: 400 })
  const mentorship = await requestMentorship(auth.user.id, {
    mentorId: body.mentorId,
    topic: body.topic,
    message: body.message,
  })
  return NextResponse.json({ mentorship }, { status: 201 })
})
