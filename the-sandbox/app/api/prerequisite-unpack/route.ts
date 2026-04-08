import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { unpackPrerequisiteChain } from '../../lib/prerequisite-service'
import { withErrorHandling } from '../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStudentUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { concept, courseId } = parsed.data as { concept?: string; courseId?: string }

  if (!concept || !courseId) {
    return NextResponse.json(
      { error: 'concept and courseId are required' },
      { status: 400 },
    )
  }

  const result = await unpackPrerequisiteChain(user.id, concept, courseId)
  return NextResponse.json(result)
})
