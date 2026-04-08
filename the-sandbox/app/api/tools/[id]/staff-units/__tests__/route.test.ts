import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../../lib/prisma', () => ({
  prisma: {
    tool: {
      findUnique: vi.fn(),
    },
    toolCollection: {
      findUnique: vi.fn(),
    },
    departmentMember: {
      findUnique: vi.fn(),
    },
    collectionTool: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../../../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((result: unknown) => result != null && typeof result === 'object' && 'response' in result!),
  parseRequestBody: vi.fn(),
}))

vi.mock('../../../../../lib/validate', () => ({
  validateBody: vi.fn(),
}))

vi.mock('../../../../../lib/tool-staff-units', () => ({
  getStaffUnitInstallEligibility: vi.fn((tool: { approvalStatus: string }) => (
    ['REJECTED', 'SUSPENDED'].includes(tool.approvalStatus)
      ? { canInstall: false, reason: 'This tool cannot be assigned to a staff unit.' }
      : { canInstall: true, reason: null }
  )),
  getVisibleToolStaffUnitSummary: vi.fn().mockResolvedValue({
    placementCount: 1,
    departmentCount: 1,
    placements: [
      {
        collectionId: 'collection-1',
        collectionName: 'Campus Life',
        collectionSlug: 'campus-life',
        collectionVisibility: 'INHERIT',
        visibility: 'PUBLIC',
        departmentId: 'dept-1',
        departmentName: 'Student Affairs',
        departmentShortName: 'Student Affairs',
        departmentSlug: 'student-affairs',
        categoryTags: ['Student Services'],
      },
    ],
  }),
  isStaffUnitDepartment: vi.fn((categoryTags: string[] | null | undefined) =>
    (categoryTags ?? []).some((tag) => ['Administrative', 'Student Services'].includes(tag)),
  ),
  listAvailableStaffUnitCollectionsForUser: vi.fn().mockResolvedValue([
    {
      collectionId: 'collection-2',
      collectionName: 'Wellness',
      collectionSlug: 'wellness',
      visibility: 'PUBLIC',
      departmentId: 'dept-1',
      departmentName: 'Student Affairs',
      departmentShortName: 'Student Affairs',
      departmentSlug: 'student-affairs',
      categoryTags: ['Student Services'],
    },
  ]),
}))

import { GET, POST } from '../route'
import { prisma } from '../../../../../lib/prisma'
import {
  parseRequestBody,
  requireRequestUser,
} from '../../../../../lib/server-auth'
import { validateBody } from '../../../../../lib/validate'

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockParseRequestBody = vi.mocked(parseRequestBody)
const mockValidateBody = vi.mocked(validateBody)

const routeParams = Promise.resolve({ id: 'tool-1' })

function buildRequest(method: 'GET' | 'POST', body?: unknown) {
  return new NextRequest('http://localhost:3000/api/tools/tool-1/staff-units', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user-email': 'morgan.rivera@uky.edu',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

function authSuccess(overrides?: { id?: string; role?: string }) {
  mockRequireRequestUser.mockResolvedValue({
    user: {
      id: overrides?.id ?? 'staff-1',
      role: overrides?.role ?? 'STAFF',
      email: 'morgan.rivera@uky.edu',
    },
  } as never)
}

describe('GET /api/tools/[id]/staff-units', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSuccess()
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      creatorId: 'staff-1',
      published: false,
      approvalStatus: 'COMMUNITY',
    } as never)
  })

  it('returns visible staff-unit placements and available collections', async () => {
    const response = await GET(buildRequest('GET'), { params: routeParams })
    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.staffUnits.departmentCount).toBe(1)
    expect(body.visiblePlacements).toHaveLength(1)
    expect(body.availableCollections).toHaveLength(1)
    expect(body.canInstall).toBe(true)
  })
})

describe('POST /api/tools/[id]/staff-units', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSuccess()
    mockParseRequestBody.mockResolvedValue({ data: { collectionId: 'collection-2' } } as never)
    mockValidateBody.mockReturnValue({ value: { collectionId: 'collection-2' } } as never)
    vi.mocked(prisma.toolCollection.findUnique).mockResolvedValue({
      id: 'collection-2',
      departmentId: 'dept-1',
      department: {
        categoryTags: ['Student Services'],
      },
    } as never)
    vi.mocked(prisma.departmentMember.findUnique).mockResolvedValue({
      role: 'EDITOR',
    } as never)
  })

  it('installs a tool into a managed staff unit collection', async () => {
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      creatorId: 'staff-1',
      published: false,
      approvalStatus: 'COMMUNITY',
    } as never)
    vi.mocked(prisma.collectionTool.create).mockResolvedValue({
      id: 'entry-1',
    } as never)

    const response = await POST(buildRequest('POST', { collectionId: 'collection-2' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(201)
    expect(prisma.collectionTool.create).toHaveBeenCalledWith({
      data: {
        collectionId: 'collection-2',
        toolId: 'tool-1',
      },
    })
  })

  it('blocks rejected tools from staff-unit assignment', async () => {
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      creatorId: 'staff-1',
      published: true,
      approvalStatus: 'REJECTED',
    } as never)

    const response = await POST(buildRequest('POST', { collectionId: 'collection-2' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toBe('This tool cannot be assigned to a staff unit.')
  })

  it('returns auth failures unchanged', async () => {
    mockRequireRequestUser.mockResolvedValue({
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    } as never)

    const response = await POST(buildRequest('POST', { collectionId: 'collection-2' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(401)
  })
})
