/** Format seconds into a human-readable duration like "12 min" or "1h 30m" */
export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

/** Format milliseconds into "M:SS" timestamp */
export function formatTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
