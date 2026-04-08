import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'

const PatchUserSchema = z.object({
  bio: z.string().max(1000).optional().nullable(),
  personalContext: z.string().max(2000).optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const requesterEmail = req.headers.get('x-demo-user-email')
    const requester = requesterEmail
      ? await prisma.user.findUnique({ where: { email: requesterEmail } })
      : null

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tools: {
          where: { published: true },
          include: {
            creator: true,
            _count: { select: { upvotes: true, favorites: true, comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        favorites: {
          include: {
            tool: {
              include: {
                creator: true,
                _count: { select: { upvotes: true, favorites: true, comments: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            tools: true,
            favorites: true,
            upvotes: true,
            comments: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const canSeePrivate = requester?.role === 'ADMIN' || requester?.email === user.email
    return NextResponse.json({
      ...user,
      personalContext: canSeePrivate ? user.personalContext : null,
    })
  } catch (error) {
    console.error('GET /api/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const requesterEmail = req.headers.get('x-demo-user-email')
    if (!requesterEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const [requester, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: requesterEmail } }),
      prisma.user.findUnique({ where: { id } }),
    ])

    if (!requester || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (requester.role !== 'ADMIN' && requester.email !== targetUser.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsedBody = await parseRequestBody(req)
    if ('error' in parsedBody) return parsedBody.error
    const validation = validateBody(PatchUserSchema, parsedBody.data)
    if ('error' in validation) return validation.error
    const body = validation.value
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.bio !== undefined ? { bio: body.bio || null } : {}),
        ...(body.personalContext !== undefined ? { personalContext: body.personalContext || null } : {}),
      },
    })

    return NextResponse.json({
      ...updated,
      personalContext: requester.role === 'ADMIN' || requester.email === updated.email
        ? updated.personalContext
        : null,
    })
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
