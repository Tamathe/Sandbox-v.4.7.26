/**
 * Peer Review Engine — Structured feedback exchange on submitted work.
 *
 * Participants submit work, Sandy anonymizes and distributes for review,
 * reviewers score on rubric dimensions + write feedback, Sandy coaches on
 * feedback quality and independently evaluates each submission. Results
 * combine peer and Sandy scores.
 *
 * Lifecycle: LOBBY -> SUBMIT (COUNTDOWN) -> DISTRIBUTE (auto) -> REVIEW (QUESTION, timed)
 *   -> COACHING (REVEAL) -> RESULTS (SCOREBOARD) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=SUBMIT, QUESTION=REVIEW,
 *   REVEAL=COACHING, SCOREBOARD=RESULTS, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'

// ── Config ───────────────────────────────────────────────────────────────────

export type { PeerReviewConfig } from './types'
import type { PeerReviewConfig } from './types'

// ── In-Memory Session State ──────────────────────────────────────────────────

interface PeerReviewSessionState {
  rubric: string[]
  submissions: Map<string, string>   // participantId -> PeerReviewSubmission.id
  assignments: Map<string, string>   // reviewerParticipantId -> submissionId to review
  reviews: Map<string, { scores: Record<string, number>; feedback: string }>  // submissionId -> review
  sandyEvaluations: Map<string, { scores: Record<string, number>; feedback: string }>
  phase: 'SUBMIT' | 'DISTRIBUTE' | 'REVIEW' | 'COACHING' | 'RESULTS'
  timerHandle: ReturnType<typeof setTimeout> | null
  participantNames: Map<string, string>  // participantId -> name
  participantUsers: Map<string, string>  // participantId -> userId
}

const sessionState = new Map<string, PeerReviewSessionState>()

// ── Anonymous Aliases ────────────────────────────────────────────────────────

const ALIASES = [
  'Author A', 'Author B', 'Author C', 'Author D', 'Author E',
  'Author F', 'Author G', 'Author H', 'Author I', 'Author J',
]

// ── Start Peer Review ────────────────────────────────────────────────────────

export async function startPeerReview(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'PEER_REVIEW') throw Object.assign(new Error('Not a peer review room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })
  if (room.participants.length < 2) throw Object.assign(new Error('Need at least 2 participants'), { status: 400 })

  const config = room.config as unknown as PeerReviewConfig
  const rubric = config.rubric ?? ['Clarity', 'Depth', 'Originality']
  const submitTimeMs = config.submitTimeMs ?? 180000

  // Initialize session state
  const participantNames = new Map<string, string>()
  const participantUsers = new Map<string, string>()
  for (const p of room.participants) {
    participantNames.set(p.id, p.user.name)
    participantUsers.set(p.id, p.userId)
  }

  sessionState.set(roomId, {
    rubric,
    submissions: new Map(),
    assignments: new Map(),
    reviews: new Map(),
    sandyEvaluations: new Map(),
    phase: 'SUBMIT',
    timerHandle: null,
    participantNames,
    participantUsers,
  })

  // Transition to SUBMIT phase (COUNTDOWN)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'SUBMIT' } })
  publishToRoom(roomId, {
    type: 'peer_review_started',
    data: {
      prompt: config.prompt,
      rubric,
      submitTimeMs,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Peer Review time! Submit your work on: "${config.prompt}". You have ${Math.round(submitTimeMs / 60000)} minutes. After everyone submits, you'll review someone else's work anonymously.`,
    },
  })

  // Auto-close submit phase after timeout
  const state = sessionState.get(roomId)!
  state.timerHandle = setTimeout(() => {
    void closeSubmitPhase(roomId)
  }, submitTimeMs)
}

// ── Submit Work ──────────────────────────────────────────────────────────────

export async function submitWork(roomId: string, userId: string, content: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })
  if (state.phase !== 'SUBMIT') throw Object.assign(new Error('Not in submit phase'), { status: 400 })

  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  if (!participant) throw Object.assign(new Error('Not a participant'), { status: 403 })

  if (state.submissions.has(participant.id)) {
    throw Object.assign(new Error('Already submitted'), { status: 400 })
  }

  // Assign anonymous alias
  const aliasIndex = state.submissions.size
  const alias = ALIASES[aliasIndex % ALIASES.length]!

  // Save to PeerReviewSubmission model
  const submission = await prisma.peerReviewSubmission.create({
    data: {
      roomId,
      authorId: participant.id,
      content,
      anonymousAlias: alias,
    },
  })

  state.submissions.set(participant.id, submission.id)

  // Broadcast anonymous progress
  const submittedCount = state.submissions.size
  const totalParticipants = state.participantNames.size
  publishToRoom(roomId, {
    type: 'work_submitted',
    data: { submittedCount, totalParticipants },
  })

  // If all submitted, close early
  if (submittedCount >= totalParticipants) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      state.timerHandle = null
    }
    // Brief pause so the last submitter sees the confirmation
    setTimeout(() => {
      void closeSubmitPhase(roomId)
    }, 2000)
  }
}

// ── Close Submit Phase & Distribute ──────────────────────────────────────────

async function closeSubmitPhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state || state.phase !== 'SUBMIT') return

  state.phase = 'DISTRIBUTE'

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: 'Submissions closed! Sandy is anonymizing and distributing work for review...' },
  })

  // Build assignment map: each reviewer gets a different author's submission
  const participantIds = [...state.participantNames.keys()]
  const submittedIds = participantIds.filter((pid) => state.submissions.has(pid))

  if (submittedIds.length < 2) {
    // Not enough submissions to do reviews
    publishToRoom(roomId, {
      type: 'sandy_says',
      data: { message: 'Not enough submissions to continue. Ending the session.' },
    })
    await completePeerReview(roomId)
    return
  }

  // Rotate assignments: participant i reviews participant (i+1 mod n)'s submission
  for (let i = 0; i < submittedIds.length; i++) {
    const reviewerPid = submittedIds[i]!
    const authorPid = submittedIds[(i + 1) % submittedIds.length]!
    const submissionId = state.submissions.get(authorPid)!
    state.assignments.set(reviewerPid, submissionId)
  }

  // Kick off Sandy evaluations for all submissions in the background
  for (const [authorPid, submissionId] of state.submissions) {
    void evaluateSubmissionWithSandy(roomId, authorPid, submissionId, state.rubric)
  }

  // Transition to REVIEW phase
  await startReviewPhase(roomId)
}

// ── Review Phase ─────────────────────────────────────────────────────────────

async function startReviewPhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.phase = 'REVIEW'

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  const config = room?.config as unknown as PeerReviewConfig
  const reviewTimeMs = config?.reviewTimeMs ?? 300000

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION' },
  })

  // Send each reviewer their assignment privately
  for (const [reviewerPid, submissionId] of state.assignments) {
    const reviewerUserId = state.participantUsers.get(reviewerPid)
    if (!reviewerUserId) continue

    const submission = await prisma.peerReviewSubmission.findUnique({
      where: { id: submissionId },
    })
    if (!submission) continue

    publishToRoom(roomId, {
      type: 'review_assignment',
      data: {
        submissionId: submission.id,
        anonymousAlias: submission.anonymousAlias,
        content: submission.content,
        rubric: state.rubric,
        reviewTimeMs,
      },
      targetUserId: reviewerUserId,
    } as never)
  }

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'REVIEW' } })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Review time! You've been assigned anonymous work to review. Score each rubric dimension (1-5) and write constructive feedback. You have ${Math.round(reviewTimeMs / 60000)} minutes.`,
    },
  })

  // Auto-close review after timeout
  state.timerHandle = setTimeout(() => {
    void closeReviewPhase(roomId)
  }, reviewTimeMs)
}

// ── Submit Review ────────────────────────────────────────────────────────────

export async function submitReview(
  roomId: string,
  userId: string,
  submissionId: string,
  scores: Record<string, number>,
  feedback: string,
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })
  if (state.phase !== 'REVIEW') throw Object.assign(new Error('Not in review phase'), { status: 400 })

  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  if (!participant) throw Object.assign(new Error('Not a participant'), { status: 403 })

  // Verify this is their assignment
  const assignedSubmission = state.assignments.get(participant.id)
  if (assignedSubmission !== submissionId) {
    throw Object.assign(new Error('Not your assigned submission'), { status: 403 })
  }

  if (state.reviews.has(submissionId)) {
    throw Object.assign(new Error('Already reviewed'), { status: 400 })
  }

  // Clamp scores to 1-5
  const clampedScores: Record<string, number> = {}
  for (const [dim, score] of Object.entries(scores)) {
    clampedScores[dim] = Math.min(5, Math.max(1, score))
  }

  state.reviews.set(submissionId, { scores: clampedScores, feedback })

  // Update the DB record
  await prisma.peerReviewSubmission.update({
    where: { id: submissionId },
    data: {
      reviewerId: participant.id,
      rubricScores: clampedScores,
      feedback,
      reviewedAt: new Date(),
    },
  })

  // Broadcast progress
  const reviewedCount = state.reviews.size
  const totalToReview = state.assignments.size
  publishToRoom(roomId, {
    type: 'review_submitted',
    data: { reviewedCount, totalToReview },
  })

  // Coach on feedback quality
  void coachFeedbackQuality(roomId, userId, feedback)

  // If all reviews are in, close early
  if (reviewedCount >= totalToReview) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      state.timerHandle = null
    }
    setTimeout(() => {
      void closeReviewPhase(roomId)
    }, 2000)
  }
}

// ── Close Review Phase ───────────────────────────────────────────────────────

async function closeReviewPhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state || (state.phase !== 'REVIEW')) return

  state.phase = 'COACHING'

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COACHING' } })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: 'Reviews are in! Sandy is calculating combined scores...' },
  })

  // Wait briefly, then show results
  setTimeout(() => {
    void showResults(roomId)
  }, 3000)
}

// ── Show Results ─────────────────────────────────────────────────────────────

async function showResults(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.phase = 'RESULTS'

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'SCOREBOARD' },
  })

  // Build results for each submission
  const results: Array<{
    userId: string
    name: string
    alias: string
    peerScores: Record<string, number> | null
    peerFeedback: string | null
    sandyScores: Record<string, number> | null
    sandyFeedback: string | null
    combinedAvg: number
    content: string
  }> = []

  for (const [authorPid, submissionId] of state.submissions) {
    const userId = state.participantUsers.get(authorPid) ?? ''
    const name = state.participantNames.get(authorPid) ?? 'Unknown'

    const submission = await prisma.peerReviewSubmission.findUnique({
      where: { id: submissionId },
    })

    const peerReview = state.reviews.get(submissionId)
    const sandyEval = state.sandyEvaluations.get(submissionId)

    // Calculate averages
    const peerValues = peerReview ? Object.values(peerReview.scores) : []
    const peerAvg = peerValues.length > 0
      ? peerValues.reduce((s, v) => s + v, 0) / peerValues.length
      : 0

    const sandyValues = sandyEval ? Object.values(sandyEval.scores) : []
    const sandyAvg = sandyValues.length > 0
      ? sandyValues.reduce((s, v) => s + v, 0) / sandyValues.length
      : 0

    const combinedAvg = peerAvg > 0 && sandyAvg > 0
      ? (peerAvg + sandyAvg) / 2
      : peerAvg || sandyAvg

    results.push({
      userId,
      name,
      alias: submission?.anonymousAlias ?? `Author ${results.length + 1}`,
      peerScores: peerReview?.scores ?? null,
      peerFeedback: peerReview?.feedback ?? null,
      sandyScores: sandyEval?.scores ?? null,
      sandyFeedback: sandyEval?.feedback ?? null,
      combinedAvg: Math.round(combinedAvg * 10) / 10,
      content: submission?.content ?? '',
    })

    // Update participant score in DB
    if (userId) {
      await prisma.liveRoomParticipant.update({
        where: { roomId_userId: { roomId, userId } },
        data: { score: Math.round(combinedAvg * 100) },
      }).catch(() => {})
    }

    // Store Sandy evaluation in the submission record
    if (sandyEval) {
      await prisma.peerReviewSubmission.update({
        where: { id: submissionId },
        data: { sandyEvaluation: sandyEval },
      }).catch(() => {})
    }
  }

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'RESULTS' } })
  publishToRoom(roomId, {
    type: 'peer_review_results',
    data: { results, rubric: state.rubric },
  })

  const bestResult = [...results].sort((a, b) => b.combinedAvg - a.combinedAvg)[0]
  if (bestResult) {
    publishToRoom(roomId, {
      type: 'sandy_says',
      data: {
        message: `Results are in! ${bestResult.name} earned the highest combined score of ${bestResult.combinedAvg}/5. Everyone gave and received valuable feedback -- that's what peer review is all about.`,
      },
    })
  }

  // Auto-complete after 15 seconds
  setTimeout(() => {
    void completePeerReview(roomId)
  }, 15000)
}

// ── Complete Peer Review ─────────────────────────────────────────────────────

async function completePeerReview(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: { user: { select: { name: true } } },
        orderBy: { score: 'desc' },
      },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as PeerReviewConfig
  const state = sessionState.get(roomId)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const names = room.participants.map((p) => p.user.name)
  const submissionCount = state?.submissions.size ?? 0
  const reviewCount = state?.reviews.size ?? 0

  // Post summary to chat
  const resultLines = room.participants
    .filter((p) => p.score > 0)
    .map((p, i) => `${i + 1}. ${p.user.name} -- ${(p.score / 100).toFixed(1)}/5`)
    .join('\n')

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Peer Review Complete -- "${config.topic}"\n\n${submissionCount} submissions, ${reviewCount} reviews completed.\n\n${resultLines ? resultLines + '\n\n' : ''}Giving and receiving feedback is a skill -- you just practiced both. Great session!`,
      messageType: 'system',
      isSandy: true,
    },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, { type: 'complete', data: { participants: names } })

  // Clean up
  if (state?.timerHandle) clearTimeout(state.timerHandle)
  sessionState.delete(roomId)
}

// ── End Peer Review (host early termination) ─────────────────────────────────

export async function endPeerReview(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.timerHandle) clearTimeout(state.timerHandle)

  await completePeerReview(roomId)
}

// ── AI: Sandy Evaluation ─────────────────────────────────────────────────────

async function evaluateSubmissionWithSandy(
  roomId: string,
  authorPid: string,
  submissionId: string,
  rubric: string[],
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const submission = await prisma.peerReviewSubmission.findUnique({
    where: { id: submissionId },
  })
  if (!submission) return

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  const config = room?.config as unknown as PeerReviewConfig

  if (!process.env.ANTHROPIC_API_KEY) {
    const fallbackScores: Record<string, number> = {}
    for (const dim of rubric) {
      fallbackScores[dim] = 3
    }
    state.sandyEvaluations.set(submissionId, {
      scores: fallbackScores,
      feedback: 'Good effort! Sandy AI evaluation unavailable for detailed feedback.',
    })
    return
  }

  try {
    const rubricText = rubric.map((r) => `"${r}": 1-5`).join(', ')
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are Sandy, evaluating a student's submission for peer review.

Assignment prompt: "${config.prompt}"
Rubric dimensions: ${rubric.join(', ')}

Evaluate the submission and return ONLY valid JSON:
{"scores": {${rubricText}}, "feedback": "2-3 sentences of constructive feedback"}

Score 5 = excellent, 1 = needs significant improvement. Be encouraging but honest.`,
      messages: [{
        role: 'user',
        content: `Student's submission:\n\n${submission.content}`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as { scores: Record<string, number>; feedback: string }
    state.sandyEvaluations.set(submissionId, parsed)
  } catch (err) {
    console.error('[PeerReviewEngine] Sandy evaluation failed:', err)
    const fallbackScores: Record<string, number> = {}
    for (const dim of rubric) {
      fallbackScores[dim] = 3
    }
    state.sandyEvaluations.set(submissionId, {
      scores: fallbackScores,
      feedback: 'Keep up the good work! Every submission is a learning opportunity.',
    })
  }
}

// ── AI: Feedback Quality Coaching ────────────────────────────────────────────

async function coachFeedbackQuality(
  roomId: string,
  reviewerUserId: string,
  feedback: string,
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return
  if (feedback.length > 100) return // Long feedback is probably fine

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: `You are Sandy, coaching a student on their peer review feedback quality. If the feedback is vague, too short, or not constructive, suggest ONE specific improvement in 1 sentence. If the feedback is already good, respond with exactly "OK".`,
      messages: [{
        role: 'user',
        content: `Peer review feedback: "${feedback}"`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    if (text !== 'OK' && text.length > 10) {
      publishToRoom(roomId, {
        type: 'sandy_coaching',
        data: { tip: text },
        targetUserId: reviewerUserId,
      } as never)
    }
  } catch {
    // Coaching is best-effort
  }
}
