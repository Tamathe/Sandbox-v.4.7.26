/**
 * Campus Pulse Early Warning — Type Definitions
 *
 * Signal streams, pulse events, severity classification, and shared types
 * for the multi-signal correlation engine.
 */

// ---------------------------------------------------------------------------
// Signal Streams
// ---------------------------------------------------------------------------

export type SignalStream =
  | 'uknow'
  | 'email-urgency'
  | 'at-risk'
  | 'sentiment'
  | 'policy'
  | 'office-hours'
  | 'course-posts'
  | 'submissions'

export interface RawSignal {
  stream: SignalStream
  theme: string
  evidence: string
  dataPoints: number
  strength: number          // 0–1
  firstSeen: Date
  lastSeen: Date
  sourceIds: string[]
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Correlation Results
// ---------------------------------------------------------------------------

export interface CorrelationResult {
  theme: string
  signals: RawSignal[]
  correlationScore: number  // 0–1
}

// ---------------------------------------------------------------------------
// Pulse Event (mirrors Prisma model shape for service layer)
// ---------------------------------------------------------------------------

export type PulseSeverity = 'low' | 'medium' | 'high' | 'critical'

export type PulseStatus = 'active' | 'acknowledged' | 'resolved' | 'false-alarm'

export interface PulseEventData {
  id: string
  detectedAt: Date
  theme: string
  severity: PulseSeverity
  status: PulseStatus
  summary: string
  suggestedActions: string[]
  affectedRoles: string[]
  affectedCourses: string[]
  signals: PulseSignalData[]
  acknowledgedBy: string | null
  acknowledgedAt: Date | null
  resolvedBy: string | null
  resolvedAt: Date | null
  resolvedNote: string | null
  escalatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PulseSignalData {
  id: string
  stream: string
  evidence: string
  dataPoints: number
  strength: number
  firstSeen: Date
  lastSeen: Date
  sourceIds: string[]
  metadata: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Severity Classification
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<PulseSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

export function classifySeverity(signals: RawSignal[]): PulseSeverity {
  const streamCount = new Set(signals.map(s => s.stream)).size
  const maxStrength = Math.max(...signals.map(s => s.strength))

  const hasSentiment = signals.some(s => s.stream === 'sentiment')
  const hasPolicy = signals.some(s => s.stream === 'policy')
  const hasAtRisk = signals.some(s => s.stream === 'at-risk')

  // Critical: 4+ streams OR sentiment+policy+at-risk triple
  if (streamCount >= 4) return 'critical'
  if (hasSentiment && hasPolicy && hasAtRisk) return 'critical'

  // High: 3 streams OR any signal with strength > 0.8
  if (streamCount >= 3 || maxStrength > 0.8) return 'high'

  // Medium: 2 streams with moderate strength
  if (maxStrength > 0.5) return 'medium'

  return 'low'
}

export function severityRank(severity: PulseSeverity): number {
  return SEVERITY_RANK[severity] ?? 0
}

// ---------------------------------------------------------------------------
// Theme Matching Utilities
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or',
  'is', 'was', 'are', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'shall', 'can', 'with', 'from', 'by', 'about', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'out', 'off', 'up', 'down', 'than', 'too', 'very', 'just', 'not',
  'this', 'that', 'these', 'those', 'it', 'its', 'low', 'high',
])

export function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  )
}

export function keywordOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  const intersection = new Set([...a].filter(x => b.has(x)))
  const union = new Set([...a, ...b])
  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Cluster items by keyword overlap of a text field.
 * Generic utility used by all extractors.
 */
export function clusterByTextOverlap<T>(
  items: T[],
  getText: (item: T) => string,
  minOverlap = 0.3,
): Array<{ topicLabel: string; items: T[] }> {
  const groups: Array<{ keywords: Set<string>; topicLabel: string; items: T[] }> = []

  for (const item of items) {
    const text = getText(item)
    const keywords = extractKeywords(text)
    let matched = false

    for (const group of groups) {
      if (keywordOverlap(keywords, group.keywords) >= minOverlap) {
        group.items.push(item)
        for (const kw of keywords) group.keywords.add(kw)
        matched = true
        break
      }
    }

    if (!matched) {
      groups.push({ keywords, topicLabel: text, items: [item] })
    }
  }

  return groups.map(g => ({ topicLabel: g.topicLabel, items: g.items }))
}

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}
