import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser } from '../../../lib/server-auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth
    const { id } = await params

    const existing = await prisma.studentNote.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    if (existing.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, content, courseId } = body

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
  } catch (err) {
    console.error('PATCH /api/notes/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth
    const { id } = await params

    const existing = await prisma.studentNote.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    if (existing.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.studentNote.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/notes/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
