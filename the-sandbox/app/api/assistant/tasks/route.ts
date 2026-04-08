import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { createTask, getUserTasks } from '../../../lib/assistant/task-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const limit = url.searchParams.get('limit')

  const tasks = await getUserTasks(auth.user.id, {
    status,
    limit: limit ? parseInt(limit) : undefined,
  })
  return NextResponse.json({ tasks }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { title, description, dueAt } = parsed.data as { title: string; description?: string; dueAt?: string }

  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const task = await createTask({
    userId: auth.user.id,
    title,
    description,
    dueAt: dueAt ? new Date(dueAt) : undefined,
  })
  return NextResponse.json({ task }, { status: 201 })
})
