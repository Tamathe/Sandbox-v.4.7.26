import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { markTaskReviewed } from '../../../../lib/faculty/day-lifecycle-service'

export const PATCH = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ taskId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { taskId } = await context.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { accepted } = parsed.data as { accepted?: boolean }

  const task = await markTaskReviewed(taskId, auth.user.id, !!accepted)
  return NextResponse.json({ task })
})
