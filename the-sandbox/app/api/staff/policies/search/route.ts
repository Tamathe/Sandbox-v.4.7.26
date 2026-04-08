import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { searchPolicies } from '../../../../lib/staff/policy-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { query, category, limit } = parsed.data as {
    query: string
    category?: string
    limit?: number
  }

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const results = await searchPolicies(query, {
    category: category || undefined,
    limit: limit || undefined,
  })

  return NextResponse.json({ results })
})
