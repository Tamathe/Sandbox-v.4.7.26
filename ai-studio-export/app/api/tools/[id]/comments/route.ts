import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { NotificationType, PlatformQuestType } from '../../../../generated/prisma'
import { createNotification } from '../../../../lib/notifications'
import { awardQuestProgress } from '../../../../lib/platform-quests'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const comments = await prisma.comment.findMany({
      where: { toolId: id, parentId: null },
      include: {
        user: true,
        replies: {
          include: { user: true, replies: { include: { user: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('GET /api/tools/[id]/comments error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: toolId } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const commentId = req.nextUrl.searchParams.get('commentId')
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 })
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } })
    if (!comment || comment.toolId !== toolId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }
    if (comment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete replies first, then the comment
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { parentId: commentId } }),
      prisma.comment.delete({ where: { id: commentId } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/tools/[id]/comments error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tool = await prisma.tool.findUnique({ where: { id } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const body = await req.json()
    const { content, parentId } = body

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const parentComment = parentId
      ? await prisma.comment.findUnique({
          where: { id: parentId },
          select: { id: true, userId: true, content: true },
        })
      : null

    if (parentId && !parentComment) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: user.id,
        toolId: id,
        parentId: parentId || null,
      },
      include: {
        user: true,
        replies: { include: { user: true } },
      },
    })

    await awardQuestProgress(user.id, PlatformQuestType.LEAVE_COMMENT).catch(() => {})

    const href = `/tools/${id}?tab=comments`

    if (parentComment && parentComment.userId !== user.id) {
      await createNotification({
        userId: parentComment.userId,
        type: NotificationType.COMMENT_REPLY,
        title: `${user.name} replied to your comment`,
        body: content.trim().slice(0, 180),
        href,
      }).catch(() => {})
    } else if (!parentComment && tool.creatorId !== user.id) {
      await createNotification({
        userId: tool.creatorId,
        type: NotificationType.COMMENT_ON_TOOL,
        title: `${user.name} commented on ${tool.name}`,
        body: content.trim().slice(0, 180),
        href,
      }).catch(() => {})
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('POST /api/tools/[id]/comments error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
