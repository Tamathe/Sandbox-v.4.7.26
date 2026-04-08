import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updateAssessment, deleteAssessment } from '../../../../lib/vendor-risk-service'

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const body = await parseRequestBody<{
    vendorName?: string
    dpaId?: string
    riskLevel?: string
    dataCategories?: string[]
    securityMeasures?: string[]
    findings?: unknown
    overallScore?: number
    nextReviewDate?: string
  }>(request)
  if ('error' in body) return body.error

  if (body.data.riskLevel) {
    const validLevels = ['low', 'medium', 'high', 'critical']
    if (!validLevels.includes(body.data.riskLevel)) {
      return NextResponse.json({ error: `riskLevel must be one of: ${validLevels.join(', ')}` }, { status: 400 })
    }
  }

  if (body.data.overallScore !== undefined && (body.data.overallScore < 0 || body.data.overallScore > 100)) {
    return NextResponse.json({ error: 'overallScore must be between 0 and 100' }, { status: 400 })
  }

    const assessment = await updateAssessment(id, {
      ...body.data,
      nextReviewDate: body.data.nextReviewDate ? new Date(body.data.nextReviewDate) : undefined,
      assessmentDate: undefined,
    })
    return NextResponse.json({ assessment })

})

export const DELETE = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    await deleteAssessment(id)
    return NextResponse.json({ success: true })

})
