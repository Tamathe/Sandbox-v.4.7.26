/**
 * Commentary Service — Sandy's in-game narration for The Commons.
 *
 * Generates contextual quips after each round reveal and a final game summary.
 * Uses Haiku for speed; falls back to template-based commentary if API unavailable.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { PlayerScore } from './commons-service'

interface RoundContext {
  roundNumber: number
  question: string
  correctIndex: number
  explanation: string
  responses: Array<{
    isCorrect: boolean
    responseTimeMs: number
    participant: { user: { name: string } }
  }>
}

export async function generateCommentary(
  round: RoundContext,
  scores: PlayerScore[],
  fastest: { responseTimeMs: number; participant: { user: { name: string } } } | undefined,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return getTemplateCommentary(round, scores, fastest)
  }

  try {
    const client = new Anthropic()
    const leader = scores[0]
    const totalCorrect = round.responses.filter((r) => r.isCorrect).length
    const totalPlayers = round.responses.length

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `You are Sandy, the enthusiastic AI host of a quiz battle at the University of Kentucky. Write ONE short, fun commentary line (15-25 words) about what just happened in this round. Be specific — name players, mention speed, streaks, comebacks. Use casual college energy. No emojis at the start.`,
      messages: [{
        role: 'user',
        content: `Round ${round.roundNumber} just ended.
${totalCorrect}/${totalPlayers} got it right.
${fastest ? `Fastest: ${fastest.participant.user.name} (${(fastest.responseTimeMs / 1000).toFixed(1)}s)` : 'Nobody got it right.'}
${leader ? `Leader: ${leader.name} with ${leader.score} pts (${leader.streak > 1 ? `${leader.streak} streak!` : 'no streak'})` : ''}
Question was about: ${round.question.substring(0, 80)}`,
      }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    return text || getTemplateCommentary(round, scores, fastest)
  } catch {
    return getTemplateCommentary(round, scores, fastest)
  }
}

export async function generateSummary(
  title: string,
  standings: PlayerScore[],
  totalRounds: number,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY || standings.length === 0) {
    return getTemplateSummary(standings)
  }

  try {
    const client = new Anthropic()
    const standingsList = standings
      .map((p, i) => `${i + 1}. ${p.name}: ${p.score} pts`)
      .join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are Sandy, the AI host wrapping up a quiz battle at UK. Write a 2-3 sentence congratulatory/fun summary. Mention the winner by name, call out notable performances. Keep it warm and encouraging — everyone should want to play again.`,
      messages: [{
        role: 'user',
        content: `Challenge "${title}" just finished (${totalRounds} rounds).\n\nFinal standings:\n${standingsList}`,
      }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    return text || getTemplateSummary(standings)
  } catch {
    return getTemplateSummary(standings)
  }
}

// ── Template fallbacks ────────────────────────────────────────────────────────

function getTemplateCommentary(
  round: RoundContext,
  scores: PlayerScore[],
  fastest: { responseTimeMs: number; participant: { user: { name: string } } } | undefined,
): string {
  const totalCorrect = round.responses.filter((r) => r.isCorrect).length
  const totalPlayers = round.responses.length

  if (totalCorrect === 0) {
    return 'That was a tough one! Nobody got it right — now you know for the exam though.'
  }

  if (fastest && totalCorrect === totalPlayers) {
    return `Clean sweep! Everyone got it right. ${fastest.participant.user.name} was fastest at ${(fastest.responseTimeMs / 1000).toFixed(1)}s.`
  }

  if (fastest) {
    const leader = scores[0]
    if (leader && leader.streak > 2) {
      return `${fastest.participant.user.name} strikes first! ${leader.name} is on a ${leader.streak}-answer streak — can anyone stop them?`
    }
    return `${fastest.participant.user.name} got it in ${(fastest.responseTimeMs / 1000).toFixed(1)}s! ${totalCorrect}/${totalPlayers} correct.`
  }

  return `${totalCorrect}/${totalPlayers} got that one right. On to the next!`
}

function getTemplateSummary(standings: PlayerScore[]): string {
  if (standings.length === 0) return 'Good game everyone!'
  const winner = standings[0]!
  return `${winner.name} takes the crown with ${winner.score} points! Great game everyone — who's up for a rematch?`
}
