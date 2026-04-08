import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listDPAs, createDPA } from '../../../lib/dpa-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const dpas = await listDPAs()
  return NextResponse.json({ dpas }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    vendorName?: string
    purpose?: string
    dataCategories?: string[]
    signedAt?: string
    expiresAt?: string
    documentUrl?: string
  }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { vendorName, purpose, dataCategories, signedAt, expiresAt, documentUrl } = body

  if (!vendorName || !purpose || !signedAt || !expiresAt) {
    return NextResponse.json({ error: 'vendorName, purpose, signedAt, and expiresAt are required' }, { status: 400 })
  }

  const dpa = await createDPA({
    vendorName,
    purpose,
    dataCategories: dataCategories ?? [],
    signedAt: new Date(signedAt),
    expiresAt: new Date(expiresAt),
    documentUrl,
  })

  return NextResponse.json({ dpa }, { status: 201 })

})
