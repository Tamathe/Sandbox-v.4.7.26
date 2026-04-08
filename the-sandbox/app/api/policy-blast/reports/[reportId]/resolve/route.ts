import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { resolveImpactReport } from '../../../../../lib/policy-blast/policy-blast-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ reportId: string }> }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { reportId } = await context.params
  const report = await resolveImpactReport(reportId)

  return NextResponse.json(report)
})
