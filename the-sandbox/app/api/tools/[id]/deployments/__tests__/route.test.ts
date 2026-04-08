import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../../lib/prisma', () => ({
  prisma: {
    tool: {
      findUnique: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    courseToolLink: {
      findMany: vi.fn(),
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
  getVisibleToolStorefrontSummary: vi.fn().mockResolvedValue({
    placementCount: 0,
    departmentCount: 0,
    placements: [],
  }),
}))

import { GET, POST } from '../route'
import { prisma } from '../../../../../lib/prisma'
import {
  parseRequestBody,
  requireRequestUser,
} from '../../../../../lib/server-auth'
import { getVisibleToolStorefrontSummary } from '../../../../../lib/tool-storefronts'
import { validateBody } from '../../../../../lib/validate'

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockParseRequestBody = vi.mocked(parseRequestBody)
const mockGetVisibleToolStorefrontSummary = vi.mocked(getVisibleToolStorefrontSummary)
const mockValidateBody = vi.mocked(validateBody)

const routeParams = Promise.resolve({ id: 'tool-1' })

function buildRequest(method: 'GET' | 'POST', body?: unknown) {
  return new NextRequest('http://localhost:3000/api/tools/tool-1/deployments', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user-email': 'educator@uky.edu',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

function authSuccess() {
  mockRequireRequestUser.mockResolvedValue({
    user: {
      id: 'educator-1',
      role: 'EDUCATOR',
      email: 'educator@uky.edu',
    },
  } as never)
}

describe('GET /api/tools/[id]/deployments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSuccess()
    mockGetVisibleToolStorefrontSummary.mockResolvedValue({
      placementCount: 0,
      departmentCount: 0,
      placements: [],
    })
  })

  it('returns deployment summary, visible installs, and available courses', async () => {
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      creatorId: 'educator-1',
      published: true,
      deploymentMode: 'MARKETPLACE',
      approvalStatus: 'APPROVED',
      toolType: 'CHATBOT',
      externalUrl: null,
      isOfficialService: false,
      requiresInstitutionalReview: false,
      reviewedAt: null,
      reviewExpiresAt: null,
      referenceDocUrls: ['course://BIO101'],
      _count: { courseLinks: 1 },
    } as never)

    vi.mocked(prisma.courseToolLink.findMany).mockResolvedValue([
      {
        course: {
          id: 'course-1',
          courseCode: 'BIO101',
          title: 'Intro Biology',
          instructor: { name: 'Dr. Ellis' },
        },
      },
    ] as never)

    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: 'course-1',
        courseCode: 'BIO101',
        title: 'Intro Biology',
        instructor: { name: 'Dr. Ellis' },
      },
      {
        id: 'course-2',
        courseCode: 'BIO201',
        title: 'Cell Biology',
        instructor: { name: 'Dr. Ellis' },
      },
    ] as never)

    const response = await GET(buildRequest('GET'), { params: routeParams })
    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.deployment.state).toBe('catalog')
    expect(body.visibleAssignedCourses).toHaveLength(1)
    expect(body.availableCourses).toEqual([
      {
        id: 'course-2',
        courseCode: 'BIO201',
        title: 'Cell Biology',
        instructorName: 'Dr. Ellis',
      },
    ])
    expect(body.canAssign).toBe(true)
  })

  it('returns private deployment state for creator-owned unpublished tools before assignment', async () => {
    vi.mocked(prisma.tool.findUnique).mockResolvedValue({
      id: 'tool-1',
      creatorId: 'educator-1',
      published: false,
      deploymentMode: 'PRIVATE',
      approvalStatus: 'COMMUNITY',
      toolType: 'CHATBOT',
      externalUrl: null,
      isOfficialService: false,
      requiresInstitutionalReview: false,
      reviewedAt: null,
      reviewExpiresAt: null,
      referenceDocUrls: [],
      _count: { courseLinks: 0 },
    } as never)

    vi.mocked(prisma.courseToolLink.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: 'course-2',
        courseCode: 'BIO201',
        title: 'Cell Biology',
        instructor: { name: 'Dr. Ellis' },
      },
    ] as never)

    const response = await GET(buildRequest('GET'), { params: routeParams })
    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.deployment.state).toBe('private')
    expect(body.canAssign).toBe(true)
  })
})

describe('POST /api/tools/[id]/deployments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSuccess()
    mockGetVisibleToolStorefrontSummary.mockResolvedValue({
      placementCount: 0,
      departmentCount: 0,
      placements: [],
    })
    mockParseRequestBody.mockResolvedValue({ data: { courseId: 'course-2' } } as never)
    mockValidateBody.mockReturnValue({ value: { courseId: 'course-2' } } as never)
  })

  it('assigns a published tool to a managed course', async () => {
    vi.mocked(prisma.tool.findUnique)
      .mockResolvedValueOnce({
        id: 'tool-1',
        creatorId: 'educator-1',
        published: true,
        deploymentMode: 'MARKETPLACE',
        approvalStatus: 'APPROVED',
      } as never)
      .mockResolvedValueOnce({
        id: 'tool-1',
        creatorId: 'educator-1',
        published: true,
        deploymentMode: 'MARKETPLACE',
        approvalStatus: 'APPROVED',
        toolType: 'CHATBOT',
        externalUrl: null,
        isOfficialService: false,
        requiresInstitutionalReview: false,
        reviewedAt: null,
        reviewExpiresAt: null,
        referenceDocUrls: ['course://BIO201'],
        _count: { courseLinks: 1 },
      } as never)

    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: 'course-2',
      instructorId: 'educator-1',
    } as never)

    vi.mocked(prisma.courseToolLink.create).mockResolvedValue({
      id: 'link-1',
    } as never)

    vi.mocked(prisma.courseToolLink.findMany).mockResolvedValue([
      {
        course: {
          id: 'course-2',
          courseCode: 'BIO201',
          title: 'Cell Biology',
          instructor: { name: 'Dr. Ellis' },
        },
      },
    ] as never)

    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: 'course-2',
        courseCode: 'BIO201',
        title: 'Cell Biology',
        instructor: { name: 'Dr. Ellis' },
      },
    ] as never)

    const response = await POST(buildRequest('POST', { courseId: 'course-2' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(201)
    expect(prisma.courseToolLink.create).toHaveBeenCalledWith({
      data: {
        courseId: 'course-2',
        toolId: 'tool-1',
      },
    })

    const body = await response.json()
    expect(body.visibleAssignedCourses).toHaveLength(1)
    expect(body.deployment.courseCount).toBe(1)
  })

  it('assigns an unpublished creator-owned tool to a managed course', async () => {
    vi.mocked(prisma.tool.findUnique)
      .mockResolvedValueOnce({
        id: 'tool-1',
        creatorId: 'educator-1',
        published: false,
        deploymentMode: 'PRIVATE',
        approvalStatus: 'COMMUNITY',
      } as never)
      .mockResolvedValueOnce({
        id: 'tool-1',
        creatorId: 'educator-1',
        published: false,
        deploymentMode: 'PRIVATE',
        approvalStatus: 'COMMUNITY',
        toolType: 'CHATBOT',
        externalUrl: null,
        isOfficialService: false,
        requiresInstitutionalReview: false,
        reviewedAt: null,
        reviewExpiresAt: null,
        referenceDocUrls: ['course://BIO201'],
        _count: { courseLinks: 1 },
      } as never)

    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: 'course-2',
      instructorId: 'educator-1',
    } as never)

    vi.mocked(prisma.courseToolLink.create).mockResolvedValue({
      id: 'link-1',
    } as never)

    vi.mocked(prisma.courseToolLink.findMany).mockResolvedValue([
      {
        course: {
          id: 'course-2',
          courseCode: 'BIO201',
          title: 'Cell Biology',
          instructor: { name: 'Dr. Ellis' },
        },
      },
    ] as never)

    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: 'course-2',
        courseCode: 'BIO201',
        title: 'Cell Biology',
        instructor: { name: 'Dr. Ellis' },
      },
    ] as never)

    const response = await POST(buildRequest('POST', { courseId: 'course-2' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(201)
  })

  it('returns auth failures unchanged', async () => {
    mockRequireRequestUser.mockResolvedValue({
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    } as never)

    const response = await POST(buildRequest('POST', { courseId: 'course-2' }), {
      params: routeParams,
    })

    expect(response).toBeDefined()
    if (!response) throw new Error('Expected a response')
    expect(response.status).toBe(401)
  })
})
