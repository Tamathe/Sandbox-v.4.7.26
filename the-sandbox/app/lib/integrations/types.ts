import type { InstitutionIntegration } from '../../generated/prisma'

export const DEFAULT_INSTITUTION_KEY = 'default'

export const INTEGRATION_KEYS = [
  'OUTLOOK_GRAPH_ASSISTANT',
  'CANVAS',
  'SIS',
  'SHAREPOINT_ONEDRIVE_FILES',
  'ROOM_BOOKING',
  'ATTENDANCE',
  'TRAVEL_REIMBURSEMENT',
  'DEPARTMENT_CMS',
  'GRANTS_PORTAL',
  'PAPER_REVIEW',
] as const

export const INTEGRATION_SYSTEMS = [
  'MICROSOFT_GRAPH',
  'CANVAS',
  'SIS_BANNER',
  'SHAREPOINT_ONEDRIVE',
  'TWENTYFIVE_LIVE',
  'ATTENDANCE_SYSTEM',
  'TRAVEL_SYSTEM',
  'DEPARTMENT_CMS',
  'GRANTS_SYSTEM',
  'PAPER_REVIEW_SYSTEM',
] as const

export const INTEGRATION_MODES = ['SIMULATED', 'REAL'] as const

export const INTEGRATION_STATUSES = [
  'HEALTHY',
  'DEGRADED',
  'BLOCKED',
  'NOT_CONFIGURED',
] as const

export type IntegrationKey = (typeof INTEGRATION_KEYS)[number]
export type IntegrationSystem = (typeof INTEGRATION_SYSTEMS)[number]
export type IntegrationMode = (typeof INTEGRATION_MODES)[number]
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number]

export type IntegrationMetadata = Record<string, unknown>

export interface IntegrationCatalogEntry {
  key: IntegrationKey
  name: string
  system: IntegrationSystem
  systemLabel: string
  providerLabel: string
  capabilities: string[]
  supportsSimulated: boolean
  supportsReal: boolean
  realProviderImplemented: boolean
}

export interface IntegrationRuntimeDefaults {
  mode: IntegrationMode
  configured: boolean
  status: IntegrationStatus
  authMode: string | null
  baseUrl: string | null
  tenantHint: string | null
  dataOwner: string | null
  syncDirection: string | null
  metadata: IntegrationMetadata | null
}

export interface ResolvedIntegration {
  record: InstitutionIntegration
  catalog: IntegrationCatalogEntry
  effectiveMode: IntegrationMode
  effectiveStatus: IntegrationStatus
  effectiveConfigured: boolean
  effectiveAuthMode: string | null
  effectiveBaseUrl: string | null
  effectiveTenantHint: string | null
  effectiveDataOwner: string | null
  effectiveSyncDirection: string | null
  effectiveMetadata: IntegrationMetadata | null
}

export interface IntegrationSummary {
  id: string
  institutionKey: string
  key: IntegrationKey
  name: string
  system: IntegrationSystem
  systemLabel: string
  providerLabel: string
  capabilities: string[]
  mode: IntegrationMode
  status: IntegrationStatus
  configured: boolean
  authMode: string | null
  baseUrl: string | null
  tenantHint: string | null
  dataOwner: string | null
  syncDirection: string | null
  metadata: IntegrationMetadata | null
  lastCheckedAt: string | null
  lastHealthyAt: string | null
  lastFailureAt: string | null
  lastSyncAt: string | null
  lastError: string | null
}

export interface IntegrationPatchInput {
  mode?: IntegrationMode
  status?: IntegrationStatus
  authMode?: string | null
  baseUrl?: string | null
  tenantHint?: string | null
  dataOwner?: string | null
  syncDirection?: string | null
  metadata?: IntegrationMetadata | null
  lastError?: string | null
  lastSyncAt?: Date | null
}

export interface IntegrationProviderDescriptor {
  key: IntegrationKey
  label: string
  system: IntegrationSystem
  mode: IntegrationMode
  status: IntegrationStatus
  configured: boolean
  available: boolean
  message: string | null
}

export interface IntegrationHealthCheckOptions {
  simulate?: boolean
  persist?: boolean
}

export interface IntegrationHealthCheckResult {
  key: IntegrationKey
  status: IntegrationStatus
  configured: boolean
  simulated: boolean
  checkedAt: string
  lastHealthyAt: string | null
  lastFailureAt: string | null
  lastError: string | null
  message: string
  details: IntegrationMetadata | null
}

export function isIntegrationKey(value: string): value is IntegrationKey {
  return INTEGRATION_KEYS.includes(value as IntegrationKey)
}

export function isIntegrationMode(value: string): value is IntegrationMode {
  return INTEGRATION_MODES.includes(value as IntegrationMode)
}

export function isIntegrationStatus(value: string): value is IntegrationStatus {
  return INTEGRATION_STATUSES.includes(value as IntegrationStatus)
}

export function asMetadataRecord(value: unknown): IntegrationMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as IntegrationMetadata
}
