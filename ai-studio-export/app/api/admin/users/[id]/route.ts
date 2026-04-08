import { NextRequest, NextResponse } from 'next/server'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'
import { prisma } from '../../../../lib/prisma'
import { requireAdminUser, parseRequestBody, isAuthFailure } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import { UpdateUserSchema } from '../../../../lib/schemas'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tools: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            _count: { select: { upvotes: true, favorites: true, comments: true, sessions: true } },
          },
        },
        toolSessions: {
          where: { chatMessages: { some: { flagged: true } } },
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: {
            tool: { select: { id: true, name: true } },
            chatMessages: {
              where: { flagged: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                flagCategory: true,
                flagReason: true,
                createdAt: true,
              },
            },
          },
        },
        _count: { select: { tools: true, toolSessions: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('GET /api/admin/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user: admin } = auth
    const { id } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(UpdateUserSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { role, suspended, suspendedReason } = validation.value

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, suspended: true },
    })
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(suspended !== undefined && {
          suspended,
          suspendedAt: suspended ? new Date() : null,
          suspendedReason: suspended ? suspendedReason || 'Account under review' : null,
        }),
      },
    })

    await recordAdminAudit({
      adminId: admin.id,
      action:
        suspended !== undefined
          ? suspended
            ? 'user_suspended'
            : 'user_unsuspended'
          : 'user_role_changed',
      targetType: 'USER',
      targetId: updatedUser.id,
      targetLabel: `${updatedUser.name} (${updatedUser.email})`,
      metadata: {
        previousRole: existingUser.role,
        nextRole: updatedUser.role,
        suspended: updatedUser.suspended,
        suspendedReason: updatedUser.suspendedReason,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
