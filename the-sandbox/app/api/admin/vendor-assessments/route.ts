import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { createAssessment, listAssessments } from '../../../lib/vendor-risk-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const assessments = await listAssessments()
    return NextResponse.json({ assessments }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    vendorName: string
    dpaId?: string
    riskLevel: string
    dataCategories?: string[]
    securityMeasures?: string[]
    findings?: unknown
    overallScore: number
    nextReviewDate?: string
  }>(request)
  if ('error' in body) return body.error

  const { vendorName, riskLevel, overallScore } = body.data
  if (!vendorName || !riskLevel) {
    return NextResponse.json({ error: 'vendorName and riskLevel are required' }, { status: 400 })
  }

  const validLevels = ['low', 'medium', 'high', 'critical']
  if (!validLevels.includes(riskLevel)) {
    return NextResponse.json({ error: `riskLevel must be one of: ${validLevels.join(', ')}` }, { status: 400 })
  }

  if (overallScore === undefined || overallScore < 0 || overallScore > 100) {
    return NextResponse.json({ error: 'overallScore must be between 0 and 100' }, { status: 400 })
  }

    const assessment = await createAssessment({
      vendorName,
      dpaId: body.data.dpaId,
      assessmentDate: new Date(),
      riskLevel,
      dataCategories: body.data.dataCategories || [],
      securityMeasures: body.data.securityMeasures || [],
      findings: body.data.findings || [],
      overallScore,
      assessedBy: auth.user.id,
      nextReviewDate: body.data.nextReviewDate ? new Date(body.data.nextReviewDate) : undefined,
    })
    return NextResponse.json({ assessment }, { status: 201 })

})
