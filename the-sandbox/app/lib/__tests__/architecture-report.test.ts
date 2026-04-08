import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../integrations/registry', () => ({
  listInstitutionIntegrations: vi.fn(),
  listRuntimeInstitutionIntegrations: vi.fn(),
}))

import {
  buildArchitectureReport,
  renderArchitectureReportMarkdown,
  selectArchitectureReportView,
} from '../architecture-report'
import {
  listInstitutionIntegrations,
  listRuntimeInstitutionIntegrations,
} from '../integrations/registry'

const mockListInstitutionIntegrations = vi.mocked(listInstitutionIntegrations)
const mockListRuntimeInstitutionIntegrations = vi.mocked(
  listRuntimeInstitutionIntegrations,
)

describe('architecture-report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListInstitutionIntegrations.mockResolvedValue([
      {
        id: 'int-1',
        institutionKey: 'default',
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
        dataOwner: 'Institutional messaging and calendar services',
        syncDirection: 'read/write',
        metadata: null,
        lastCheckedAt: '2026-03-25T10:00:00.000Z',
        lastHealthyAt: null,
        lastFailureAt: null,
        lastSyncAt: null,
        lastError: null,
      },
      {
        id: 'int-2',
        institutionKey: 'default',
        key: 'CANVAS',
        name: 'Canvas LMS',
        system: 'CANVAS',
        systemLabel: 'Canvas LMS',
        providerLabel: 'Course Sync + Grade Passback',
        capabilities: ['course-sync'],
        mode: 'REAL',
        status: 'DEGRADED',
        configured: true,
        authMode: 'api-token',
        baseUrl: 'https://canvas.example.edu',
        tenantHint: null,
        dataOwner: 'Learning management system team',
        syncDirection: 'import/export',
        metadata: null,
        lastCheckedAt: '2026-03-25T10:05:00.000Z',
        lastHealthyAt: null,
        lastFailureAt: null,
        lastSyncAt: '2026-03-24T12:00:00.000Z',
        lastError: 'Token expired',
      },
    ] as never)
    mockListRuntimeInstitutionIntegrations.mockReturnValue([
      {
        id: 'runtime-default-outlook_graph_assistant',
        institutionKey: 'default',
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
        dataOwner: 'Institutional messaging and calendar services',
        syncDirection: 'read/write',
        metadata: null,
        lastCheckedAt: null,
        lastHealthyAt: null,
        lastFailureAt: null,
        lastSyncAt: null,
        lastError: null,
      },
      {
        id: 'runtime-default-canvas',
        institutionKey: 'default',
        key: 'CANVAS',
        name: 'Canvas LMS',
        system: 'CANVAS',
        systemLabel: 'Canvas LMS',
        providerLabel: 'Course Sync + Grade Passback',
        capabilities: ['course-sync'],
        mode: 'REAL',
        status: 'DEGRADED',
        configured: true,
        authMode: 'api-token',
        baseUrl: 'https://canvas.example.edu',
        tenantHint: null,
        dataOwner: 'Learning management system team',
        syncDirection: 'import/export',
        metadata: null,
        lastCheckedAt: null,
        lastHealthyAt: null,
        lastFailureAt: null,
        lastSyncAt: null,
        lastError: null,
      },
    ] as never)
  })

  it('builds a report from the current repo state', async () => {
    const report = await buildArchitectureReport({ repoRoot: process.cwd() })

    expect(report.inventory.prismaModelCount).toBeGreaterThan(0)
    expect(report.inventory.apiRouteCount).toBeGreaterThan(0)
    expect(report.connectorInventory.source).toBe('live')
    expect(report.domains.some((domain) => domain.key === 'governance_provenance')).toBe(
      true,
    )
    expect(
      report.domains.find((domain) => domain.key === 'governance_provenance')
        ?.supportingPaths,
    ).toContain('app/lib/provenance-service.ts')
  })

  it('falls back to runtime connector defaults when live inventory fails', async () => {
    mockListInstitutionIntegrations.mockRejectedValueOnce(new Error('db offline'))

    const report = await buildArchitectureReport({ repoRoot: process.cwd() })

    expect(report.connectorInventory.source).toBe('runtime')
    expect(report.connectorInventory.note).toContain('db offline')
    expect(report.connectorInventory.connectors).toHaveLength(2)
    expect(report.connectorInventory.connectors[0]?.status).toBe('HEALTHY')
  })

  it('renders legal markdown and summary payloads', async () => {
    const report = await buildArchitectureReport({ repoRoot: process.cwd() })
    const summary = selectArchitectureReportView(report, 'summary')
    const markdown = renderArchitectureReportMarkdown(report, 'legal')

    expect(summary.view).toBe('summary')
    expect(summary.domains).toHaveLength(report.domains.length)
    expect(markdown).toContain('# University of Kentucky System Interdependencies')
    expect(markdown).toContain('## Connector Inventory')
    expect(markdown).toContain('Governance and Provenance')
  })
})
