import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import {
  addAnnotation,
  getCourseMapAnnotations,
  updateAnnotation,
  deleteAnnotation,
} from '../../../../../lib/syllabus-architect/annotation-service'
import type { AnnotationType } from '../../../../../lib/syllabus-architect/annotation-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

const VALID_TYPES: AnnotationType[] = ['note', 'highlight', 'drawing']

/**
 * GET /api/courses/[id]/course-map/annotations
 *
 * Get all annotations across all layers for a course map.
 * Auth: any authenticated user.
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  const annotations = await getCourseMapAnnotations(courseMap.id)
  return NextResponse.json({ annotations }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

/**
 * POST /api/courses/[id]/course-map/annotations
 *
 * Add an annotation to a layer.
 * Body: { layerId, type: 'note'|'highlight'|'drawing', content, positionX, positionY, targetNodeId? }
 * Auth: course owner.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { layerId, type, content, positionX, positionY, targetNodeId } = parsed.data as { layerId?: string; type?: AnnotationType; content?: string; positionX?: number; positionY?: number; targetNodeId?: string }

  if (!layerId || !type || content == null || positionX == null || positionY == null) {
    return NextResponse.json(
      { error: 'layerId, type, content, positionX, positionY are required' },
      { status: 400 },
    )
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  const annotation = await addAnnotation({
    layerId,
    type,
    content,
    positionX,
    positionY,
    targetNodeId,
    createdById: user.id,
  })

  return NextResponse.json({ annotation }, { status: 201 })
})

/**
 * PATCH /api/courses/[id]/course-map/annotations
 *
 * Update an annotation's content or position.
 * Body: { annotationId, content?, positionX?, positionY? }
 * Auth: course owner.
 */
export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { annotationId, content, positionX, positionY } = parsed.data as { annotationId?: string; content?: string; positionX?: number; positionY?: number }

  if (!annotationId) {
    return NextResponse.json({ error: 'annotationId is required' }, { status: 400 })
  }

  const annotation = await updateAnnotation(annotationId, { content, positionX, positionY })
  return NextResponse.json({ annotation }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

/**
 * DELETE /api/courses/[id]/course-map/annotations
 *
 * Delete an annotation.
 * Body: { annotationId }
 * Auth: course owner.
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { annotationId } = parsed.data as { annotationId?: string }

  if (!annotationId) {
    return NextResponse.json({ error: 'annotationId is required' }, { status: 400 })
  }

  await deleteAnnotation(annotationId)
  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
