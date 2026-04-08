import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { processNaturalLanguageEdit } from '../../../../../lib/syllabus-architect/ai-map-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { instruction?: string }
  if (!body.instruction || typeof body.instruction !== 'string' || body.instruction.trim().length === 0) {
    return NextResponse.json({ error: 'Missing instruction in request body' }, { status: 400 })
  }

  if (body.instruction.length > 2000) {
    return NextResponse.json({ error: 'Instruction too long (max 2000 characters)' }, { status: 400 })
  }

  const result = await processNaturalLanguageEdit(courseId, body.instruction.trim())
  return NextResponse.json(result)
})
