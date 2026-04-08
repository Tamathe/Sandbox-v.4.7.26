/**
 * learning-recap-service.ts
 *
 * Generates weekly learning recaps for students — aggregates session stats,
 * mastery changes, spaced repetition status, and AI-generated insights via Sonnet.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

// ── Types ─────────────────────────────────────────────────────────────────

export interface LearningRecap {
  userId: string
  weekStart: string
  weekEnd: string
  generatedAt: string
  summary: string
  stats: {
    totalSessions: number
    totalMinutes: number
    toolsUsed: string[]
    coursesStudied: string[]
  }
  masteryChanges: {
    concept: string
    previousMastery: number
    currentMastery: number
    direction: 'improved' | 'declined' | 'stable'
  }[]
  spacedRepetitionStatus: {
    totalConcepts: number
    onTrack: number
    overdue: number
  }
  aiInsights: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date()
  const day = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)

  return { weekStart: monday, weekEnd: sunday }
}

function masteryDirection(prev: number, curr: number): 'improved' | 'declined' | 'stable' {
  const delta = curr - prev
  if (delta > 0.02) return 'improved'
  if (delta < -0.02) return 'declined'
  return 'stable'
}

// ── Generate ──────────────────────────────────────────────────────────────

export async function generateLearningRecap(userId: string): Promise<LearningRecap> {
  const { weekStart, weekEnd } = getWeekRange()
  const now = new Date()

  // Parallel queries
  const [sessions, masteries, srStates] = await Promise.all([
    // Sessions this week with tool name and course code
    prisma.toolSession.findMany({
      where: {
        userId,
        startedAt: { gte: weekStart, lte: weekEnd },
      },
      select: {
        durationSeconds: true,
        tool: { select: { name: true } },
        course: { select: { courseCode: true } },
      },
    }),

    // Concept masteries updated this week
    prisma.studentConceptMastery.findMany({
      where: {
        userId,
        lastSeenAt: { gte: weekStart },
      },
      select: {
        concept: true,
        masteryLevel: true,
        encounterCount: true,
      },
    }),

    // All spaced repetition states for this user
    prisma.conceptState.findMany({
      where: { userId },
      select: {
        nextReviewAt: true,
      },
    }),
  ])

  // Aggregate session stats
  const totalSessions = sessions.length
  const totalMinutes = Math.round(
    sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60,
  )
  const toolsUsed = [...new Set(sessions.map((s) => s.tool.name))]
  const coursesStudied = [
    ...new Set(
      sessions
        .map((s) => s.course?.courseCode)
        .filter((c): c is string => c != null),
    ),
  ]

  // Mastery changes — estimate previous from current level and encounter count
  // (a rough heuristic since we don't snapshot historical mastery)
  const masteryChanges = masteries.map((m) => {
    // Estimate previous mastery: if few encounters, previous was likely lower
    const estimatedPrevious = m.encounterCount > 1
      ? Math.max(0, m.masteryLevel - (0.1 / m.encounterCount))
      : 0
    return {
      concept: m.concept,
      previousMastery: Math.round(estimatedPrevious * 100) / 100,
      currentMastery: Math.round(m.masteryLevel * 100) / 100,
      direction: masteryDirection(estimatedPrevious, m.masteryLevel),
    }
  })

  // Spaced repetition status
  const totalConcepts = srStates.length
  const overdue = srStates.filter((s) => s.nextReviewAt < now).length
  const onTrack = totalConcepts - overdue

  const spacedRepetitionStatus = { totalConcepts, onTrack, overdue }

  const stats = { totalSessions, totalMinutes, toolsUsed, coursesStudied }

  // Build AI prompt for narrative summary + insights
  let summary = 'No activity this week yet — start a study session to see your recap!'
  let aiInsights: string[] = []

  if (totalSessions > 0 || masteryChanges.length > 0) {
    try {
      const prompt = `You are a supportive academic coach generating a weekly learning recap for a university student.

## Raw Data
- Sessions this week: ${totalSessions}
- Total study time: ${totalMinutes} minutes
- Tools used: ${toolsUsed.join(', ') || 'none'}
- Courses studied: ${coursesStudied.join(', ') || 'none'}
- Mastery changes: ${masteryChanges.length > 0 ? masteryChanges.map((m) => `${m.concept}: ${Math.round(m.previousMastery * 100)}% → ${Math.round(m.currentMastery * 100)}% (${m.direction})`).join('; ') : 'none tracked'}
- Spaced repetition: ${totalConcepts} concepts tracked, ${onTrack} on track, ${overdue} overdue

## Instructions
Generate a JSON response with:
1. "summary" — A warm, encouraging 2-3 sentence narrative of the student's week. Mention specific tools/courses if available. Be specific, not generic.
2. "insights" — An array of 2-4 actionable bullet-point strings (no bullet characters, just the text). Focus on what to do next, not what was done.

Respond with ONLY valid JSON, no markdown:
{ "summary": "...", "insights": ["...", "..."] }`

      const client = new Anthropic()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')

      const parsed = JSON.parse(text) as { summary: string; insights: string[] }
      summary = parsed.summary
      aiInsights = parsed.insights
    } catch (err) {
      console.error('[learning-recap] AI generation failed:', err)
      summary = `This week you completed ${totalSessions} session${totalSessions !== 1 ? 's' : ''} totaling ${totalMinutes} minutes of study.`
    }
  }

  return {
    userId,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    generatedAt: now.toISOString(),
    summary,
    stats,
    masteryChanges,
    spacedRepetitionStatus,
    aiInsights,
  }
}
