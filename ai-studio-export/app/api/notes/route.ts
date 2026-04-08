import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { requireRequestUser } from '../../lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId') || undefined
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    const where = {
      userId: user.id,
      ...(courseId ? { courseId } : {}),
    }

    const [notes, total] = await Promise.all([
      prisma.studentNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: { course: { select: { id: true, courseCode: true, title: true } } },
      }),
      prisma.studentNote.count({ where }),
    ])

    return NextResponse.json({ notes, total })
  } catch (err) {
    console.error('GET /api/notes error:', err)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const body = await req.json()
    const { title, content, courseId, source } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }
    if (title.length > 200) {
      return NextResponse.json({ error: 'title must be 200 characters or fewer' }, { status: 400 })
    }

    const note = await prisma.studentNote.create({
      data: {
        userId: user.id,
        title: title.trim(),
        content: content.trim(),
        courseId: courseId || null,
        source: source || 'manual',
      },
      include: { course: { select: { id: true, courseCode: true, title: true } } },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (err) {
    console.error('POST /api/notes error:', err)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
