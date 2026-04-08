/**
 * Learning Weather Map — Shared Utilities
 *
 * Single source of truth for weather score colors, labels,
 * hour formatting, and course-to-building heuristic matching.
 */

// ── Weather score visualization ──

export function getWeatherColor(score: number): string {
  if (score >= 0.8) return '#ef4444'
  if (score >= 0.6) return '#f97316'
  if (score >= 0.4) return '#eab308'
  if (score >= 0.2) return '#22c55e'
  return '#94a3b8'
}

export function getWeatherLabel(score: number): string {
  if (score >= 0.8) return 'Very Hot'
  if (score >= 0.6) return 'Hot'
  if (score >= 0.4) return 'Warm'
  if (score >= 0.2) return 'Mild'
  return 'Cool'
}

export function getWeatherEmoji(score: number): string {
  if (score >= 0.8) return '🔥'
  if (score >= 0.6) return '🟠'
  if (score >= 0.4) return '🟡'
  if (score >= 0.2) return '🟢'
  return '⚪'
}

export const WEATHER_LEGEND_ITEMS = [
  { label: 'Very Hot', color: '#ef4444' },
  { label: 'Hot', color: '#f97316' },
  { label: 'Warm', color: '#eab308' },
  { label: 'Mild', color: '#22c55e' },
  { label: 'Cool', color: '#94a3b8' },
] as const

/** Marker radius scales with student count (8–30px range) */
export function getMarkerRadius(weeklyStudents: number): number {
  return Math.max(8, Math.min(30, 8 + weeklyStudents * 0.5))
}

// ── Time formatting ──

export function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// ── Course-to-building heuristic matching ──

/**
 * Heuristic: match a course code/title to a campus building.
 * Shared across my-buildings API, location inference, and recommendation engine.
 */
export function matchesCourse(
  code: string,
  title: string,
  bName: string,
  bShort: string,
): boolean {
  if (bShort && code.includes(bShort)) return true
  if (title.includes('law') && bName.includes('law')) return true
  if (title.includes('business') && bName.includes('gatton')) return true
  if (
    title.includes('engineering') &&
    (bName.includes('anderson') || bName.includes('marksbury'))
  )
    return true
  if (title.includes('computer') && bName.includes('marksbury')) return true
  if (title.includes('chemistry') && bName.includes('chem')) return true
  if (title.includes('biology') && bName.includes('morgan')) return true
  if (
    title.includes('education') &&
    (bName.includes('taylor') || bName.includes('erikson'))
  )
    return true
  return false
}

// ── Noise level inference ──

export function inferNoiseLevel(buildingType: string): string {
  if (buildingType === 'LIBRARY') return 'quiet'
  if (['DINING', 'ATHLETICS', 'RECREATION', 'STUDENT_SERVICES'].includes(buildingType))
    return 'loud'
  return 'moderate'
}
