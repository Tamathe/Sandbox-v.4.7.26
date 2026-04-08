import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { randomBytes } from 'crypto'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * POST /api/courses/[id]/course-map/share-link
 * Generate a time-limited public link token for the course map.
 * Body: { expiresInHours?: number } (default 168 = 7 days)
 * Uses existing Course.shareToken field; expiry is computed client-side.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { expiresInHours?: number }
  const expiresInHours = Math.min(Math.max(body.expiresInHours || 168, 1), 720) // 1h–30d

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, shareToken: true, courseCode: true, title: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // If existing token exists, return it
  if (course.shareToken) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    return NextResponse.json({
      token: course.shareToken,
      url: `${baseUrl}/courses/share/${course.shareToken}`,
      expiresAt: expiresAt.toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  }

  // Generate new token
  const token = randomBytes(16).toString('hex') // 32-char hex string
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  await prisma.course.update({
    where: { id: courseId },
    data: { shareToken: token },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return NextResponse.json({
    token,
    url: `${baseUrl}/courses/share/${token}`,
    expiresAt: expiresAt.toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

/**
 * GET /api/courses/[id]/course-map/share-link
 * Validate token and return read-only course map data.
 * No auth required — token serves as credential.
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      shareToken: true,
      courseCode: true,
      title: true,
      courseMap: {
        select: {
          id: true,
          nodes: { select: { id: true, label: true, nodeType: true, courseUnitId: true, xPos: true, yPos: true, archived: true } },
          edges: { select: { id: true, fromNodeId: true, toNodeId: true, edgeType: true } },
          units: {
            select: {
              id: true,
              label: true,
              description: true,
              unitType: true,
              startDate: true,
              endDate: true,
              position: true,
              modules: {
                select: {
                  id: true,
                  label: true,
                  description: true,
                  lessons: { select: { id: true, label: true } },
                },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (course.shareToken !== token) {
    return NextResponse.json({ error: 'Invalid share token' }, { status: 403 })
  }

  if (!course.courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  // Record view (fire-and-forget)
  const viewerIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null
  prisma.courseMapShareView.create({
    data: {
      courseId: course.id,
      viewerIp,
      userAgent,
    },
  }).catch(() => {})

  return NextResponse.json({
    courseCode: course.courseCode,
    title: course.title,
    graphMap: {
      id: course.courseMap.id,
      courseId: course.id,
      nodes: course.courseMap.nodes.filter((n: { archived?: boolean }) => !n.archived),
      edges: course.courseMap.edges,
      units: course.courseMap.units,
    },
    readOnly: true,
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
