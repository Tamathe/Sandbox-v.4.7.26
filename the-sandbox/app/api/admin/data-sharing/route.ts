import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listDataSharingAgreements, createDataSharingAgreement } from '../../../lib/data-sharing-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const agreements = await listDataSharingAgreements()
  return NextResponse.json({ agreements }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    partnerInstitution?: string
    dataScope?: string
    legalBasis?: string
    signedAt?: string
    expiresAt?: string
    contactEmail?: string
  }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { partnerInstitution, dataScope, legalBasis, signedAt, expiresAt, contactEmail } = body

  if (!partnerInstitution || !dataScope || !legalBasis || !signedAt || !expiresAt) {
    return NextResponse.json(
      { error: 'partnerInstitution, dataScope, legalBasis, signedAt, and expiresAt are required' },
      { status: 400 },
    )
  }

  const agreement = await createDataSharingAgreement({
    partnerInstitution,
    dataScope,
    legalBasis,
    signedAt: new Date(signedAt),
    expiresAt: new Date(expiresAt),
    contactEmail,
  })

  return NextResponse.json({ agreement }, { status: 201 })

})
