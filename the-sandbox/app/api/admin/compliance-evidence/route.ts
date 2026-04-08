import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { createEvidence, listEvidence } from '../../../lib/compliance-evidence-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const url = new URL(request.url)
    const requirementId = url.searchParams.get('requirementId') || undefined
    const evidenceType = url.searchParams.get('evidenceType') || undefined
    const evidence = await listEvidence({ requirementId, evidenceType })
    return NextResponse.json({ evidence }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    requirementId?: string
    evidenceType: string
    title: string
    description?: string
    content?: string
    validUntil?: string
    tags?: string[]
  }>(request)
  if ('error' in body) return body.error

  const { title, evidenceType } = body.data
  if (!title || !evidenceType) {
    return NextResponse.json({ error: 'title and evidenceType are required' }, { status: 400 })
  }

  const validTypes = ['automated', 'manual', 'document', 'screenshot', 'log-extract']
  if (!validTypes.includes(evidenceType)) {
    return NextResponse.json({ error: `evidenceType must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

    const evidence = await createEvidence({
      requirementId: body.data.requirementId,
      evidenceType,
      title,
      description: body.data.description,
      content: body.data.content,
      collectedBy: auth.user.id,
      validUntil: body.data.validUntil ? new Date(body.data.validUntil) : undefined,
      tags: body.data.tags || [],
    })
    return NextResponse.json({ evidence }, { status: 201 })

})
