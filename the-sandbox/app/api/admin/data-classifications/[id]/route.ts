import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updateClassification, deleteClassification } from '../../../../lib/data-classification-service'

type RouteContext = { params: Promise<{ id: string }> }

export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await context.params
  const parsed = await parseRequestBody<{
    classificationLevel?: string
    sensitivityTags?: string[]
    ferpaProtected?: boolean
    piiContained?: boolean
    retentionCategory?: string | null
    owner?: string | null
    notes?: string | null
  }>(request)
  if ('error' in parsed) return parsed.error

    const updated = await updateClassification(id, parsed.data)
    return NextResponse.json(updated)

})

export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await context.params

    await deleteClassification(id)
    return NextResponse.json({ ok: true })

})
