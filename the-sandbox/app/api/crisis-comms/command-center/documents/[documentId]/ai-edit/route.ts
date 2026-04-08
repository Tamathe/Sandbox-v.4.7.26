import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { aiEditDocument } from '../../../../../../lib/crisis-comms/command-center/command-center-service'

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ documentId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { documentId } = await context.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { instruction } = parsed.data as { instruction: string }
  const doc = await aiEditDocument(auth.user.id, { documentId, instruction })
  return NextResponse.json(doc)
})
