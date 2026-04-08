import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { evaluateUserHighlights } from '../../../../lib/output-eval-service'
import type { PlantedError } from '../../../../lib/output-eval-constants'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { scenarioId, plantedErrors, userHighlights, userRating } = parsed.data as { scenarioId: string; plantedErrors: PlantedError[]; userHighlights: { span: string; type: string; explanation: string }[]; userRating: number | undefined }
  if (!scenarioId || !plantedErrors || !userHighlights || userRating === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await evaluateUserHighlights(scenarioId, plantedErrors, userHighlights, userRating)
  return NextResponse.json(result)
})
