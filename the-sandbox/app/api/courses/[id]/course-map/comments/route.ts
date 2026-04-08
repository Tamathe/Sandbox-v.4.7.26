import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { createComment, getComments, getCommentCounts } from '../../../../../lib/syllabus-architect/comment-service'
import { broadcastEvent } from '../../../../../lib/syllabus-architect/collab-editing'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) return NextResponse.json({ error: 'Course map not found' }, { status: 404 })

  const url = new URL(req.url)
  const nodeId = url.searchParams.get('nodeId') ?? undefined
  const edgeId = url.searchParams.get('edgeId') ?? undefined
  const resolvedParam = url.searchParams.get('resolved')
  const resolved = resolvedParam === 'true' ? true : resolvedParam === 'false' ? false : undefined

  const [comments, counts] = await Promise.all([
    getComments(courseMap.id, { nodeId, edgeId, resolved }),
    getCommentCounts(courseMap.id),
  ])

  return NextResponse.json({ comments, counts }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) return NextResponse.json({ error: 'Course map not found' }, { status: 404 })

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    content?: string
    nodeId?: string
    edgeId?: string
    parentId?: string
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const comment = await createComment(courseMap.id, auth.user.id, {
    content: body.content.trim(),
    nodeId: body.nodeId,
    edgeId: body.edgeId,
    parentId: body.parentId,
  })

  // Broadcast via SSE for real-time updates
  broadcastEvent(courseMap.id, {
    type: 'node_updated',
    payload: {
      nodeId: comment.nodeId ?? '',
      label: 'comment_added',
      userId: auth.user.id,
      userName: auth.user.name,
    },
  })

  return NextResponse.json({ comment }, { status: 201 })
})
