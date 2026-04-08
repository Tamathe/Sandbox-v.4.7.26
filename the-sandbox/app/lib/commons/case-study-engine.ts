/**
 * Case Study Engine -- Deep-dive analysis with progressive evidence drops.
 *
 * Sandy generates a case study with multiple evidence phases. Participants
 * read the initial case, form hypotheses, then revise as new evidence drops.
 * Sandy tracks hypothesis evolution and reveals what actually happened.
 *
 * Lifecycle: LOBBY -> READ (COUNTDOWN) -> HYPOTHESIZE (QUESTION)
 *   -> EVIDENCE_DROP+ANALYZE (REVEAL, repeats) -> CONCLUDE (SCOREBOARD) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=READ, QUESTION=HYPOTHESIZE,
 *   REVEAL=EVIDENCE, SCOREBOARD=CONCLUSION, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'

// -- Config -------------------------------------------------------------------

export type { CaseStudyConfig } from './types'
import type { CaseStudyConfig } from './types'

// -- In-Memory Session State --------------------------------------------------

interface CaseStudySessionState {
  caseText: string
  evidencePhases: string[]      // Pre-generated evidence drops
  revealText: string            // "what actually happened"
  currentPhase: number          // 0-based index into evidence phases (0 = initial, 1+ = evidence drops)
  totalPhases: number
  hypotheses: Map<string, string[]>  // userId -> hypothesis per phase
  timerHandle: ReturnType<typeof setTimeout> | null
  participantNames: Map<string, string>  // userId -> name
}

const sessionState = new Map<string, CaseStudySessionState>()

// -- Fallback Case Studies ----------------------------------------------------

const FALLBACK_CASE = {
  caseText: `In 2019, a mid-size regional hospital noticed an alarming trend: patient satisfaction scores had dropped 18% over two quarters, despite no changes in staffing, procedures, or facilities. The hospital serves a community of 120,000 people and is the only Level II trauma center within 60 miles.

The CEO convened a task force. Initial data showed: (1) Average wait times hadn't changed. (2) Staff turnover was actually lower than the previous year. (3) The drop was most pronounced in the 25-44 age demographic. (4) Online reviews had become increasingly negative, with recurring mentions of "feeling rushed" and "no one listens."

The hospital board is meeting in 2 weeks and wants a root cause analysis with recommendations. What do you think is happening here, and what should the task force investigate first?`,
  evidencePhases: [
    'Evidence Drop 1: The task force interviews 50 patients from the affected demographic. 72% mention that they tried to use the hospital\'s new patient portal (launched 8 months ago) before their visit, but found it confusing and unhelpful. Several say they arrived at appointments "already frustrated." The portal was built by an outside vendor with minimal clinician input.',
    'Evidence Drop 2: A deeper look at the timing reveals the satisfaction drop began exactly when the hospital implemented a new Electronic Health Record (EHR) system. Nurses report spending 40% more time on documentation, which means less face-time with patients. Several senior nurses say they feel "chained to the computer" during patient interactions.',
    'Evidence Drop 3: Exit interviews with 3 recently departed physicians reveal they left partly because of the EHR burden. One stated: "I went into medicine to help people, not to be a data entry clerk." Meanwhile, the hospital\'s social media manager reveals that a single viral negative review (viewed 45,000 times) triggered a cascade of similar complaints -- a phenomenon known as "review anchoring."',
  ],
  revealText: 'The root cause was a cascade effect triggered by the EHR implementation. The technology change created three interconnected problems: (1) reduced face-time with patients as staff focused on documentation, (2) a poorly designed patient portal that frustrated tech-savvy younger patients before they even arrived, and (3) physician burnout leading to departures that further strained remaining staff. The viral review amplified existing frustrations but was a symptom, not the cause. The hospital ultimately invested in EHR optimization training, redesigned the portal with patient input, and implemented "screen-free" first minutes for every patient encounter.',
}

// -- Start Case Study ---------------------------------------------------------

export async function startCaseStudy(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'CASE_STUDY') throw Object.assign(new Error('Not a case study room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })

  const config = room.config as unknown as CaseStudyConfig
  const evidencePhaseCount = config.evidencePhaseCount ?? 3

  // Generate case study
  const caseData = await generateCaseStudy(
    config.topic,
    room.course?.title ?? 'General',
    evidencePhaseCount,
  )

  // Name lookup
  const participantNames = new Map<string, string>()
  for (const p of room.participants) {
    participantNames.set(p.userId, p.user.name)
  }

  // Initialize session state
  sessionState.set(roomId, {
    caseText: caseData.caseText,
    evidencePhases: caseData.evidencePhases,
    revealText: caseData.revealText,
    currentPhase: 0,
    totalPhases: caseData.evidencePhases.length,
    hypotheses: new Map(),
    timerHandle: null,
    participantNames,
  })

  // Initialize hypothesis arrays for all participants
  const state = sessionState.get(roomId)!
  for (const p of room.participants) {
    state.hypotheses.set(p.userId, [])
  }

  // Update room phase
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  const readTimeMs = config.readTimeMs ?? 90000

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'READ' } })
  publishToRoom(roomId, {
    type: 'case_presented',
    data: {
      caseText: caseData.caseText,
      totalPhases: caseData.evidencePhases.length,
      readTimeMs,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Welcome to the Case Study! Read the case carefully. You'll have ${Math.round(readTimeMs / 1000)} seconds, then I'll ask for your initial hypothesis. New evidence will drop in rounds -- you can revise your thinking each time. Let's see how your analysis evolves!`,
    },
  })

  // After reading time, prompt for hypotheses
  state.timerHandle = setTimeout(() => {
    void promptForHypothesis(roomId)
  }, readTimeMs)
}

// -- Prompt for Hypothesis ----------------------------------------------------

async function promptForHypothesis(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const config = await getConfig(roomId)
  const hypothesizeTimeMs = config?.hypothesizeTimeMs ?? 90000

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', currentRound: state.currentPhase + 1 },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'HYPOTHESIZE' } })
  publishToRoom(roomId, {
    type: 'hypothesis_prompt',
    data: {
      phaseNumber: state.currentPhase,
      totalPhases: state.totalPhases,
      hypothesizeTimeMs,
      isInitial: state.currentPhase === 0,
    },
  })

  const phaseLabel = state.currentPhase === 0
    ? 'Based on what you\'ve read so far, what do you think is happening? Submit your initial hypothesis.'
    : `New evidence has been revealed! Has your thinking changed? Submit your updated hypothesis. (Round ${state.currentPhase + 1} of ${state.totalPhases + 1})`

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: phaseLabel },
  })

  // Auto-advance after hypothesis time
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void advanceEvidence(roomId)
  }, hypothesizeTimeMs)
}

// -- Submit Hypothesis --------------------------------------------------------

export async function submitHypothesis(roomId: string, userId: string, text: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const hyps = state.hypotheses.get(userId)
  if (!hyps) throw Object.assign(new Error('Not a participant'), { status: 403 })

  // Check they haven't already submitted for this phase
  if (hyps.length > state.currentPhase) {
    throw Object.assign(new Error('Already submitted hypothesis for this round'), { status: 400 })
  }

  hyps.push(text)
  const userName = state.participantNames.get(userId) ?? 'Unknown'

  const submittedCount = [...state.hypotheses.values()].filter((h) => h.length > state.currentPhase).length
  const totalParticipants = state.hypotheses.size

  publishToRoom(roomId, {
    type: 'hypothesis_submitted',
    data: { userId, userName, submittedCount, totalParticipants, phaseNumber: state.currentPhase },
  })

  // If all submitted, advance early
  if (submittedCount >= totalParticipants) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      state.timerHandle = null
    }
    setTimeout(() => {
      void advanceEvidence(roomId)
    }, 2000)
  }
}

// -- Advance Evidence ---------------------------------------------------------

async function advanceEvidence(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  // Fill in missing hypotheses
  for (const [userId, hyps] of state.hypotheses) {
    if (hyps.length <= state.currentPhase) {
      hyps.push('(No hypothesis submitted)')
    }
  }

  state.currentPhase++

  // Check if we've used all evidence phases
  if (state.currentPhase > state.totalPhases) {
    // All evidence shown + hypothesized, go to conclusion
    await showConclusion(roomId)
    return
  }

  // Show next evidence drop
  const evidenceIndex = state.currentPhase - 1
  const evidence = state.evidencePhases[evidenceIndex]

  if (!evidence) {
    await showConclusion(roomId)
    return
  }

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'EVIDENCE' } })
  publishToRoom(roomId, {
    type: 'evidence_drop',
    data: {
      evidenceIndex,
      evidence,
      totalPhases: state.totalPhases,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `New evidence has emerged! Read it carefully -- does this change your thinking?` },
  })

  // After 15s reading time for evidence, prompt for new hypothesis
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void promptForHypothesis(roomId)
  }, 15000)
}

// -- Show Conclusion ----------------------------------------------------------

async function showConclusion(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  // Analyze hypothesis evolution
  const evolutionAnalysis = await generateEvolutionAnalysis(roomId, state)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'SCOREBOARD' },
  })

  // Build participant evolution data
  const participantEvolutions = [...state.hypotheses.entries()].map(([userId, hyps]) => ({
    userId,
    name: state.participantNames.get(userId) ?? 'Unknown',
    hypotheses: hyps,
    changedMind: hyps.length > 1 && hyps.some((h, i) => i > 0 && h !== hyps[i - 1] && h !== '(No hypothesis submitted)'),
  }))

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'CONCLUSION' } })
  publishToRoom(roomId, {
    type: 'case_conclusion',
    data: {
      revealText: state.revealText,
      participantEvolutions,
      analysis: evolutionAnalysis,
      totalPhases: state.totalPhases,
    },
  })

  const changedCount = participantEvolutions.filter((p) => p.changedMind).length
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: changedCount > 0
        ? `${changedCount} of you revised your hypotheses as new evidence emerged -- that's exactly how good analysis works! Changing your mind when the evidence demands it is a sign of intellectual honesty.`
        : `Interesting -- most of you stuck with your initial hypotheses. Sometimes first instincts are right, but always be open to revising when new evidence appears.`,
    },
  })

  // Auto-complete after viewing conclusion
  setTimeout(() => {
    void completeCaseStudy(roomId)
  }, 20000)
}

// -- Complete Case Study ------------------------------------------------------

async function completeCaseStudy(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as CaseStudyConfig
  const state = sessionState.get(roomId)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const names = room.participants.map((p) => p.user.name)

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Case Study Complete -- "${config.topic}"\n\n${names.length} participants analyzed the case through ${state?.totalPhases ?? 3} evidence phases.\n\nParticipants: ${names.join(', ')}\n\nThe best analysts revise their thinking when new evidence demands it.`,
      messageType: 'system',
      isSandy: true,
    },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, {
    type: 'complete',
    data: { participants: names },
  })

  // Cleanup
  if (state?.timerHandle) clearTimeout(state.timerHandle)
  sessionState.delete(roomId)
}

// -- End Case Study (host early termination) ----------------------------------

export async function endCaseStudy(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.timerHandle) clearTimeout(state.timerHandle)

  await completeCaseStudy(roomId)
}

// -- AI: Generate Case Study --------------------------------------------------

async function generateCaseStudy(
  topic: string,
  courseName: string,
  evidenceCount: number,
): Promise<{ caseText: string; evidencePhases: string[]; revealText: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return FALLBACK_CASE
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: `You are Sandy, a case study facilitator at the University of Kentucky. Generate a realistic case study with progressive evidence reveals.

Course context: ${courseName}

Return ONLY valid JSON with this structure:
{
  "caseText": "2-3 paragraph initial case description with enough info to form hypotheses but missing key details",
  "evidencePhases": ["Evidence Drop 1: ...", "Evidence Drop 2: ...", "Evidence Drop 3: ..."],
  "revealText": "What actually happened -- the full story that connects all the evidence"
}

Requirements:
- The case should be realistic and relevant to the topic
- Each evidence drop should genuinely change or complicate the analysis
- The reveal should be satisfying -- connecting dots in a way that rewards careful analysis
- Generate exactly ${evidenceCount} evidence phases`,
      messages: [{ role: 'user', content: `Generate a case study about: "${topic}"` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as { caseText: string; evidencePhases: string[]; revealText: string }
    if (parsed.caseText && parsed.evidencePhases?.length >= 1 && parsed.revealText) {
      return parsed
    }

    return FALLBACK_CASE
  } catch (err) {
    console.error('[CaseStudyEngine] Case generation failed:', err)
    return FALLBACK_CASE
  }
}

// -- AI: Evolution Analysis ---------------------------------------------------

async function generateEvolutionAnalysis(
  roomId: string,
  state: CaseStudySessionState,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const names = [...state.participantNames.values()].join(', ')
    return `${names} analyzed the case through ${state.totalPhases} evidence phases. Each new piece of evidence challenged assumptions and pushed the analysis deeper. The key insight is that good analysis requires both forming strong hypotheses AND being willing to revise them.`
  }

  try {
    const evolutionText = [...state.hypotheses.entries()].map(([userId, hyps]) => {
      const name = state.participantNames.get(userId) ?? 'Unknown'
      const hypList = hyps.map((h, i) => `  Phase ${i}: ${h.substring(0, 150)}`).join('\n')
      return `${name}:\n${hypList}`
    }).join('\n\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are Sandy, analyzing how students' hypotheses evolved during a case study.

Case: ${state.caseText.substring(0, 300)}
Actual outcome: ${state.revealText.substring(0, 300)}

Participant hypothesis evolution:
${evolutionText}

Write a 2-3 paragraph analysis:
1. Who changed their thinking most -- and was that warranted by the evidence?
2. Who was closest to the truth earliest?
3. What does this teach about analytical thinking and intellectual flexibility?

Be encouraging and educational. Return ONLY the analysis text.`,
      messages: [{ role: 'user', content: 'Analyze the hypothesis evolution across all participants.' }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) {
      return 'The group showed strong analytical thinking as they worked through the evidence. Each phase brought new insights that challenged assumptions.'
    }

    return text.trim()
  } catch (err) {
    console.error('[CaseStudyEngine] Evolution analysis failed:', err)
    return 'The group demonstrated thoughtful analysis, revising their hypotheses as new evidence emerged. That willingness to update your thinking is the hallmark of great analytical work.'
  }
}

// -- Helpers ------------------------------------------------------------------

async function getConfig(roomId: string): Promise<CaseStudyConfig | null> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  return room?.config as unknown as CaseStudyConfig | null
}
