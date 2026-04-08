import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { parseRawTextToCase } from '../../../../lib/virtual-clinic/import-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{ rawText: string }>(req)
  if ('error' in parsed) return parsed.error

  const { rawText } = parsed.data
  if (!rawText?.trim()) {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 })
  }

  if (rawText.length > 50_000) {
    return NextResponse.json({ error: 'rawText exceeds 50,000 character limit' }, { status: 400 })
  }

  const caseInput = await parseRawTextToCase(rawText)
  return NextResponse.json(caseInput)
})
