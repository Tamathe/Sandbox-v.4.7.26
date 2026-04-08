import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getStudyRecommendations } from '../../../../../lib/syllabus-architect/ai-study-recommendations'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  // Only students and admins can get study recommendations
  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Students and admins only' }, { status: 403 })
  }

  const result = await getStudyRecommendations(courseId, user.id)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
