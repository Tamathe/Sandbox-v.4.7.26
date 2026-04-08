import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    studentProfile: {
      findUnique: vi.fn(),
    },
    toolSession: {
      findMany: vi.fn(),
    },
    tool: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((value: unknown) => value != null && typeof value === 'object' && 'response' in value),
}))

vi.mock('../../../lib/provenance-service', () => ({
  buildToolTrustMetadata: vi.fn(() => ({
    reviewStatus: 'approved',
    permissionBasis: 'approved',
    requiresInstitutionalReview: false,
    reviewedBy: null,
    reviewExpiresAt: null,
  })),
}))

vi.mock('../../../lib/tool-storefronts', () => ({
  createEmptyToolStorefrontSummary: vi.fn(() => ({
    placementCount: 0,
    departmentCount: 0,
    placements: [],
  })),
  getVisibleToolStorefrontSummaryMap: vi.fn(async (toolIds: string[]) => new Map(
    toolIds.map((toolId) => [
      toolId,
      {
        placementCount: 0,
        departmentCount: 0,
        placements: [],
      },
    ]),
  )),
}))

import { GET } from '../route'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser } from '../../../lib/server-auth'

const mockRequireRequestUser = vi.mocked(requireRequestUser)

function buildRequest() {
  return new NextRequest('http://localhost:3000/api/recommendations', {
    headers: {
      'x-demo-user-email': 'student@uky.edu',
    },
  })
}

describe('GET /api/recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-student users', async () => {
    mockRequireRequestUser.mockResolvedValue({
      user: {
        id: 'educator-1',
        role: 'EDUCATOR',
        email: 'educator@uky.edu',
      },
    } as never)

    const response = await GET(buildRequest())
    expect(response.status).toBe(403)

    const body = await response.json()
    expect(body.error).toBe('Students only')
  })

  it('returns marketplace-ready recommendation cards', async () => {
    mockRequireRequestUser.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
        email: 'student@uky.edu',
      },
    } as never)

    vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue({
      preferredModality: 'dialogue',
      topConceptsThisWeek: ['civil procedure'],
    } as never)
    vi.mocked(prisma.toolSession.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tool.findMany).mockResolvedValue([
      {
        id: 'tool-1',
        name: 'Civil Procedure Coach',
        shortDescription: 'Helps students prepare for class.',
        fullDescription: 'Detailed description.',
        category: 'Law',
        toolType: 'CHATBOT',
        learningObjectives: ['Understand civil procedure'],
        referenceDocUrls: [],
        published: true,
        deploymentMode: 'MARKETPLACE',
        approvalStatus: 'APPROVED',
        externalUrl: null,
        isOfficialService: false,
        requiresInstitutionalReview: false,
        reviewedAt: null,
        reviewedBy: null,
        reviewExpiresAt: null,
        creator: {
          id: 'educator-1',
          name: 'Prof. Hart',
          email: 'hart@uky.edu',
          role: 'EDUCATOR',
        },
        forkedFrom: null,
        _count: {
          upvotes: 3,
          favorites: 1,
          comments: 0,
          sessions: 12,
          ratings: 1,
          forks: 0,
          courseLinks: 0,
        },
        ratings: [{ rating: 5 }],
      },
    ] as never)

    const response = await GET(buildRequest())
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.recommendations).toHaveLength(1)
    expect(body.recommendations[0].reason).toContain('preferred conversation style')
    expect(body.recommendations[0].tool).toMatchObject({
      id: 'tool-1',
      name: 'Civil Procedure Coach',
      avgRating: 5,
    })
    expect(body.recommendations[0].tool.deployment.state).toBe('catalog')
  })

  it('passes auth failures through unchanged', async () => {
    mockRequireRequestUser.mockResolvedValue({
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    } as never)

    const response = await GET(buildRequest())
    expect(response.status).toBe(401)
  })
})
