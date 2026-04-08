/**
 * Practice — Simulation Library service.
 * Modular simulation engine, scenario management, debrief, portfolio.
 */

import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import type { PracticeSimPhase } from '../generated/prisma'

// ── Types ───────────────────────────────────────────────────────────────

export interface RubricDimension {
  dimension: string
  description: string
  weight: number
}

export interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface DimensionScore {
  name: string
  score: number // 1-10
  feedback: string
}

// ── Starter Scenarios (seeded on first access) ──────────────────────────

export const STARTER_SCENARIOS = [
  {
    title: 'Job Interview: Software Engineer',
    description: 'Practice a technical job interview for a software engineering position. The interviewer will ask behavioral and technical questions.',
    category: 'career',
    difficulty: 'standard',
    emoji: '💼',
    aiRole: 'Senior hiring manager at a tech company',
    aiPersonality: 'Professional, friendly but probing. Ask behavioral questions (STAR method), one technical problem-solving question, and follow up on weak answers. Be realistic — push back gently on vague answers.',
    studentRole: 'Software engineering job candidate',
    rubricJson: [
      { dimension: 'Clarity', description: 'Clear, structured answers with specific examples', weight: 25 },
      { dimension: 'Confidence', description: 'Composed delivery, appropriate pace, not overly apologetic', weight: 20 },
      { dimension: 'Specificity', description: 'Uses concrete examples, numbers, outcomes — not generalities', weight: 25 },
      { dimension: 'Adaptability', description: 'Handles follow-up questions and pivots well', weight: 15 },
      { dimension: 'Self-Awareness', description: 'Honest about weaknesses, shows growth mindset', weight: 15 },
    ],
    estimatedMinutes: 15,
    turnLimit: 10,
  },
  {
    title: 'Thesis Defense',
    description: 'Defend your research before a faculty committee. Expect tough questions about methodology, significance, and limitations.',
    category: 'academic',
    difficulty: 'advanced',
    emoji: '🎓',
    aiRole: 'Faculty thesis committee chair',
    aiPersonality: 'Intellectually rigorous, asks probing questions about methodology, challenges assumptions, pushes on limitations. Not hostile but expects precision. Occasionally plays devil\'s advocate.',
    studentRole: 'Graduate student defending thesis',
    rubricJson: [
      { dimension: 'Depth of Knowledge', description: 'Demonstrates deep understanding of the research area', weight: 30 },
      { dimension: 'Defense of Methodology', description: 'Justifies research design choices with reasoning', weight: 25 },
      { dimension: 'Handling Criticism', description: 'Responds to challenges constructively, not defensively', weight: 20 },
      { dimension: 'Communication', description: 'Explains complex ideas clearly for the committee', weight: 25 },
    ],
    estimatedMinutes: 20,
    turnLimit: 12,
  },
  {
    title: 'Patient Intake Interview',
    description: 'Conduct an initial patient interview as a nursing student. Build rapport while gathering essential health information.',
    category: 'healthcare',
    difficulty: 'standard',
    emoji: '🏥',
    aiRole: 'Adult patient visiting clinic for the first time',
    aiPersonality: 'Slightly anxious, gives short answers initially, opens up when the student shows empathy. Has some symptoms they\'re embarrassed about. Responds well to open-ended questions.',
    studentRole: 'Nursing student conducting intake',
    rubricJson: [
      { dimension: 'Rapport Building', description: 'Creates a comfortable, trusting environment', weight: 25 },
      { dimension: 'Clinical Thoroughness', description: 'Covers key health history areas systematically', weight: 25 },
      { dimension: 'Empathy', description: 'Responds sensitively to patient concerns and emotions', weight: 25 },
      { dimension: 'Communication Clarity', description: 'Uses plain language, avoids jargon, confirms understanding', weight: 25 },
    ],
    estimatedMinutes: 15,
    turnLimit: 10,
  },
  {
    title: 'Investor Pitch',
    description: 'Pitch your startup idea to a skeptical investor. Convince them your business is worth funding.',
    category: 'business',
    difficulty: 'advanced',
    emoji: '📈',
    aiRole: 'Venture capital partner evaluating startups',
    aiPersonality: 'Sharp, analytical, time-constrained. Interrupts if the pitch meanders. Asks tough questions about market size, competition, unit economics. Impressed by data, unimpressed by buzzwords.',
    studentRole: 'Startup founder seeking seed funding',
    rubricJson: [
      { dimension: 'Problem Clarity', description: 'Clearly articulates the problem being solved', weight: 20 },
      { dimension: 'Business Viability', description: 'Demonstrates market understanding and revenue model', weight: 25 },
      { dimension: 'Handling Pushback', description: 'Responds to investor objections with data and logic', weight: 25 },
      { dimension: 'Persuasion', description: 'Compelling delivery, builds urgency and excitement', weight: 15 },
      { dimension: 'Conciseness', description: 'Gets to the point, respects the investor\'s time', weight: 15 },
    ],
    estimatedMinutes: 12,
    turnLimit: 8,
  },
  {
    title: 'Difficult Conversation with Professor',
    description: 'Practice requesting a deadline extension or discussing a grade concern with a professor.',
    category: 'communication',
    difficulty: 'warmup',
    emoji: '🗣️',
    aiRole: 'University professor during office hours',
    aiPersonality: 'Busy but fair. Wants to see that the student takes responsibility. Willing to be flexible if given a good reason, but pushes back on excuses. Values directness and honesty.',
    studentRole: 'Student requesting accommodation',
    rubricJson: [
      { dimension: 'Professionalism', description: 'Appropriate tone, respectful of professor\'s time', weight: 25 },
      { dimension: 'Clarity of Request', description: 'States what they need clearly and early', weight: 25 },
      { dimension: 'Accountability', description: 'Takes responsibility rather than making excuses', weight: 25 },
      { dimension: 'Problem-Solving', description: 'Proposes solutions, not just problems', weight: 25 },
    ],
    estimatedMinutes: 10,
    turnLimit: 8,
  },
  {
    title: 'Negotiation Exercise',
    description: 'Negotiate a salary offer for your first job after graduation. The hiring manager has a range in mind.',
    category: 'career',
    difficulty: 'standard',
    emoji: '🤝',
    aiRole: 'HR manager extending a job offer',
    aiPersonality: 'Professional, has a budget range. Initially offers the low end. Responds to well-reasoned counteroffers. Appreciates preparation and market research. May offer non-salary benefits as compromise.',
    studentRole: 'New graduate negotiating first salary',
    rubricJson: [
      { dimension: 'Preparation', description: 'References market data and specific qualifications', weight: 25 },
      { dimension: 'Assertiveness', description: 'Advocates for themselves without being aggressive', weight: 25 },
      { dimension: 'Flexibility', description: 'Considers creative solutions beyond base salary', weight: 25 },
      { dimension: 'Professionalism', description: 'Maintains positive relationship throughout negotiation', weight: 25 },
    ],
    estimatedMinutes: 12,
    turnLimit: 10,
  },
]

// ── Scenario Management ─────────────────────────────────────────────────

export async function ensureStarterScenarios() {
  const count = await prisma.practiceScenario.count({ where: { isBuiltIn: true } })
  if (count >= STARTER_SCENARIOS.length) return

  for (const s of STARTER_SCENARIOS) {
    await prisma.practiceScenario.upsert({
      where: { id: `builtin-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      create: {
        id: `builtin-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        ...s,
        rubricJson: toJsonValue(s.rubricJson),
      },
      update: {},
    })
  }
}

export async function listScenarios(category?: string) {
  await ensureStarterScenarios()
  return prisma.practiceScenario.findMany({
    where: {
      ...(category ? { category } : {}),
    },
    orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getScenario(scenarioId: string) {
  return prisma.practiceScenario.findUnique({ where: { id: scenarioId } })
}

export async function createEducatorScenario(
  creatorId: string,
  data: {
    title: string; description: string; category: string; difficulty?: string; emoji?: string
    aiRole: string; aiPersonality: string; studentRole: string
    rubricJson: RubricDimension[]; estimatedMinutes?: number; turnLimit?: number; courseId?: string
  },
) {
  return prisma.practiceScenario.create({
    data: {
      ...data,
      rubricJson: toJsonValue(data.rubricJson),
      isBuiltIn: false,
      creatorId,
      difficulty: data.difficulty ?? 'standard',
      emoji: data.emoji ?? '🎭',
      estimatedMinutes: data.estimatedMinutes ?? 15,
      turnLimit: data.turnLimit ?? 12,
    },
  })
}

// ── Session Management ──────────────────────────────────────────────────

export async function startSession(userId: string, scenarioId: string) {
  return prisma.practiceSimSession.create({
    data: { userId, scenarioId, phase: 'BRIEFING', transcript: [] },
    include: { scenario: true },
  })
}

export async function getSession(sessionId: string) {
  return prisma.practiceSimSession.findUnique({
    where: { id: sessionId },
    include: { scenario: true },
  })
}

export async function updateSessionPhase(sessionId: string, phase: PracticeSimPhase) {
  return prisma.practiceSimSession.update({
    where: { id: sessionId },
    data: { phase },
  })
}

export async function appendTranscript(sessionId: string, message: TranscriptMessage) {
  const session = await prisma.practiceSimSession.findUnique({ where: { id: sessionId } })
  if (!session) return null

  const transcript = (session.transcript as TranscriptMessage[] | null) ?? []
  transcript.push(message)

  return prisma.practiceSimSession.update({
    where: { id: sessionId },
    data: {
      transcript: toJsonValue(transcript),
      turnCount: message.role === 'user' ? { increment: 1 } : undefined,
    },
  })
}

export async function saveDebrief(
  sessionId: string,
  debrief: {
    dimensions: DimensionScore[]
    overall: number
    strengths: string[]
    growthAreas: string[]
  },
) {
  return prisma.practiceSimSession.update({
    where: { id: sessionId },
    data: {
      phase: 'DEBRIEF',
      scores: toJsonValue({ dimensions: debrief.dimensions, overall: debrief.overall }),
      strengths: debrief.strengths,
      growthAreas: debrief.growthAreas,
      overallScore: debrief.overall,
      completedAt: new Date(),
    },
  })
}

// ── User History ────────────────────────────────────────────────────────

export async function getUserSessions(userId: string, limit = 10) {
  return prisma.practiceSimSession.findMany({
    where: { userId },
    include: { scenario: { select: { title: true, emoji: true, category: true } } },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
}

// ── Portfolio ───────────────────────────────────────────────────────────

export async function saveToPortfolio(userId: string, sessionId: string) {
  const session = await prisma.practiceSimSession.findFirst({
    where: { id: sessionId, userId, completedAt: { not: null } },
    include: { scenario: true },
  })
  if (!session) return null

  await prisma.practiceSimSession.update({
    where: { id: sessionId },
    data: { savedToPortfolio: true },
  })

  return prisma.portfolioItem.create({
    data: {
      userId,
      type: 'PROJECT',
      title: `Simulation: ${session.scenario.title}`,
      description: `Completed ${session.scenario.category} simulation as ${session.scenario.studentRole}. Score: ${session.overallScore?.toFixed(0)}/10.`,
      skills: [session.scenario.category, 'Communication', 'Critical Thinking'],
      isVerified: true,
      metadata: {
        practiceSessionId: sessionId,
        scenarioTitle: session.scenario.title,
        overallScore: session.overallScore,
        strengths: session.strengths,
      },
    },
  })
}

// ── Simulation Prompt Builder ───────────────────────────────────────────

export function buildSimulationPrompt(
  scenario: {
    title: string; aiRole: string; aiPersonality: string; studentRole: string
    rubricJson: unknown; turnLimit: number
  },
  phase: PracticeSimPhase,
  turnCount: number,
): string {
  const rubric = scenario.rubricJson as RubricDimension[]

  if (phase === 'BRIEFING') {
    return `You are Sandy, running a practice simulation for a student.

**Scenario:** ${scenario.title}
**Your Role:** ${scenario.aiRole}
**Student's Role:** ${scenario.studentRole}

Briefly introduce the scenario in 2-3 sentences. Tell the student what to expect, then say "When you're ready, say 'I'm ready' and we'll begin."

Do NOT start the simulation yet — just set the stage.`
  }

  if (phase === 'DEBRIEF') {
    const rubricText = rubric.map(r => `- ${r.dimension} (${r.weight}%): ${r.description}`).join('\n')

    return `The simulation is over. You are now Sandy the coach, no longer in character.

Score the student on each dimension (1-10) based on the conversation transcript.

Rubric:
${rubricText}

Return ONLY valid JSON:
{
  "dimensions": [${rubric.map(r => `{"name": "${r.dimension}", "score": <1-10>, "feedback": "<1 sentence>"}`).join(', ')}],
  "overall": <weighted average 1-10>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "growthAreas": ["<area 1>", "<area 2>"]
}`
  }

  // ACTIVE phase
  const turnsRemaining = scenario.turnLimit - turnCount
  const urgency = turnsRemaining <= 2 ? '\n\nThis is one of the final turns — begin wrapping up the conversation naturally.' : ''

  return `You are in character as: ${scenario.aiRole}

${scenario.aiPersonality}

The student is playing: ${scenario.studentRole}

Rules:
- Stay in character at all times
- Keep responses to 2-4 sentences (realistic conversation pace)
- Respond naturally to what the student says
- Push back on vague or weak answers like a real person would
- Turn ${turnCount + 1} of ${scenario.turnLimit}${urgency}

Do NOT break character. Do NOT provide coaching during the simulation.`
}
