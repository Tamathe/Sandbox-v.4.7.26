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
  isAuthFailure: vi.fn((r: unknown) => r != null && typeof r === 'object' && 'response' in r!),
  parseRequestBody: vi.fn(),
}))

vi.mock('../../../../../lib/validate', () => ({
  validateBody: vi.fn(),
}))

vi.mock('../../../../../lib/tool-storefronts', () => ({
  getStorefrontShareEligibility: vi.fn((tool: { approvalStatus: string }) => (
    tool.approvalStatus === 'APPROVED'
      ? { canShare: true, reason: null }
      : { canShare: false, reason: 'Only approved tools can be shared into department storefronts.' }
  )),
  getVisibleToolStorefrontSummary: vi.fn().mockResolvedValue({
    placementCount: 1,
    departmentCount: 1,
    placements: [
      {
        collectionId: 'collection-1',
        collectionName: 'Faculty Picks',
        collectionSlug: 'faculty-picks',
        collectionVisibility: 'PUBLIC',
        visibility: 'PUBLIC',
        departmentId: 'dept-1',
        departmentName: 'Biology',
        departmentShortName: 'BIO',
        departmentSlug: 'biology',
      },
    ],
  }),
  listAvailableStorefrontCollectionsForUser: vi.fn().mockResolvedValue([
    {
      collectionId: 'collection-2',
      collectionName: 'Lab Templates',
      collectionSlug: 'lab-templates',
      visibility: 'PUBLIC',
      departmentId: 'dept-1',
      departmentName: 'Biology',
      departmentShortName: 'BIO',
      departmentSlug: 'biology',
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
  return new NextRequest('http://localhost:3000/api/tools/tool-1/storefronts', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user-email': 'educator@uky.edu',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

function authSuccess(overrides?: { id?: string; role?: string }) {
  mockRequireRequestUser.mockResolvedValue({
    user: {
      id: overrides?.id ?? 'educator-1',
      role: overrides?.role ?? 'EDUCATOR',
      email: 'educator@uky.edu',
    },
  } as never)
}

describe('GET /api/tools/[id]/storefronts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSuccess()
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      creatorId: 'educator-1',
      published: false,
      approvalStatus: 'APPROVED',
    } as never)
  })

  it('returns visible storefront placements and available collections', async () => {
    const response = await GET(buildRequest('GET'), { params: routeParams })
    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.storefront.departmentCount).toBe(1)
    expect(body.visiblePlacements).toHaveLength(1)
    expect(body.availableCollections).toHaveLength(1)
    expect(body.canShare).toBe(true)
  })
})

describe('POST /api/tools/[id]/storefronts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSuccess()
    mockParseRequestBody.mockResolvedValue({ data: { collectionId: 'collection-1' } } as never)
    mockValidateBody.mockReturnValue({ value: { collectionId: 'collection-1' } } as never)
    vi.mocked(prisma.toolCollection.findUnique).mockResolvedValue({
      id: 'collection-1',
      visibility: 'PUBLIC',
      departmentId: 'dept-1',
    } as never)
    vi.mocked(prisma.departmentMember.findUnique).mockResolvedValue({
      role: 'EDITOR',
    } as never)
  })

  it('shares an approved tool into a managed storefront collection', async () => {
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      approvalStatus: 'APPROVED',
    } as never)
    vi.mocked(prisma.collectionTool.create).mockResolvedValue({
      id: 'entry-1',
    } as never)

    const response = await POST(buildRequest('POST', { collectionId: 'collection-1' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(201)
    expect(prisma.collectionTool.create).toHaveBeenCalledWith({
      data: {
        collectionId: 'collection-1',
        toolId: 'tool-1',
      },
    })
  })

  it('blocks storefront sharing for tools that are not approved', async () => {
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      approvalStatus: 'COMMUNITY',
    } as never)

    const response = await POST(buildRequest('POST', { collectionId: 'collection-1' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(409)

    const body = await response.json()
    expect(body.error).toBe('Only approved tools can be shared into department storefronts.')
  })

  it('returns auth failures unchanged', async () => {
    mockRequireRequestUser.mockResolvedValue({
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    } as never)

    const response = await POST(buildRequest('POST', { collectionId: 'collection-1' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(401)
  })
})
