import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'

// GET — list all consent versions grouped by type, ordered by effectiveAt desc
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const versions = await prisma.consentVersion.findMany({
    orderBy: { effectiveAt: 'desc' },
  })

  // Group by type
  const grouped: Record<string, typeof versions> = {}
  for (const v of versions) {
    if (!grouped[v.type]) grouped[v.type] = []
    grouped[v.type].push(v)
  }

  return NextResponse.json({ versions: grouped }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })

})

// POST — create a new consent version and bulk-reset the corresponding User timestamp field
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const parsed = await parseRequestBody<{ type?: string; version?: string; content?: string; effectiveAt?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { type, version, content, effectiveAt } = body as { type?: string; version?: string; content?: string; effectiveAt?: string }

  if (!type || !['tos', 'consent', 'ferpa'].includes(type)) {
    return NextResponse.json({ error: 'type must be one of: tos, consent, ferpa' }, { status: 400 })
  }
  if (!version || typeof version !== 'string' || version.trim().length === 0) {
    return NextResponse.json({ error: 'version is required' }, { status: 400 })
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const effectiveDate = effectiveAt ? new Date(effectiveAt) : new Date()

  // Create the new consent version
  const created = await prisma.consentVersion.create({
    data: {
      type,
      version: version.trim(),
      content: content.trim(),
      effectiveAt: effectiveDate,
    },
  })

  // Bulk-reset the corresponding User timestamp field
  const fieldMap: Record<string, string> = {
    tos: 'tosAcceptedAt',
    consent: 'dataConsentAt',
    ferpa: 'ferpaAckAt',
  }
  const field = fieldMap[type]

  const resetResult = await prisma.user.updateMany({
    where: { [field]: { not: null } },
    data: { [field]: null },
  })

  const materialResetResult =
    type === 'consent'
      ? await prisma.courseMaterial.updateMany({
          where: {
            provenanceType: 'user-uploaded',
            aiOptInStatus: { not: 'blocked' },
          },
          data: { aiOptInStatus: 'consent_required' },
        })
      : { count: 0 }

  // Log to AdminAuditLog
  await prisma.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: `consent-version-created`,
      targetType: 'ConsentVersion',
      targetLabel: `${type} v${version.trim()}`,
      metadata: {
        consentVersionId: created.id,
        type,
        version: version.trim(),
        usersReset: resetResult.count,
        courseMaterialsReset: materialResetResult.count,
      },
    },
  })

  return NextResponse.json({
    ok: true,
    consentVersion: created,
    usersReset: resetResult.count,
    courseMaterialsReset: materialResetResult.count,
  })

})
