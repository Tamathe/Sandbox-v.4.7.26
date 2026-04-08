import { NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listGoals, createGoal, updateGoal, deleteGoal } from '../../../lib/my-path-service'

export const GET = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const goals = await listGoals(auth.user.id)
  return NextResponse.json(goals, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { title: string; description?: string; category?: string }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const goal = await createGoal(auth.user.id, body)
  return NextResponse.json(goal, { status: 201 })
})

export const PUT = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsedPut = await parseRequestBody(req)
  if ('error' in parsedPut) return parsedPut.error
  const body = parsedPut.data as { id: string; title?: string; description?: string; category?: string }
  if (!body.id) {
    return NextResponse.json({ error: 'Goal id is required' }, { status: 400 })
  }

  const goal = await updateGoal(auth.user.id, body.id, body)
  return NextResponse.json(goal, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const DELETE = withErrorHandling(async (req) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Goal id is required' }, { status: 400 })
  }

  await deleteGoal(auth.user.id, id)
  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
