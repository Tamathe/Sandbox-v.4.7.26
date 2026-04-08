import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    course: { findUnique: vi.fn() },
    tool: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    metricEvent: { deleteMany: vi.fn() },
    toolDocument: { deleteMany: vi.fn() },
    toolSession: { deleteMany: vi.fn() },
    comment: { deleteMany: vi.fn() },
    upvote: { deleteMany: vi.fn() },
    favorite: { deleteMany: vi.fn() },
    customMetricDefinition: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((r: unknown) => r != null && typeof r === 'object' && 'response' in r!),
  parseRequestBody: vi.fn(),
}))

vi.mock('../../../../lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../../../lib/validate', () => ({
  validateBody: vi.fn(),
}))

vi.mock('../../../../lib/admin-control-tower', () => ({
  shouldFastTrackTool: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../../lib/portfolio', () => ({
  maybeCreatePortfolioItem: vi.fn(),
}))

vi.mock('../../../../lib/schemas', () => ({
  UpdateToolSchema: {},
  ToolsQuerySchema: {},
}))

vi.mock('../../../../lib/tool-storefronts', () => ({
  createEmptyToolStorefrontSummary: vi.fn(() => ({
    placementCount: 0,
    departmentCount: 0,
    placements: [],
  })),
  getVisibleToolStorefrontSummary: vi.fn().mockResolvedValue({
    placementCount: 0,
    departmentCount: 0,
    placements: [],
  }),
}))

import { GET, PUT, DELETE } from '../route'
import { requireRequestUser, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { getVisibleToolStorefrontSummary } from '../../../../lib/tool-storefronts'
import { validateBody } from '../../../../lib/validate'

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockParseRequestBody = vi.mocked(parseRequestBody)
const mockGetVisibleToolStorefrontSummary = vi.mocked(getVisibleToolStorefrontSummary)
const mockValidateBody = vi.mocked(validateBody)

function buildRequest(method: string, email?: string, searchParams?: string): NextRequest {
  const url = searchParams
    ? `http://localhost:3000/api/tools/tool-1?${searchParams}`
    : 'http://localhost:3000/api/tools/tool-1'

  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'x-demo-user-email': email } : {}),
    },
    ...(method === 'PUT' ? { body: JSON.stringify({ name: 'Updated' }) } : {}),
  })
}

const routeParams = Promise.resolve({ id: 'tool-1' })

function authSuccess(overrides?: { id?: string; role?: string; email?: string }) {
  const user = {
    id: overrides?.id ?? 'user-1',
    role: overrides?.role ?? 'EDUCATOR',
    email: overrides?.email ?? 'educator@uky.edu',
  }
  mockRequireRequestUser.mockResolvedValue({ user } as never)
}

function makeTool(overrides?: Record<string, unknown>) {
  return {
    id: 'tool-1',
    name: 'Test Tool',
    published: true,
    deploymentMode: 'MARKETPLACE',
    approvalStatus: 'APPROVED',
    creatorId: 'creator-1',
    creator: { id: 'creator-1', name: 'Creator', email: 'creator@uky.edu' },
    customMetrics: [],
    ratings: [{ rating: 4 }, { rating: 5 }],
    _count: { upvotes: 3, favorites: 2, comments: 1, ratings: 2, forks: 0 },
    upvotes: [],
    favorites: [],
    ...overrides,
  }
}

// ── Tests: GET ───────────────────────────────────────────────────────────────

describe('GET /api/tools/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    mockGetVisibleToolStorefrontSummary.mockResolvedValue({
      placementCount: 0,
      departmentCount: 0,
      placements: [],
    })
  })

  it('returns tool with avgRating, hasUpvoted, hasFavorited for authenticated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      role: 'STUDENT',
    } as never)

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({
        upvotes: [{ id: 'up-1' }],
        favorites: [{ id: 'fav-1' }],
        ratings: [{ rating: 4 }, { rating: 5 }],
      }) as never
    )

    const req = buildRequest('GET', 'student@uky.edu')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.avgRating).toBe(4.5)
    expect(body.hasUpvoted).toBe(true)
    expect(body.hasFavorited).toBe(true)
  })

  it('returns 404 for non-existent tool', async () => {
    vi.mocked(prisma.tool.findUnique).mockResolvedValue(null)

    const req = buildRequest('GET')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('Tool not found')
  })

  it('hides unpublished tools from non-owner/non-admin', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'other-user',
      role: 'STUDENT',
    } as never)

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ published: false, creatorId: 'creator-1' }) as never
    )

    const req = buildRequest('GET', 'other@uky.edu')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(404)
  })

  it('shows unpublished tools to course participants when the tool is linked to that course', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'student-1',
      role: 'STUDENT',
    } as never)

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({
        published: false,
        creatorId: 'creator-1',
        courseLinks: [{ courseId: 'course-1', syllabusContext: null, weekLabel: null }],
      }) as never
    )

    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      instructorId: 'educator-1',
      isPublic: false,
      enrollments: [{ studentId: 'student-1' }],
    } as never)

    const req = buildRequest('GET', 'student@uky.edu', 'courseId=course-1')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(200)
  })

  it('shows unpublished tools when the viewer can access a shared department storefront placement', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'educator-2',
      role: 'EDUCATOR',
    } as never)

    mockGetVisibleToolStorefrontSummary.mockResolvedValue({
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
    })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ published: false, creatorId: 'creator-1' }) as never
    )

    const req = buildRequest('GET', 'educator2@uky.edu')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.storefront.departmentCount).toBe(1)
    expect(body.deployment.state).toBe('department-scoped')
  })

  it('shows unpublished tools to creator', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'creator-1',
      role: 'EDUCATOR',
    } as never)

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ published: false, creatorId: 'creator-1' }) as never
    )

    const req = buildRequest('GET', 'creator@uky.edu')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(200)
  })

  it('surfaces private deployment state to the creator of an unpublished private tool', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'creator-1',
      role: 'EDUCATOR',
    } as never)

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({
        published: false,
        deploymentMode: 'PRIVATE',
        creatorId: 'creator-1',
      }) as never
    )

    const req = buildRequest('GET', 'creator@uky.edu')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.deployment.state).toBe('private')
    expect(body.deployment.label).toBe('Private')
  })

  it('surfaces department deployment state to the creator before storefront rollout is attached', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'creator-1',
      role: 'EDUCATOR',
    } as never)

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({
        published: false,
        deploymentMode: 'DEPARTMENT',
        creatorId: 'creator-1',
      }) as never
    )

    const req = buildRequest('GET', 'creator@uky.edu')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.deployment.state).toBe('department-scoped')
    expect(body.deployment.description).toContain('Reserved for department rollout')
  })

  it('shows unpublished tools to admin', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'admin-1',
      role: 'ADMIN',
    } as never)

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ published: false, creatorId: 'creator-1' }) as never
    )

    const req = buildRequest('GET', 'heath.price@uky.edu')
    const res = await GET(req, { params: routeParams })
    expect(res.status).toBe(200)
  })
})

// ── Tests: PUT ───────────────────────────────────────────────────────────────

describe('PUT /api/tools/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-owner/non-admin with 403', async () => {
    authSuccess({ id: 'other-user', role: 'EDUCATOR' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ creatorId: 'creator-1' }) as never
    )

    const req = buildRequest('PUT', 'other@uky.edu')
    const res = await PUT(req, { params: routeParams })
    expect(res.status).toBe(403)
  })

  it('updates tool successfully', async () => {
    authSuccess({ id: 'creator-1', role: 'EDUCATOR' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ creatorId: 'creator-1', published: false }) as never
    )

    mockParseRequestBody.mockResolvedValue({ data: { name: 'Updated Tool' } } as never)
    mockValidateBody.mockReturnValue({
      value: { name: 'Updated Tool' },
    } as never)

    const updatedTool = makeTool({ name: 'Updated Tool', creatorId: 'creator-1' })
    vi.mocked(prisma.tool.update).mockResolvedValue(updatedTool as never)

    const req = buildRequest('PUT', 'creator@uky.edu')
    const res = await PUT(req, { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.name).toBe('Updated Tool')
  })

  it('admin can update any tool', async () => {
    authSuccess({ id: 'admin-1', role: 'ADMIN' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ creatorId: 'creator-1', published: false }) as never
    )

    mockParseRequestBody.mockResolvedValue({ data: { name: 'Admin Edit' } } as never)
    mockValidateBody.mockReturnValue({
      value: { name: 'Admin Edit' },
    } as never)

    const updatedTool = makeTool({ name: 'Admin Edit', creatorId: 'creator-1' })
    vi.mocked(prisma.tool.update).mockResolvedValue(updatedTool as never)

    const req = buildRequest('PUT', 'heath.price@uky.edu')
    const res = await PUT(req, { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.name).toBe('Admin Edit')
  })
})

// ── Tests: DELETE ────────────────────────────────────────────────────────────

describe('DELETE /api/tools/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-owner with 403', async () => {
    authSuccess({ id: 'other-user', role: 'EDUCATOR' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ creatorId: 'creator-1' }) as never
    )

    const req = buildRequest('DELETE', 'other@uky.edu')
    const res = await DELETE(req, { params: routeParams })
    expect(res.status).toBe(403)
  })

  it('owner can delete tool', async () => {
    authSuccess({ id: 'creator-1', role: 'EDUCATOR' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(
      makeTool({ creatorId: 'creator-1' }) as never
    )
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never)

    const req = buildRequest('DELETE', 'creator@uky.edu')
    const res = await DELETE(req, { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 for non-existent tool', async () => {
    authSuccess({ id: 'user-1', role: 'EDUCATOR' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(null)

    const req = buildRequest('DELETE', 'user@uky.edu')
    const res = await DELETE(req, { params: routeParams })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('Tool not found')
  })
})
