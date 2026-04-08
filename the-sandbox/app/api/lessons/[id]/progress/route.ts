import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { ProgressService } from '../../../../lib/courses/progress-service'
import { EnrollmentError } from '../../../../lib/courses/enrollment-service'
import type { LessonProgressStatus } from '../../../../generated/prisma'

const VALID_STATUS: LessonProgressStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const status = (body?.status ?? 'IN_PROGRESS') as LessonProgressStatus
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  const score = typeof body?.score === 'number' ? body.score : undefined

  try {
    const progress = await ProgressService.upsert(auth.user, id, status, score)
    return NextResponse.json(progress)
  } catch (err) {
    if (err instanceof EnrollmentError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
})
