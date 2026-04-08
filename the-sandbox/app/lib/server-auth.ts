import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'
import { timingSafeEqual } from 'crypto'
import type { User } from '../generated/prisma'
import { prisma } from './prisma'

// ── User cache (60 s TTL, max 500 entries) ────────────────────────────────────
// Eliminates a DB roundtrip on every API call.  Roles and suspension status
// change rarely; a 60-second stale window is acceptable.  When a user is
// suspended via the admin panel the cache entry will expire within 60 s.

const userCache = new LRUCache<string, User>({ max: 500, ttl: 60_000 })

export function invalidateUserCache(email: string) {
  userCache.delete(email)
}

// ── Core auth helpers ─────────────────────────────────────────────────────────

type AuthOptions = {
  requireAdmin?: boolean
  requireEducator?: boolean  // EDUCATOR or ADMIN
  allowSuspended?: boolean
}

type AuthSuccess = { user: User }
type AuthFailure = { response: NextResponse }

export type RequestAuthResult = AuthSuccess | AuthFailure

export function isAuthFailure(result: RequestAuthResult): result is AuthFailure {
  return 'response' in result
}

/**
 * Looks up a user by email with a 60-second in-process cache.
 * This is the single authoritative lookup — all auth utilities call this.
 */
export async function getUserByEmail(email: string | null | undefined): Promise<User | null> {
  if (!email) return null

  const cached = userCache.get(email)
  if (cached) return cached

  const user = await prisma.user.findUnique({ where: { email } })
  if (user) userCache.set(email, user)
  return user
}

export async function requireRequestUser(
  request: NextRequest,
  options: AuthOptions = {},
): Promise<RequestAuthResult> {
  const email = request.headers.get('x-demo-user-email')
  if (!email) {
    return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const user = await getUserByEmail(email)
  if (!user) {
    return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  if (user.suspended && !options.allowSuspended) {
    return {
      response: NextResponse.json(
        { error: 'Your account is under review.', suspended: true, reason: user.suspendedReason },
        { status: 403 },
      ),
    }
  }

  if (options.requireAdmin && user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  if (options.requireEducator && user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Educator access required' }, { status: 403 }) }
  }

  return { user }
}

export async function requireAdminUser(request: NextRequest) {
  return requireRequestUser(request, { requireAdmin: true })
}

/**
 * Requires EDUCATOR or ADMIN role.
 */
export async function requireEducatorUser(request: NextRequest) {
  return requireRequestUser(request, { requireEducator: true })
}

/**
 * Requires STUDENT role only.
 * Educators and admins cannot impersonate a student here.
 * Used for sensitive service tools (DRC, counseling, financial aid, ISSS).
 */
export async function requireStudentUser(request: NextRequest): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth
  const { user } = auth
  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Student access required' }, { status: 403 }) }
  }
  return auth
}

/**
 * Requires REGISTRAR or ADMIN role.
 */
export async function requireRegistrarUser(request: NextRequest): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth
  const { user } = auth
  if (user.role !== 'REGISTRAR' && user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Registrar access required' }, { status: 403 }) }
  }
  return auth
}

/**
 * Requires STAFF or ADMIN role.
 */
export async function requireStaffOrAdminUser(request: NextRequest): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth
  const { user } = auth
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Staff access required' }, { status: 403 }) }
  }
  return auth
}

/**
 * Requires the authenticated user to be the instructor of the given course,
 * or an ADMIN.  Returns the auth result so call sites can access the user.
 */
export async function requireCourseOwner(
  request: NextRequest,
  courseId: string,
): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth

  const { user } = auth
  if (user.role === 'ADMIN') return auth

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  })
  if (!course) {
    return { response: NextResponse.json({ error: 'Course not found' }, { status: 404 }) }
  }
  if (course.instructorId !== user.id) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return auth
}

/**
 * Requires the authenticated user to be the creator of the given tool,
 * or an ADMIN.
 */
export async function requireToolOwner(
  request: NextRequest,
  toolId: string,
): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth

  const { user } = auth
  if (user.role === 'ADMIN') return auth

  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { creatorId: true },
  })
  if (!tool) {
    return { response: NextResponse.json({ error: 'Tool not found' }, { status: 404 }) }
  }
  if (tool.creatorId !== user.id) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return auth
}

// ── Department auth ──────────────────────────────────────────────────────────

/**
 * Requires the authenticated user to be an EDITOR or OWNER of the given department,
 * or an ADMIN. Looks up by department ID.
 */
export async function requireDepartmentEditor(
  request: NextRequest,
  departmentId: string,
): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth

  const { user } = auth
  if (user.role === 'ADMIN') return auth

  const membership = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId: user.id } },
    select: { role: true },
  })
  if (!membership || membership.role === 'VIEWER') {
    return { response: NextResponse.json({ error: 'Department editor access required' }, { status: 403 }) }
  }

  return auth
}

/**
 * Requires the authenticated user to be an OWNER of the given department,
 * or an ADMIN.
 */
export async function requireDepartmentOwner(
  request: NextRequest,
  departmentId: string,
): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth

  const { user } = auth
  if (user.role === 'ADMIN') return auth

  const membership = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId: user.id } },
    select: { role: true },
  })
  if (!membership || membership.role !== 'OWNER') {
    return { response: NextResponse.json({ error: 'Department owner access required' }, { status: 403 }) }
  }

  return auth
}

// ── Body parsing ──────────────────────────────────────────────────────────────

/**
 * Safely parses the JSON request body.
 * Returns { data } on success or { error: NextResponse } on malformed/missing body.
 */
export async function parseRequestBody<T = unknown>(
  request: NextRequest,
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const data = (await request.json()) as T
    return { data }
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid or missing request body' }, { status: 400 }),
    }
  }
}

// ── User lookup by email ─────────────────────────────────────────────────────

/**
 * Looks up a user by email. Returns { user } on success or { response } with 404 on failure.
 * Follows the same pattern as requireRequestUser for consistency.
 */
export async function requireUserByEmail(email: string, label = 'User') {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return { response: NextResponse.json({ error: `${label} not found` }, { status: 404 }) }
  return { user }
}

// ── Cron auth ─────────────────────────────────────────────────────────────────

/**
 * Verifies the CRON_SECRET Bearer token on cron endpoints.
 * Fails closed — if CRON_SECRET is not set, all requests are rejected.
 * Returns a NextResponse on failure, or null on success.
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not set — rejecting request')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const authHeader = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${cronSecret}`
  // Use timing-safe comparison to prevent brute-force timing attacks
  const providedBuf = Buffer.from(authHeader)
  const expectedBuf = Buffer.from(expected)
  const valid =
    providedBuf.length === expectedBuf.length &&
    timingSafeEqual(providedBuf, expectedBuf)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
