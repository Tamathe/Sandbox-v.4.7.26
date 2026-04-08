import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import {
  getDataSharingAgreement,
  updateDataSharingAgreement,
  deleteDataSharingAgreement,
} from '../../../../lib/data-sharing-service'

export const GET = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const agreement = await getDataSharingAgreement(id)
  if (!agreement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ agreement }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })

})

export const PATCH = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const parsed = await parseRequestBody<Record<string, unknown>>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const data: Record<string, unknown> = { ...body }
  if (typeof data.signedAt === 'string') data.signedAt = new Date(data.signedAt as string)
  if (typeof data.expiresAt === 'string') data.expiresAt = new Date(data.expiresAt as string)

  try {
    const agreement = await updateDataSharingAgreement(id, data as Parameters<typeof updateDataSharingAgreement>[1])
    return NextResponse.json({ agreement }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

})

export const DELETE = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    await deleteDataSharingAgreement(id)
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

})
