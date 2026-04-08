import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../../lib/server-auth', () => ({
  requireCourseOwner: vi.fn(),
  parseRequestBody: vi.fn(),
  isAuthFailure: vi.fn((result: unknown) => result != null && typeof result === 'object' && 'response' in result),
}))

vi.mock('../../../../../lib/faculty/ai-policy-builder', () => ({
  savePolicyBuilderDraft: vi.fn(),
}))

import { POST } from '../route'
import { requireCourseOwner, parseRequestBody } from '../../../../../lib/server-auth'
import { savePolicyBuilderDraft } from '../../../../../lib/faculty/ai-policy-builder'

const mockRequireCourseOwner = vi.mocked(requireCourseOwner)
const mockParseRequestBody = vi.mocked(parseRequestBody)
const mockSavePolicyBuilderDraft = vi.mocked(savePolicyBuilderDraft)

function buildRequest() {
  return new NextRequest('http://localhost:3000/api/write-room/ai-policy-builder/save', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-demo-user-email': 'katie.thompson@uky.edu',
    },
    body: JSON.stringify({}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/write-room/ai-policy-builder/save', () => {
  it('returns auth failures from requireCourseOwner', async () => {
    mockParseRequestBody.mockResolvedValue({
      data: {
        courseId: 'course-1',
        saveMode: 'append',
        policy: {
          title: 'AI Policy',
          policyType: 'academic_integrity',
          content: 'Draft text',
        },
      },
    } as never)
    mockRequireCourseOwner.mockResolvedValue({
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    } as never)

    const response = await POST(buildRequest())

    expect(response.status).toBe(403)
    expect(mockSavePolicyBuilderDraft).not.toHaveBeenCalled()
  })

  it('saves the generated policy through the shared service', async () => {
    mockParseRequestBody.mockResolvedValue({
      data: {
        courseId: 'course-1',
        saveMode: 'replace',
        replacePolicyId: 'policy-1',
        policy: {
          title: 'Generative AI Use and Academic Integrity',
          policyType: 'academic_integrity',
          content: 'AI support is allowed with disclosure.',
        },
      },
    } as never)
    mockRequireCourseOwner.mockResolvedValue({
      user: {
        id: 'educator-1',
        role: 'EDUCATOR',
        email: 'katie.thompson@uky.edu',
      },
    } as never)
    mockSavePolicyBuilderDraft.mockResolvedValue({
      savedPolicy: {
        id: 'policy-1',
        policyType: 'academic_integrity',
        title: 'Generative AI Use and Academic Integrity',
        content: 'AI support is allowed with disclosure.',
        source: 'ai_policy_builder',
        createdAt: '2026-03-25T12:00:00.000Z',
      },
      saveMode: 'replace',
      replacedPolicyId: 'policy-1',
      changeRecorded: true,
      acknowledgmentReset: true,
      policiesCount: 2,
    })

    const response = await POST(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mockSavePolicyBuilderDraft).toHaveBeenCalledWith('educator-1', {
      courseId: 'course-1',
      saveMode: 'replace',
      replacePolicyId: 'policy-1',
      policy: {
        title: 'Generative AI Use and Academic Integrity',
        policyType: 'academic_integrity',
        content: 'AI support is allowed with disclosure.',
      },
    })
    expect(payload.changeRecorded).toBe(true)
    expect(payload.acknowledgmentReset).toBe(true)
  })
})
