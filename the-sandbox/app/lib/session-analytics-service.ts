import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic()

type QualitySignal = 'strong' | 'partial' | 'minimal' | 'incomplete'
type ExitReason = 'completed' | 'abandoned' | 'timeout'

interface ScoringResult {
  score: number
  qualitySignal: QualitySignal
  hintCount: number | null
  conceptsTouched: string[]
  exitReason: ExitReason | null
}

function parseScoringResponse(text: string): ScoringResult {
  try {
    const json = JSON.parse(text.trim())
    const score = Math.min(1, Math.max(0, Number(json.score) || 0))
    const signal: QualitySignal =
      ['strong', 'partial', 'minimal', 'incomplete'].includes(json.qualitySignal)
        ? (json.qualitySignal as QualitySignal)
        : score >= 0.75 ? 'strong'
        : score >= 0.5 ? 'partial'
        : score >= 0.25 ? 'minimal'
        : 'incomplete'
    const hintCount = typeof json.hintCount === 'number' ? Math.max(0, Math.round(json.hintCount)) : null
    const conceptsTouched = Array.isArray(json.conceptsTouched)
      ? json.conceptsTouched.filter((c: unknown) => typeof c === 'string').slice(0, 8)
      : []
    const exitReason: ExitReason | null =
      ['completed', 'abandoned', 'timeout'].includes(json.exitReason)
        ? (json.exitReason as ExitReason)
        : null
    return { score, qualitySignal: signal, hintCount, conceptsTouched, exitReason }
  } catch {
    // Fallback: parse score from text
    const scoreMatch = text.match(/score[:\s]+([0-9.]+)/i)
    const score = scoreMatch ? Math.min(1, Math.max(0, parseFloat(scoreMatch[1]))) : 0
    const qualitySignal: QualitySignal =
      score >= 0.75 ? 'strong' : score >= 0.5 ? 'partial' : score >= 0.25 ? 'minimal' : 'incomplete'
    return { score, qualitySignal, hintCount: null, conceptsTouched: [], exitReason: null }
  }
}

export async function scoreSession(sessionId: string): Promise<void> {
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    include: {
      tool: { select: { learningObjectives: true, name: true } },
      chatMessages: {
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { role: true, content: true },
      },
    },
  })

  if (!session || !session.endedAt) return
  if (session.chatMessages.length === 0) return

  const objectives = session.tool.learningObjectives
  const objectivesText =
    objectives.length > 0
      ? objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
      : 'General engagement with the tool content'

  const transcript = session.chatMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}`)
    .join('\n\n')

  const studentTurnCount = session.chatMessages.filter(m => m.role === 'user').length

  const prompt = `You are evaluating a student's learning session for the tool "${session.tool.name}".

Learning objectives:
${objectivesText}

Session transcript (last 20 messages):
${transcript}

Score this session from 0.0 to 1.0 based on how well the student engaged with and progressed toward the learning objectives. Also classify quality and extract behavioral signals.

Also extract:
- hintCount: count the number of student turns that are asking for clarification, hints, or rephrasing (e.g. "can you explain that differently", "what does that mean", "I don't understand", "give me a hint"). Return 0 if none.
- conceptsTouched: extract up to 8 specific academic concepts, terms, or topics the student engaged with (not generic words like "learning" or "session"). Return as a JSON array of short strings.
- exitReason: "completed" if the session appears to have reached a natural conclusion; "abandoned" if it ends abruptly mid-thought or with very few messages (< 4 student turns, student had ${studentTurnCount} turns); "timeout" if unclear.

Respond with ONLY valid JSON, no other text:
{"score": 0.0, "qualitySignal": "strong|partial|minimal|incomplete", "hintCount": 0, "conceptsTouched": ["concept1", "concept2"], "exitReason": "completed|abandoned|timeout"}

Scoring guide:
- 0.75–1.0 = strong: student clearly engaged with objectives, demonstrated understanding
- 0.50–0.74 = partial: some engagement with objectives but incomplete
- 0.25–0.49 = minimal: surface-level engagement, minimal objective progress
- 0.00–0.24 = incomplete: session ended early or student did not engage meaningfully`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const { score, qualitySignal, hintCount, conceptsTouched, exitReason } = parseScoringResponse(text)

    // Compute durationSeconds from timestamps
    const durationSeconds = session.endedAt && session.startedAt
      ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : null

    await prisma.toolSession.update({
      where: { id: sessionId },
      data: {
        score,
        qualitySignal,
        scoredAt: new Date(),
        durationSeconds,
        hintCount: hintCount ?? null,
        conceptsTouched: conceptsTouched ?? [],
        exitReason: exitReason ?? null,
      },
    })

    // Update StudentObjectiveProgress if records exist
    if (session.courseId && session.userId && objectives.length > 0) {
      const masteryLevel =
        qualitySignal === 'strong'
          ? 'proficient'
          : qualitySignal === 'partial'
          ? 'developing'
          : 'struggling'

      await prisma.studentObjectiveProgress.updateMany({
        where: {
          studentId: session.userId,
          courseId: session.courseId,
          masteryLevel: { in: ['struggling', 'developing'] },
        },
        data: {
          masteryLevel,
          updatedAt: new Date(),
        },
      })
    }

    // Non-blocking — profile update runs after scoring completes
    if (session.userId) {
      void import('./student-profile-service').then(({ upsertStudentProfile }) =>
        upsertStudentProfile(session.userId!).catch(err =>
          console.error('[student-profile] Failed to update profile:', err)
        )
      )
    }

    // Non-blocking — SR state upsert for each concept touched in this session
    if (session.userId && session.courseId && conceptsTouched.length > 0) {
      void import('./sr-scheduler').then(({ upsertConceptStateAfterSession }) =>
        upsertConceptStateAfterSession(sessionId, session.userId!, session.courseId!).catch(err =>
          console.error('[sr-scheduler] Failed to upsert concept state:', err)
        )
      )
    }

    // Non-blocking — concept mastery + transfer detection per concept
    if (session.userId && session.courseId && conceptsTouched.length > 0) {
      void Promise.all([
        import('./concept-mastery-service').then(({ upsertConceptMastery }) =>
          Promise.all(
            conceptsTouched.map((concept) =>
              upsertConceptMastery(session.userId!, concept, session.courseId!, score).catch(
                (err) => console.error('[concept-mastery] upsert error', err),
              )
            )
          )
        ),
        import('./transfer-event-service').then(({ detectAndUpsertTransferEvent }) =>
          Promise.all(
            conceptsTouched.map((concept) =>
              detectAndUpsertTransferEvent(session.userId!, concept, session.courseId!, score).catch(
                (err) => console.error('[transfer-event] detect error', err),
              )
            )
          )
        ),
      ])
    }
  } catch (err) {
    console.error(`[session-analytics] Failed to score session ${sessionId}:`, err)
    // Non-fatal — session already ended successfully
  }
}
