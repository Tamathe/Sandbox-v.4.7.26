/**
 * WebSocket token signing/verification for Sandcastle rooms.
 *
 * Token payload: { userId, roomId, role: 'HOST' | 'PARTICIPANT' }
 * Signed with SANDCASTLE_WS_SECRET, HS256, 1h expiry.
 *
 * Issued at room creation (HOST) and room join (PARTICIPANT).
 * The token is reserved for future native WebSocket upgrade; Phase 1
 * uses SSE + REST, so this token is included in responses but not yet
 * consumed by a WS handshake.
 */

import jwt from 'jsonwebtoken'

export type WsRole = 'HOST' | 'PARTICIPANT'

export interface WsTokenPayload {
  userId: string
  roomId: string
  role: WsRole
}

function getSecret(): string {
  const secret = process.env.SANDCASTLE_WS_SECRET
  if (!secret) throw new Error('SANDCASTLE_WS_SECRET is not set')
  return secret
}

export function signWsToken(userId: string, roomId: string, role: WsRole): string {
  return jwt.sign({ userId, roomId, role } satisfies WsTokenPayload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: '1h',
  })
}

export function verifyWsToken(token: string): WsTokenPayload | null {
  try {
    const secret = process.env.SANDCASTLE_WS_SECRET
    if (!secret) return null
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as WsTokenPayload
    if (!payload.userId || !payload.roomId || !payload.role) return null
    return payload
  } catch {
    return null
  }
}
