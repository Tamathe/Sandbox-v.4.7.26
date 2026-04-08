import { NextRequest, NextResponse } from 'next/server'
import { streamAgentBuilderChat } from '../../../../lib/agent/agent-builder-service'
import { withErrorHandling } from '../../../../lib/api-utils'
import { isAuthFailure, parseRequestBody, requireRequestUser } from '../../../../lib/server-auth'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{ messages?: { role: 'user' | 'assistant'; content: string }[] }>(req)
  if ('error' in parsed) return parsed.error

  const messages = parsed.data.messages
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  return streamAgentBuilderChat(messages, auth.user.role)
})
