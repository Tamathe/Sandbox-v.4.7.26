import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { EnrollmentService } from '../../../lib/courses/enrollment-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const enrollments = await EnrollmentService.listForUser(auth.user)
  return NextResponse.json(enrollments)
})
