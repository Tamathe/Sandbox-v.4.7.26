import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import {
  createAnnotationLayer,
  getAnnotationLayers,
  renameAnnotationLayer,
  deleteAnnotationLayer,
  toggleLayerVisibility,
} from '../../../../../lib/syllabus-architect/annotation-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/annotation-layers
 *
 * List all annotation layers with annotation counts.
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

  const layers = await getAnnotationLayers(courseMap.id)
  return NextResponse.json({ layers }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

/**
 * POST /api/courses/[id]/course-map/annotation-layers
 *
 * Create a new annotation layer.
 * Body: { name: string, color?: string }
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
  const { name, color } = parsed.data as { name?: string; color?: string }

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  const layer = await createAnnotationLayer({
    courseMapId: courseMap.id,
    name: name.trim(),
    createdById: user.id,
    color,
  })

  return NextResponse.json({ layer }, { status: 201 })
})

/**
 * PATCH /api/courses/[id]/course-map/annotation-layers
 *
 * Update a layer: rename, delete, or toggle visibility.
 * Body: { layerId: string, action: 'rename' | 'delete' | 'toggleVisibility', name?: string, visible?: boolean }
 * Auth: course owner for rename/delete; any user for toggleVisibility.
 */
export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { layerId, action, name, visible } = parsed.data as { layerId?: string; action?: string; name?: string; visible?: boolean }

  if (!layerId || !action) {
    return NextResponse.json({ error: 'layerId and action are required' }, { status: 400 })
  }

  if (action === 'toggleVisibility') {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    if (visible == null) {
      return NextResponse.json({ error: 'visible is required' }, { status: 400 })
    }

    await toggleLayerVisibility(layerId, user.id, visible)
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // rename and delete require course owner
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  if (action === 'rename') {
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required for rename' }, { status: 400 })
    }
    const layer = await renameAnnotationLayer(layerId, name.trim())
    return NextResponse.json({ layer }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (action === 'delete') {
    await deleteAnnotationLayer(layerId)
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
})
