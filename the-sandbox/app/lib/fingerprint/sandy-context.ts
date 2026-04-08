// ── Engagement Fingerprint — Sandy Context Builder ──────────────────────────
// Builds a natural-language <learner-profile> block that Sandy can use
// to personalize her responses across all chat surfaces.

import { getFingerprint } from './fingerprint-service'
import type { ComputedFingerprint } from './types'

/** Convert 0-23 hour to human-readable string like "9 AM", "2 PM" */
export function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

/**
 * Build a natural-language fingerprint summary wrapped in <learner-profile> XML.
 * Returns empty string if fingerprint is null or confidence too low.
 */
export async function buildFingerprintBlock(userId: string): Promise<string> {
  const fp = await getFingerprint(userId)
  if (!fp || fp.meta.confidence < 0.2) return ''

  return buildContextFromFingerprint(fp)
}

function buildContextFromFingerprint(fp: ComputedFingerprint): string {
  const lines: string[] = []

  // Temporal
  const peakHourLabels = fp.temporal.peakHours.map(h => formatHour(h)).join(', ')
  lines.push(`Chronotype: "${fp.temporal.chronotype}". Most active around ${peakHourLabels}.`)
  lines.push(`Session cadence: "${fp.temporal.sessionCadence}" — ${fp.engagement.sessionsPerWeek.toFixed(1)} sessions/week, avg ${fp.engagement.avgSessionMinutes.toFixed(0)} min each.`)

  // Learning
  if (fp.learning.preferredStudyModes.length > 0) {
    lines.push(`Preferred study modes: ${fp.learning.preferredStudyModes.join(', ')}.`)
  }
  lines.push(`Learning modality: ${fp.learning.preferredModality}. Velocity: ${fp.learning.learningVelocity}.`)

  if (fp.learning.masteryRetention > 0.8) {
    lines.push(`Strong flashcard retention (${(fp.learning.masteryRetention * 100).toFixed(0)}%) — challenge with harder material.`)
  } else if (fp.learning.masteryRetention < 0.5) {
    lines.push(`Flashcard retention is low (${(fp.learning.masteryRetention * 100).toFixed(0)}%) — encourage shorter, more frequent review sessions.`)
  }

  // Social
  if (fp.social.collaborationIndex > 0.4) {
    lines.push(`Highly collaborative (${fp.social.socialOrientation}) — active in live rooms and study groups.`)
  } else if (fp.social.collaborationIndex < 0.15) {
    lines.push(`Prefers solo work — respect independence, suggest group activities gently.`)
  } else {
    lines.push(`Social style: ${fp.social.socialOrientation}.`)
  }

  // Responsiveness & deadlines
  lines.push(`Deadline behavior: "${fp.engagement.deadlineProximity}". Nudge response rate: ${(fp.responsiveness.nudgeResponseRate * 100).toFixed(0)}%.`)

  // Confidence
  lines.push(`Profile confidence: ${(fp.meta.confidence * 100).toFixed(0)}%.`)

  // Behavioral instructions for Sandy
  const instructions: string[] = []
  instructions.push('Adapt timing suggestions to this learner\'s chronotype and peak hours.')
  instructions.push('Match session length recommendations to their typical session duration.')

  if (fp.temporal.sessionCadence === 'binge-learner') {
    instructions.push('This student binge-studies — suggest breaking sessions into focused blocks with breaks.')
  } else if (fp.temporal.sessionCadence === 'crammer') {
    instructions.push('This student tends to cram — proactively suggest earlier study starts before deadlines.')
  }

  if (fp.social.socialOrientation === 'solo') {
    instructions.push('Respect solo preference — only suggest group activities when clearly beneficial.')
  } else if (fp.social.socialOrientation === 'community-active') {
    instructions.push('Leverage social motivation — suggest study groups, live rooms, and peer activities.')
  }

  if (fp.responsiveness.nudgeResponseRate < 0.3) {
    instructions.push('Low nudge response rate — be concise and impactful with suggestions rather than frequent.')
  } else if (fp.responsiveness.nudgeResponseRate > 0.7) {
    instructions.push('High nudge response rate — this student is receptive to proactive suggestions.')
  }

  const profileBlock = lines.join('\n')
  const instructionBlock = instructions.join('\n')

  return `\n\n<learner-profile>\n${profileBlock}\n\nBehavioral guidance:\n${instructionBlock}\n</learner-profile>`
}
