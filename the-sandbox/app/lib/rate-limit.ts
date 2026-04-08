/**
 * Rate limiting for AI endpoints.
 *
 * Uses Upstash Ratelimit (Redis-backed, cross-instance) when configured.
 * Silently allows all requests when Redis is not configured (dev / no Upstash).
 *
 * Tiers:
 *   CHAT        — 60 req / 60 s  (streaming chat, concierge)
 *   GENERATE    — 10 req / 60 s  (tool generation, bot generation — expensive Sonnet calls)
 *   AUDIO       — 20 req / 60 s  (OpenAI TTS)
 *   API         — 120 req / 60 s (general API)
 *   AUTH_LOGIN  —  5 req / 60 s  (login attempts)
 *   AUTH_SIGNUP —  3 req / 60 s  (signup attempts)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { NextRequest, NextResponse } from 'next/server'

import { redis } from './redis'

export type RateLimitTier = 'CHAT' | 'GENERATE' | 'AUDIO' | 'API' | 'AUTH_LOGIN' | 'AUTH_SIGNUP'

// Multiplier applied to EDUCATOR and ADMIN users to give them more headroom
// during tool building / testing.
const ELEVATED_MULTIPLIER = 3

function buildLimiters() {
  if (!redis) return null

  return {
    CHAT: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      prefix: 'rl:chat',
    }),
    GENERATE: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'rl:generate',
    }),
    AUDIO: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'rl:audio',
    }),
    API: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, '60 s'),
      prefix: 'rl:api',
    }),
    AUTH_LOGIN: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'rl:auth-login',
    }),
    AUTH_SIGNUP: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '60 s'),
      prefix: 'rl:auth-signup',
    }),
  }
}

function buildElevatedLimiters() {
  if (!redis) return null

  return {
    CHAT: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60 * ELEVATED_MULTIPLIER, '60 s'),
      prefix: 'rl:elevated:chat',
    }),
    GENERATE: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10 * ELEVATED_MULTIPLIER, '60 s'),
      prefix: 'rl:elevated:generate',
    }),
    AUDIO: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20 * ELEVATED_MULTIPLIER, '60 s'),
      prefix: 'rl:elevated:audio',
    }),
    API: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120 * ELEVATED_MULTIPLIER, '60 s'),
      prefix: 'rl:elevated:api',
    }),
    AUTH_LOGIN: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5 * ELEVATED_MULTIPLIER, '60 s'),
      prefix: 'rl:elevated:auth-login',
    }),
    AUTH_SIGNUP: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3 * ELEVATED_MULTIPLIER, '60 s'),
      prefix: 'rl:elevated:auth-signup',
    }),
  }
}

const globalForLimiters = globalThis as unknown as {
  rateLimiters: ReturnType<typeof buildLimiters>
  elevatedLimiters: ReturnType<typeof buildElevatedLimiters>
}

const limiters = globalForLimiters.rateLimiters ?? buildLimiters()
const elevatedLimiters = globalForLimiters.elevatedLimiters ?? buildElevatedLimiters()
if (process.env.NODE_ENV !== 'production') {
  globalForLimiters.rateLimiters = limiters
  globalForLimiters.elevatedLimiters = elevatedLimiters
}

/**
 * Check rate limit for the given tier.
 *
 * @param req      - The incoming request (used to derive a fallback identifier).
 * @param userId   - Authenticated user ID (null for anonymous requests).
 * @param tier     - Which tier to check against.
 * @param elevated - Pass true for EDUCATOR/ADMIN to get the higher limit.
 *
 * @returns null if the request is allowed; a 429 NextResponse if throttled.
 */
export async function checkRateLimit(
  req: NextRequest,
  userId: string | null,
  tier: RateLimitTier,
  elevated = false,
): Promise<NextResponse | null> {
  if (!limiters) return null // Redis not configured — allow all

  const limiter = limiters[tier]

  // Key: prefer userId so limits are per-user, fall back to IP.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anon'
  const identifier = userId ? `user:${userId}` : `ip:${ip}`

  // For elevated users we check a higher-limit variant by using a separate prefix.
  const effectiveIdentifier = elevated ? `elevated:${identifier}` : identifier

  // Apply elevated multiplier using pre-built elevated limiters (cached at startup).
  if (elevated) {
    if (!elevatedLimiters) return null // Redis not configured — allow all
    const result = await elevatedLimiters[tier].limit(effectiveIdentifier)
    if (!result.success) {
      return rateLimitResponse(result.reset)
    }
    return null
  }

  const result = await limiter.limit(identifier)
  if (!result.success) {
    return rateLimitResponse(result.reset)
  }
  return null
}

function rateLimitResponse(resetTimestamp: number): NextResponse {
  const retryAfterSecs = Math.max(1, Math.ceil((resetTimestamp - Date.now()) / 1000))
  return NextResponse.json(
    {
      error: "You're sending requests too quickly. Please wait a moment and try again.",
      retryAfter: retryAfterSecs,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSecs) },
    },
  )
}
