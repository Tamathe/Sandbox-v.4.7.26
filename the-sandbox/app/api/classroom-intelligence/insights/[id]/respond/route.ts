import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { recordIntervention } from '../../../../../lib/classroom-intelligence/intervention-tracker'
import type { Approach } from '../../../../../lib/classroom-intelligence/types'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { approach, description, targetConcepts, courseId } = parsed.data as { approach: string; description: string; targetConcepts: string[]; courseId: string }

  const result = await recordIntervention({
    courseId,
    instructorId: user.id,
    approach: approach as Approach,
    description,
    targetConcepts,
    insightCardId: id,
  })

  return NextResponse.json(result)
})
