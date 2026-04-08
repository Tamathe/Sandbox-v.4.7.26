import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { createImpactReport } from '../../../lib/policy-blast/policy-blast-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody<{ policyId: string; changeDescription?: string }>(req)
  if ('error' in parsed) return parsed.error
  const { policyId, changeDescription } = parsed.data

  if (!policyId) {
    return NextResponse.json({ error: 'policyId is required' }, { status: 400 })
  }

  const report = await createImpactReport(policyId, user.id, changeDescription)
  return NextResponse.json(report)
})
