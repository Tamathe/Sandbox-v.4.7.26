import { prisma } from '../prisma'
import type {
  VoiceTutoringMode,
  TranscriptEntry,
  CheckpointResult,
  ScoreDimension,
  VoiceSessionSummary,
} from './types'

export async function createVoiceSession(
  userId: string,
  type: VoiceTutoringMode,
  options?: { scenarioId?: string; courseId?: string; topicTags?: string[] },
) {
  return prisma.voiceSession.create({
    data: {
      userId,
      type,
      scenarioId: options?.scenarioId,
      courseId: options?.courseId,
      topicTags: options?.topicTags ?? [],
      transcript: [],
      status: 'active',
    },
  })
}

export async function updateVoiceSession(
  sessionId: string,
  data: {
    transcript?: TranscriptEntry[]
    status?: string
    durationSecs?: number
    summary?: string
    checkpointResults?: CheckpointResult[]
  },
) {
  const update: Record<string, unknown> = {}
  if (data.transcript) update.transcript = data.transcript
  if (data.status) update.status = data.status
  if (data.durationSecs !== undefined) update.durationSecs = data.durationSecs
  if (data.summary) update.summary = data.summary
  if (data.checkpointResults) update.checkpointResults = data.checkpointResults

  return prisma.voiceSession.update({
    where: { id: sessionId },
    data: update,
  })
}

export async function scoreVoiceSession(
  sessionId: string,
  scores: ScoreDimension[],
) {
  await prisma.voiceSessionScore.deleteMany({ where: { sessionId } })
  await prisma.voiceSessionScore.createMany({
    data: scores.map(s => ({
      sessionId,
      dimension: s.dimension,
      score: s.score,
      weight: s.weight,
      evidence: s.evidence,
      feedback: s.feedback,
    })),
  })
}

export async function getVoiceSession(sessionId: string) {
  return prisma.voiceSession.findUnique({
    where: { id: sessionId },
    include: { scores: true, scenario: true },
  })
}

export async function listVoiceSessions(
  userId: string,
  limit = 20,
): Promise<VoiceSessionSummary[]> {
  const sessions = await prisma.voiceSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { scores: true },
  })

  return sessions.map(s => ({
    id: s.id,
    type: s.type as VoiceTutoringMode,
    courseId: s.courseId,
    topicTags: s.topicTags,
    durationSecs: s.durationSecs,
    summary: s.summary,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    scores: s.scores.map(sc => ({
      dimension: sc.dimension,
      score: sc.score,
      weight: sc.weight,
      evidence: sc.evidence,
      feedback: sc.feedback,
    })),
  }))
}

export function getVoiceTutoringPrompt(mode: VoiceTutoringMode, topic: string, courseName?: string): string {
  const context = courseName ? ` for the course "${courseName}"` : ''

  const prompts: Record<VoiceTutoringMode, string> = {
    socratic: `You are a Socratic tutor${context}. The topic is: ${topic}.
Never give answers directly. Ask one question at a time. Increase complexity when the student demonstrates understanding. If they struggle, simplify and guide with leading questions. Keep responses concise (2-3 sentences max).`,

    rehearsal: `You are a curious student who doesn't understand the topic: ${topic}${context}.
The student will explain the concept to you (Feynman Technique). Ask clarifying questions. Be encouraging but persistent — if something is unclear or missing, say "I don't quite follow..." Ask about examples and edge cases. Keep responses to 1-2 sentences.`,

    walkthrough: `Walk the student through the topic "${topic}"${context} step by step.
After each concept, pause and check understanding: "Does that make sense?" If they say no, re-explain with a different analogy. If they ask a question, answer it, then resume the walkthrough. Keep each step to 3-4 sentences.`,

    assessment: `You are an oral examiner${context}. The topic is: ${topic}.
Ask exactly 5 questions, one at a time. Wait for the student's answer. Do NOT help, hint, or provide feedback between questions. After each answer, say only "Thank you. Next question:" and ask the next one. After all 5 questions, say "Assessment complete."`,

    scenario: '',
  }

  return prompts[mode]
}

export function suggestVoiceTutoringMode(signals: {
  justFinishedReading?: boolean
  assessmentWithin3Days?: boolean
  lowQuizScores?: boolean
  newTopic?: boolean
}): { mode: VoiceTutoringMode; reason: string } {
  if (signals.assessmentWithin3Days) {
    return { mode: 'assessment', reason: 'You have an assessment coming up — oral practice will prepare you.' }
  }
  if (signals.justFinishedReading) {
    return { mode: 'rehearsal', reason: "You just finished reading — explaining it back solidifies understanding." }
  }
  if (signals.lowQuizScores) {
    return { mode: 'socratic', reason: 'Socratic questioning helps identify and fill knowledge gaps.' }
  }
  if (signals.newTopic) {
    return { mode: 'walkthrough', reason: 'A guided walkthrough is the best way to approach new material.' }
  }
  return { mode: 'socratic', reason: 'Socratic dialogue is a great all-purpose study mode.' }
}
