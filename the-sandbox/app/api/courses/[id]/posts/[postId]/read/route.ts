import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { markPostAsRead } from '../../../../../../lib/course-post-service'

// POST — mark a course post as read by the current student
export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string; postId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { postId } = await context.params

  await markPostAsRead(postId, auth.user.id)

  return NextResponse.json({ success: true })
})
