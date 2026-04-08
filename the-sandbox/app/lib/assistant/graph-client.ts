import { prisma } from '../prisma'
import {
  getInstitutionIntegrationByKey,
  updateInstitutionIntegration,
} from '../integrations/registry'

const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default'
const TOKEN_REFRESH_BUFFER_MS = 60_000

type CachedToken = {
  accessToken: string
  expiresAt: number
  cacheKey: string
}

type GraphTokenResponse = {
  access_token: string
  expires_in: number
}

let cachedToken: CachedToken | null = null

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function getGraphRuntimeDiagnostics() {
  const tenantId =
    process.env.AZURE_GRAPH_TENANT_ID ??
    process.env.AZURE_TENANT_ID ??
    process.env.MICROSOFT_TENANT_ID ??
    null
  const clientId = process.env.AZURE_GRAPH_CLIENT_ID ?? null
  const clientSecret = process.env.AZURE_GRAPH_CLIENT_SECRET ?? null

  return {
    baseUrl: trimTrailingSlashes(
      process.env.AZURE_GRAPH_BASE_URL ?? DEFAULT_GRAPH_BASE_URL,
    ),
    tenantId,
    clientId,
    hasClientSecret: isNonEmptyString(clientSecret),
    sharePointSiteId: process.env.AZURE_GRAPH_SHAREPOINT_SITE_ID ?? null,
    healthcheckUserEmail: process.env.AZURE_GRAPH_HEALTHCHECK_USER_EMAIL ?? null,
  }
}

function getGraphRuntimeConfig() {
  const diagnostics = getGraphRuntimeDiagnostics()

  if (!isNonEmptyString(diagnostics.tenantId)) {
    throw new Error('AZURE_GRAPH_TENANT_ID is not configured')
  }

  if (!isNonEmptyString(diagnostics.clientId)) {
    throw new Error('AZURE_GRAPH_CLIENT_ID is not configured')
  }

  if (!diagnostics.hasClientSecret) {
    throw new Error('AZURE_GRAPH_CLIENT_SECRET is not configured')
  }

  return {
    baseUrl: diagnostics.baseUrl,
    tenantId: diagnostics.tenantId,
    clientId: diagnostics.clientId,
    clientSecret: process.env.AZURE_GRAPH_CLIENT_SECRET!,
    sharePointSiteId: diagnostics.sharePointSiteId,
    healthcheckUserEmail: diagnostics.healthcheckUserEmail,
  }
}

function buildGraphError(status: number, statusText: string, payload: string) {
  try {
    const parsed = JSON.parse(payload) as {
      error?: { message?: string }
      error_description?: string
    }
    const message =
      parsed.error?.message ??
      parsed.error_description ??
      payload

    return new Error(`Microsoft Graph ${status} ${statusText}: ${message}`)
  } catch {
    return new Error(`Microsoft Graph ${status} ${statusText}: ${payload}`)
  }
}

export async function getGraphAccessToken() {
  const config = getGraphRuntimeConfig()
  const cacheKey = `${config.tenantId}:${config.clientId}:${config.baseUrl}`

  if (
    cachedToken &&
    cachedToken.cacheKey === cacheKey &&
    cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()
  ) {
    return cachedToken.accessToken
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: GRAPH_SCOPE,
        grant_type: 'client_credentials',
      }),
    },
  )

  const payload = await response.text()
  if (!response.ok) {
    throw buildGraphError(response.status, response.statusText, payload)
  }

  const token = JSON.parse(payload) as GraphTokenResponse
  cachedToken = {
    accessToken: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    cacheKey,
  }

  return token.access_token
}

export async function graphJsonRequest<T>(
  path: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
  },
): Promise<T> {
  const config = getGraphRuntimeConfig()
  const accessToken = await getGraphAccessToken()
  const url = path.startsWith('http')
    ? path
    : `${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`

  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
    body:
      init?.body !== undefined
        ? JSON.stringify(init.body)
        : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.text()
  if (!response.ok) {
    throw buildGraphError(response.status, response.statusText, payload)
  }

  return JSON.parse(payload) as T
}

export async function getGraphPrincipalForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  if (!user?.email) {
    throw new Error('The current user does not have an email address for Microsoft Graph')
  }

  return user.email
}

export async function recordGraphSyncSuccess(
  key: 'OUTLOOK_GRAPH_ASSISTANT' | 'SHAREPOINT_ONEDRIVE_FILES',
) {
  try {
    const resolved = await getInstitutionIntegrationByKey(key)
    await updateInstitutionIntegration(resolved.record.id, {
      lastSyncAt: new Date(),
      lastError: null,
    })
  } catch {
    // Best effort only; provider operations should not fail because audit metadata could not be updated.
  }
}

export function buildGraphUserPath(userPrincipal: string) {
  return `/users/${encodeURIComponent(userPrincipal)}`
}

export function toGraphDateTime(date: Date) {
  return date.toISOString().replace(/\.000Z$/, '')
}

export function fromGraphDateTime(input: {
  dateTime?: string | null
  timeZone?: string | null
}) {
  const raw = input.dateTime ?? null
  if (!raw) return new Date(0)

  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw)
  }

  if ((input.timeZone ?? '').toUpperCase() === 'UTC') {
    return new Date(`${raw}Z`)
  }

  return new Date(raw)
}

export function escapeGraphFilterValue(value: string) {
  return value.replace(/'/g, "''")
}
