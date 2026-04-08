// ── Engagement Fingerprint — Notification Timing Optimization ────────────────
// Determines optimal nudge timing based on user's peak activity hours.

import { getFingerprint } from './fingerprint-service'

/**
 * Returns the user's primary peak hour and day for scheduling nudges.
 * Returns null if fingerprint unavailable or confidence too low.
 */
export async function getOptimalNotificationWindow(
  userId: string,
): Promise<{ hour: number; day: number } | null> {
  const fp = await getFingerprint(userId)
  if (!fp || fp.meta.confidence < 0.3) return null

  return {
    hour: fp.temporal.peakHours[0],
    day: fp.temporal.peakDays[0],
  }
}

/**
 * Returns true if the current hour is within +/- 1 hour of any of the user's
 * peak hours. Returns true (permissive) if no fingerprint data is available.
 */
export async function isWithinPeakWindow(userId: string): Promise<boolean> {
  const fp = await getFingerprint(userId)
  if (!fp || fp.meta.confidence < 0.3) return true // No data — allow nudge

  const currentHour = new Date().getHours()
  return fp.temporal.peakHours.some(peak => {
    const diff = Math.abs(currentHour - peak)
    // Handle wrap-around (e.g., 23 and 0 are 1 hour apart)
    return diff <= 1 || diff >= 23
  })
}
