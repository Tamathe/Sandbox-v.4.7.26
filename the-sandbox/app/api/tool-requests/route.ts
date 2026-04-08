import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { checkRateLimit } from '../../lib/rate-limit'
import { withErrorHandling } from '../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const rateLimitError = await checkRateLimit(req, auth.user.id, 'API', false)
    if (rateLimitError) return rateLimitError

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as Record<string, unknown>
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() || null : null
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() || null : null

    if (title.length < 5 || title.length > 100) {
      return NextResponse.json({ error: 'Title must be 5–100 characters' }, { status: 400 })
    }
    if (description.length < 10 || description.length > 500) {
      return NextResponse.json({ error: 'Description must be 10–500 characters' }, { status: 400 })
    }

    // Rate limit: max 3 creates per day per user
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await prisma.toolRequest.count({
      where: { requesterId: auth.user.id, createdAt: { gte: oneDayAgo } },
    })
    if (recentCount >= 3) {
      return NextResponse.json({ error: 'You can only create 3 tool requests per day' }, { status: 429 })
    }

    const request = await prisma.toolRequest.create({
      data: {
        title,
        description,
        category,
        courseId,
        requesterId: auth.user.id,
      },
      include: {
        requester: { select: { id: true, name: true } },
        course: { select: { id: true, courseCode: true } },
      },
    })

    return NextResponse.json(request, { status: 201 })
  })

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const courseId = searchParams.get('courseId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (courseId) where.courseId = courseId

    const [requests, total] = await Promise.all([
      prisma.toolRequest.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true } },
          course: { select: { id: true, courseCode: true } },
          _count: { select: { upvotes: true } },
          upvotes: {
            where: { userId: auth.user.id },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { upvotes: { _count: 'desc' } },
        take: limit,
        skip: offset,
      }),
      prisma.toolRequest.count({ where }),
    ])

    const items = requests.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      courseId: r.courseId,
      course: r.course,
      requester: r.requester,
      status: r.status,
      upvoteCount: r._count.upvotes,
      hasUpvoted: r.upvotes.length > 0,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ items, total }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
