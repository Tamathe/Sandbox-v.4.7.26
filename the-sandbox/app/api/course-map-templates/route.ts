import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { listTemplates, saveAsTemplate } from '../../lib/syllabus-architect/template-service'
import { prisma } from '../../lib/prisma'
import { withErrorHandling } from '../../lib/api-utils'

/**
 * GET /api/course-map-templates — list all templates (any authenticated user)
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const userId = req.nextUrl.searchParams.get('mine') === 'true' ? auth.user.id : undefined
    const templates = await listTemplates(userId)
    return NextResponse.json({ templates }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

/**
 * POST /api/course-map-templates — create a template from a course map
 * Body: { courseId, name, description?, category? }
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { courseId?: string; name?: string; description?: string; category?: string }

    if (!body.courseId || typeof body.courseId !== 'string') {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Must own the course to create a template from it
    const courseAuth = await requireCourseOwner(req, body.courseId)
    if (isAuthFailure(courseAuth)) return courseAuth.response

    // Get the course map ID
    const courseMap = await prisma.courseMap.findUnique({
      where: { courseId: body.courseId },
      select: { id: true },
    })
    if (!courseMap) {
      return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
    }

    const template = await saveAsTemplate(
      courseMap.id,
      body.name.trim(),
      body.description?.trim() || null,
      body.category?.trim() || null,
      auth.user.id,
    )

    return NextResponse.json({ template }, { status: 201 })
  })
