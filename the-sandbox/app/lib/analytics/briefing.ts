import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { FacultyBriefing } from '../../generated/prisma'
import { buildBriefingClassroomSummary } from '../classroom-intelligence/classroom-intelligence-service'

// ── Types ────────────────────────────────────────────────────────────────────

interface BriefingJson {
  highlights: string[]
  concerns: string[]
  actionItems: { label: string; type: string; priority: 'high' | 'medium' | 'low' }[]
  stats: { label: string; value: string; delta?: string }[]
}

// ── Main generator ───────────────────────────────────────────────────────────

export async function generateFacultyBriefing(
  userId: string,
  courseId?: string,
): Promise<FacultyBriefing> {
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000)

  // ── Gather data for the last 24 hours ──────────────────────────────────────

  const courseFilter = courseId ? { courseId } : { course: { instructorId: userId } }

  const [sessions, submissions, rubrics, uniqueStudents] = await Promise.all([
    // Tool sessions in the faculty member's course(s)
    prisma.toolSession.findMany({
      where: {
        ...courseFilter,
        startedAt: { gte: windowStart },
        sensitiveSession: false,
      },
      select: {
        id: true,
        score: true,
        durationSeconds: true,
        status: true,
        qualitySignal: true,
        courseId: true,
        userId: true,
        tool: { select: { name: true } },
      },
    }),

    // Submissions with gradebook entries
    prisma.submission.findMany({
      where: {
        submittedAt: { gte: windowStart },
        assignment: { course: courseId ? { id: courseId } : { instructorId: userId } },
      },
      select: {
        id: true,
        gradebookEntry: {
          select: { aiScore: true, facultyScore: true, status: true },
        },
      },
    }),

    // Rubric breakdowns
    prisma.rubricBreakdown.findMany({
      where: {
        generatedAt: { gte: windowStart },
        session: courseFilter,
      },
      select: { compositeScore: true, dimensions: true },
    }),

    // Unique active students
    prisma.toolSession.groupBy({
      by: ['userId'],
      where: {
        ...courseFilter,
        startedAt: { gte: windowStart },
        sensitiveSession: false,
        userId: { not: null },
      },
    }),
  ])

  // ── Compute summary stats ──────────────────────────────────────────────────

  const totalSessions = sessions.length
  const activeStudents = uniqueStudents.length
  const completedSessions = sessions.filter(s => s.status === 'completed').length
  const completionRate = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0

  const scoredSessions = sessions.filter(s => s.score !== null)
  const avgScore = scoredSessions.length > 0
    ? Math.round(
        (scoredSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredSessions.length) * 100,
      )
    : null

  const durSessions = sessions.filter(s => s.durationSeconds !== null)
  const avgDuration = durSessions.length > 0
    ? Math.round(
        durSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) /
          durSessions.length / 60,
      )
    : null

  const submissionsNeedingReview = submissions.filter(
    s => s.gradebookEntry?.status === 'AI_DRAFT' || s.gradebookEntry?.status === 'PENDING_REVIEW',
  ).length

  const avgRubricScore = rubrics.length > 0
    ? Math.round(
        (rubrics.reduce((sum, r) => sum + r.compositeScore, 0) / rubrics.length) * 100,
      )
    : null

  // Tool usage breakdown
  const toolUsage = new Map<string, number>()
  for (const s of sessions) {
    const name = s.tool.name
    toolUsage.set(name, (toolUsage.get(name) ?? 0) + 1)
  }
  const topTools = [...toolUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name} (${count})`)

  // ── Classroom Intelligence summary ─────────────────────────────────────────
  let classroomSummary: string | null = null
  if (courseId) {
    try {
      classroomSummary = await buildBriefingClassroomSummary(courseId)
    } catch {
      // Non-fatal — briefing still works without classroom intelligence
    }
  }

  // ── Build narrative prompt ─────────────────────────────────────────────────

  const dataBlock = [
    `Time window: last 24 hours`,
    `Total sessions: ${totalSessions}`,
    `Unique active students: ${activeStudents}`,
    `Completion rate: ${completionRate}%`,
    avgScore !== null ? `Average session quality score: ${avgScore}%` : `No scored sessions yet`,
    avgDuration !== null ? `Average session duration: ${avgDuration} min` : null,
    `Submissions needing review: ${submissionsNeedingReview}`,
    avgRubricScore !== null ? `Average rubric composite: ${avgRubricScore}%` : null,
    topTools.length > 0 ? `Most-used tools: ${topTools.join(', ')}` : `No tool activity`,
    `Quality signals: ${sessions.filter(s => s.qualitySignal === 'strong').length} strong, ${sessions.filter(s => s.qualitySignal === 'partial').length} partial, ${sessions.filter(s => s.qualitySignal === 'minimal').length} minimal`,
    classroomSummary ? `\nClassroom Intelligence:\n${classroomSummary}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are a faculty intelligence assistant for the University of Kentucky's course platform.

Generate a morning briefing for a faculty member based on the last 24 hours of student activity data.

<data>
${dataBlock}
</data>

Respond with valid JSON only (no markdown, no code fences). The JSON must have this exact shape:
{
  "briefingHtml": "<p>3-5 paragraph HTML narrative briefing. Use <strong> for emphasis. Be specific with numbers. Open with the most important insight. Mention action items naturally.</p>",
  "highlights": ["up to 4 short highlight strings"],
  "concerns": ["up to 3 short concern strings, or empty array if none"],
  "actionItems": [{"label": "string", "type": "review|follow-up|planning", "priority": "high|medium|low"}],
  "stats": [{"label": "string", "value": "string", "delta": "optional +/- string"}]
}

Rules:
- If there is no activity, say so honestly and suggest proactive steps.
- Keep the tone professional, warm, and concise.
- Action items should be concrete and actionable.
- Stats should include 4-6 key metrics.`

  // ── Call Claude Haiku ──────────────────────────────────────────────────────

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text) as {
    briefingHtml: string
    highlights: string[]
    concerns: string[]
    actionItems: { label: string; type: string; priority: string }[]
    stats: { label: string; value: string; delta?: string }[]
  }

  const briefingJson: BriefingJson = {
    highlights: parsed.highlights,
    concerns: parsed.concerns,
    actionItems: parsed.actionItems as BriefingJson['actionItems'],
    stats: parsed.stats,
  }

  // ── Mark previous briefings as stale & create new ─────────────────────────

  await prisma.facultyBriefing.updateMany({
    where: { userId, courseId: courseId ?? null, stale: false },
    data: { stale: true },
  })

  const briefing = await prisma.facultyBriefing.create({
    data: {
      userId,
      courseId: courseId ?? null,
      briefingHtml: parsed.briefingHtml,
      briefingJson: briefingJson as unknown as import('../../generated/prisma').Prisma.InputJsonValue,
      windowStart,
      windowEnd,
      generatedAt: new Date(),
      stale: false,
    },
  })

  return briefing
}