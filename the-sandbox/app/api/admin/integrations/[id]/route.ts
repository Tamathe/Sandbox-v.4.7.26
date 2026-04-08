import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'
import {
  getInstitutionIntegrationById,
  serializeIntegration,
  updateInstitutionIntegration,
} from '../../../../lib/integrations/registry'
import {
  asMetadataRecord,
  isIntegrationMode,
  isIntegrationStatus,
  type IntegrationPatchInput,
} from '../../../../lib/integrations/types'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const GET = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const integration = await getInstitutionIntegrationById(id)

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  return NextResponse.json({ integration: serializeIntegration(integration) }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const existing = await getInstitutionIntegrationById(id)
  if (!existing) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const parsed = await parseRequestBody<Record<string, unknown>>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  const update: IntegrationPatchInput = {}

  if (body.mode !== undefined) {
    if (typeof body.mode !== 'string' || !isIntegrationMode(body.mode)) {
      return NextResponse.json({ error: 'Invalid integration mode' }, { status: 400 })
    }
    update.mode = body.mode
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !isIntegrationStatus(body.status)
    ) {
      return NextResponse.json(
        { error: 'Invalid integration status' },
        { status: 400 },
      )
    }
    update.status = body.status
  }

  const authMode = normalizeOptionalString(body.authMode)
  if (authMode !== undefined) update.authMode = authMode

  const baseUrl = normalizeOptionalString(body.baseUrl)
  if (baseUrl !== undefined) update.baseUrl = baseUrl

  const tenantHint = normalizeOptionalString(body.tenantHint)
  if (tenantHint !== undefined) update.tenantHint = tenantHint

  const dataOwner = normalizeOptionalString(body.dataOwner)
  if (dataOwner !== undefined) update.dataOwner = dataOwner

  const syncDirection = normalizeOptionalString(body.syncDirection)
  if (syncDirection !== undefined) update.syncDirection = syncDirection

  if (body.metadata !== undefined) {
    if (body.metadata === null) {
      update.metadata = null
    } else {
      const metadata = asMetadataRecord(body.metadata)
      if (!metadata) {
        return NextResponse.json(
          { error: 'metadata must be an object or null' },
          { status: 400 },
        )
      }
      update.metadata = metadata
    }
  }

  const lastError = normalizeOptionalString(body.lastError)
  if (lastError !== undefined) update.lastError = lastError

  if (body.lastSyncAt !== undefined) {
    if (body.lastSyncAt === null || body.lastSyncAt === '') {
      update.lastSyncAt = null
    } else if (typeof body.lastSyncAt === 'string') {
      const parsed = new Date(body.lastSyncAt)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'lastSyncAt must be a valid ISO date string' },
          { status: 400 },
        )
      }
      update.lastSyncAt = parsed
    } else {
      return NextResponse.json(
        { error: 'lastSyncAt must be a string or null' },
        { status: 400 },
      )
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: 'No valid integration fields supplied' },
      { status: 400 },
    )
  }

  const integration = await updateInstitutionIntegration(id, update)

  await recordAdminAudit({
    adminId: auth.user.id,
    action: 'integration_updated',
    targetType: 'INTEGRATION',
    targetId: integration.record.id,
    targetLabel: integration.catalog.name,
    metadata: {
      mode: integration.record.mode,
      status: integration.record.status,
    },
  })

  return NextResponse.json({ integration: serializeIntegration(integration) }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
