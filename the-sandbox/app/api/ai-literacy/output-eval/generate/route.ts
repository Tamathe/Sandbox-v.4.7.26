import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { generateScenario } from '../../../../lib/output-eval-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { tier, topic } = parsed.data as { tier: number; topic?: 'code' | 'general-knowledge' | 'academic-writing' | 'data-interpretation' }
  if (!tier || typeof tier !== 'number' || tier < 1 || tier > 3) {
    return NextResponse.json({ error: 'Invalid tier (1-3)' }, { status: 400 })
  }

  const scenario = await generateScenario(tier, topic)
  return NextResponse.json({ scenario })
})
