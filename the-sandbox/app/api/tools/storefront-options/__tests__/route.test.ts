import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((result: unknown) => result != null && typeof result === 'object' && 'response' in result!),
}))

vi.mock('../../../../lib/tool-storefronts', () => ({
  listAvailableStorefrontCollectionsForUser: vi.fn(),
}))

import { GET } from '../route'
import { requireRequestUser } from '../../../../lib/server-auth'
import { listAvailableStorefrontCollectionsForUser } from '../../../../lib/tool-storefronts'

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockListAvailableStorefrontCollectionsForUser = vi.mocked(listAvailableStorefrontCollectionsForUser)

function buildRequest() {
  return new NextRequest('http://localhost:3000/api/tools/storefront-options', {
    method: 'GET',
    headers: {
      'x-demo-user-email': 'educator@uky.edu',
    },
  })
}

describe('GET /api/tools/storefront-options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns available department storefront collections for educators', async () => {
    mockRequireRequestUser.mockResolvedValue({
      user: {
        id: 'educator-1',
        role: 'EDUCATOR',
        email: 'educator@uky.edu',
      },
    } as never)
    mockListAvailableStorefrontCollectionsForUser.mockResolvedValue([
      {
        collectionId: 'collection-1',
        collectionName: 'Faculty Picks',
        collectionSlug: 'faculty-picks',
        visibility: 'PUBLIC',
        departmentId: 'dept-1',
        departmentName: 'Biology',
        departmentShortName: 'BIO',
        departmentSlug: 'biology',
      },
    ] as never)

    const response = await GET(buildRequest())
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.availableCollections).toHaveLength(1)
    expect(body.availableCollections[0].collectionId).toBe('collection-1')
  })

  it('blocks students from publish-time department deployment options', async () => {
    mockRequireRequestUser.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
        email: 'student@uky.edu',
      },
    } as never)

    const response = await GET(buildRequest())
    expect(response.status).toBe(403)

    const body = await response.json()
    expect(body.error).toBe('Department deployment is only available to educators and admins')
  })

  it('returns auth failures unchanged', async () => {
    mockRequireRequestUser.mockResolvedValue({
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    } as never)

    const response = await GET(buildRequest())
    expect(response.status).toBe(401)
  })
})
