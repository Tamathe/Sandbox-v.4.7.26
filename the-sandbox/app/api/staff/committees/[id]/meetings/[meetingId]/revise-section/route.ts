import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { reviseMinutesSection } from '../../../../../../../lib/staff/minutes-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  await params // validate route params exist
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { sectionContent, instruction, fullMinutes } = parsed.data as {
    sectionContent: string
    instruction: string
    fullMinutes: string
  }

  if (!sectionContent || !instruction || !fullMinutes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const revisedSection = await reviseMinutesSection(sectionContent, instruction, fullMinutes)
  return NextResponse.json({ revisedSection })
})
