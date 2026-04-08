import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { generateReportFromTemplate } from '../../../../lib/compliance-template-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{ templateId: string }>(request)
  if ('error' in body) return body.error

  const { templateId } = body.data
  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
  }

    const documentId = await generateReportFromTemplate(templateId, auth.user.id)
    return NextResponse.json({ documentId })

})
