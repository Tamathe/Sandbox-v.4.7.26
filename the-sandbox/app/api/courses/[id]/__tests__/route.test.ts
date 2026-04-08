import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockCourseUpdate = vi.fn()
const mockCourseDelete = vi.fn()
const mockSyncCourseMaterialGovernance = vi.fn()

vi.mock('../../../../lib/prisma', () => ({
  prisma: {
    course: {
      update: (...args: unknown[]) => mockCourseUpdate(...(args as [unknown])),
      delete: (...args: unknown[]) => mockCourseDelete(...(args as [unknown])),
    },
  },
}))

vi.mock('../../../../lib/content-permissions', () => ({
  syncCourseMaterialGovernance: (...args: unknown[]) =>
    mockSyncCourseMaterialGovernance(...(args as [unknown])),
}))

const mockRequireCourseOwner = vi.fn()
const mockIsAuthFailure = vi.fn((result: { response?: unknown }) => 'response' in result)

vi.mock('../../../../lib/server-auth', () => ({
  requireCourseOwner: (...args: unknown[]) => mockRequireCourseOwner(...(args as [unknown])),
  isAuthFailure: (result: { response?: unknown }) => mockIsAuthFailure(result),
}))

import { DELETE, PATCH } from '../route'

function buildRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const url = 'http://localhost:3000/api/courses/course-1'
  if (method === 'GET' || method === 'DELETE') {
    return new NextRequest(url, { method })
  }

  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const EDUCATOR_USER = {
  id: 'edu-1',
  email: 'heath@uky.edu',
  role: 'EDUCATOR',
  name: 'Heath',
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/courses/[id]', () => {
  it('rejects non-owner with 403', async () => {
    const authResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    mockRequireCourseOwner.mockResolvedValue({ response: authResponse })

    const res = await PATCH(buildRequest('PATCH', { title: 'New Title' }), paramsFor('course-1'))

    expect(res.status).toBe(403)
    expect(mockCourseUpdate).not.toHaveBeenCalled()
  })

  it('updates title successfully and returns updated course', async () => {
    mockRequireCourseOwner.mockResolvedValue({ user: EDUCATOR_USER })

    const updatedCourse = { id: 'course-1', title: 'New Title', description: 'Old desc' }
    mockCourseUpdate.mockResolvedValue(updatedCourse)

    const res = await PATCH(buildRequest('PATCH', { title: 'New Title' }), paramsFor('course-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual(updatedCourse)
    expect(mockCourseUpdate).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { title: 'New Title' },
    })
  })

  it('updates only description when requested', async () => {
    mockRequireCourseOwner.mockResolvedValue({ user: EDUCATOR_USER })

    const updatedCourse = { id: 'course-1', title: 'Existing', description: 'Updated desc' }
    mockCourseUpdate.mockResolvedValue(updatedCourse)

    const res = await PATCH(
      buildRequest('PATCH', { description: 'Updated desc' }),
      paramsFor('course-1'),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual(updatedCourse)
    expect(mockCourseUpdate).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { description: 'Updated desc' },
    })
  })

  it('syncs material governance when visibility changes', async () => {
    mockRequireCourseOwner.mockResolvedValue({ user: EDUCATOR_USER })
    mockCourseUpdate.mockResolvedValue({ id: 'course-1', isPublic: false })
    mockSyncCourseMaterialGovernance.mockResolvedValue(undefined)

    const res = await PATCH(buildRequest('PATCH', { isPublic: false }), paramsFor('course-1'))

    expect(res.status).toBe(200)
    expect(mockSyncCourseMaterialGovernance).toHaveBeenCalledWith('course-1')
  })
})

describe('DELETE /api/courses/[id]', () => {
  it('rejects non-owner with 403', async () => {
    const authResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    mockRequireCourseOwner.mockResolvedValue({ response: authResponse })

    const res = await DELETE(buildRequest('DELETE'), paramsFor('course-1'))

    expect(res.status).toBe(403)
    expect(mockCourseDelete).not.toHaveBeenCalled()
  })

  it('deletes course and returns ok', async () => {
    mockRequireCourseOwner.mockResolvedValue({ user: EDUCATOR_USER })
    mockCourseDelete.mockResolvedValue({})

    const res = await DELETE(buildRequest('DELETE'), paramsFor('course-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(mockCourseDelete).toHaveBeenCalledWith({ where: { id: 'course-1' } })
  })
})
