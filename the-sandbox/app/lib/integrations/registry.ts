import { Prisma, type InstitutionIntegration } from '../../generated/prisma'
import { prisma } from '../prisma'
import {
  DEFAULT_INSTITUTION_KEY,
  INTEGRATION_KEYS,
  asMetadataRecord,
  type IntegrationCatalogEntry,
  type IntegrationHealthCheckResult,
  type IntegrationKey,
  type IntegrationMetadata,
  type IntegrationPatchInput,
  type IntegrationRuntimeDefaults,
  type IntegrationSummary,
  type IntegrationStatus,
  type ResolvedIntegration,
} from './types'

const CANONICAL_INTEGRATIONS: Record<IntegrationKey, IntegrationCatalogEntry> = {
  OUTLOOK_GRAPH_ASSISTANT: {
    key: 'OUTLOOK_GRAPH_ASSISTANT',
    name: 'Outlook / Graph Assistant',
    system: 'MICROSOFT_GRAPH',
    systemLabel: 'Microsoft Graph',
    providerLabel: 'Calendar + Email Assistant',
    capabilities: ['calendar', 'email'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: true,
  },
  CANVAS: {
    key: 'CANVAS',
    name: 'Canvas LMS',
    system: 'CANVAS',
    systemLabel: 'Canvas LMS',
    providerLabel: 'Course Sync + Grade Passback',
    capabilities: ['course-sync', 'grade-passback'],
    supportsSimulated: false,
    supportsReal: true,
    realProviderImplemented: true,
  },
  SIS: {
    key: 'SIS',
    name: 'Student Information System',
    system: 'SIS_BANNER',
    systemLabel: 'Banner / Ellucian',
    providerLabel: 'Student Record Adapter',
    capabilities: ['student-profile', 'course-history', 'academic-standing'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: false,
  },
  SHAREPOINT_ONEDRIVE_FILES: {
    key: 'SHAREPOINT_ONEDRIVE_FILES',
    name: 'SharePoint / OneDrive Files',
    system: 'SHAREPOINT_ONEDRIVE',
    systemLabel: 'SharePoint / OneDrive',
    providerLabel: 'Document Search',
    capabilities: ['document-search'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: true,
  },
  ROOM_BOOKING: {
    key: 'ROOM_BOOKING',
    name: '25Live Room Booking',
    system: 'TWENTYFIVE_LIVE',
    systemLabel: '25Live / EMS',
    providerLabel: 'Room Search + Booking',
    capabilities: ['room-search', 'room-booking'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: false,
  },
  ATTENDANCE: {
    key: 'ATTENDANCE',
    name: 'Attendance Logging',
    system: 'ATTENDANCE_SYSTEM',
    systemLabel: 'iClicker / Manual',
    providerLabel: 'Attendance Tracking',
    capabilities: ['manual-checkin', 'csv-import', 'risk-scoring'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: false,
  },
  TRAVEL_REIMBURSEMENT: {
    key: 'TRAVEL_REIMBURSEMENT',
    name: 'Travel Reimbursement',
    system: 'TRAVEL_SYSTEM',
    systemLabel: 'Concur / SAP',
    providerLabel: 'Expense Submission',
    capabilities: ['form-generation', 'expense-tracking'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: false,
  },
  DEPARTMENT_CMS: {
    key: 'DEPARTMENT_CMS',
    name: 'Department Website',
    system: 'DEPARTMENT_CMS',
    systemLabel: 'WordPress / Drupal',
    providerLabel: 'Website Change Requests',
    capabilities: ['change-request', 'content-update'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: false,
  },
  GRANTS_PORTAL: {
    key: 'GRANTS_PORTAL',
    name: 'Conference Travel Grants',
    system: 'GRANTS_SYSTEM',
    systemLabel: 'UK Research Grants',
    providerLabel: 'Grant Discovery + Application',
    capabilities: ['grant-search', 'eligibility-matching', 'application-drafting'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: false,
  },
  PAPER_REVIEW: {
    key: 'PAPER_REVIEW',
    name: 'Paper Review Workspace',
    system: 'PAPER_REVIEW_SYSTEM',
    systemLabel: 'Manuscript Review',
    providerLabel: 'AI-Assisted Review',
    capabilities: ['structural-analysis', 'comment-management', 'deadline-tracking'],
    supportsSimulated: true,
    supportsReal: true,
    realProviderImplemented: false,
  },
}

function toNullableJsonValue(value: IntegrationMetadata | null | undefined) {
  if (value === undefined) return undefined
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)
}

function getGraphEnvDefaults(): IntegrationRuntimeDefaults {
  const tenantId =
    process.env.AZURE_GRAPH_TENANT_ID ??
    process.env.AZURE_TENANT_ID ??
    process.env.MICROSOFT_TENANT_ID ??
    null
  const graphCredentialsPresent = Boolean(
    process.env.AZURE_GRAPH_CLIENT_ID &&
      process.env.AZURE_GRAPH_CLIENT_SECRET &&
      tenantId,
  )

  return {
    mode: 'SIMULATED',
    configured: true,
    status: 'HEALTHY',
    authMode: graphCredentialsPresent ? 'client-credentials' : 'simulated',
    baseUrl: process.env.AZURE_GRAPH_BASE_URL ?? 'https://graph.microsoft.com/v1.0',
    tenantHint: tenantId,
    dataOwner: 'Institutional messaging and calendar services',
    syncDirection: 'read/write',
    metadata: {
      legacyProvider: 'simulated',
      graphCredentialsPresent,
      graphScopes: ['Calendars.ReadWrite', 'Mail.Read'],
    },
  }
}

function getCanvasEnvDefaults(): IntegrationRuntimeDefaults {
  const baseUrl = process.env.CANVAS_BASE_URL ?? null
  const token = process.env.CANVAS_API_TOKEN ?? null
  const configured = Boolean(baseUrl && token)

  return {
    mode: 'REAL',
    configured,
    status: configured ? 'DEGRADED' : 'NOT_CONFIGURED',
    authMode: token ? 'api-token' : null,
    baseUrl,
    tenantHint: null,
    dataOwner: 'Learning management system team',
    syncDirection: 'import/export',
    metadata: {
      legacyEnvKeys: ['CANVAS_BASE_URL', 'CANVAS_API_TOKEN'],
      supports: ['course-sync', 'grade-passback'],
    },
  }
}

function getSISEnvDefaults(): IntegrationRuntimeDefaults {
  const baseUrl = process.env.SIS_BASE_URL ?? null
  const apiKey = process.env.SIS_API_KEY ?? null
  const useMock = process.env.SIS_MOCK === 'true' || !baseUrl || !apiKey
  const configured = useMock || Boolean(baseUrl && apiKey)

  return {
    mode: useMock ? 'SIMULATED' : 'REAL',
    configured,
    status: useMock ? 'HEALTHY' : 'BLOCKED',
    authMode: useMock ? 'simulated' : 'api-key',
    baseUrl,
    tenantHint: null,
    dataOwner: 'Registrar and student records',
    syncDirection: 'read-only',
    metadata: {
      legacyEnvKeys: ['SIS_BASE_URL', 'SIS_API_KEY', 'SIS_MOCK'],
      mockMode: useMock,
    },
  }
}

function getSharePointEnvDefaults(): IntegrationRuntimeDefaults {
  const tenantId =
    process.env.AZURE_GRAPH_TENANT_ID ??
    process.env.AZURE_TENANT_ID ??
    process.env.MICROSOFT_TENANT_ID ??
    null
  const graphCredentialsPresent = Boolean(
    process.env.AZURE_GRAPH_CLIENT_ID &&
      process.env.AZURE_GRAPH_CLIENT_SECRET &&
      tenantId,
  )

  return {
    mode: 'SIMULATED',
    configured: true,
    status: 'HEALTHY',
    authMode: graphCredentialsPresent ? 'client-credentials' : 'simulated',
    baseUrl: process.env.AZURE_GRAPH_BASE_URL ?? 'https://graph.microsoft.com/v1.0',
    tenantHint: tenantId,
    dataOwner: 'Institutional document repositories',
    syncDirection: 'read-only',
    metadata: {
      legacyProvider: 'simulated',
      graphCredentialsPresent,
      graphScopes: ['Files.Read.All', 'Sites.Read.All'],
      sharePointSiteId: process.env.AZURE_GRAPH_SHAREPOINT_SITE_ID ?? null,
    },
  }
}

function getSimulatedOnlyDefaults(label: string): IntegrationRuntimeDefaults {
  return {
    mode: 'SIMULATED',
    configured: true,
    status: 'HEALTHY',
    authMode: 'simulated',
    baseUrl: null,
    tenantHint: null,
    dataOwner: label,
    syncDirection: 'read/write',
    metadata: { provider: 'simulated' },
  }
}

function getDefaultsForKey(key: IntegrationKey): IntegrationRuntimeDefaults {
  switch (key) {
    case 'OUTLOOK_GRAPH_ASSISTANT':
      return getGraphEnvDefaults()
    case 'CANVAS':
      return getCanvasEnvDefaults()
    case 'SIS':
      return getSISEnvDefaults()
    case 'SHAREPOINT_ONEDRIVE_FILES':
      return getSharePointEnvDefaults()
    case 'ROOM_BOOKING':
      return getSimulatedOnlyDefaults('Classroom scheduling services')
    case 'ATTENDANCE':
      return getSimulatedOnlyDefaults('Faculty attendance records')
    case 'TRAVEL_REIMBURSEMENT':
      return getSimulatedOnlyDefaults('Travel and expense management')
    case 'DEPARTMENT_CMS':
      return getSimulatedOnlyDefaults('Department web administration')
    case 'GRANTS_PORTAL':
      return getSimulatedOnlyDefaults('Research grants office')
    case 'PAPER_REVIEW':
      return getSimulatedOnlyDefaults('Academic manuscript review')
  }
}

function mergeMetadata(
  defaults: IntegrationMetadata | null,
  persisted: unknown,
): IntegrationMetadata | null {
  const persistedRecord = asMetadataRecord(persisted)
  if (!defaults) return persistedRecord
  if (!persistedRecord) return defaults
  return { ...defaults, ...persistedRecord }
}

function summarizeStatus(
  configured: boolean,
  defaultStatus: IntegrationStatus,
  record: InstitutionIntegration,
): IntegrationStatus {
  if (!configured) return 'NOT_CONFIGURED'
  if (!record.lastCheckedAt) return defaultStatus
  return record.status as IntegrationStatus
}

function getDefaultStatus(
  catalog: IntegrationCatalogEntry,
  defaults: IntegrationRuntimeDefaults,
  mode: InstitutionIntegration['mode'],
  configured: boolean,
): IntegrationStatus {
  if (!configured) return 'NOT_CONFIGURED'
  if (mode === 'SIMULATED') {
    return catalog.supportsSimulated ? 'HEALTHY' : 'BLOCKED'
  }
  if (!catalog.realProviderImplemented) {
    return 'BLOCKED'
  }
  return defaults.status
}

function applyEffectiveValues(record: InstitutionIntegration): ResolvedIntegration {
  const catalog = CANONICAL_INTEGRATIONS[record.key as IntegrationKey]
  const defaults = getDefaultsForKey(record.key as IntegrationKey)
  const effectiveAuthMode = record.authMode ?? defaults.authMode
  const effectiveBaseUrl = record.baseUrl ?? defaults.baseUrl
  const effectiveTenantHint = record.tenantHint ?? defaults.tenantHint
  const effectiveDataOwner = record.dataOwner ?? defaults.dataOwner
  const effectiveSyncDirection = record.syncDirection ?? defaults.syncDirection
  const effectiveMetadata = mergeMetadata(defaults.metadata, record.metadata)
  const hasRealAuth =
    Boolean(effectiveAuthMode) && effectiveAuthMode !== 'simulated'
  const effectiveConfigured =
    record.mode === 'SIMULATED'
      ? catalog.supportsSimulated
      : catalog.key === 'CANVAS' || catalog.key === 'SIS'
        ? Boolean(effectiveBaseUrl && hasRealAuth)
        : hasRealAuth
  const defaultStatus = getDefaultStatus(
    catalog,
    defaults,
    record.mode,
    effectiveConfigured,
  )

  return {
    record,
    catalog,
    effectiveMode: record.mode as ResolvedIntegration['effectiveMode'],
    effectiveStatus: summarizeStatus(
      effectiveConfigured,
      defaultStatus,
      record,
    ),
    effectiveConfigured,
    effectiveAuthMode,
    effectiveBaseUrl,
    effectiveTenantHint,
    effectiveDataOwner,
    effectiveSyncDirection,
    effectiveMetadata,
  }
}

function buildRuntimeIntegrationSummary(
  key: IntegrationKey,
  institutionKey = DEFAULT_INSTITUTION_KEY,
): IntegrationSummary {
  const catalog = CANONICAL_INTEGRATIONS[key]
  const defaults = getDefaultsForKey(key)
  const hasRealAuth =
    Boolean(defaults.authMode) && defaults.authMode !== 'simulated'
  const configured =
    defaults.mode === 'SIMULATED'
      ? catalog.supportsSimulated
      : catalog.key === 'CANVAS' || catalog.key === 'SIS'
        ? Boolean(defaults.baseUrl && hasRealAuth)
        : hasRealAuth
  const status = getDefaultStatus(
    catalog,
    defaults,
    defaults.mode,
    configured,
  )

  return {
    id: `runtime-${institutionKey}-${key.toLowerCase()}`,
    institutionKey,
    key,
    name: catalog.name,
    system: catalog.system,
    systemLabel: catalog.systemLabel,
    providerLabel: catalog.providerLabel,
    capabilities: catalog.capabilities,
    mode: defaults.mode,
    status,
    configured,
    authMode: defaults.authMode,
    baseUrl: defaults.baseUrl,
    tenantHint: defaults.tenantHint,
    dataOwner: defaults.dataOwner,
    syncDirection: defaults.syncDirection,
    metadata: defaults.metadata,
    lastCheckedAt: null,
    lastHealthyAt: null,
    lastFailureAt: null,
    lastSyncAt: null,
    lastError: null,
  }
}

async function syncPersistedRuntime(record: InstitutionIntegration) {
  const resolved = applyEffectiveValues(record)
  const updates: { configured?: boolean; status?: IntegrationStatus } = {}

  if (record.configured !== resolved.effectiveConfigured) {
    updates.configured = resolved.effectiveConfigured
  }

  if (
    !record.lastCheckedAt &&
    record.status !== resolved.effectiveStatus
  ) {
    updates.status = resolved.effectiveStatus
  }

  if (Object.keys(updates).length === 0) {
    return resolved
  }

  const updated = await prisma.institutionIntegration.update({
    where: { id: record.id },
    data: updates,
  })

  return applyEffectiveValues(updated)
}

async function ensureSingleIntegration(
  key: IntegrationKey,
  institutionKey = DEFAULT_INSTITUTION_KEY,
) {
  const catalog = CANONICAL_INTEGRATIONS[key]
  const defaults = getDefaultsForKey(key)

  const record = await prisma.institutionIntegration.upsert({
    where: {
      institutionKey_key: {
        institutionKey,
        key,
      },
    },
    update: {},
    create: {
      institutionKey,
      key,
      system: catalog.system,
      mode: defaults.mode,
      status: defaults.status,
      configured: defaults.configured,
      authMode: defaults.authMode,
      baseUrl: defaults.baseUrl,
      tenantHint: defaults.tenantHint,
      dataOwner: defaults.dataOwner,
      syncDirection: defaults.syncDirection,
      metadata: toNullableJsonValue(defaults.metadata),
    },
  })

  return syncPersistedRuntime(record)
}

export async function listInstitutionIntegrations(
  institutionKey = DEFAULT_INSTITUTION_KEY,
) {
  const integrations = await Promise.all(
    Object.keys(CANONICAL_INTEGRATIONS).map((key) =>
      ensureSingleIntegration(key as IntegrationKey, institutionKey),
    ),
  )

  return integrations.map(serializeIntegration)
}

export function listRuntimeInstitutionIntegrations(
  institutionKey = DEFAULT_INSTITUTION_KEY,
) {
  return INTEGRATION_KEYS.map((key) =>
    buildRuntimeIntegrationSummary(key, institutionKey),
  )
}

export async function getInstitutionIntegrationById(id: string) {
  const record = await prisma.institutionIntegration.findUnique({ where: { id } })
  if (!record) return null
  return syncPersistedRuntime(record)
}

export async function getInstitutionIntegrationByKey(
  key: IntegrationKey,
  institutionKey = DEFAULT_INSTITUTION_KEY,
) {
  return ensureSingleIntegration(key, institutionKey)
}

export async function updateInstitutionIntegration(
  id: string,
  input: IntegrationPatchInput,
) {
  const updated = await prisma.institutionIntegration.update({
    where: { id },
    data: {
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.authMode !== undefined ? { authMode: input.authMode } : {}),
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
      ...(input.tenantHint !== undefined ? { tenantHint: input.tenantHint } : {}),
      ...(input.dataOwner !== undefined ? { dataOwner: input.dataOwner } : {}),
      ...(input.syncDirection !== undefined
        ? { syncDirection: input.syncDirection }
        : {}),
      ...(input.metadata !== undefined
        ? { metadata: toNullableJsonValue(input.metadata) }
        : {}),
      ...(input.lastError !== undefined ? { lastError: input.lastError } : {}),
      ...(input.lastSyncAt !== undefined ? { lastSyncAt: input.lastSyncAt } : {}),
    },
  })

  return syncPersistedRuntime(updated)
}

export async function persistIntegrationHealthResult(
  id: string,
  result: IntegrationHealthCheckResult,
) {
  const record = await prisma.institutionIntegration.findUnique({ where: { id } })
  if (!record) {
    throw new Error('Integration not found')
  }

  const updated = await prisma.institutionIntegration.update({
    where: { id },
    data: {
      configured: result.configured,
      status: result.status,
      lastCheckedAt: new Date(result.checkedAt),
      lastHealthyAt: result.lastHealthyAt ? new Date(result.lastHealthyAt) : record.lastHealthyAt,
      lastFailureAt: result.lastFailureAt ? new Date(result.lastFailureAt) : record.lastFailureAt,
      lastError: result.lastError,
    },
  })

  return syncPersistedRuntime(updated)
}

export function getIntegrationCatalogEntry(key: IntegrationKey) {
  return CANONICAL_INTEGRATIONS[key]
}

export function serializeIntegration(integration: ResolvedIntegration): IntegrationSummary {
  return {
    id: integration.record.id,
    institutionKey: integration.record.institutionKey,
    key: integration.record.key as IntegrationKey,
    name: integration.catalog.name,
    system: integration.catalog.system,
    systemLabel: integration.catalog.systemLabel,
    providerLabel: integration.catalog.providerLabel,
    capabilities: integration.catalog.capabilities,
    mode: integration.effectiveMode,
    status: integration.effectiveStatus,
    configured: integration.effectiveConfigured,
    authMode: integration.effectiveAuthMode,
    baseUrl: integration.effectiveBaseUrl,
    tenantHint: integration.effectiveTenantHint,
    dataOwner: integration.effectiveDataOwner,
    syncDirection: integration.effectiveSyncDirection,
    metadata: integration.effectiveMetadata,
    lastCheckedAt: integration.record.lastCheckedAt?.toISOString() ?? null,
    lastHealthyAt: integration.record.lastHealthyAt?.toISOString() ?? null,
    lastFailureAt: integration.record.lastFailureAt?.toISOString() ?? null,
    lastSyncAt: integration.record.lastSyncAt?.toISOString() ?? null,
    lastError: integration.record.lastError,
  }
}
