import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { reviseDraft } from '../../../../../lib/staff/communication-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { instruction } = parsed.data as { instruction: string }

  if (!instruction || typeof instruction !== 'string') {
    return NextResponse.json({ error: 'instruction is required' }, { status: 400 })
  }

  const communication = await reviseDraft(id, instruction)
  return NextResponse.json(communication)
})
