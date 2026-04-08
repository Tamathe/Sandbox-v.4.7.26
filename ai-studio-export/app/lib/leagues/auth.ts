import { NextResponse, type NextRequest } from 'next/server'

import { prisma } from '../prisma'

export class LeagueHttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function getLeagueUserByEmail(email: string | null) {
  if (!email) return null

  return prisma.user.findUnique({
    where: { email },
  })
}

export async function requireLeagueUser(request: NextRequest) {
  const user = await getLeagueUserByEmail(request.headers.get('x-demo-user-email'))

  if (!user) {
    throw new LeagueHttpError(401, 'Unauthorized')
  }

  return user
}

export function assertLeagueAccess(condition: unknown, message: string, status = 403): asserts condition {
  if (!condition) {
    throw new LeagueHttpError(status, message)
  }
}

export function normalizeLeagueEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function leagueErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof LeagueHttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error(fallbackMessage, error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
