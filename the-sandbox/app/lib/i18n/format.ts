/**
 * i18n formatting utilities using the Intl API.
 * All functions accept an optional locale parameter (defaults to en-US).
 */

/**
 * Format a date for display using Intl.DateTimeFormat.
 */
export function formatDate(
  date: Date | string | number,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date)
  return new Intl.DateTimeFormat(locale, options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Format a number for display using Intl.NumberFormat.
 */
export function formatNumber(
  num: number,
  locale = 'en-US',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(num)
}

/**
 * Format a relative time string (e.g., "2 hours ago", "in 3 days")
 * using Intl.RelativeTimeFormat.
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale = 'en-US',
): string {
  const d = date instanceof Date ? date : new Date(date)
  const now = Date.now()
  const diffMs = d.getTime() - now
  const absDiffMs = Math.abs(diffMs)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  // Pick the most appropriate unit
  if (absDiffMs < 60_000) {
    const seconds = Math.round(diffMs / 1_000)
    return rtf.format(seconds, 'second')
  }
  if (absDiffMs < 3_600_000) {
    const minutes = Math.round(diffMs / 60_000)
    return rtf.format(minutes, 'minute')
  }
  if (absDiffMs < 86_400_000) {
    const hours = Math.round(diffMs / 3_600_000)
    return rtf.format(hours, 'hour')
  }
  if (absDiffMs < 2_592_000_000) {
    const days = Math.round(diffMs / 86_400_000)
    return rtf.format(days, 'day')
  }
  if (absDiffMs < 31_536_000_000) {
    const months = Math.round(diffMs / 2_592_000_000)
    return rtf.format(months, 'month')
  }
  const years = Math.round(diffMs / 31_536_000_000)
  return rtf.format(years, 'year')
}
