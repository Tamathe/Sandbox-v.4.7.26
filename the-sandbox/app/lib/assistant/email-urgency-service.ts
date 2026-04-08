// ─── Email Urgency Scorer ────────────────────────────────────
// Pure heuristic scoring — no LLM calls, runs at ingest time.
// Every email gets a 0–100 score, a bucket, and a reasons array.

import type { AssistantEmail } from '../../generated/prisma'

export type { UrgencyBucket, UrgencyScore } from './types'
import type { UrgencyBucket, UrgencyScore } from './types'

interface UserContext {
  role: string
  department: string | null
}

const DEADLINE_KEYWORDS = /\b(asap|urgent|by eod|deadline|due|immediately|time.?sensitive|action required)\b/i
const QUESTION_PATTERN = /\b(could you|can you|would you|will you|please|do you|are you|have you|when will)\b.*\?/i
const ADMIN_SENDER_PATTERN = /\b(dean|provost|president|chancellor|vice.?president|vp|associate dean|department head|chair)\b/i

export function scoreEmailUrgency(
  email: AssistantEmail,
  userContext: UserContext
): UrgencyScore {
  let score = 0
  const reasons: string[] = []

  // Category is urgent → +40
  if (email.category === 'urgent') {
    score += 40
    reasons.push('Marked as urgent')
  }

  // Category is admin or department → +15
  if (email.category === 'admin' || email.category === 'department') {
    score += 15
    reasons.push(`Category: ${email.category}`)
  }

  // Subject contains deadline keywords → +20
  if (DEADLINE_KEYWORDS.test(email.subject)) {
    score += 20
    reasons.push('Deadline keyword in subject')
  }

  // Body contains a question directed at user → +10
  if (QUESTION_PATTERN.test(email.body)) {
    score += 10
    reasons.push('Contains a direct question')
  }

  // Sender is in user's department or course roster → +10
  const senderDomain = email.fromAddress.split('@')[1] ?? ''
  const isInternalSender = senderDomain === 'uky.edu' || senderDomain.endsWith('.uky.edu')
  if (isInternalSender && userContext.department) {
    // Heuristic: check if sender name or address hints at same department
    const fromLower = (email.fromName + ' ' + email.fromAddress).toLowerCase()
    const deptLower = userContext.department.toLowerCase()
    if (fromLower.includes(deptLower) || email.category === 'department') {
      score += 10
      reasons.push('Sender is in your department')
    }
  }

  // Sender is admin/dean-level → +15
  if (ADMIN_SENDER_PATTERN.test(email.fromName)) {
    score += 15
    reasons.push('Sender is admin/dean-level')
  }

  // Email is a reply in an active thread (< 24h) → +10
  if (email.threadId) {
    const ageMs = Date.now() - email.receivedAt.getTime()
    if (ageMs < 24 * 60 * 60 * 1000) {
      score += 10
      reasons.push('Active thread reply (< 24h)')
    }
  }

  // Email age < 2 hours → +5
  const ageHours = (Date.now() - email.receivedAt.getTime()) / (60 * 60 * 1000)
  if (ageHours < 2) {
    score += 5
    reasons.push('Received within last 2 hours')
  }

  // Email is newsletter category → -20
  if (email.category === 'newsletter') {
    score -= 20
    reasons.push('Newsletter (deprioritized)')
  }

  // Email is external and not from known contact → -10
  if (email.category === 'external' && !isInternalSender) {
    score -= 10
    reasons.push('External sender, not a known contact')
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    bucket: scoreToBucket(score),
    reasons,
  }
}

function scoreToBucket(score: number): UrgencyBucket {
  if (score >= 70) return 'respond-today'
  if (score >= 40) return 'this-week'
  if (score >= 20) return 'when-free'
  return 'archive'
}
