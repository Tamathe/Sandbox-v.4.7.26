import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { queueSandyTask, getUserAsyncTasks } from '../../../lib/faculty/day-lifecycle-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const tasks = await getUserAsyncTasks(auth.user.id)
  return NextResponse.json({ tasks }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { prompt, context } = parsed.data as { prompt: string; context?: string }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  const result = await queueSandyTask(auth.user.id, prompt.trim(), context)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 429 })
  }

  return NextResponse.json({ task: result.task }, { status: 201 })
})
