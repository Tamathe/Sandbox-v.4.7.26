import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { getOpenActionItems, createActionItems } from '../../../../../lib/staff/minutes-service'
import type { ExtractedActionItem } from '../../../../../lib/staff/minutes-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const actionItems = await getOpenActionItems(id)
  return NextResponse.json({ items: actionItems }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { meetingId, items } = parsed.data as { meetingId: string; items: ExtractedActionItem[] }

  if (!meetingId || !items?.length) {
    return NextResponse.json({ error: 'meetingId and items are required' }, { status: 400 })
  }

  const created = await createActionItems(id, meetingId, items)
  return NextResponse.json({ items: created }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
