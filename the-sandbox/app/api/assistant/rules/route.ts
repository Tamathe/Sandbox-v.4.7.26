import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { saveLearnedRule } from '../../../lib/assistant/email-rule-learner'
import type { DraftPattern } from '../../../lib/assistant/email-rule-learner'

/**
 * POST /api/assistant/rules
 * Save a learned email rule from a DraftPattern.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { pattern: DraftPattern }
  if (!body.pattern?.proposedRule || !body.pattern?.category) {
    return NextResponse.json({ error: 'Missing pattern data' }, { status: 400 })
  }

  const rule = await saveLearnedRule(auth.user.id, body.pattern)
  return NextResponse.json({ rule })
})
