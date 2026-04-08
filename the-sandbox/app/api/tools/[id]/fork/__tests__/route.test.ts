import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../../lib/prisma', () => {
  const prisma = {
    tool: {
      findUnique: vi.fn(),
    },
    buildSession: {
      create: vi.fn(),
    },
  }

  return {
    getPrismaClient: vi.fn(() => prisma),
  }
})

vi.mock('../../../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((value: unknown) => value != null && typeof value === 'object' && 'response' in value),
}))

vi.mock('../../../../../lib/tool-storefronts', () => ({
  getVisibleToolStorefrontSummary: vi.fn().mockResolvedValue({
    placementCount: 0,
    departmentCount: 0,
    placements: [],
  }),
}))

import { POST } from '../route'
import { getPrismaClient } from '../../../../../lib/prisma'
import { requireRequestUser } from '../../../../../lib/server-auth'
import { getVisibleToolStorefrontSummary } from '../../../../../lib/tool-storefronts'

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockGetPrismaClient = vi.mocked(getPrismaClient)
const mockGetVisibleToolStorefrontSummary = vi.mocked(getVisibleToolStorefrontSummary)

const routeParams = Promise.resolve({ id: 'tool-1' })

function buildRequest() {
  return new NextRequest('http://localhost:3000/api/tools/tool-1/fork', {
    method: 'POST',
    headers: {
      'x-demo-user-email': 'educator@uky.edu',
    },
  })
}

function authSuccess(overrides?: { id?: string; role?: string; email?: string }) {
  mockRequireRequestUser.mockResolvedValue({
    user: {
      id: overrides?.id ?? 'viewer-1',
      role: overrides?.role ?? 'EDUCATOR',
      email: overrides?.email ?? 'educator@uky.edu',
    },
  } as never)
}

function prismaMock() {
  return mockGetPrismaClient() as unknown as {
    tool: { findUnique: ReturnType<typeof vi.fn> }
    buildSession: { create: ReturnType<typeof vi.fn> }
  }
}

describe('POST /api/tools/[id]/fork', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSuccess()
    mockGetVisibleToolStorefrontSummary.mockResolvedValue({
      placementCount: 0,
      departmentCount: 0,
      placements: [],
    })
  })

  it('creates a sandbox clone session for an accessible tool', async () => {
    const prisma = prismaMock()
    prisma.tool.findUnique.mockResolvedValue({
      id: 'tool-1',
      name: 'Socratic Tutor',
      shortDescription: 'Short description',
      fullDescription: 'Long description',
      category: 'General',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 20,
      toolType: 'CHATBOT',
      systemPrompt: 'Prompt',
      personaName: 'Sandy',
      personaAvatar: null,
      welcomeMessage: 'Hello',
      starterQuestions: ['What do you want to learn?'],
      learningObjectives: ['Practice reasoning'],
      intendedAudience: 'Students',
      creatorId: 'creator-1',
      published: true,
      approvalStatus: 'APPROVED',
    } as never)
    prisma.buildSession.create.mockResolvedValue({ id: 'session-1' } as never)

    const response = await POST(buildRequest(), { params: routeParams })
    expect(response.status).toBe(200)
    expect(prisma.buildSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creatorId: 'viewer-1',
        title: 'Clone of Socratic Tutor',
      }),
    })

    const body = await response.json()
    expect(body.sessionId).toBe('session-1')
    expect(body.sourceToolId).toBe('tool-1')
  })

  it('blocks cloning unpublished tools without privileged or storefront access', async () => {
    const prisma = prismaMock()
    prisma.tool.findUnique.mockResolvedValue({
      id: 'tool-1',
      name: 'Hidden Tool',
      shortDescription: 'Short description',
      fullDescription: 'Long description',
      category: 'General',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 20,
      toolType: 'CHATBOT',
      systemPrompt: 'Prompt',
      personaName: 'Sandy',
      personaAvatar: null,
      welcomeMessage: 'Hello',
      starterQuestions: ['Question'],
      learningObjectives: ['Objective'],
      intendedAudience: 'Students',
      creatorId: 'creator-1',
      published: false,
      approvalStatus: 'APPROVED',
    } as never)

    const response = await POST(buildRequest(), { params: routeParams })
    expect(response.status).toBe(404)
  })

  it('allows cloning unpublished department-shared tools the viewer can access', async () => {
    const prisma = prismaMock()
    prisma.tool.findUnique.mockResolvedValue({
      id: 'tool-1',
      name: 'Department Template',
      shortDescription: 'Short description',
      fullDescription: 'Long description',
      category: 'General',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 20,
      toolType: 'CHATBOT',
      systemPrompt: 'Prompt',
      personaName: 'Sandy',
      personaAvatar: null,
      welcomeMessage: 'Hello',
      starterQuestions: ['Question'],
      learningObjectives: ['Objective'],
      intendedAudience: 'Students',
      creatorId: 'creator-1',
      published: false,
      approvalStatus: 'APPROVED',
    } as never)
    prisma.buildSession.create.mockResolvedValue({ id: 'session-2' } as never)
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

    const response = await POST(buildRequest(), { params: routeParams })
    expect(response.status).toBe(200)
  })

  it('blocks external tools from sandbox cloning', async () => {
    const prisma = prismaMock()
    prisma.tool.findUnique.mockResolvedValue({
      id: 'tool-1',
      name: 'External Tool',
      shortDescription: 'Short description',
      fullDescription: 'Long description',
      category: 'General',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 20,
      toolType: 'EXTERNAL',
      systemPrompt: null,
      personaName: null,
      personaAvatar: null,
      welcomeMessage: null,
      starterQuestions: [],
      learningObjectives: [],
      intendedAudience: null,
      creatorId: 'creator-1',
      published: true,
      approvalStatus: 'APPROVED',
    } as never)

    const response = await POST(buildRequest(), { params: routeParams })
    expect(response.status).toBe(409)

    const body = await response.json()
    expect(body.error).toContain('cannot be cloned')
  })

  it('passes auth failures through unchanged', async () => {
    mockRequireRequestUser.mockResolvedValue({
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    } as never)

    const response = await POST(buildRequest(), { params: routeParams })
    expect(response.status).toBe(401)
  })
})
