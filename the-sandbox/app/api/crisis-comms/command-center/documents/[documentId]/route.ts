import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { updateDocument } from '../../../../../lib/crisis-comms/command-center/command-center-service'

export const PATCH = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ documentId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { documentId } = await context.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { content } = parsed.data as { content: string }
  const doc = await updateDocument(auth.user.id, { documentId, content })
  return NextResponse.json(doc)
})
