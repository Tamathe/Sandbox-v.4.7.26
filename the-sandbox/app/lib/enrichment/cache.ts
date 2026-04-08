import type { EnrichmentResult } from './types'

// ─── Simple in-memory TTL cache (24 hours) ────────────────────────────────────
// No Redis required in demo mode. Keyed by email (lowercased).

const TTL_MS = 24 * 60 * 60 * 1000

type CacheEntry = {
  result:    EnrichmentResult
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function getCached(email: string): EnrichmentResult | null {
  const entry = cache.get(email.toLowerCase())
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(email.toLowerCase())
    return null
  }
  return entry.result
}

export function setCached(email: string, result: EnrichmentResult): void {
  cache.set(email.toLowerCase(), {
    result,
    expiresAt: Date.now() + TTL_MS,
  })
}

export function invalidateCached(email: string): void {
  cache.delete(email.toLowerCase())
}
