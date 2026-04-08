import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getCase, updateCase, deleteCase } from '../../../../lib/virtual-clinic/case-service'
import type { ClinicalCaseInput } from '../../../../lib/virtual-clinic/types'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { caseId } = await params
  const clinicalCase = await getCase(caseId)
  if (!clinicalCase) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  return NextResponse.json(clinicalCase, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { caseId } = await params
  const parsed = await parseRequestBody<Partial<ClinicalCaseInput>>(req)
  if ('error' in parsed) return parsed.error

  const updated = await updateCase(caseId, parsed.data, user.id)
  return NextResponse.json(updated, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { caseId } = await params
  await deleteCase(caseId, user.id)
  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
