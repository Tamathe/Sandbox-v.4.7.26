/**
 * Teach It Back Service — Teaching-as-Learning Sessions
 *
 * Students explain concepts to a confused AI student persona. The AI
 * calibrates its confusion to the student's Bloom level and known
 * misconceptions. After the teaching exchange, Sonnet evaluates the
 * transcript for accuracy, clarity, and Bloom level achieved.
 *
 * Exports:
 *   startTeachBack          — select concept + create session + first AI message
 *   sendTeachBackMessage    — append turn to transcript + AI student reply
 *   completeTeachBack       — Sonnet evaluation + SR/Bloom updates
 *   listTeachBackSessions   — metadata-only list for a student
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { computeNextReview } from './sr-scheduler'
import type { ConceptStateForScheduler } from './sr-scheduler'
import { upsertConceptMastery } from './concept-mastery-service'
import type { Prisma } from '../generated/prisma'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = 'claude-sonnet-4-6'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TranscriptMessage {
  role: 'ai-student' | 'user'
  content: string
}

export interface TeachBackStartResponse {
  sessionId: string
  conceptSlug: string
  conceptLabel: string
  courseCode: string
  courseName: string
  bloomTarget: number
  firstMessage: string
}

export interface TeachBackMessageResponse {
  message: string
  turnCount: number
  isComplete: boolean
}

export interface TeachBackEvaluation {
  sessionId: string
  teachingScore: number
  accuracyScore: number
  clarityScore: number
  bloomAchieved: number
  misconceptionsCovered: string[]
  feedbackNarrative: string
  srBoosted: boolean
}

export interface TeachBackSummary {
  id: string
  conceptSlug: string
  conceptLabel: string
  courseCode: string
  courseName: string
  turnCount: number
  teachingScore: number | null
  bloomAchieved: number | null
  completedAt: string | null
  createdAt: string
}

// ── Bloom labels ──────────────────────────────────────────────────────────────

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

// ── startTeachBack ────────────────────────────────────────────────────────────

export async function startTeachBack(
  userId: string,
  courseId: string,
  conceptSlug?: string,
): Promise<TeachBackStartResponse> {
  // 1. Fetch course
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, courseCode: true },
  })
  if (!course) throw new Error('Course not found')

  // 2. Select concept
  let selectedSlug: string
  let masteryLevel: number

  if (conceptSlug) {
    // Validate provided concept has sufficient mastery
    const mastery = await prisma.studentConceptMastery.findUnique({
      where: { userId_concept: { userId, concept: conceptSlug } },
      select: { masteryLevel: true },
    })
    if (!mastery || mastery.masteryLevel < 0.6) {
      throw new Error('Concept mastery too low for Teach It Back (requires > 0.6)')
    }
    selectedSlug = conceptSlug
    masteryLevel = mastery.masteryLevel
  } else {
    // Pick best candidate: highest mastery, Bloom < 6, not yet taught back recently
    const recentSessions = await prisma.teachBackSession.findMany({
      where: { userId, courseId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { conceptSlug: true },
    })
    const recentSlugs = new Set(recentSessions.map((s) => s.conceptSlug))

    const masteries = await prisma.studentConceptMastery.findMany({
      where: {
        userId,
        masteryLevel: { gte: 0.6 },
        coursesEncountered: { has: courseId },
      },
      orderBy: { masteryLevel: 'desc' },
      take: 20,
      select: { concept: true, masteryLevel: true },
    })

    // Filter: not recently taught, Bloom < 6
    const conceptStates = await prisma.conceptState.findMany({
      where: {
        userId,
        courseId,
        conceptSlug: { in: masteries.map((m) => m.concept) },
      },
      select: { conceptSlug: true, bloomHighWater: true },
    })
    const bloomMap = new Map(conceptStates.map((s) => [s.conceptSlug, s.bloomHighWater ?? 0]))

    const candidate = masteries.find(
      (m) => !recentSlugs.has(m.concept) && (bloomMap.get(m.concept) ?? 0) < 6,
    )

    if (!candidate) {
      throw new Error('No eligible concepts found for Teach It Back')
    }
    selectedSlug = candidate.concept
    masteryLevel = candidate.masteryLevel
  }

  // 3. Fetch Bloom level + misconceptions
  const conceptState = await prisma.conceptState.findUnique({
    where: { userId_courseId_conceptSlug: { userId, courseId, conceptSlug: selectedSlug } },
    select: { bloomHighWater: true },
  })
  const bloomLevel = conceptState?.bloomHighWater ?? 2

  const misconceptions = await prisma.misconceptionTaxonomy.findMany({
    where: { courseId, conceptSlug: selectedSlug },
    select: { misconceptionText: true },
    take: 5,
  })

  // 4. Fetch learning objectives for context
  const objectives = await prisma.learningObjective.findMany({
    where: { courseId },
    select: { title: true, bloomLevel: true },
    take: 5,
  })

  const conceptLabel = selectedSlug.replace(/-/g, ' ')
  const misconceptionList = misconceptions.map((m) => m.misconceptionText)

  // 5. Build AI student system prompt and generate first message
  const bloomLabel = BLOOM_LABELS[bloomLevel] ?? 'Understand'
  const misconceptionPrompt = misconceptionList.length > 0
    ? `You tend to confuse these things:\n${misconceptionList.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
    : 'You have general confusion about this topic.'

  const systemPrompt = `You are a struggling student learning about "${conceptLabel}" in ${course.courseCode} — ${course.title}.
${misconceptionPrompt}

The student teaching you is currently at Bloom level ${bloomLevel} (${bloomLabel}).
Ask confused follow-up questions at an appropriate difficulty.
When corrected well, acknowledge the insight and move forward to a harder question.
Start by introducing yourself and asking the student to explain the concept to you.
Keep your responses to 2-4 sentences. Be a realistic confused student — not over-the-top.`

  const aiResponse = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Hi! I'm going to teach you about ${conceptLabel}. Let me know what you're confused about.`,
      },
    ],
  })

  let firstMessage = `Hey! I've been struggling with ${conceptLabel}. Can you explain it to me from the beginning?`
  const textBlock = aiResponse.content.find((b) => b.type === 'text')
  if (textBlock && textBlock.type === 'text') {
    firstMessage = textBlock.text
  }

  // 6. Create session
  const transcript: TranscriptMessage[] = [
    { role: 'ai-student', content: firstMessage },
  ]

  const session = await prisma.teachBackSession.create({
    data: {
      userId,
      courseId,
      conceptSlug: selectedSlug,
      conceptLabel,
      transcript: transcript as unknown as Prisma.InputJsonValue,
      turnCount: 1,
    },
  })

  return {
    sessionId: session.id,
    conceptSlug: selectedSlug,
    conceptLabel,
    courseCode: course.courseCode,
    courseName: course.title,
    bloomTarget: Math.min(6, bloomLevel + 1),
    firstMessage,
  }
}

// ── sendTeachBackMessage ──────────────────────────────────────────────────────

export async function sendTeachBackMessage(
  sessionId: string,
  userId: string,
  message: string,
): Promise<TeachBackMessageResponse> {
  // 1. Fetch session + verify ownership
  const session = await prisma.teachBackSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      courseId: true,
      conceptSlug: true,
      conceptLabel: true,
      transcript: true,
      turnCount: true,
      completedAt: true,
      course: { select: { courseCode: true, title: true } },
    },
  })

  if (!session || session.userId !== userId) {
    throw new Error('Session not found')
  }
  if (session.completedAt) {
    throw new Error('Session already completed')
  }

  const transcript = session.transcript as unknown as TranscriptMessage[]

  // 2. Append user message
  transcript.push({ role: 'user', content: message })
  const newTurnCount = session.turnCount + 1

  // 3. Check if we should wrap up
  const shouldWrapUp = newTurnCount >= 8

  // 4. Fetch misconceptions for persona
  const misconceptions = await prisma.misconceptionTaxonomy.findMany({
    where: { courseId: session.courseId, conceptSlug: session.conceptSlug },
    select: { misconceptionText: true },
    take: 5,
  })
  const misconceptionList = misconceptions.map((m) => m.misconceptionText)

  // 5. Build conversation for Haiku
  const systemPrompt = `You are a struggling student learning about "${session.conceptLabel}" in ${session.course.courseCode} — ${session.course.title}.
${misconceptionList.length > 0 ? `You tend to confuse these things:\n${misconceptionList.map((m, i) => `${i + 1}. ${m}`).join('\n')}` : 'You have general confusion about this topic.'}

${shouldWrapUp
    ? 'The teaching session is wrapping up. Show that you are starting to understand the concept based on the explanations given. Express gratitude and summarize what you learned in 2-3 sentences.'
    : 'Ask confused follow-up questions. When corrected well, acknowledge and ask a slightly harder question. Keep responses to 2-4 sentences.'}
`

  const messages: { role: 'user' | 'assistant'; content: string }[] = []
  for (const msg of transcript) {
    messages.push({
      role: msg.role === 'ai-student' ? 'assistant' : 'user',
      content: msg.content,
    })
  }

  const aiResponse = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    system: systemPrompt,
    messages,
  })

  let aiMessage = shouldWrapUp
    ? `I think I'm starting to get it now. Thanks for explaining ${session.conceptLabel}!`
    : `Hmm, I'm still a bit confused about ${session.conceptLabel}. Can you explain that differently?`

  const textBlock = aiResponse.content.find((b) => b.type === 'text')
  if (textBlock && textBlock.type === 'text') {
    aiMessage = textBlock.text
  }

  // 6. Append AI response
  transcript.push({ role: 'ai-student', content: aiMessage })

  // 7. Update session
  await prisma.teachBackSession.update({
    where: { id: sessionId },
    data: {
      transcript: transcript as unknown as Prisma.InputJsonValue,
      turnCount: newTurnCount + 1,
    },
  })

  return {
    message: aiMessage,
    turnCount: newTurnCount + 1,
    isComplete: shouldWrapUp,
  }
}

// ── completeTeachBack ─────────────────────────────────────────────────────────

export async function completeTeachBack(
  sessionId: string,
  userId: string,
): Promise<TeachBackEvaluation> {
  // 1. Fetch session
  const session = await prisma.teachBackSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      courseId: true,
      conceptSlug: true,
      conceptLabel: true,
      transcript: true,
      turnCount: true,
      completedAt: true,
      course: { select: { courseCode: true, title: true } },
    },
  })

  if (!session || session.userId !== userId) {
    throw new Error('Session not found')
  }
  if (session.completedAt) {
    throw new Error('Session already completed')
  }

  const transcript = session.transcript as unknown as TranscriptMessage[]

  // 2. Fetch misconceptions + objectives for evaluation context
  const misconceptions = await prisma.misconceptionTaxonomy.findMany({
    where: { courseId: session.courseId, conceptSlug: session.conceptSlug },
    select: { id: true, misconceptionText: true },
  })

  const objectives = await prisma.learningObjective.findMany({
    where: { courseId: session.courseId },
    select: { title: true, bloomLevel: true },
    take: 5,
  })

  // 3. Call Sonnet to evaluate
  const transcriptText = transcript
    .map((msg) => `${msg.role === 'ai-student' ? 'AI Student' : 'Teacher'}: ${msg.content}`)
    .join('\n\n')

  const misconceptionLabels = misconceptions.map((m) => m.misconceptionText)

  const evalResponse = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `You are evaluating a student's teaching performance. They were teaching the concept "${session.conceptLabel}" in ${session.course.courseCode} — ${session.course.title} to a confused AI student.

Known misconceptions for this concept:
${misconceptionLabels.length > 0 ? misconceptionLabels.map((m, i) => `${i + 1}. ${m}`).join('\n') : 'None catalogued.'}

Transcript:
${transcriptText}

Evaluate the student's teaching on these dimensions. Score each 0.0 to 1.0:
1. accuracy — Did they explain the concept correctly? Did they catch/correct misconceptions?
2. clarity — Would someone actually understand their explanation?
3. teachingScore — Overall teaching effectiveness (weighted average)
4. bloomAchieved — Bloom level demonstrated (1-6): 1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create
5. misconceptionsCovered — Which misconception numbers (from the list above) they addressed
6. feedbackNarrative — 2-3 sentences of constructive coaching

Respond in this exact JSON format:
{"accuracy": 0.0, "clarity": 0.0, "teachingScore": 0.0, "bloomAchieved": 1, "misconceptionsCovered": [1, 2], "feedbackNarrative": "..."}`,
      },
    ],
  })

  // 4. Parse evaluation
  let accuracyScore = 0.5
  let clarityScore = 0.5
  let teachingScore = 0.5
  let bloomAchieved = 2
  let misconceptionsCoveredIndices: number[] = []
  let feedbackNarrative = 'Good effort! Keep practicing your teaching skills.'

  const evalBlock = evalResponse.content.find((b) => b.type === 'text')
  if (evalBlock && evalBlock.type === 'text') {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = evalBlock.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (typeof parsed.accuracy === 'number') accuracyScore = Math.min(1, Math.max(0, parsed.accuracy))
        if (typeof parsed.clarity === 'number') clarityScore = Math.min(1, Math.max(0, parsed.clarity))
        if (typeof parsed.teachingScore === 'number') teachingScore = Math.min(1, Math.max(0, parsed.teachingScore))
        if (typeof parsed.bloomAchieved === 'number') bloomAchieved = Math.min(6, Math.max(1, Math.round(parsed.bloomAchieved)))
        if (Array.isArray(parsed.misconceptionsCovered)) misconceptionsCoveredIndices = parsed.misconceptionsCovered
        if (typeof parsed.feedbackNarrative === 'string') feedbackNarrative = parsed.feedbackNarrative
      }
    } catch {
      // Use defaults
    }
  }

  // Map indices to misconception IDs
  const misconceptionsCovered = misconceptionsCoveredIndices
    .filter((i) => i >= 1 && i <= misconceptions.length)
    .map((i) => misconceptions[i - 1].id)

  // 5. Update ConceptState if teaching was good
  let srBoosted = false
  if (teachingScore > 0.7) {
    const conceptState = await prisma.conceptState.findUnique({
      where: {
        userId_courseId_conceptSlug: {
          userId,
          courseId: session.courseId,
          conceptSlug: session.conceptSlug,
        },
      },
      select: { stabilityFactor: true, missedReviews: true, bloomHighWater: true },
    })

    if (conceptState) {
      const srState: ConceptStateForScheduler = {
        stabilityFactor: conceptState.stabilityFactor * 2, // 2x stability boost for successful teaching
        missedReviews: conceptState.missedReviews,
        bloomHighWater: conceptState.bloomHighWater,
      }

      const updated = computeNextReview(srState, 0.9, bloomAchieved)

      await prisma.conceptState.update({
        where: {
          userId_courseId_conceptSlug: {
            userId,
            courseId: session.courseId,
            conceptSlug: session.conceptSlug,
          },
        },
        data: {
          stabilityFactor: updated.stabilityFactor,
          nextReviewAt: updated.nextReviewAt,
          missedReviews: updated.missedReviews,
          bloomHighWater: updated.bloomHighWater ?? undefined,
        },
      })

      srBoosted = true
    }

    // Update concept mastery
    await upsertConceptMastery(userId, session.conceptSlug, session.courseId, teachingScore)
  }

  // 6. Update session with scores
  await prisma.teachBackSession.update({
    where: { id: sessionId },
    data: {
      teachingScore,
      accuracyScore,
      clarityScore,
      bloomAchieved,
      misconceptionsCovered,
      completedAt: new Date(),
    },
  })

  return {
    sessionId,
    teachingScore,
    accuracyScore,
    clarityScore,
    bloomAchieved,
    misconceptionsCovered,
    feedbackNarrative,
    srBoosted,
  }
}

// ── listTeachBackSessions ─────────────────────────────────────────────────────

export async function listTeachBackSessions(
  userId: string,
  courseId?: string,
): Promise<TeachBackSummary[]> {
  const sessions = await prisma.teachBackSession.findMany({
    where: {
      userId,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      conceptSlug: true,
      conceptLabel: true,
      turnCount: true,
      teachingScore: true,
      bloomAchieved: true,
      completedAt: true,
      createdAt: true,
      course: { select: { courseCode: true, title: true } },
    },
  })

  return sessions.map((s) => ({
    id: s.id,
    conceptSlug: s.conceptSlug,
    conceptLabel: s.conceptLabel,
    courseCode: s.course.courseCode,
    courseName: s.course.title,
    turnCount: s.turnCount,
    teachingScore: s.teachingScore,
    bloomAchieved: s.bloomAchieved,
    completedAt: s.completedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }))
}
