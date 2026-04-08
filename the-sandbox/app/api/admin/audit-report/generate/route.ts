import { NextRequest } from 'next/server'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { generateAuditReport } from '../../../../lib/audit-report-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  // Optional scope from body
  let scope = 'full-compliance-audit'
  const bodyResult = await parseRequestBody<{ scope?: string }>(request)
  if ('data' in bodyResult && bodyResult.data?.scope) {
    scope = bodyResult.data.scope
  }

  const report = await generateAuditReport(user.id, scope)
  return Response.json(report)
})
