import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getAuthenticAssessmentFacultyPayload,
  getAuthenticAssessmentStudentPayload,
  recomputeAuthenticAssessmentForAssignment,
} from '../../../../lib/assessment/authentic-assessment-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { id } = await params
    const viewer = {
      id: auth.user.id,
      role: auth.user.role,
    }

    if (auth.user.role === 'STUDENT') {
      return NextResponse.json(await getAuthenticAssessmentStudentPayload(viewer, id))
    }

    return NextResponse.json(await getAuthenticAssessmentFacultyPayload(viewer, id))
  }
)

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    if (auth.user.role !== 'EDUCATOR' && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const result = await recomputeAuthenticAssessmentForAssignment(
      {
        id: auth.user.id,
        role: auth.user.role,
      },
      id
    )

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
)
