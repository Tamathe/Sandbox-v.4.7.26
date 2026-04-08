// ─── Virtual Clinic — HTML Comment Marker Utilities ─────────────────────────
// Shared regex patterns and helpers for stripping/extracting HTML comment markers
// (<!--DOMAIN:xxx-->, <!--MANEUVER:xxx-->) from AI-generated transcript text.

/** Matches any HTML comment (used to strip markers before display or AI analysis) */
const COMMENT_REGEX = /<!--[\s\S]*?-->/g

/** Matches <!--DOMAIN:some-name--> markers embedded by the patient prompt */
const DOMAIN_MARKER_REGEX = /<!--DOMAIN:([\w-]+)-->/g

/** Matches <!--MANEUVER:some-name--> markers embedded by the patient prompt */
const MANEUVER_MARKER_REGEX = /<!--MANEUVER:([\w-]+)-->/g

/**
 * Strips all HTML comment markers from text.
 * Used before sending transcript content to AI scoring/analysis services.
 */
export function stripMarkers(text: string): string {
  return text.replace(COMMENT_REGEX, '').trim()
}

/**
 * Extracts all DOMAIN marker values from an AI response string.
 * Returns unique domain names (e.g., ['cardiovascular', 'psychiatric']).
 */
export function extractDomainMarkers(text: string): string[] {
  const matches = text.matchAll(DOMAIN_MARKER_REGEX)
  const domains: string[] = []
  for (const m of matches) {
    if (!domains.includes(m[1])) domains.push(m[1])
  }
  return domains
}

/**
 * Extracts all MANEUVER marker values from an AI response string.
 * Returns unique maneuver names (e.g., ['cardiac-auscultation', 'abdominal-palpation']).
 */
export function extractManeuverMarkers(text: string): string[] {
  const matches = text.matchAll(MANEUVER_MARKER_REGEX)
  const maneuvers: string[] = []
  for (const m of matches) {
    if (!maneuvers.includes(m[1])) maneuvers.push(m[1])
  }
  return maneuvers
}
