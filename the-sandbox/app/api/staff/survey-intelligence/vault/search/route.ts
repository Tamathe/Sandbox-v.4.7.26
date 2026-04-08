import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { searchEvidenceDual } from '../../../../../lib/staff/survey-vault-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { query, categories, includeUKNow, topK } = parsed.data as { query: string; categories?: string[]; includeUKNow?: boolean; topK?: number }

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const results = await searchEvidenceDual(query, {
    categories,
    topKVault: topK,
    topKUKNow: includeUKNow === false ? 0 : undefined,
  })

  return NextResponse.json(results)
})
