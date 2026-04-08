import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((r: unknown) => r != null && typeof r === 'object' && 'response' in r!),
  parseRequestBody: vi.fn(),
}))

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tool: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
    },
  },
}))

vi.mock('../../../lib/validate', () => ({
  validateBody: vi.fn(),
}))

vi.mock('../../../lib/admin-control-tower', () => ({
  shouldFastTrackTool: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../lib/portfolio', () => ({
  maybeCreatePortfolioItem: vi.fn(),
}))

vi.mock('../../../lib/prisma-includes', () => ({
  TOOL_CARD_INCLUDE: {},
}))

vi.mock('../../../lib/builder-service', () => ({
  validateBuilderToolType: vi.fn(),
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

import { GET, POST } from '../route'
import { requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { validateBody } from '../../../lib/validate'

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockParseRequestBody = vi.mocked(parseRequestBody)
const mockValidateBody = vi.mocked(validateBody)

function buildGetRequest(params?: Record<string, string>, email?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/tools')
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: email ? { 'x-demo-user-email': email } : {},
  })
}

function buildPostRequest(body: unknown, email?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/tools', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'x-demo-user-email': email } : {}),
    },
    body: JSON.stringify(body),
  })
}

function authSuccess(overrides?: { id?: string; role?: string; email?: string }) {
  const user = {
    id: overrides?.id ?? 'user-1',
    role: overrides?.role ?? 'EDUCATOR',
    email: overrides?.email ?? 'educator@uky.edu',
  }
  mockRequireRequestUser.mockResolvedValue({ user } as never)
}

function authFailure() {
  mockRequireRequestUser.mockResolvedValue({
    response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
  })
}

// ── Tests: GET ───────────────────────────────────────────────────────────────

describe('GET /api/tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: validateBody passes through for ToolsQuerySchema
    mockValidateBody.mockImplementation((_schema: unknown, data: unknown) => ({
      value: {
        search: '',
        category: '',
        toolType: '',
        difficulty: '',
        approvalStatus: '',
        audioEnabled: '',
        featured: '',
        sort: 'newest',
        published: undefined,
        creator: '',
        creatorEmail: '',
        page: 1,
        limit: 20,
        since: undefined,
        ...(data as Record<string, unknown>),
      },
    }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
  })

  it('returns tools with pagination', async () => {
    const toolData = [
      { id: 't-1', name: 'Quiz Bot', category: 'STUDY', upvotes: [], favorites: [], ratings: [] },
      { id: 't-2', name: 'Flashcards', category: 'REVIEW', upvotes: [], favorites: [], ratings: [] },
    ]
    vi.mocked(prisma.tool.findMany).mockResolvedValue(toolData as never)
    vi.mocked(prisma.tool.count).mockResolvedValue(2)

    const res = await GET(buildGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.tools).toHaveLength(2)
    expect(body.total).toBe(2)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(body.tools[0]).toMatchObject({ id: 't-1', name: 'Quiz Bot' })
    expect(body.tools[0].trust).toMatchObject({ reviewStatus: 'approved' })
  })

  it('filters by search query', async () => {
    vi.mocked(prisma.tool.findMany).mockResolvedValue([
      { id: 't-1', name: 'Quiz Bot', upvotes: [], favorites: [], ratings: [] },
    ] as never)
    vi.mocked(prisma.tool.count).mockResolvedValue(1)

    // Override validateBody to include search
    mockValidateBody.mockImplementation(() => ({
      value: {
        search: 'quiz',
        category: '',
        toolType: '',
        difficulty: '',
        approvalStatus: '',
        audioEnabled: '',
        featured: '',
        sort: 'newest',
        published: undefined,
        creator: '',
        creatorEmail: '',
        page: 1,
        limit: 20,
        since: undefined,
      },
    }))

    const res = await GET(buildGetRequest({ search: 'quiz' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tools).toHaveLength(1)

    // Verify prisma was called with a where clause containing OR for search
    const findManyCall = vi.mocked(prisma.tool.findMany).mock.calls[0][0] as { where: Record<string, unknown> }
    expect(findManyCall.where.OR).toBeDefined()
  })

  it('hides REJECTED/SUSPENDED tools from non-admin users', async () => {
    // Simulate a non-admin user
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      role: 'STUDENT',
    } as never)

    vi.mocked(prisma.tool.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tool.count).mockResolvedValue(0)

    const res = await GET(buildGetRequest({}, 'student@uky.edu'))
    expect(res.status).toBe(200)

    // Verify the where clause includes notIn filter
    const findManyCall = vi.mocked(prisma.tool.findMany).mock.calls[0][0] as { where: Record<string, unknown> }
    expect(findManyCall.where.approvalStatus).toEqual({ notIn: ['REJECTED', 'SUSPENDED'] })
  })

  it('restricts unpublished listings to the current creator when published=false is requested', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      role: 'EDUCATOR',
    } as never)
    vi.mocked(prisma.tool.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tool.count).mockResolvedValue(0)

    mockValidateBody.mockImplementation(() => ({
      value: {
        search: '',
        category: '',
        toolType: '',
        difficulty: '',
        approvalStatus: '',
        audioEnabled: '',
        featured: '',
        sort: 'newest',
        published: 'false',
        creator: '',
        creatorEmail: '',
        page: 1,
        limit: 20,
        since: undefined,
      },
    }))

    const res = await GET(buildGetRequest({ published: 'false' }, 'educator@uky.edu'))
    expect(res.status).toBe(200)

    const findManyCall = vi.mocked(prisma.tool.findMany).mock.calls[0][0] as { where: Record<string, unknown> }
    expect(findManyCall.where.published).toBe(false)
    expect(findManyCall.where.creatorId).toBe('user-1')
  })

  it('returns no unpublished tools for anonymous published=false requests', async () => {
    vi.mocked(prisma.tool.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tool.count).mockResolvedValue(0)

    mockValidateBody.mockImplementation(() => ({
      value: {
        search: '',
        category: '',
        toolType: '',
        difficulty: '',
        approvalStatus: '',
        audioEnabled: '',
        featured: '',
        sort: 'newest',
        published: 'false',
        creator: '',
        creatorEmail: '',
        page: 1,
        limit: 20,
        since: undefined,
      },
    }))

    const res = await GET(buildGetRequest({ published: 'false' }))
    expect(res.status).toBe(200)

    const findManyCall = vi.mocked(prisma.tool.findMany).mock.calls[0][0] as { where: Record<string, unknown> }
    expect(findManyCall.where.published).toBe(false)
    expect(findManyCall.where.id).toBe('__no_unpublished_tools__')
  })
})

// ── Tests: POST ──────────────────────────────────────────────────────────────

describe('POST /api/tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a tool successfully and returns 201', async () => {
    authSuccess({ id: 'edu-1', role: 'EDUCATOR', email: 'educator@uky.edu' })

    const toolInput = {
      name: 'New Quiz',
      shortDescription: 'A quiz tool',
      fullDescription: 'Detailed quiz tool description',
      category: 'STUDY',
      toolType: 'CHATBOT',
      published: false,
    }

    mockParseRequestBody.mockResolvedValue({ data: toolInput } as never)
    mockValidateBody.mockReturnValue({
      value: {
        ...toolInput,
        difficultyLevel: 'Introductory',
        estimatedMinutes: null,
        thumbnailUrl: null,
        externalUrl: null,
        systemPrompt: null,
        personaName: null,
        personaAvatar: null,
        welcomeMessage: null,
        starterQuestions: [],
        referenceDocUrls: [],
        learningObjectives: [],
        intendedAudience: null,
        approvalStatus: 'COMMUNITY',
        isOfficialService: false,
        serviceProtocol: null,
        escalationEmail: null,
        audioEnabled: false,
        audioPersonaName: null,
        audioEngine: null,
        audioVoiceName: null,
        audioSpeakingStyle: null,
        audioSpeed: 1,
        audioSystemSuffix: null,
        audioBackgroundTrack: null,
        customMetrics: [],
        totalSteps: null,
        stepLabel: null,
      },
    } as never)

    const createdTool = {
      id: 'tool-new',
      name: 'New Quiz',
      published: false,
      creatorId: 'edu-1',
    }
    vi.mocked(prisma.tool.create).mockResolvedValue(createdTool as never)

    const res = await POST(buildPostRequest(toolInput, 'educator@uky.edu'))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('tool-new')
    expect(body.name).toBe('New Quiz')
  })

  it('rejects unauthenticated requests with 401', async () => {
    authFailure()

    const res = await POST(buildPostRequest({ name: 'test' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Authentication required')
  })

  it('persists private deployment mode for unpublished private tools', async () => {
    authSuccess({ id: 'edu-1', role: 'EDUCATOR', email: 'educator@uky.edu' })

    const toolInput = {
      name: 'Private Quiz',
      shortDescription: 'A private quiz tool',
      fullDescription: 'Detailed private quiz tool description',
      category: 'STUDY',
      toolType: 'CHATBOT',
      published: false,
      deploymentMode: 'PRIVATE',
    }

    mockParseRequestBody.mockResolvedValue({ data: toolInput } as never)
    mockValidateBody.mockReturnValue({
      value: {
        ...toolInput,
        difficultyLevel: 'Introductory',
        estimatedMinutes: null,
        thumbnailUrl: null,
        externalUrl: null,
        systemPrompt: null,
        personaName: null,
        personaAvatar: null,
        welcomeMessage: null,
        starterQuestions: [],
        referenceDocUrls: [],
        learningObjectives: [],
        intendedAudience: null,
        approvalStatus: 'COMMUNITY',
        isOfficialService: false,
        serviceProtocol: null,
        escalationEmail: null,
        audioEnabled: false,
        audioPersonaName: null,
        audioEngine: null,
        audioVoiceName: null,
        audioSpeakingStyle: null,
        audioSpeed: 1,
        audioSystemSuffix: null,
        audioBackgroundTrack: null,
        customMetrics: [],
        totalSteps: null,
        stepLabel: null,
      },
    } as never)

    vi.mocked(prisma.tool.create).mockResolvedValue({
      id: 'tool-private',
      name: 'Private Quiz',
      published: false,
      deploymentMode: 'PRIVATE',
      creatorId: 'edu-1',
    } as never)

    const res = await POST(buildPostRequest(toolInput, 'educator@uky.edu'))
    expect(res.status).toBe(201)
    expect(prisma.tool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          published: false,
          deploymentMode: 'PRIVATE',
        }),
      }),
    )
  })

  it('persists department deployment mode for unpublished department tools', async () => {
    authSuccess({ id: 'edu-1', role: 'EDUCATOR', email: 'educator@uky.edu' })

    const toolInput = {
      name: 'Department Quiz',
      shortDescription: 'A department-shared quiz tool',
      fullDescription: 'Detailed department quiz tool description',
      category: 'STUDY',
      toolType: 'CHATBOT',
      published: false,
      deploymentMode: 'DEPARTMENT',
    }

    mockParseRequestBody.mockResolvedValue({ data: toolInput } as never)
    mockValidateBody.mockReturnValue({
      value: {
        ...toolInput,
        difficultyLevel: 'Introductory',
        estimatedMinutes: null,
        thumbnailUrl: null,
        externalUrl: null,
        systemPrompt: null,
        personaName: null,
        personaAvatar: null,
        welcomeMessage: null,
        starterQuestions: [],
        referenceDocUrls: [],
        learningObjectives: [],
        intendedAudience: null,
        approvalStatus: 'COMMUNITY',
        isOfficialService: false,
        serviceProtocol: null,
        escalationEmail: null,
        audioEnabled: false,
        audioPersonaName: null,
        audioEngine: null,
        audioVoiceName: null,
        audioSpeakingStyle: null,
        audioSpeed: 1,
        audioSystemSuffix: null,
        audioBackgroundTrack: null,
        customMetrics: [],
        totalSteps: null,
        stepLabel: null,
      },
    } as never)

    vi.mocked(prisma.tool.create).mockResolvedValue({
      id: 'tool-department',
      name: 'Department Quiz',
      published: false,
      deploymentMode: 'DEPARTMENT',
      creatorId: 'edu-1',
    } as never)

    const res = await POST(buildPostRequest(toolInput, 'educator@uky.edu'))
    expect(res.status).toBe(201)
    expect(prisma.tool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          published: false,
          deploymentMode: 'DEPARTMENT',
        }),
      }),
    )
  })
})
