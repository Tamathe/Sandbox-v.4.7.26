import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if ('response' in auth) return auth.response
  const { user } = auth
  const { id } = await params

  const existing = await prisma.studentNote.findUnique({ where: { id }, select: { id: true, userId: true } })
  if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  if (existing.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { title, content, courseId } = parsed.data as { title?: string; content?: string; courseId?: string }

  if (title !== undefined && title.trim().length === 0) {
    return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
  }
  if (title !== undefined && title.length > 200) {
    return NextResponse.json({ error: 'title must be 200 characters or fewer' }, { status: 400 })
  }

  const note = await prisma.studentNote.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(courseId !== undefined ? { courseId: courseId || null } : {}),
    },
    include: { course: { select: { id: true, courseCode: true, title: true } } },
  })

  return NextResponse.json(note)
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if ('response' in auth) return auth.response
  const { user } = auth
  const { id } = await params

  const existing = await prisma.studentNote.findUnique({ where: { id }, select: { id: true, userId: true } })
  if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  if (existing.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.studentNote.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
