import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, invalidateUserCache, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { syncUserUploadedMaterialGovernanceForUser } from '../../../lib/content-permissions'
import { withErrorHandling } from '../../../lib/api-utils'

const VALID_ACTIONS = ['accept-tos', 'accept-consent', 'accept-ferpa'] as const
type ComplianceAction = (typeof VALID_ACTIONS)[number]

const ACTION_FIELD_MAP: Record<ComplianceAction, string> = {
  'accept-tos': 'tosAcceptedAt',
  'accept-consent': 'dataConsentAt',
  'accept-ferpa': 'ferpaAckAt',
}

const ACTION_VERSION_FIELD_MAP: Record<ComplianceAction, string> = {
  'accept-tos': 'acceptedTosVersion',
  'accept-consent': 'acceptedConsentVersion',
  'accept-ferpa': 'acceptedFerpaVersion',
}

const ACTION_TYPE_MAP: Record<ComplianceAction, string> = {
  'accept-tos': 'tos',
  'accept-consent': 'consent',
  'accept-ferpa': 'ferpa',
}

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const parsed = await parseRequestBody<{ action?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { action } = body
  if (!action || !VALID_ACTIONS.includes(action as ComplianceAction)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    )
  }

  if (action === 'accept-ferpa' && user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'FERPA acknowledgement is only available to educators and admins' },
      { status: 403 },
    )
  }

  const field = ACTION_FIELD_MAP[action as ComplianceAction]
  const versionField = ACTION_VERSION_FIELD_MAP[action as ComplianceAction]
  const consentType = ACTION_TYPE_MAP[action as ComplianceAction]

  const now = new Date()

  // Look up the latest ConsentVersion for this type
  const latestVersion = await prisma.consentVersion.findFirst({
    where: { type: consentType },
    orderBy: { effectiveAt: 'desc' },
    select: { version: true },
  })

  const updateData: Record<string, unknown> = { [field]: now }
  if (latestVersion) {
    updateData[versionField] = latestVersion.version
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  })

  // Log to compliance audit trail
  await prisma.complianceAuditLog.create({
    data: {
      userId: user.id,
      action: action as string,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    },
  })

  invalidateUserCache(user.email)

  if (action === 'accept-consent') {
    syncUserUploadedMaterialGovernanceForUser(user.id).catch((error) => {
      console.error('Failed to refresh uploaded material governance after consent update:', error)
    })
  }

  return NextResponse.json({ ok: true, timestamp: now.toISOString(), version: latestVersion?.version ?? null })
})
