import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Standard mock users matching the demo users
export const MOCK_USERS = {
  admin: { id: 'user-admin', email: 'heath.price@uky.edu', name: 'Heath Price', role: 'ADMIN' as const, title: 'Platform Admin', studyGroup: null, lastSeenAt: new Date(), createdAt: new Date(), suspended: false },
  educator: { id: 'user-educator', email: 'katie.thompson@uky.edu', name: 'Katie Thompson', role: 'EDUCATOR' as const, title: 'Professor', studyGroup: null, lastSeenAt: new Date(), createdAt: new Date(), suspended: false },
  student: { id: 'user-student', email: 'tiana.the.student@uky.edu', name: 'Tiana The', role: 'STUDENT' as const, title: null, studyGroup: 'treatment', lastSeenAt: new Date(), createdAt: new Date(), suspended: false },
} as const

export function buildRequest(url: string, options: {
  method?: string
  email?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const { method = 'GET', email, body, searchParams } = options
  const fullUrl = new URL(url, 'http://localhost:3000')
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      fullUrl.searchParams.set(k, v)
    }
  }
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'x-demo-user-email': email } : {}),
    },
  }
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(fullUrl, init as any)
}

// Helper to setup auth mock responses
export function mockAuthSuccess(mockFn: ReturnType<typeof vi.fn>, user: typeof MOCK_USERS[keyof typeof MOCK_USERS]) {
  mockFn.mockResolvedValue({ user })
}

export function mockAuthFailure(mockFn: ReturnType<typeof vi.fn>, status: number, message: string) {
  const { NextResponse } = require('next/server')
  mockFn.mockResolvedValue({
    response: NextResponse.json({ error: message }, { status }),
  })
}
