import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { updateInsightStatus } from '../../../../../lib/curriculum-intel/curriculum-service'
import type { InsightStatus } from '../../../../../lib/curriculum-intel/types'

const VALID_STATUSES: InsightStatus[] = ['new', 'reviewed', 'acted', 'dismissed']

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { status } = parsed.data as { status?: string }
  if (!status || !VALID_STATUSES.includes(status as InsightStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  const { id } = await context.params
  const updated = await updateInsightStatus(id, status as InsightStatus)
  return NextResponse.json(updated)
})
