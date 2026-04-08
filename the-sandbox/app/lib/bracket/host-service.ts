import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { getTeamById } from './bracket-2026'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Round Commentary (Haiku) ─────────────────────────────────────────────────

export async function generateRoundCommentary(
  contestId: string,
  round: number
): Promise<string> {
  const [contest, entries, results] = await Promise.all([
    prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } }),
    prisma.bracketEntry.findMany({
      where: { contestId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { score: 'desc' },
    }),
    prisma.bracketResult.findMany({
      where: { contestId, round },
      orderBy: { enteredAt: 'asc' },
    }),
  ])

  const leaderboard = entries
    .map((e, i) => `${i + 1}. ${e.user.name}: ${e.score} pts`)
    .join(', ')

  const roundResults = results
    .map((r) => `${r.winnerId} won game ${r.gameId}`)
    .join('; ')

  const prompt = `You are "Bracket Buddy", an energetic March Madness announcer for a bracket contest called "${contest.name}".
Round ${round} results just came in: ${roundResults || 'No results yet'}.
Current standings: ${leaderboard}.

Write 150-200 words of enthusiastic commentary. Use first names only. Celebrate any upsets. Give hot takes. Be energetic. No emojis.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Post as AI host message (no circular import — write directly)
  await prisma.bracketMessage.create({
    data: {
      contestId,
      userId: null,
      content: text.trim(),
      isAiHost: true,
    },
  })

  return text
}

// ─── Per-Game Result Commentary (Haiku) ───────────────────────────────────────

export async function generateResultCommentary(
  contestId: string,
  gameId: string,
  winnerId: string,
  round: number
): Promise<void> {
  const winnerTeam = getTeamById(winnerId)
  const teamName = winnerTeam?.name ?? winnerId
  const isUpset = (winnerTeam?.seed ?? 0) > 4

  const [contest, entries] = await Promise.all([
    prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } }),
    prisma.bracketEntry.findMany({
      where: { contestId },
      include: { user: { select: { name: true } } },
    }),
  ])

  const picksCorrect = entries.filter((e) => {
    const picks = e.picks as Record<string, string>
    return picks[gameId] === winnerId
  }).length
  const picksWrong = entries.length - picksCorrect

  const upsetLine = isUpset
    ? ` A ${winnerTeam?.seed ?? '?'}-seed upset! Brackets everywhere are in flames.`
    : ''
  const scoreLine =
    picksWrong === 0
      ? ' Everyone called it right.'
      : `${picksWrong} player${picksWrong > 1 ? 's' : ''} got burned.`

  const prompt = `You are "Bracket Buddy", a dramatic March Madness announcer for the contest "${contest.name}".
${teamName} just won a Round ${round} game!${upsetLine}
${picksCorrect} of ${entries.length} players picked them correctly.${scoreLine}

Write 80-120 words of punchy hot-take color commentary on this result. Name the team. Be dramatic and specific. No emojis.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  if (!text) return

  // Write directly to avoid circular import with bracket-service.ts
  await prisma.bracketMessage.create({
    data: {
      contestId,
      userId: null,
      content: text,
      isAiHost: true,
    },
  })
}

// ─── Nudge Messages (Haiku) ───────────────────────────────────────────────────

export async function generateNudgeMessages(contestId: string): Promise<{ sent: number }> {
  const contest = await prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } })

  if (!contest.allowAiNudges) return { sent: 0 }

  const entries = await prisma.bracketEntry.findMany({
    where: { contestId },
    include: { user: { select: { name: true } } },
    orderBy: { score: 'desc' },
  })

  if (entries.length < 2) return { sent: 0 }

  const leader = entries[0]
  const half = Math.floor(entries.length / 2)
  const atRisk = entries.slice(half).filter((e) => leader.score - e.score >= 20)

  if (atRisk.length === 0) return { sent: 0 }

  const toneInstructions =
    contest.nudgeIntensity === 'GENTLE'
      ? 'encouraging and supportive — cheer them on, highlight that a comeback is still possible'
      : contest.nudgeIntensity === 'ACTIVE'
      ? 'competitive and motivating — challenge them directly, mention what they need to do to close the gap'
      : 'playful trash talk — roast their bracket picks humorously, keep it fun but pointed'

  const playerLines = atRisk
    .map((e, i) => {
      const firstName = e.user.name.split(' ')[0]
      const rank = entries.findIndex((x) => x.id === e.id) + 1
      return `${i + 1}. ${firstName} (rank ${rank}/${entries.length}, ${e.score} pts, ${leader.score - e.score} pts behind leader)`
    })
    .join('\n')

  const prompt = `You are "Bracket Buddy", a March Madness bracket contest AI for "${contest.name}".
These players are in the bottom half of the standings and could use a nudge:
${playerLines}

Generate exactly ${atRisk.length} short personalized nudge messages, one per player.
Tone: ${toneInstructions}
Format: one line per player, starting with "NUMBER. ", using first name only. Keep each to 1–2 sentences. No emojis.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+\./.test(l))
  const nudges = lines.map((l) => l.replace(/^\d+\.\s*/, '').trim())

  let sent = 0
  for (let i = 0; i < Math.min(nudges.length, atRisk.length); i++) {
    if (!nudges[i]) continue
    await prisma.bracketMessage.create({
      data: { contestId, userId: null, content: nudges[i], isAiHost: true },
    })
    sent++
  }

  return { sent }
}

// ─── Email Narrative (Sonnet) ─────────────────────────────────────────────────

export async function generateEmailNarrative(
  contestId: string,
  round?: number
): Promise<string> {
  const [contest, entries, results] = await Promise.all([
    prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } }),
    prisma.bracketEntry.findMany({
      where: { contestId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { score: 'desc' },
    }),
    prisma.bracketResult.findMany({
      where: { contestId, ...(round !== undefined ? { round } : {}) },
      orderBy: { enteredAt: 'asc' },
    }),
  ])

  const standingsText = entries
    .map(
      (e, i) =>
        `${i + 1}. ${e.user.name}: ${e.score} pts (max possible: ${e.maxPossible}${e.isEliminated ? ', eliminated' : ''})`
    )
    .join('\n')

  const resultsText =
    results.length > 0
      ? results.map((r) => `Round ${r.round}: ${r.winnerId} won game ${r.gameId}`).join('\n')
      : 'No results yet'

  const prompt = `Write an engaging bracket contest email update for "${contest.name}".

Current standings:
${standingsText}

Recent results:
${resultsText}

Write a 200-300 word energetic narrative for a March Madness bracket email. Include:
- Leader callout by first name
- Who is still in contention
- Notable upsets or storylines from the results
- Hype for upcoming games
- Encouraging note for everyone

Write only the narrative text, no headers or HTML tags.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
