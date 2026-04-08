import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { createVisitNote, getVisitNotes, deleteVisitNote } from '../../../lib/faculty/visit-notes-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const studentId = req.nextUrl.searchParams.get('studentId') ?? undefined
  const notes = await getVisitNotes(auth.user.id, studentId)
  return NextResponse.json(notes, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { studentId, courseId, content, followUpDate } = parsed.data as { studentId: string; courseId?: string; content: string; followUpDate?: string }

  if (!studentId || !content) {
    return NextResponse.json({ error: 'studentId and content are required' }, { status: 400 })
  }

  const note = await createVisitNote(auth.user.id, {
    studentId,
    courseId,
    content,
    followUpDate,
  })

  return NextResponse.json(note, { status: 201 })
})

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const noteId = req.nextUrl.searchParams.get('noteId')
  if (!noteId) {
    return NextResponse.json({ error: 'noteId is required' }, { status: 400 })
  }

  const deleted = await deleteVisitNote(auth.user.id, noteId)
  if (!deleted) {
    return NextResponse.json({ error: 'Note not found or not authorized' }, { status: 404 })
  }

  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
