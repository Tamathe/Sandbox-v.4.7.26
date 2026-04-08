import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { recordAdminAudit } from '../../../../../lib/admin-control-tower'
import { runIntegrationHealthCheckById } from '../../../../../lib/integrations/health'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'

export const POST = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  let body: { simulate?: unknown; persist?: unknown } = {}
  if (request.headers.get('content-length') !== '0') {
    const parsed = await parseRequestBody<{ simulate?: unknown; persist?: unknown }>(request)
    if ('error' in parsed) return parsed.error
    body = parsed.data
  }

  const simulate = body.simulate === true
  const persist =
    typeof body.persist === 'boolean' ? body.persist : !simulate

  const result = await runIntegrationHealthCheckById(id, { simulate, persist })

  await recordAdminAudit({
    adminId: auth.user.id,
    action: simulate ? 'integration_health_simulated' : 'integration_health_run',
    targetType: 'INTEGRATION',
    targetId: result.integration.id,
    targetLabel: result.integration.name,
    metadata: {
      status: result.healthCheck.status,
      persisted: persist,
      simulated: simulate,
    },
  })

  return NextResponse.json(result)
})
