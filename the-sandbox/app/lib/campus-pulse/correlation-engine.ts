/**
 * Campus Pulse — Correlation Engine
 *
 * Takes raw signals from all extractors, groups them by theme using
 * keyword overlap (Jaccard similarity), and identifies convergences
 * where 2+ different streams cluster around the same theme within
 * the detection window.
 */

import type { RawSignal, CorrelationResult } from './types'
import { extractKeywords, keywordOverlap } from './types'
import { extractUKNowSignals } from './extractors/uknow-extractor'
import { extractEmailUrgencySignals } from './extractors/email-urgency-extractor'
import { extractAtRiskSignals } from './extractors/at-risk-extractor'
import { extractOfficeHoursSignals } from './extractors/office-hours-extractor'
import { extractSubmissionSignals } from './extractors/submission-extractor'
import { extractCoursePostSignals } from './extractors/course-post-extractor'

/**
 * Run all extractors in parallel, then find theme correlations
 * across signal streams.
 */
export async function runCorrelationScan(windowHours = 48): Promise<CorrelationResult[]> {
  // 1. Extract all signals in parallel
  const allSignals = (
    await Promise.all([
      extractUKNowSignals(windowHours).catch(() => [] as RawSignal[]),
      extractEmailUrgencySignals(windowHours).catch(() => [] as RawSignal[]),
      extractAtRiskSignals(windowHours).catch(() => [] as RawSignal[]),
      extractOfficeHoursSignals(windowHours).catch(() => [] as RawSignal[]),
      extractSubmissionSignals(windowHours).catch(() => [] as RawSignal[]),
      extractCoursePostSignals(windowHours).catch(() => [] as RawSignal[]),
    ])
  ).flat()

  if (allSignals.length < 2) return []

  // 2. Theme matching — group signals whose themes overlap
  const correlations = findThemeCorrelations(allSignals)

  // 3. Keep only correlations with 2+ different streams
  return correlations
    .filter(c => {
      const uniqueStreams = new Set(c.signals.map(s => s.stream))
      return uniqueStreams.size >= 2
    })
    .sort((a, b) => b.correlationScore - a.correlationScore)
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function findThemeCorrelations(signals: RawSignal[]): CorrelationResult[] {
  const groups: Map<string, RawSignal[]> = new Map()

  for (const signal of signals) {
    const keywords = extractKeywords(signal.theme)
    let matched = false

    for (const [groupTheme, groupSignals] of groups) {
      const groupKeywords = extractKeywords(groupTheme)
      const overlap = keywordOverlap(keywords, groupKeywords)

      if (overlap >= 0.3) {
        groupSignals.push(signal)
        matched = true
        break
      }
    }

    if (!matched) {
      groups.set(signal.theme, [signal])
    }
  }

  return Array.from(groups.entries()).map(([theme, sigs]) => ({
    theme,
    signals: sigs,
    correlationScore: computeCorrelationScore(sigs),
  }))
}

function computeCorrelationScore(signals: RawSignal[]): number {
  const uniqueStreams = new Set(signals.map(s => s.stream)).size
  const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length
  const totalDataPoints = signals.reduce((sum, s) => sum + s.dataPoints, 0)

  const streamDiversityScore = Math.min(1, uniqueStreams / 4)
  const strengthScore = avgStrength
  const volumeScore = Math.min(1, totalDataPoints / 20)

  return streamDiversityScore * 0.5 + strengthScore * 0.3 + volumeScore * 0.2
}
