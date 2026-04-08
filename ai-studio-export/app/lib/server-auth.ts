import { NextRequest, NextResponse } from 'next/server'
import type { User } from '../generated/prisma'
import { prisma } from './prisma'

type AuthOptions = {
  requireAdmin?: boolean
  allowSuspended?: boolean
}

type AuthSuccess = { user: User }
type AuthFailure = { response: NextResponse }

export type RequestAuthResult = AuthSuccess | AuthFailure

export function isAuthFailure(result: RequestAuthResult): result is AuthFailure {
  return 'response' in result
}

export async function getUserByEmail(email: string | null | undefined) {
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

export async function requireRequestUser(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<RequestAuthResult> {
  const email = request.headers.get('x-demo-user-email')
  if (!email) {
    return {
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  const user = await getUserByEmail(email)
  if (!user) {
    return {
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    }
  }

  if (user.suspended && !options.allowSuspended) {
    return {
      response: NextResponse.json(
        {
          error: 'Your account is under review.',
          suspended: true,
          reason: user.suspendedReason,
        },
        { status: 403 }
      ),
    }
  }

  if (options.requireAdmin && user.role !== 'ADMIN') {
    return {
      response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    }
  }

  return { user }
}

export async function requireAdminUser(request: NextRequest) {
  return requireRequestUser(request, { requireAdmin: true })
}

/**
 * Safely parses the JSON request body.
 * Returns { data } on success or { error: NextResponse } on malformed/missing body.
 */
export async function parseRequestBody<T = unknown>(
  request: NextRequest
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const data = (await request.json()) as T
    return { data }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid or missing request body' },
        { status: 400 }
      ),
    }
  }
}

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
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
