/**
 * Problem Lab Engine — Collaborative problem decomposition and solving.
 *
 * Sandy generates a complex problem, decomposes it into N sub-problems
 * (one per participant), each person solves their piece independently,
 * then Sandy combines solutions and identifies integration gaps.
 *
 * Lifecycle: LOBBY -> PRESENT (COUNTDOWN) -> DECOMPOSE (auto) ->
 *   SOLVE (QUESTION) -> COMBINE (REVEAL) -> GAP_ANALYSIS (SCOREBOARD) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=PRESENT, QUESTION=SOLVE,
 *   REVEAL=COMBINE, SCOREBOARD=GAP_ANALYSIS, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'

// -- Config -------------------------------------------------------------------

export type { ProblemLabConfig } from './types'
import type { ProblemLabConfig } from './types'

// -- In-Memory Session State --------------------------------------------------

interface ProblemLabSessionState {
  problem: string
  subProblems: Array<{ piece: string; assigneeId: string; assigneeName: string }>
  solutions: Map<string, string> // participantId -> solution text
  combinedSolution: string
  gapAnalysis: string
  timerHandle: ReturnType<typeof setTimeout> | null
}

const sessionState = new Map<string, ProblemLabSessionState>()

// -- Fallback Templates -------------------------------------------------------

const FALLBACK_PROBLEM = `A mid-size university wants to build a new campus-wide app that unifies student services (dining, library, advising, campus events, and emergency alerts) into a single platform. The existing systems are maintained by five different departments, each with their own databases, authentication, and APIs. Budget is limited, political dynamics between departments are complex, and students expect a seamless mobile-first experience delivered within one academic year.

Break this challenge into its core sub-problems and solve each piece.`

function fallbackDecompose(topic: string, count: number): string[] {
  const generic = [
    `Define the core requirements and success criteria for "${topic}"`,
    `Identify the key stakeholders and their competing interests in "${topic}"`,
    `Design the technical architecture or framework needed for "${topic}"`,
    `Create an implementation timeline and resource plan for "${topic}"`,
    `Develop the evaluation criteria and risk mitigation strategy for "${topic}"`,
    `Plan the communication and change-management approach for "${topic}"`,
  ]
  return generic.slice(0, count)
}

function fallbackCombine(pieces: Array<{ piece: string; solution: string }>): string {
  const lines = pieces.map((p, i) => `${i + 1}. ${p.piece}: ${p.solution.substring(0, 200)}`).join('\n\n')
  return `Combined Solution:\n\n${lines}\n\nThese individual solutions address different facets of the problem. Together they form a comprehensive approach, though integration points between the pieces will need careful attention.`
}

function fallbackGapAnalysis(pieces: Array<{ piece: string; solution: string }>): string {
  return `Gap Analysis:\n\n1. Integration: The solutions address their individual pieces well, but the handoff points between them need more detail.\n2. Dependencies: Some solutions may rely on assumptions from other pieces that aren't explicitly stated.\n3. Timeline: The combined effort may create sequencing challenges that individual solutions don't account for.\n\nOverall, the team covered the key aspects. Strengthening the connections between solutions would make the combined approach more robust.`
}

// -- Start Problem Lab --------------------------------------------------------

export async function startProblemLab(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'PROBLEM_LAB') throw Object.assign(new Error('Not a problem lab room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })
  if (room.participants.length < 2) throw Object.assign(new Error('Need at least 2 participants'), { status: 400 })

  const config = room.config as unknown as ProblemLabConfig

  // Generate or fallback the complex problem
  const problem = await generateProblem(config.topic, room.course?.title ?? 'General')

  // Phase -> COUNTDOWN (PRESENT)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'PRESENT' } })
  publishToRoom(roomId, {
    type: 'problem_presented',
    data: { problem },
  })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: 'Welcome to the Problem Lab! I\'m presenting a complex problem. Read it carefully -- in a moment I\'ll break it into pieces and assign each of you a sub-problem to solve independently.',
    },
  })

  // Initialize session state
  sessionState.set(roomId, {
    problem,
    subProblems: [],
    solutions: new Map(),
    combinedSolution: '',
    gapAnalysis: '',
    timerHandle: null,
  })

  // After 8s reading time, decompose
  setTimeout(() => {
    void decomposeProblem(roomId)
  }, 8000)
}

// -- Decompose Problem --------------------------------------------------------

async function decomposeProblem(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: { participants: { include: { user: { select: { id: true, name: true } } } } },
  })
  if (!room) return

  const config = room.config as unknown as ProblemLabConfig
  const participantCount = room.participants.length

  // Generate sub-problems (1 per participant)
  const pieces = await generateSubProblems(state.problem, participantCount, config.topic)

  // Assign each piece to a participant
  const subProblems = room.participants.map((p, i) => ({
    piece: pieces[i % pieces.length]!,
    assigneeId: p.userId,
    assigneeName: p.user.name,
  }))
  state.subProblems = subProblems

  publishToRoom(roomId, {
    type: 'problem_decomposed',
    data: {
      subProblems: subProblems.map((sp) => ({
        piece: sp.piece,
        assigneeId: sp.assigneeId,
        assigneeName: sp.assigneeName,
      })),
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `I've broken the problem into ${subProblems.length} pieces -- one for each of you. You'll have 3 minutes to solve your piece independently. Let's go!`,
    },
  })

  // Transition to SOLVE (QUESTION)
  await startSolvePhase(roomId)
}

// -- Solve Phase --------------------------------------------------------------

async function startSolvePhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  const config = room?.config as unknown as ProblemLabConfig
  const solveTimeMs = config?.solveTimeMs ?? 180000

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'SOLVE' } })
  publishToRoom(roomId, {
    type: 'solve_started',
    data: { solveTimeMs },
  })

  // Auto-close after timer
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void closeSolvePhase(roomId)
  }, solveTimeMs)
}

// -- Submit Solution ----------------------------------------------------------

export async function submitSolution(roomId: string, userId: string, text: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const assignment = state.subProblems.find((sp) => sp.assigneeId === userId)
  if (!assignment) throw Object.assign(new Error('Not a participant in this problem lab'), { status: 403 })
  if (state.solutions.has(userId)) throw Object.assign(new Error('Already submitted'), { status: 400 })

  state.solutions.set(userId, text)

  // Broadcast progress
  const submittedCount = state.solutions.size
  const totalParticipants = state.subProblems.length
  publishToRoom(roomId, {
    type: 'solution_submitted',
    data: { submittedCount, totalParticipants, userId },
  })

  // If all submitted, close immediately
  if (submittedCount >= totalParticipants) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      state.timerHandle = null
    }
    setTimeout(() => {
      void closeSolvePhase(roomId)
    }, 2000)
  }
}

// -- Close Solve Phase --------------------------------------------------------

async function closeSolvePhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  // Fill in defaults for anyone who didn't submit
  for (const sp of state.subProblems) {
    if (!state.solutions.has(sp.assigneeId)) {
      state.solutions.set(sp.assigneeId, 'No solution submitted -- chose to observe.')
    }
  }

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: 'Time\'s up! Now I\'m combining all your solutions and looking for integration gaps...' },
  })

  // Phase -> REVEAL (COMBINE)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })
  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMBINE' } })

  // Build pieces + solutions
  const pieces = state.subProblems.map((sp) => ({
    piece: sp.piece,
    assigneeName: sp.assigneeName,
    solution: state.solutions.get(sp.assigneeId) ?? '',
  }))

  // Generate combined solution
  const combined = await generateCombinedSolution(state.problem, pieces)
  state.combinedSolution = combined

  publishToRoom(roomId, {
    type: 'solutions_combined',
    data: { pieces, combinedSolution: combined },
  })

  // After 5s, move to gap analysis
  setTimeout(() => {
    void gapAnalysisPhase(roomId)
  }, 5000)
}

// -- Gap Analysis Phase -------------------------------------------------------

async function gapAnalysisPhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const pieces = state.subProblems.map((sp) => ({
    piece: sp.piece,
    solution: state.solutions.get(sp.assigneeId) ?? '',
  }))

  const analysis = await generateGapAnalysis(state.problem, pieces, state.combinedSolution)
  state.gapAnalysis = analysis

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'SCOREBOARD' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'GAP_ANALYSIS' } })
  publishToRoom(roomId, {
    type: 'gap_analysis',
    data: { gapAnalysis: analysis },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: 'Here\'s my analysis of the gaps and integration points. Great collaborative work!' },
  })

  // Auto-complete after 20s
  setTimeout(() => {
    void completeProblemLab(roomId)
  }, 20000)
}

// -- Complete -----------------------------------------------------------------

async function completeProblemLab(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as ProblemLabConfig
  const state = sessionState.get(roomId)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const names = room.participants.map((p) => p.user.name)
  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, { type: 'complete', data: { participants: names } })

  // Post summary to chat
  const pieceLines = state?.subProblems.map((sp) =>
    `- ${sp.assigneeName}: "${sp.piece}"`
  ).join('\n') ?? ''

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Problem Lab Complete -- "${config.topic}"\n\n${names.length} participants each tackled a piece of the problem:\n${pieceLines}\n\nSandy combined the solutions and identified integration gaps. Great collaborative problem-solving!`,
      messageType: 'system',
      isSandy: true,
    },
  })

  // Cleanup
  if (state?.timerHandle) clearTimeout(state.timerHandle)
  sessionState.delete(roomId)
}

// -- End (host early termination) ---------------------------------------------

export async function endProblemLab(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.timerHandle) clearTimeout(state.timerHandle)

  await completeProblemLab(roomId)
}

// -- AI: Generate Problem -----------------------------------------------------

async function generateProblem(topic: string, courseName: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return FALLBACK_PROBLEM

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are Sandy, an AI facilitator at the University of Kentucky. Generate a complex, multi-faceted problem for a group problem-solving session.

Topic: ${topic}
Course context: ${courseName}

Requirements:
1. The problem must be complex enough to decompose into multiple pieces
2. It should have technical, social, and strategic dimensions
3. It should be realistic and relevant to university students
4. 2-3 paragraphs, ending with a clear call to action

Return ONLY the problem text, no JSON wrapper.`,
      messages: [{ role: 'user', content: `Generate a complex problem about: ${topic}` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 50) return FALLBACK_PROBLEM
    return text.trim()
  } catch (err) {
    console.error('[ProblemLabEngine] Problem generation failed:', err)
    return FALLBACK_PROBLEM
  }
}

// -- AI: Generate Sub-Problems ------------------------------------------------

async function generateSubProblems(problem: string, count: number, topic: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackDecompose(topic, count)

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Decompose a complex problem into exactly ${count} distinct, solvable sub-problems. Each sub-problem should be a clear, self-contained piece that one person can tackle in 3 minutes. Return ONLY a JSON array of strings. No markdown.`,
      messages: [{ role: 'user', content: `Problem:\n${problem.substring(0, 800)}\n\nDecompose into ${count} sub-problems.` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as string[]
    if (Array.isArray(parsed) && parsed.length >= count) return parsed.slice(0, count)
    return fallbackDecompose(topic, count)
  } catch {
    return fallbackDecompose(topic, count)
  }
}

// -- AI: Combine Solutions ----------------------------------------------------

async function generateCombinedSolution(
  problem: string,
  pieces: Array<{ piece: string; assigneeName: string; solution: string }>,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackCombine(pieces.map((p) => ({ piece: p.piece, solution: p.solution })))
  }

  try {
    const piecesText = pieces.map((p) =>
      `${p.assigneeName} -- "${p.piece}":\n${p.solution}`
    ).join('\n\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are Sandy. Combine individual solutions to sub-problems into a coherent overall solution. Highlight how the pieces connect and complement each other. Be encouraging. 2-3 paragraphs. Return ONLY the combined solution text.`,
      messages: [{ role: 'user', content: `Original problem:\n${problem.substring(0, 600)}\n\nIndividual solutions:\n${piecesText}` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) {
      return fallbackCombine(pieces.map((p) => ({ piece: p.piece, solution: p.solution })))
    }
    return text.trim()
  } catch (err) {
    console.error('[ProblemLabEngine] Combine failed:', err)
    return fallbackCombine(pieces.map((p) => ({ piece: p.piece, solution: p.solution })))
  }
}

// -- AI: Gap Analysis ---------------------------------------------------------

async function generateGapAnalysis(
  problem: string,
  pieces: Array<{ piece: string; solution: string }>,
  combinedSolution: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackGapAnalysis(pieces)
  }

  try {
    const piecesText = pieces.map((p, i) =>
      `Piece ${i + 1} -- "${p.piece}":\n${p.solution}`
    ).join('\n\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You are Sandy. Analyze the gaps and integration challenges in a set of sub-problem solutions. Identify:
1. Missing connections between pieces
2. Conflicting assumptions
3. Overlooked dependencies
4. Opportunities for synergy

Be constructive and specific. 2-3 paragraphs. Return ONLY the analysis text.`,
      messages: [{
        role: 'user',
        content: `Problem:\n${problem.substring(0, 400)}\n\nSolutions:\n${piecesText}\n\nCombined:\n${combinedSolution.substring(0, 400)}`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) return fallbackGapAnalysis(pieces)
    return text.trim()
  } catch (err) {
    console.error('[ProblemLabEngine] Gap analysis failed:', err)
    return fallbackGapAnalysis(pieces)
  }
}
