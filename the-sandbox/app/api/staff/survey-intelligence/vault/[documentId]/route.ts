import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import {
  getVaultDocument,
  deleteVaultDocument,
} from '../../../../../lib/staff/survey-vault-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { documentId } = await params

  const document = await getVaultDocument(documentId)
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json(document, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { documentId } = await params

  const document = await getVaultDocument(documentId)
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  await deleteVaultDocument(documentId)
  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
