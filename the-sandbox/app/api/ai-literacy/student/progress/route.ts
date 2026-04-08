import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getStudentModuleProgress } from '../../../../lib/ai-literacy/student-progress-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const progress = await getStudentModuleProgress(auth.user.id)
  return NextResponse.json(progress, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
