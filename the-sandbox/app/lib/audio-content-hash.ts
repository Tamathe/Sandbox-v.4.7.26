import { createHash } from 'crypto'

/**
 * Normalizes raw source text to a canonical form for stable cache-key generation.
 * Strips noise (page numbers, bibliography sections, figure captions, repeated headers)
 * then collapses whitespace and lowercases.
 */
export function normalizeSource(text: string): string {
  const lines = text.split('\n')

  // Detect running headers: lines that appear 3+ times and are < 80 chars
  const lineCounts = new Map<string, number>()
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && trimmed.length < 80) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) ?? 0) + 1)
    }
  }
  const runningHeaders = new Set<string>()
  for (const [line, count] of lineCounts) {
    if (count >= 3) runningHeaders.add(line)
  }

  const filtered: string[] = []
  let inBibSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect bibliography / references section start — drop everything after
    if (/^(references|bibliography)$/i.test(trimmed)) {
      inBibSection = true
      continue
    }
    if (inBibSection) continue

    // Strip standalone page numbers
    if (/^\d+$/.test(trimmed)) continue
    if (/^page \d+/i.test(trimmed)) continue

    // Strip figure captions
    if (/^figure \d+[:.]/i.test(trimmed)) continue
    if (/^fig\. \d+/i.test(trimmed)) continue

    // Strip running headers (lines repeated 3+ times across the document)
    if (runningHeaders.has(trimmed)) continue

    filtered.push(line)
  }

  return filtered
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Returns a deterministic sha256 hex digest of the normalized source text.
 * Same input always produces the same output.
 */
export function contentHash(text: string): string {
  const normalized = normalizeSource(text)
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Returns a deterministic sha256 hex digest of a script JSON object.
 * Used as the Tier 3 cache key for AudioRender.scriptHash.
 */
export function scriptHash(scriptJson: unknown): string {
  const serialized = JSON.stringify(scriptJson)
  return createHash('sha256').update(serialized).digest('hex')
}
