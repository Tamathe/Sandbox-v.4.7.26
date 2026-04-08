import { NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { addMilestone, toggleMilestone, deleteMilestone } from '../../../lib/my-path-service'

export const POST = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { goalId: string; title: string }
  if (!body.goalId || !body.title?.trim()) {
    return NextResponse.json({ error: 'goalId and title are required' }, { status: 400 })
  }

  const milestone = await addMilestone(auth.user.id, body.goalId, body)
  return NextResponse.json(milestone, { status: 201 })
})

export const PUT = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsedPut = await parseRequestBody(req)
  if ('error' in parsedPut) return parsedPut.error
  const bodyPut = parsedPut.data as { milestoneId: string }
  if (!bodyPut.milestoneId) {
    return NextResponse.json({ error: 'milestoneId is required' }, { status: 400 })
  }

  const milestone = await toggleMilestone(auth.user.id, bodyPut.milestoneId)
  return NextResponse.json(milestone)
})

export const DELETE = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Milestone id is required' }, { status: 400 })
  }

  await deleteMilestone(auth.user.id, id)
  return NextResponse.json({ ok: true })
})
