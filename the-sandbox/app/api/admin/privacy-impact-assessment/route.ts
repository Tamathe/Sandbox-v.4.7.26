import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { generatePrivacyImpactAssessment } from '../../../lib/compliance-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  const { toolId } = body as { toolId?: string }

  if (!toolId) {
    return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
  }

    const report = await generatePrivacyImpactAssessment(toolId)
    if (!report) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    return NextResponse.json({ report })

})
