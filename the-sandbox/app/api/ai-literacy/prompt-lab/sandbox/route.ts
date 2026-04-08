import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { getSandboxTip, saveSandboxEntry } from '../../../../lib/prompt-lab-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { prompt, output } = parsed.data as { prompt: string; output: string }
  if (!prompt || !output) {
    return NextResponse.json({ error: 'prompt and output are required' }, { status: 400 })
  }

  const sandyTip = await getSandboxTip(prompt)
  const entry = await saveSandboxEntry(auth.user.id, { prompt, output, sandyTip })
  return NextResponse.json({ sandyTip, entry })
})
