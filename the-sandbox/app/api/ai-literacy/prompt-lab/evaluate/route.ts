import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { evaluatePromptRewrite } from '../../../../lib/prompt-lab-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { original, rewritten, originalOutput, rewrittenOutput, challengeContext } = parsed.data as { original: string; rewritten: string; originalOutput: string; rewrittenOutput: string; challengeContext?: string }
  if (!original || !rewritten || !originalOutput || !rewrittenOutput) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await evaluatePromptRewrite(original, rewritten, originalOutput, rewrittenOutput, challengeContext ?? '')
  return NextResponse.json(result)
})
