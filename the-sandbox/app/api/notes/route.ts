import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../lib/api-utils'
import { requireRequestUser, parseRequestBody } from '../../lib/server-auth'
import { getUserNotes, createNote } from '../../lib/notes-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if ('response' in auth) return auth.response
  const { user } = auth

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId') || undefined
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    const [notes, total] = await getUserNotes(user.id, { courseId, limit, offset })

  return NextResponse.json({ notes, total }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if ('response' in auth) return auth.response
  const { user } = auth

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { title, content, courseId, source } = parsed.data as { title: string; content: string; courseId?: string; source?: string }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }
    if (title.length > 200) {
      return NextResponse.json({ error: 'title must be 200 characters or fewer' }, { status: 400 })
    }

    const note = await createNote(user.id, { title, content, courseId, source })

  return NextResponse.json(note, { status: 201 })
})
