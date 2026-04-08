import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../lib/server-auth', () => ({
  requireAdminUser: vi.fn(),
  isAuthFailure: vi.fn(
    (value: unknown) =>
      value != null && typeof value === 'object' && 'response' in value,
  ),
}))

vi.mock('../../../../lib/integrations/registry', () => ({
  listInstitutionIntegrations: vi.fn(),
}))

vi.mock('../../../../lib/admin-control-tower', () => ({
  recordAdminAudit: vi.fn(),
}))

vi.mock('../../../../lib/integrations/health', () => ({
  runIntegrationHealthCheckById: vi.fn(),
}))

import { GET } from '../route'
import { POST } from '../[id]/health/route'
import { requireAdminUser } from '../../../../lib/server-auth'
import { listInstitutionIntegrations } from '../../../../lib/integrations/registry'
import { runIntegrationHealthCheckById } from '../../../../lib/integrations/health'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'

const mockRequireAdminUser = vi.mocked(requireAdminUser)
const mockListInstitutionIntegrations = vi.mocked(listInstitutionIntegrations)
const mockRunIntegrationHealthCheckById = vi.mocked(runIntegrationHealthCheckById)
const mockRecordAdminAudit = vi.mocked(recordAdminAudit)

function buildRequest(path: string, init?: RequestInit) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(`http://localhost:3000${path}`, init as any)
}

function authSuccess() {
  mockRequireAdminUser.mockResolvedValue({
    user: {
      id: 'admin-1',
      email: 'admin@uky.edu',
      role: 'ADMIN',
    },
  } as never)
}

function authFailure(status = 403) {
  mockRequireAdminUser.mockResolvedValue({
    response: NextResponse.json({ error: 'Admin access required' }, { status }),
  } as never)
}

describe('admin integrations routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists integrations for admins', async () => {
    authSuccess()
    mockListInstitutionIntegrations.mockResolvedValue([
      {
        id: 'int-1',
        key: 'OUTLOOK_GRAPH_ASSISTANT',
        name: 'Outlook / Graph Assistant',
        system: 'MICROSOFT_GRAPH',
        systemLabel: 'Microsoft Graph',
        providerLabel: 'Calendar + Email Assistant',
        capabilities: ['calendar', 'email'],
        mode: 'SIMULATED',
        status: 'HEALTHY',
        configured: true,
        authMode: 'simulated',
        baseUrl: null,
        tenantHint: null,
        dataOwner: null,
        syncDirection: 'read/write',
        metadata: null,
        lastCheckedAt: null,
        lastHealthyAt: null,
        lastFailureAt: null,
        lastSyncAt: null,
        lastError: null,
        institutionKey: 'default',
      },
    ] as never)

    const response = await GET(buildRequest('/api/admin/integrations'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.integrations).toHaveLength(1)
    expect(body.integrations[0].key).toBe('OUTLOOK_GRAPH_ASSISTANT')
  })

  it('passes through admin auth failures for the list route', async () => {
    authFailure()

    const response = await GET(buildRequest('/api/admin/integrations'))
    expect(response.status).toBe(403)
  })

  it('runs a simulated health check and records an audit entry', async () => {
    authSuccess()
    mockRunIntegrationHealthCheckById.mockResolvedValue({
      integration: {
        id: 'int-1',
        key: 'CANVAS',
        name: 'Canvas LMS',
      },
      healthCheck: {
        status: 'DEGRADED',
        message: 'Dry run only: Canvas configuration is present, but the external API ping was skipped.',
      },
    } as never)

    const response = await POST(
      buildRequest('/api/admin/integrations/int-1/health', {
        method: 'POST',
        body: JSON.stringify({ simulate: true }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'int-1' }) },
    )

    expect(response.status).toBe(200)
    expect(mockRunIntegrationHealthCheckById).toHaveBeenCalledWith('int-1', {
      simulate: true,
      persist: false,
    })
    expect(mockRecordAdminAudit).toHaveBeenCalledTimes(1)

    const body = await response.json()
    expect(body.healthCheck.status).toBe('DEGRADED')
  })
})
