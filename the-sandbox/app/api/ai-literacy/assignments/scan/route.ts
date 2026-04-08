import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { scanAssignment, getAssignmentsForUser, REDESIGN_TEMPLATES } from '../../../../lib/assignment-redesign-service'

// POST — scan an assignment for AI vulnerability
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { assignmentText: string; assignmentType?: string; discipline?: string }
  const { assignmentText, assignmentType, discipline } = body

  if (!assignmentText || typeof assignmentText !== 'string' || assignmentText.trim().length < 10) {
    return NextResponse.json({ error: 'Assignment text must be at least 10 characters' }, { status: 400 })
  }

  const result = await scanAssignment(assignmentText, assignmentType, discipline)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// GET — fetch user's assignments + templates
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courses = await getAssignmentsForUser(auth.user.id)
  return NextResponse.json({ courses, templates: REDESIGN_TEMPLATES })
})
