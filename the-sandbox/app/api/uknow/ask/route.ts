import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { askAI } from '../../../lib/uknow-service'
import type { ConversationTurn } from '../../../lib/uknow-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { query?: string; history?: ConversationTurn[] }
    const query: string | undefined = body?.query
    const history: ConversationTurn[] | undefined = body?.history

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const result = await askAI(query.trim(), auth.user.id, history)
    return NextResponse.json(result)
  })
