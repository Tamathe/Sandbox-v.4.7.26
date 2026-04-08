import { prisma } from '../prisma'
import { BRACKET_2026, ROUND_POINTS, getGameById } from './bracket-2026'
import type { BracketResult } from '../../generated/prisma'

// ─── Score calculation ────────────────────────────────────────────────────────

/**
 * Given a player's picks and entered results, return the player's current score.
 * picks: { gameId → teamId }
 * results: array of BracketResult rows
 */
export function scoreEntry(
  picks: Record<string, string>,
  results: BracketResult[]
): number {
  let score = 0
  for (const result of results) {
    const pickedTeam = picks[result.gameId]
    if (pickedTeam && pickedTeam === result.winnerId) {
      score += ROUND_POINTS[result.round] ?? 0
    }
  }
  return score
}

/**
 * Given a player's picks and results entered so far, return the maximum
 * achievable score (current score + points still possible from remaining games).
 *
 * A team is "still alive" if it hasn't been eliminated by a result yet.
 * For games not yet played, the player's pick can still win — unless that team
 * was already knocked out in an earlier round.
 */
export function computeMaxPossible(
  picks: Record<string, string>,
  results: BracketResult[]
): number {
  // Build set of eliminated teams (losers of each result)
  const eliminatedTeams = new Set<string>()
  for (const result of results) {
    const game = getGameById(result.gameId)
    if (!game) continue
    // The team that did NOT win in this slot is eliminated
    // We need to find who the two contestants were — for round 1 they're direct team IDs,
    // for later rounds we resolve via recursive winner lookup
    const allTeamIds = resolveSlotTeams(game.slotA, game.slotAIsGame, results)
    const allTeamIdsB = resolveSlotTeams(game.slotB, game.slotBIsGame, results)
    ;[...allTeamIds, ...allTeamIdsB].forEach(tid => {
      if (tid !== result.winnerId) eliminatedTeams.add(tid)
    })
  }

  const playedGameIds = new Set(results.map(r => r.gameId))

  const currentScore = scoreEntry(picks, results)
  let remainingPotential = 0

  for (const game of BRACKET_2026.games) {
    if (playedGameIds.has(game.id)) continue // already counted
    const pickedTeam = picks[game.id]
    if (!pickedTeam) continue
    if (!eliminatedTeams.has(pickedTeam)) {
      remainingPotential += ROUND_POINTS[game.round] ?? 0
    }
  }

  return currentScore + remainingPotential
}

/**
 * Resolve which team(s) could end up in a slot, given entered results.
 * For a team slot: returns [teamId].
 * For a game slot: recursively finds the winner, or all possible teams if not played.
 */
function resolveSlotTeams(
  slotId: string,
  isGame: boolean,
  results: BracketResult[]
): string[] {
  if (!isGame) return [slotId]

  const result = results.find(r => r.gameId === slotId)
  if (result) {
    return [result.winnerId]
  }

  // Game not yet played — recursively get all possible teams from both slots
  const game = getGameById(slotId)
  if (!game) return []
  return [
    ...resolveSlotTeams(game.slotA, game.slotAIsGame, results),
    ...resolveSlotTeams(game.slotB, game.slotBIsGame, results),
  ]
}

// ─── Persist recalculation ────────────────────────────────────────────────────

/**
 * Recalculate score and maxPossible for every entry in a contest.
 * Called automatically after each BracketResult is entered.
 */
export async function recalculateAllEntries(contestId: string): Promise<void> {
  const [entries, results] = await Promise.all([
    prisma.bracketEntry.findMany({ where: { contestId } }),
    prisma.bracketResult.findMany({ where: { contestId } }),
  ])

  const updates = entries.map(entry => {
    const picks = (entry.picks ?? {}) as Record<string, string>
    const score = scoreEntry(picks, results)
    const maxPossible = computeMaxPossible(picks, results)
    const isEliminated = maxPossible === 0 && results.length > 0
    return prisma.bracketEntry.update({
      where: { id: entry.id },
      data: { score, maxPossible, isEliminated, lastScoredAt: new Date() },
    })
  })

  await Promise.all(updates)
}
