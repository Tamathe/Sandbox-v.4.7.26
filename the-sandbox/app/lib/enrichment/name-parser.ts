// ─── Parse human name and directory slug from a UK email address ──────────────

/**
 * Extracts a human-readable name from a UK email prefix.
 * Examples:
 *   katie.thompson@uky.edu       → "Katie Thompson"
 *   tiana.the.student@uky.edu    → "Tiana The"
 *   tiana.the@uky.edu            → "Tiana The"
 *   r.smith3@uky.edu             → null (ambiguous initial)
 */
export function parseNameFromEmail(email: string): string | null {
  const prefix = email.split('@')[0].toLowerCase()

  // Strip .student suffix and trailing digits
  const cleaned = prefix
    .replace(/\.student$/, '')
    .replace(/\d+$/, '')

  const parts = cleaned.split('.').filter((p) => p.length > 1)

  // If fewer than 2 parts after cleaning, name is ambiguous
  if (parts.length < 2) return null

  // Capitalize each part
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/**
 * Convert a name to a URL slug.
 * "Heath Price" → "heath-price"
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Returns true if the email prefix pattern suggests a student
 * (e.g. ends in .student or contains a student-pattern number).
 */
export function isLikelyStudent(email: string): boolean {
  const prefix = email.split('@')[0].toLowerCase()
  return (
    prefix.endsWith('.student') ||
    /\d{4,}/.test(prefix) || // long number suffix = student ID pattern
    isLinkBlueFormat(email)   // LinkBlue IDs (e.g. tsthe2, abc123) are always students
  )
}

/**
 * Returns true if the email looks like a UK LinkBlue username rather than
 * a first.last name (e.g. "tsthe2@uky.edu", "abc123@uky.edu").
 * LinkBlue IDs have no dots and contain at least one digit.
 */
export function isLinkBlueFormat(email: string): boolean {
  const prefix = email.split('@')[0].toLowerCase()
  return !prefix.includes('.') && /\d/.test(prefix)
}
