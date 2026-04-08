/**
 * mastery-decay.ts
 *
 * Pure functions for exponential mastery decay.
 * NO database calls — applied at read time only.
 */

import type { StudentConceptMastery } from '../generated/prisma'

const HALF_LIFE_DAYS = 90

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
}

/**
 * Returns the effective mastery after decay, clamped to [0, 1].
 */
export function applyMasteryDecay(mastery: StudentConceptMastery): number {
  const days = daysSince(mastery.lastSeenAt)
  const effective = mastery.masteryLevel * Math.pow(0.5, days / HALF_LIFE_DAYS)
  return Math.min(1, Math.max(0, effective))
}

/**
 * Returns true when a concept was once strong but has degraded over time
 * without recent reinforcement.
 */
export function isMasteryStale(mastery: StudentConceptMastery): boolean {
  const days = daysSince(mastery.lastSeenAt)
  const effective = applyMasteryDecay(mastery)
  return effective < 0.5 && mastery.masteryLevel >= 0.7 && days > 60
}
