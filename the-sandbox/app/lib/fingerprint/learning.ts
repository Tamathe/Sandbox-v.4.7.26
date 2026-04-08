// ── Engagement Fingerprint — Learning Profile Computation ─────────────────────
// Pure function: derives study mode preferences, Bloom distribution,
// learning velocity, and mastery retention from session + mastery data.

import type { LearningProfile } from './types'

interface SessionInput {
  toolId: string
  startedAt: Date
  durationSeconds: number | null
  score: number | null
  bloomLevel: number | null
  notes: string | null
}

interface FlashcardInput {
  lastQuality: number
  reviewCount: number
}

interface ConceptInput {
  concept: string
  masteryLevel: number
  encounterCount: number
  successCount: number
  failCount: number
  lastSeenAt: Date
}

interface ModalityInput {
  domain: string
  preferredModality: string
  confidenceScore: number
  sessionCount: number
}

const BLOOM_LEVELS = ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation']

export function computeLearningProfile(
  sessions: SessionInput[],
  flashcardStats: FlashcardInput[],
  conceptMastery: ConceptInput[],
  domainModalities: ModalityInput[]
): LearningProfile {
  // ── Preferred study modes ──
  // Parse notes field for study mode hints (Study Buddy stores mode in notes)
  const modeMap: Record<string, number> = {}
  for (const s of sessions) {
    if (s.notes) {
      const modeMatch = s.notes.match(/mode:\s*(\w[\w-]*)/i)
      if (modeMatch) {
        const mode = modeMatch[1].toLowerCase()
        modeMap[mode] = (modeMap[mode] || 0) + 1
      }
    }
  }
  const preferredStudyModes = Object.entries(modeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mode]) => mode)

  // ── Preferred modality ──
  let preferredModality: LearningProfile['preferredModality'] = 'mixed'
  if (domainModalities.length > 0) {
    const top = domainModalities[0] // already sorted by confidence desc
    const mod = top.preferredModality.toLowerCase()
    if (['visual', 'auditory', 'kinesthetic', 'reading'].includes(mod)) {
      preferredModality = mod as LearningProfile['preferredModality']
    }
  }

  // ── Bloom profile ──
  const bloomCounts: Record<string, number> = {}
  for (const level of BLOOM_LEVELS) bloomCounts[level] = 0

  for (const cm of conceptMastery) {
    // masteryLevel 0-5 maps to Bloom levels
    const idx = Math.min(Math.max(Math.round(cm.masteryLevel), 0), 5)
    bloomCounts[BLOOM_LEVELS[idx]] += cm.encounterCount
  }

  const bloomTotal = Object.values(bloomCounts).reduce((a, b) => a + b, 0) || 1
  const bloomProfile: Record<string, number> = {}
  for (const level of BLOOM_LEVELS) {
    bloomProfile[level] = Math.round((bloomCounts[level] / bloomTotal) * 100) / 100
  }

  // ── Learning velocity ──
  const learningVelocity = computeVelocity(conceptMastery)

  // ── Mastery retention from flashcards ──
  let masteryRetention = 0.5 // fallback
  if (flashcardStats.length > 0) {
    const goodOrBetter = flashcardStats.filter((f) => f.lastQuality >= 3).length
    masteryRetention = goodOrBetter / flashcardStats.length
  }

  return { preferredStudyModes, preferredModality, bloomProfile, learningVelocity, masteryRetention }
}

function computeVelocity(concepts: ConceptInput[]): LearningProfile['learningVelocity'] {
  if (concepts.length < 4) return 'plateaued'

  // Sort by lastSeenAt to split into halves
  const sorted = [...concepts].sort((a, b) => a.lastSeenAt.getTime() - b.lastSeenAt.getTime())
  const mid = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, mid)
  const secondHalf = sorted.slice(mid)

  const avgFirst = firstHalf.reduce((s, c) => s + c.masteryLevel, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, c) => s + c.masteryLevel, 0) / secondHalf.length

  const diff = avgSecond - avgFirst
  if (Math.abs(diff) < 0.1) return 'plateaued'
  if (diff > 0.3) return 'accelerating'
  if (diff > 0) return 'steady'
  return 'decelerating'
}
