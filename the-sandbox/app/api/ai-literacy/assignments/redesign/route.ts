import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { redesignWithTemplate } from '../../../../lib/assignment-redesign-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { assignmentText: string; suggestionTitle: string; suggestionDescription?: string }
  const { assignmentText, suggestionTitle, suggestionDescription } = body

  if (!assignmentText || !suggestionTitle) {
    return NextResponse.json({ error: 'Missing assignmentText or suggestionTitle' }, { status: 400 })
  }

  const result = await redesignWithTemplate(
    assignmentText,
    suggestionTitle,
    suggestionDescription || '',
  )

  return NextResponse.json(result)
})
