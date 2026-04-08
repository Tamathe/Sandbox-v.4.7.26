import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { completeTask, dismissTask } from '../../../../lib/assistant/task-service'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { status: string }

  if (body.status === 'completed') {
    const task = await completeTask(id)
    return NextResponse.json({ task })
  }

  if (body.status === 'dismissed') {
    const task = await dismissTask(id)
    return NextResponse.json({ task })
  }

  return NextResponse.json({ error: 'status must be "completed" or "dismissed"' }, { status: 400 })
})
