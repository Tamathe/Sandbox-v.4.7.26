import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import * as prismaModule from '../../../../../lib/prisma'
import * as serverAuth from '../../../../../lib/server-auth'
import * as provenanceService from '../../../../../lib/provenance-service'
import * as contentPermissions from '../../../../../lib/content-permissions'

const mockCourseFindUnique = vi.spyOn(prismaModule.prisma.course, 'findUnique')
const mockCourseUpdate = vi.spyOn(prismaModule.prisma.course, 'update')
const mockRequireRequestUser = vi.spyOn(serverAuth, 'requireRequestUser')
const mockRequireCourseOwner = vi.spyOn(serverAuth, 'requireCourseOwner')
const mockGetCourseGovernanceSummary = vi.spyOn(provenanceService, 'getCourseGovernanceSummary')
const mockSyncCourseMaterialGovernance = vi.spyOn(
  contentPermissions,
  'syncCourseMaterialGovernance',
)

const { GET, PATCH } = await import('../route')

function buildRequest(method: string, body?: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/courses/course-1/content-governance', {
    method,
    headers: {
      'content-type': 'application/json',
      'x-demo-user-email': 'educator@uky.edu',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

const EDUCATOR = {
  id: 'edu-1',
  role: 'EDUCATOR',
  email: 'educator@uky.edu',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/courses/[id]/content-governance', () => {
  it('returns governance summary for an accessible course', async () => {
    mockRequireRequestUser.mockResolvedValue({ user: EDUCATOR } as never)
    mockCourseFindUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'edu-1',
      isPublic: false,
    } as never)
    mockGetCourseGovernanceSummary.mockResolvedValue({
      course: {
        id: 'course-1',
        courseCode: 'BIO-101',
        title: 'Intro Biology',
        isPublic: false,
        instructorName: 'Heath',
        flags: {
          facultyAiRetrievalApproved: true,
          studentUploadsAllowed: false,
          transcriptGenerationAllowed: false,
          classroomRecordingAllowed: false,
        },
      },
      consent: null,
      policySummary: {
        totalPolicies: 2,
        totalWeights: 1,
        ackCount: 4,
        latestChangeAt: null,
      },
      sourceSummary: {
        totalSources: 3,
        officialSources: 3,
        userUploadedSources: 0,
        simulatedSources: 0,
        inferredSources: 0,
        allowedSources: 3,
        blockedSources: 0,
      },
      recentSources: [],
    } as never)

    const res = await GET(buildRequest('GET'), paramsFor('course-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.course.courseCode).toBe('BIO-101')
    expect(mockGetCourseGovernanceSummary).toHaveBeenCalledWith({
      courseId: 'course-1',
      viewer: { id: 'edu-1', role: 'EDUCATOR' },
    })
  })
})

describe('PATCH /api/courses/[id]/content-governance', () => {
  it('updates governance flags and re-syncs course materials', async () => {
    mockRequireCourseOwner.mockResolvedValue({ user: EDUCATOR } as never)
    mockCourseUpdate.mockResolvedValue({ id: 'course-1' } as never)
    mockSyncCourseMaterialGovernance.mockResolvedValue(undefined)
    mockGetCourseGovernanceSummary.mockResolvedValue({
      course: {
        id: 'course-1',
        courseCode: 'BIO-101',
        title: 'Intro Biology',
        isPublic: false,
        instructorName: 'Heath',
        flags: {
          facultyAiRetrievalApproved: false,
          studentUploadsAllowed: true,
          transcriptGenerationAllowed: true,
          classroomRecordingAllowed: false,
        },
      },
      consent: null,
      policySummary: {
        totalPolicies: 2,
        totalWeights: 1,
        ackCount: 4,
        latestChangeAt: null,
      },
      sourceSummary: {
        totalSources: 3,
        officialSources: 2,
        userUploadedSources: 1,
        simulatedSources: 0,
        inferredSources: 0,
        allowedSources: 1,
        blockedSources: 2,
      },
      recentSources: [],
    } as never)

    const res = await PATCH(
      buildRequest('PATCH', {
        facultyAiRetrievalApproved: false,
        studentUploadsAllowed: true,
        transcriptGenerationAllowed: true,
      }),
      paramsFor('course-1'),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.course.flags.facultyAiRetrievalApproved).toBe(false)
    expect(mockCourseUpdate).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: {
        facultyAiRetrievalApproved: false,
        studentUploadsAllowed: true,
        transcriptGenerationAllowed: true,
      },
    })
    expect(mockSyncCourseMaterialGovernance).toHaveBeenCalledWith('course-1')
  })

  it('returns auth failures from requireCourseOwner', async () => {
    const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    mockRequireCourseOwner.mockResolvedValue({ response } as never)

    const res = await PATCH(buildRequest('PATCH', {}), paramsFor('course-1'))

    expect(res.status).toBe(403)
    expect(mockCourseUpdate).not.toHaveBeenCalled()
  })
})
