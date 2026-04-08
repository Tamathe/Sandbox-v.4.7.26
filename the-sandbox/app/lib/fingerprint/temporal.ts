// ── Engagement Fingerprint — Temporal Profile Computation ──────────────────────
// Pure function: no Prisma, no LLM. Derives time-of-day and cadence patterns
// from tool session timestamps.

import type { TemporalProfile } from './types'

/** Return indices of the top N values in a counts array */
export function topN(counts: number[], n: number): number[] {
  return counts
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map((x) => x.i)
}

/** Sum an array of numbers */
export function sum(arr: number[]): number {
  let total = 0
  for (const v of arr) total += v
  return total
}

interface SessionInput {
  startedAt: Date
}

export function computeTemporalProfile(
  sessions: SessionInput[],
  _since: Date,
  windowDays: number
): TemporalProfile {
  const hourCounts = new Array(24).fill(0) as number[]
  const dayCounts = new Array(7).fill(0) as number[]
  const dailyActivity: Record<string, number> = {}

  for (const s of sessions) {
    const d = s.startedAt
    hourCounts[d.getHours()]++
    dayCounts[d.getDay()]++
    const dateKey = d.toISOString().slice(0, 10)
    dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1
  }

  const peakHours = topN(hourCounts, 3)
  const peakDays = topN(dayCounts, 3)

  // ── Chronotype classification ──
  const morningWeight = sum(hourCounts.slice(5, 12))
  const eveningWeight = sum(hourCounts.slice(18, 24)) + sum(hourCounts.slice(0, 3))
  const weekendWeight = dayCounts[0] + dayCounts[6]
  const total = sessions.length || 1

  let chronotype: TemporalProfile['chronotype']
  if (weekendWeight / total > 0.5) chronotype = 'weekend-warrior'
  else if (morningWeight / total > 0.55) chronotype = 'early-bird'
  else if (eveningWeight / total > 0.55) chronotype = 'night-owl'
  else chronotype = 'steady'

  // ── Session cadence ──
  const activeDays = Object.keys(dailyActivity).length
  const activeDayRatio = activeDays / (windowDays || 1)
  const dailyCounts = Object.values(dailyActivity)
  const maxDayCount = Math.max(...dailyCounts, 0)
  const avgDayCount = dailyCounts.length > 0 ? sum(dailyCounts) / dailyCounts.length : 0
  const burstiness = maxDayCount / (avgDayCount || 1)

  let sessionCadence: TemporalProfile['sessionCadence']
  if (activeDayRatio < 0.1) sessionCadence = 'minimal'
  else if (activeDayRatio > 0.6 && burstiness < 3) sessionCadence = 'daily-grinder'
  else if (burstiness > 5) sessionCadence = 'binge-learner'
  else if (activeDayRatio > 0.3 && burstiness > 3) sessionCadence = 'sprint-rester'
  else sessionCadence = 'crammer'

  return { peakHours, peakDays, chronotype, sessionCadence }
}
