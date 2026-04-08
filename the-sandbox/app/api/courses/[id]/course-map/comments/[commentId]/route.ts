import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { resolveComment, unresolveComment, deleteComment } from '../../../../../../lib/syllabus-architect/comment-service'
import { prisma } from '../../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) => {
  const { id: courseId, commentId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { action?: string }

  if (body.action === 'resolve') {
    const comment = await resolveComment(commentId, auth.user.id)
    return NextResponse.json({ comment })
  }

  if (body.action === 'unresolve') {
    const comment = await unresolveComment(commentId)
    return NextResponse.json({ comment })
  }

  return NextResponse.json({ error: 'Invalid action. Use "resolve" or "unresolve".' }, { status: 400 })
})

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) => {
  try {
    const { id: courseId, commentId } = await params
    const auth = await requireCourseOwner(req, courseId)
    if (isAuthFailure(auth)) return auth.response

    await deleteComment(commentId, auth.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/courses/[id]/course-map/comments/[commentId] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete comment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
