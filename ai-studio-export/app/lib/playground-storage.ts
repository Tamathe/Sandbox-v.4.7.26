import { NextRequest, NextResponse } from 'next/server'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { Prisma } from '../generated/prisma'
import { prisma } from './prisma'

export type PlaygroundTokenRole = 'creator' | 'user'

export interface PlaygroundStorageTokenPayload extends JwtPayload {
  userId: string
  email: string
  appId: string
  role: PlaygroundTokenRole
}

export class PlaygroundHttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const PLAYGROUND_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  Vary: 'Origin',
} as const

function getStorageSecret() {
  const secret = process.env.STORAGE_JWT_SECRET?.trim()

  if (!secret) {
    throw new PlaygroundHttpError(503, 'STORAGE_JWT_SECRET is not configured')
  }

  return secret
}

export async function requireDemoUser(request: NextRequest) {
  const email = request.headers.get('x-demo-user-email')
  if (!email) {
    throw new PlaygroundHttpError(401, 'Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  if (!user) {
    throw new PlaygroundHttpError(404, 'User not found')
  }

  return user
}

export async function getPlaygroundAppRole(appId: string, user: { id: string; role: string }) {
  const app = await prisma.playgroundApp.findUnique({
    where: { id: appId },
    select: {
      id: true,
      creatorId: true,
      delegates: {
        where: { userId: user.id },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!app) {
    throw new PlaygroundHttpError(404, 'Playground app not found')
  }

  if (user.role === 'ADMIN' || app.creatorId === user.id || app.delegates.length > 0) {
    return 'creator' as const
  }

  return 'user' as const
}

export function signPlaygroundStorageToken(payload: Omit<PlaygroundStorageTokenPayload, 'iat' | 'exp'>) {
  return jwt.sign(payload, getStorageSecret(), { expiresIn: '1h' })
}

export function verifyPlaygroundStorageToken(request: NextRequest, appId: string) {
  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new PlaygroundHttpError(401, 'Missing bearer token')
  }

  const token = authorization.slice('Bearer '.length).trim()

  if (!token) {
    throw new PlaygroundHttpError(401, 'Missing bearer token')
  }

  let decoded: string | JwtPayload

  try {
    decoded = jwt.verify(token, getStorageSecret())
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new PlaygroundHttpError(401, 'Token expired')
    }

    throw new PlaygroundHttpError(401, 'Invalid token')
  }

  if (typeof decoded === 'string') {
    throw new PlaygroundHttpError(401, 'Invalid token payload')
  }

  const payload = decoded as PlaygroundStorageTokenPayload

  if (!payload.userId || !payload.email || !payload.appId || !payload.role) {
    throw new PlaygroundHttpError(401, 'Invalid token payload')
  }

  if (payload.appId !== appId) {
    throw new PlaygroundHttpError(403, 'Token does not match this app')
  }

  return payload
}

export function assertCreatorRole(payload: PlaygroundStorageTokenPayload) {
  if (payload.role !== 'creator') {
    throw new PlaygroundHttpError(403, 'Forbidden')
  }
}

export function getSerializedSize(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8')
  } catch {
    throw new PlaygroundHttpError(400, 'Value must be JSON-serializable')
  }
}

export function buildUserStoreUniqueKey(appId: string, userId: string, key: string) {
  return `user:${appId}:${userId}:${key}`
}

export function buildConfigStoreUniqueKey(appId: string, key: string) {
  return `config:${appId}:${key}`
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(max, parsed)
}

export function toPlaygroundJsonValue(value: unknown): Prisma.InputJsonValue {
  try {
    const serialized = JSON.stringify(value)

    if (serialized === undefined) {
      throw new PlaygroundHttpError(400, 'Value must be JSON-serializable')
    }

    return JSON.parse(serialized) as Prisma.InputJsonValue
  } catch (error) {
    if (error instanceof PlaygroundHttpError) {
      throw error
    }

    throw new PlaygroundHttpError(400, 'Value must be JSON-serializable')
  }
}

function getComparableValue(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value instanceof Date) return value.getTime()
  return 0
}

export function sortStoreEntries<T extends { createdAt: Date; data: unknown }>(
  entries: T[],
  orderBy: string,
  order: 'asc' | 'desc'
) {
  const multiplier = order === 'asc' ? 1 : -1

  return [...entries].sort((left, right) => {
    const leftValue =
      orderBy === 'createdAt'
        ? left.createdAt.getTime()
        : getComparableValue(
            typeof left.data === 'object' && left.data !== null
              ? (left.data as Record<string, unknown>)[orderBy]
              : undefined
          )

    const rightValue =
      orderBy === 'createdAt'
        ? right.createdAt.getTime()
        : getComparableValue(
            typeof right.data === 'object' && right.data !== null
              ? (right.data as Record<string, unknown>)[orderBy]
              : undefined
          )

    if (leftValue === rightValue) return 0
    return leftValue > rightValue ? multiplier : -multiplier
  })
}

export function handlePlaygroundError(error: unknown, context: string) {
  if (error instanceof PlaygroundHttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error(context, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function withPlaygroundCors(response: Response) {
  const nextResponse = new Response(response.body, response)

  for (const [key, value] of Object.entries(PLAYGROUND_CORS_HEADERS)) {
    nextResponse.headers.set(key, value)
  }

  return nextResponse
}

export function playgroundCorsPreflight() {
  return new NextResponse(null, {
    status: 204,
    headers: PLAYGROUND_CORS_HEADERS,
  })
}
