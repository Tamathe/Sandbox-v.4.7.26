import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../lib/server-auth', () => ({
  requireAdminUser: vi.fn(),
  isAuthFailure: vi.fn(
    (value: unknown) =>
      value != null && typeof value === 'object' && 'response' in value,
  ),
}))

vi.mock('../../../../lib/architecture-report', () => ({
  ARCHITECTURE_REPORT_VIEWS: ['summary', 'legal'],
  ARCHITECTURE_REPORT_FORMATS: ['json', 'markdown'],
  buildArchitectureReport: vi.fn(),
  renderArchitectureReportMarkdown: vi.fn(),
  selectArchitectureReportView: vi.fn(),
}))

import { GET } from '../route'
import { requireAdminUser } from '../../../../lib/server-auth'
import {
  buildArchitectureReport,
  renderArchitectureReportMarkdown,
  selectArchitectureReportView,
} from '../../../../lib/architecture-report'

const mockRequireAdminUser = vi.mocked(requireAdminUser)
const mockBuildArchitectureReport = vi.mocked(buildArchitectureReport)
const mockRenderArchitectureReportMarkdown = vi.mocked(
  renderArchitectureReportMarkdown,
)
const mockSelectArchitectureReportView = vi.mocked(selectArchitectureReportView)

function buildRequest(path: string) {
  return new NextRequest(`http://localhost:3000${path}`)
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

describe('GET /api/system/interdependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the selected JSON view for admins', async () => {
    authSuccess()
    mockBuildArchitectureReport.mockResolvedValue({
      generatedAt: '2026-03-25T12:00:00.000Z',
    } as never)
    mockSelectArchitectureReportView.mockReturnValue({
      view: 'summary',
      generatedAt: '2026-03-25T12:00:00.000Z',
      inventory: {
        prismaModelCount: 10,
        prismaEnumCount: 3,
        apiRouteCount: 5,
        domainCount: 2,
        connectorCount: 4,
        loadBearingFileCount: 3,
        reportPath: 'SYSTEM-INTERDEPENDENCIES.md',
      },
      connectorInventory: {
        source: 'live',
        note: null,
        connectors: [],
      },
      domains: [],
      approvals: [],
      dataFlows: [],
      loadBearingFiles: [],
    } as never)

    const response = await GET(
      buildRequest('/api/system/interdependencies?view=summary'),
    )

    expect(response.status).toBe(200)
    expect(mockBuildArchitectureReport).toHaveBeenCalledTimes(1)
    expect(mockSelectArchitectureReportView).toHaveBeenCalledWith(
      { generatedAt: '2026-03-25T12:00:00.000Z' },
      'summary',
    )

    const body = await response.json()
    expect(body.view).toBe('summary')
    expect(body.inventory.connectorCount).toBe(4)
  })

  it('returns markdown attachments when requested', async () => {
    authSuccess()
    mockBuildArchitectureReport.mockResolvedValue({
      generatedAt: '2026-03-25T12:00:00.000Z',
    } as never)
    mockRenderArchitectureReportMarkdown.mockReturnValue('# Packet')

    const response = await GET(
      buildRequest('/api/system/interdependencies?view=legal&format=markdown'),
    )

    expect(response.status).toBe(200)
    expect(mockRenderArchitectureReportMarkdown).toHaveBeenCalledWith(
      { generatedAt: '2026-03-25T12:00:00.000Z' },
      'legal',
    )
    expect(response.headers.get('Content-Type')).toContain('text/markdown')
    expect(response.headers.get('Content-Disposition')).toContain(
      'system-interdependencies-2026-03-25.md',
    )
    expect(await response.text()).toBe('# Packet')
  })

  it('rejects invalid view values', async () => {
    authSuccess()

    const response = await GET(
      buildRequest('/api/system/interdependencies?view=bogus'),
    )

    expect(response.status).toBe(400)
    expect(mockBuildArchitectureReport).not.toHaveBeenCalled()
  })

  it('passes through admin auth failures', async () => {
    authFailure()

    const response = await GET(buildRequest('/api/system/interdependencies'))

    expect(response.status).toBe(403)
  })
})
