// ── AI Study Coach Service ──────────────────────────────────────────────────
// Manages coaching sessions where Sandy helps students learn HOW to use AI
// effectively for their studies. Streams responses via Claude Haiku, then
// scores the full transcript on 4 technique dimensions.

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { DisciplineFamily, StudyCoachSession, Prisma } from '../../generated/prisma'

const anthropic = new Anthropic()

// ── Types ───────────────────────────────────────────────────────────────────

interface SessionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  coachingNote?: string
  timestamp: string
}

export interface TechniqueScores {
  followUpQuality: number
  verificationHabits: number
  thinkingPauses: number
  contextProvision: number
}

export interface SessionScoreResult {
  techniqueScores: TechniqueScores
  overallScore: number
  feedback: string
}

// ── System Prompt ───────────────────────────────────────────────────────────

function buildCoachSystemPrompt(topic: string, courseContext: string): string {
  return `You are an AI Study Coach at the University of Kentucky. A student is using AI to learn about a specific topic for their coursework.

Your job is NOT to teach the topic directly. Your job is to COACH the student on how to effectively use AI for learning.

When the student asks you about their topic, respond helpfully — but after each substantive response, provide a coaching note in this exact format:
[COACHING_NOTE: brief technique feedback here]

Coach them on:
- When to ask follow-up questions vs. moving on
- When to verify AI output against primary sources
- When to pause and think before asking the next question
- How to provide good context in their prompts
- When AI is NOT the right tool for this particular question
- How to build understanding vs. just getting answers

Be warm, encouraging, and specific. Reference their actual prompts in your coaching.
If they ask a question where AI might give unreliable answers (recent events, very specialized knowledge), flag this.

The student is studying: ${topic}
Course context: ${courseContext}`
}

// ── Extract coaching notes from response ────────────────────────────────────

function extractCoachingNote(text: string): string | undefined {
  const match = text.match(/\[COACHING_NOTE:\s*(.*?)\]/s)
  return match ? match[1].trim() : undefined
}

// ── Service Functions ───────────────────────────────────────────────────────

export async function startSession(
  userId: string,
  topic: string,
  courseId?: string,
  disciplineFamily?: DisciplineFamily,
): Promise<StudyCoachSession> {
  let courseContext = 'No specific course'

  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, courseCode: true, description: true },
    })
    if (course) {
      courseContext = `${course.courseCode} — ${course.title}${course.description ? `. ${course.description}` : ''}`
    }
  }

  const systemPrompt = buildCoachSystemPrompt(topic, courseContext)
  const now = new Date().toISOString()

  const initialMessages: SessionMessage[] = [
    { role: 'system', content: systemPrompt, timestamp: now },
  ]

  return prisma.studyCoachSession.create({
    data: {
      userId,
      topic,
      courseId: courseId || null,
      disciplineFamily: disciplineFamily || null,
      messages: initialMessages as unknown as Prisma.InputJsonValue,
    },
  })
}

export async function processMessage(
  sessionId: string,
  userMessage: string,
): Promise<{ stream: ReadableStream<Uint8Array>; sessionId: string }> {
  const session = await prisma.studyCoachSession.findUniqueOrThrow({
    where: { id: sessionId },
  })

  const messages = (session.messages as unknown as SessionMessage[]) || []
  const now = new Date().toISOString()

  // Append user message
  messages.push({ role: 'user', content: userMessage, timestamp: now })

  // Build Anthropic message array (system message separate)
  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  const aiStream = anthropic.messages.stream(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemMsg?.content || '',
      messages: chatMessages,
    },
    { signal: controller.signal },
  )

  const encoder = new TextEncoder()
  let fullResponse = ''

  const readable = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      try {
        for await (const event of aiStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullResponse += event.delta.text
            ctrl.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch {
        // timeout or abort — swallow
      } finally {
        clearTimeout(timeout)

        // Persist assistant message with coaching note
        const coachingNote = extractCoachingNote(fullResponse)
        messages.push({
          role: 'assistant',
          content: fullResponse,
          coachingNote,
          timestamp: new Date().toISOString(),
        })

        await prisma.studyCoachSession
          .update({
            where: { id: sessionId },
            data: { messages: messages as unknown as Prisma.InputJsonValue },
          })
          .catch(() => {})

        ctrl.close()
      }
    },
  })

  return { stream: readable, sessionId }
}

export async function scoreSession(
  sessionId: string,
): Promise<SessionScoreResult> {
  const session = await prisma.studyCoachSession.findUniqueOrThrow({
    where: { id: sessionId },
  })

  const messages = (session.messages as unknown as SessionMessage[]) || []

  // Build transcript of user messages and coaching notes
  const transcriptParts: string[] = []
  for (const m of messages) {
    if (m.role === 'user') {
      transcriptParts.push(`STUDENT: ${m.content}`)
    } else if (m.role === 'assistant' && m.coachingNote) {
      transcriptParts.push(`COACHING NOTE: ${m.coachingNote}`)
    }
  }
  const transcript = transcriptParts.join('\n\n')

  const scoringPrompt = `Analyze this AI study session transcript. The student was learning about "${session.topic}" with an AI study coach.

Score the student's learning technique on 4 dimensions (0-100):
- followUpQuality: Did they ask good follow-up questions that deepened understanding?
- verificationHabits: Did they verify claims, check sources, or express healthy skepticism?
- thinkingPauses: Did they pause to reflect or process before asking the next question? Did they demonstrate processing rather than rapid-fire questions?
- contextProvision: Did they provide good context in their prompts (course details, what they already know, specific goals)?

Return ONLY valid JSON (no markdown, no code fences):
{"followUpQuality": N, "verificationHabits": N, "thinkingPauses": N, "contextProvision": N, "feedback": "2-3 paragraphs of constructive coaching advice"}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${scoringPrompt}\n\nTRANSCRIPT:\n${transcript}`,
      },
    ],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: {
    followUpQuality: number
    verificationHabits: number
    thinkingPauses: number
    contextProvision: number
    feedback: string
  }

  try {
    parsed = JSON.parse(text)
  } catch {
    // Fallback if JSON parsing fails
    parsed = {
      followUpQuality: 50,
      verificationHabits: 50,
      thinkingPauses: 50,
      contextProvision: 50,
      feedback:
        'Your session showed a mix of strengths and areas for growth. Keep practicing!',
    }
  }

  const techniqueScores: TechniqueScores = {
    followUpQuality: Math.max(0, Math.min(100, parsed.followUpQuality)),
    verificationHabits: Math.max(0, Math.min(100, parsed.verificationHabits)),
    thinkingPauses: Math.max(0, Math.min(100, parsed.thinkingPauses)),
    contextProvision: Math.max(0, Math.min(100, parsed.contextProvision)),
  }

  const overallScore = Math.round(
    (techniqueScores.followUpQuality +
      techniqueScores.verificationHabits +
      techniqueScores.thinkingPauses +
      techniqueScores.contextProvision) /
      4,
  )

  await prisma.studyCoachSession.update({
    where: { id: sessionId },
    data: {
      techniqueScores: techniqueScores as unknown as Prisma.InputJsonValue,
      overallScore,
      completedAt: new Date(),
    },
  })

  return { techniqueScores, overallScore, feedback: parsed.feedback }
}

export async function getSession(
  sessionId: string,
): Promise<StudyCoachSession> {
  return prisma.studyCoachSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { course: { select: { id: true, title: true, courseCode: true } } },
  })
}

export async function getUserSessions(
  userId: string,
): Promise<StudyCoachSession[]> {
  return prisma.studyCoachSession.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true, courseCode: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}
