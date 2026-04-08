import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {
    assistantCalendarEvent: {
      count: vi.fn(),
    },
    assistantEmail: {
      count: vi.fn(),
    },
    courseMaterial: {
      count: vi.fn(),
    },
    serviceDocument: {
      count: vi.fn(),
    },
  },
}))

vi.mock('../assistant/graph-client', () => ({
  buildGraphUserPath: vi.fn(
    (userPrincipal: string) => `/users/${encodeURIComponent(userPrincipal)}`,
  ),
  getGraphAccessToken: vi.fn(),
  getGraphRuntimeDiagnostics: vi.fn(),
  graphJsonRequest: vi.fn(),
}))

vi.mock('../integrations/registry', () => ({
  getInstitutionIntegrationById: vi.fn(),
  getIntegrationCatalogEntry: vi.fn((key: string) => ({
    key,
    name: key,
  })),
  persistIntegrationHealthResult: vi.fn(),
  serializeIntegration: vi.fn((value: unknown) => value),
}))

import {
  getGraphAccessToken,
  getGraphRuntimeDiagnostics,
  graphJsonRequest,
} from '../assistant/graph-client'
import { runIntegrationHealthCheckById } from '../integrations/health'
import {
  getInstitutionIntegrationById,
  persistIntegrationHealthResult,
  serializeIntegration,
} from '../integrations/registry'

const mockGetGraphAccessToken = vi.mocked(getGraphAccessToken)
const mockGetGraphRuntimeDiagnostics = vi.mocked(getGraphRuntimeDiagnostics)
const mockGraphJsonRequest = vi.mocked(graphJsonRequest)
const mockGetInstitutionIntegrationById = vi.mocked(getInstitutionIntegrationById)
const mockPersistIntegrationHealthResult = vi.mocked(
  persistIntegrationHealthResult,
)
const mockSerializeIntegration = vi.mocked(serializeIntegration)

function buildResolvedIntegration(
  key: 'OUTLOOK_GRAPH_ASSISTANT' | 'SHAREPOINT_ONEDRIVE_FILES',
) {
  return {
    record: {
      id: `${key}-1`,
      institutionKey: 'default',
      key,
      mode: 'REAL',
      status: 'DEGRADED',
      configured: true,
      authMode: 'client-credentials',
      baseUrl: 'https://graph.microsoft.com/v1.0',
      tenantHint: 'tenant-1',
      dataOwner: 'Institutional systems',
      syncDirection: key === 'OUTLOOK_GRAPH_ASSISTANT' ? 'read/write' : 'read-only',
      metadata: null,
      lastCheckedAt: null,
      lastHealthyAt: null,
      lastFailureAt: null,
      lastError: null,
    },
    catalog: {
      key,
      name:
        key === 'OUTLOOK_GRAPH_ASSISTANT'
          ? 'Outlook / Graph Assistant'
          : 'SharePoint / OneDrive Files',
    },
    effectiveMode: 'REAL',
    effectiveStatus: 'DEGRADED',
    effectiveConfigured: true,
    effectiveAuthMode: 'client-credentials',
    effectiveBaseUrl: 'https://graph.microsoft.com/v1.0',
    effectiveTenantHint: 'tenant-1',
    effectiveDataOwner: 'Institutional systems',
    effectiveSyncDirection:
      key === 'OUTLOOK_GRAPH_ASSISTANT' ? 'read/write' : 'read-only',
    effectiveMetadata: null,
  } as never
}

describe('integration health checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGraphAccessToken.mockResolvedValue('graph-token')
    mockSerializeIntegration.mockImplementation((value) => value as never)
    mockPersistIntegrationHealthResult.mockImplementation(
      async (_id, result) =>
        ({
          id: `${result.key}-persisted`,
          key: result.key,
          status: result.status,
          configured: result.configured,
        }) as never,
    )
  })

  it('runs a real Microsoft Graph assistant probe and persists a healthy result', async () => {
    mockGetInstitutionIntegrationById.mockResolvedValue(
      buildResolvedIntegration('OUTLOOK_GRAPH_ASSISTANT'),
    )
    mockGetGraphRuntimeDiagnostics.mockReturnValue({
      baseUrl: 'https://graph.microsoft.com/v1.0',
      tenantId: 'tenant-1',
      clientId: 'client-1',
      hasClientSecret: true,
      sharePointSiteId: null,
      healthcheckUserEmail: 'educator@uky.edu',
    })
    mockGraphJsonRequest.mockResolvedValue({} as never)

    const result = await runIntegrationHealthCheckById('OUTLOOK_GRAPH_ASSISTANT-1')

    expect(mockGetGraphAccessToken).toHaveBeenCalledTimes(1)
    expect(mockGraphJsonRequest).toHaveBeenCalledTimes(2)
    expect(mockGraphJsonRequest).toHaveBeenNthCalledWith(
      1,
      '/users/educator%40uky.edu/mailFolders/Inbox/messages?$top=1&$select=id',
    )
    expect(mockGraphJsonRequest).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/users/educator%40uky.edu/calendarView?'),
      {
        headers: {
          Prefer: 'outlook.timezone="UTC"',
        },
      },
    )
    expect(mockPersistIntegrationHealthResult).toHaveBeenCalledWith(
      'OUTLOOK_GRAPH_ASSISTANT-1',
      expect.objectContaining({
        key: 'OUTLOOK_GRAPH_ASSISTANT',
        status: 'HEALTHY',
        configured: true,
      }),
    )
    expect(result.healthCheck.status).toBe('HEALTHY')
    expect(result.healthCheck.message).toContain('calendar and inbox probes succeeded')
  })

  it('runs a real Microsoft Graph file probe against a configured SharePoint site', async () => {
    mockGetInstitutionIntegrationById.mockResolvedValue(
      buildResolvedIntegration('SHAREPOINT_ONEDRIVE_FILES'),
    )
    mockGetGraphRuntimeDiagnostics.mockReturnValue({
      baseUrl: 'https://graph.microsoft.com/v1.0',
      tenantId: 'tenant-1',
      clientId: 'client-1',
      hasClientSecret: true,
      sharePointSiteId: 'site-123',
      healthcheckUserEmail: null,
    })
    mockGraphJsonRequest.mockResolvedValue({} as never)

    const result = await runIntegrationHealthCheckById(
      'SHAREPOINT_ONEDRIVE_FILES-1',
    )

    expect(mockGetGraphAccessToken).toHaveBeenCalledTimes(1)
    expect(mockGraphJsonRequest).toHaveBeenCalledWith(
      '/sites/site-123/drive/root?$select=id,name,webUrl',
    )
    expect(mockPersistIntegrationHealthResult).toHaveBeenCalledWith(
      'SHAREPOINT_ONEDRIVE_FILES-1',
      expect.objectContaining({
        key: 'SHAREPOINT_ONEDRIVE_FILES',
        status: 'HEALTHY',
        configured: true,
      }),
    )
    expect(result.healthCheck.status).toBe('HEALTHY')
    expect(result.healthCheck.message).toContain('SharePoint drive probe succeeded')
  })
})
