/**
 * Simulation Engine — Branching narrative experiences in The Commons.
 *
 * Everyone starts with the same scenario, makes private choices each turn,
 * then reconvenes to see where everyone ended up (divergence analysis).
 *
 * Lifecycle: LOBBY -> COUNTDOWN (scenario) -> QUESTION (branching turns) -> REVEAL (divergence) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=SCENARIO, QUESTION=BRANCHING,
 *   REVEAL=DIVERGENCE, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'
import { finalizeDivergenceAssessment } from '../assessment/divergence-service'

// ── Config ───────────────────────────────────────────────────────────────────

export type { SimulationConfig } from './types'
import type { SimulationConfig } from './types'

// ── In-Memory Session State ──────────────────────────────────────────────────

interface ParticipantThread {
  participantId: string
  userId: string
  name: string
  conversationHistory: Array<{
    turn: number
    prompt: string
    choice: string
    narrative: string
  }>
  currentPrompt: string | null
  hasSubmitted: boolean
}

interface SimulationSessionState {
  scenario: string
  totalTurns: number
  currentTurn: number
  threads: Map<string, ParticipantThread>
  turnTimerHandle: ReturnType<typeof setTimeout> | null
}

const sessionState = new Map<string, SimulationSessionState>()

// ── Fallback Scenarios ───────────────────────────────────────────────────────

const FALLBACK_SCENARIOS: Record<string, string> = {
  'ethical-dilemma': `You are a senior software engineer at a healthcare startup. Your team has just discovered that the AI diagnostic tool you built — already deployed to 200 clinics — has a subtle bias: it underperforms for patients over 65. The fix will take 3 weeks. Your CEO wants to keep the tool running because pulling it means clinics revert to a slower manual process that also has errors.

Your direct report, a junior engineer, wants to go public with the finding. Your medical advisor says the bias is within "acceptable variance." A patient advocacy group has been asking pointed questions on social media.

What do you do?

Some options to consider:
- Immediately pull the tool and issue a public disclosure
- Keep it running with a documented warning to clinicians while you fix it
- Escalate internally and let the board decide
- Or take a different approach entirely`,

  'crisis': `You are the emergency coordinator for a mid-size university during finals week. A severe ice storm has knocked out power to 40% of campus, including two residence halls housing 1,200 students. The forecast shows conditions worsening over the next 48 hours.

You have limited generator capacity (enough for one building), the campus dining hall is operational but running on backup power, and local hotels are nearly full. The university president wants classes to continue remotely, but many affected students have no internet access. Parents are calling the emergency line.

What do you do?

Some options to consider:
- Consolidate all affected students into the powered residence halls
- Cancel finals and arrange emergency transportation home
- Set up warming shelters in academic buildings with generators
- Or take a different approach entirely`,

  'negotiation': `You represent a mid-size city's public transit authority in a critical budget meeting. Ridership has grown 30% post-pandemic, but your aging bus fleet needs $50M in replacements. The city council has offered $20M — less than half what you need.

Meanwhile, a tech company has offered to pilot autonomous shuttles on two routes for free (they want the data). The transit workers' union is threatening to strike if any routes go autonomous. Community advocates want the money spent on expanding routes to underserved neighborhoods, not replacing existing buses.

What do you do?

Some options to consider:
- Accept the $20M and prioritize the most critical replacements
- Take the autonomous shuttle pilot on low-ridership routes
- Counter-propose a phased $50M plan funded by a small fare increase
- Or take a different approach entirely`,

  'clinical': `You are a third-year medical resident on overnight call. A 45-year-old patient arrives with severe abdominal pain. Initial labs suggest appendicitis, but the CT scan is inconclusive — it could also be a rare mesenteric ischemia that requires very different treatment.

The attending surgeon wants to operate immediately for appendicitis. The radiologist recommends a contrast study that will take 2 hours. The patient is in significant pain and begging for relief. Their spouse, a nurse, is asking detailed questions about the differential diagnosis.

What do you do?

Some options to consider:
- Defer to the attending surgeon and proceed to OR
- Request the contrast study and manage pain while waiting
- Call for a GI consult to get another opinion before deciding
- Or take a different approach entirely`,

  'custom': `Your team has been presented with a complex situation that requires careful thinking and collaboration. Multiple stakeholders have competing interests, and there is no single "right" answer.

Consider the different perspectives involved, the short-term and long-term consequences of each option, and what values should guide your decision.

What do you do?

Some options to consider:
- Prioritize the most affected stakeholders
- Seek more information before deciding
- Find a creative compromise that addresses multiple concerns
- Or take a different approach entirely`,
}

// ── Start Simulation ─────────────────────────────────────────────────────────

export async function startSimulation(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'SIMULATION') throw Object.assign(new Error('Not a simulation room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })

  const config = room.config as unknown as SimulationConfig
  const totalTurns = config.totalTurns ?? 5

  // Generate or use custom scenario
  let scenario: string
  if (config.customScenario) {
    scenario = config.customScenario
  } else {
    scenario = await generateScenario(
      config.topic,
      config.scenarioType ?? 'ethical-dilemma',
      room.course?.title ?? 'General',
    )
  }

  // Update room: phase -> COUNTDOWN (SCENARIO), startedAt -> now
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  // Broadcast scenario to all participants
  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'SCENARIO' } })
  publishToRoom(roomId, {
    type: 'scenario_presented',
    data: { scenario, totalTurns },
  })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Welcome to the Simulation! Everyone will face the same scenario but make their own choices. After ${totalTurns} turns, we'll see where everyone ended up. Read the scenario carefully...`,
    },
  })

  // Initialize session state with all participants
  const threads = new Map<string, ParticipantThread>()
  for (const p of room.participants) {
    threads.set(p.userId, {
      participantId: p.id,
      userId: p.userId,
      name: p.user.name,
      conversationHistory: [],
      currentPrompt: null,
      hasSubmitted: false,
    })
  }

  sessionState.set(roomId, {
    scenario,
    totalTurns,
    currentTurn: 0,
    threads,
    turnTimerHandle: null,
  })

  // After 5s reading time, advance to first turn
  setTimeout(() => {
    void advanceTurn(roomId)
  }, 5000)
}

// ── Advance Turn ─────────────────────────────────────────────────────────────

export async function advanceTurn(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  // Increment turn
  state.currentTurn++
  const turnNumber = state.currentTurn

  // Update room: phase -> QUESTION, currentRound -> currentTurn
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', currentRound: turnNumber },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'BRANCHING' } })
  publishToRoom(roomId, {
    type: 'turn_advanced',
    data: { turnNumber, totalTurns: state.totalTurns },
  })

  const config = (await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  }))?.config as unknown as SimulationConfig
  const turnTimeoutMs = config?.turnTimeoutMs ?? 120000

  if (turnNumber === 1) {
    // Turn 1: same prompt for everyone (derived from scenario)
    const firstPrompt = state.scenario
    for (const [userId, thread] of state.threads) {
      thread.currentPrompt = firstPrompt
      thread.hasSubmitted = false
      // Send private prompt to each participant
      publishToRoom(roomId, {
        type: 'private_prompt',
        data: {
          turnNumber,
          prompt: firstPrompt,
          totalTurns: state.totalTurns,
          turnTimeoutMs,
        },
        targetUserId: userId,
      } as never)
    }
  } else {
    // Turns 2+: generate different prompts per participant based on their prior choices
    const promptPromises: Array<Promise<void>> = []
    for (const [userId, thread] of state.threads) {
      thread.hasSubmitted = false
      const p = (async () => {
        const prompt = await generateTurnContinuation(
          state.scenario,
          thread.conversationHistory,
          thread.conversationHistory[thread.conversationHistory.length - 1]?.choice ?? '',
        )
        thread.currentPrompt = prompt
        publishToRoom(roomId, {
          type: 'private_prompt',
          data: {
            turnNumber,
            prompt,
            totalTurns: state.totalTurns,
            turnTimeoutMs,
          },
          targetUserId: userId,
        } as never)
      })()
      promptPromises.push(p)
    }
    await Promise.all(promptPromises)
  }

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: turnNumber === 1
        ? `Turn ${turnNumber} of ${state.totalTurns} — Read the scenario and decide: what do you do? You have ${Math.round(turnTimeoutMs / 1000)} seconds.`
        : `Turn ${turnNumber} of ${state.totalTurns} — Your story continues based on your previous choices. What do you do next? You have ${Math.round(turnTimeoutMs / 1000)} seconds.`,
    },
  })

  // Set timeout for auto-close
  if (state.turnTimerHandle) clearTimeout(state.turnTimerHandle)
  state.turnTimerHandle = setTimeout(() => {
    void autoCloseTurn(roomId)
  }, turnTimeoutMs)
}

// ── Auto-Close Turn ──────────────────────────────────────────────────────────

async function autoCloseTurn(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  // Mark any non-submitted participants with a default "no response"
  for (const [, thread] of state.threads) {
    if (!thread.hasSubmitted) {
      thread.hasSubmitted = true
      const defaultChoice = 'No response — chose to observe and wait.'
      const narrative = 'You hesitated, unsure of the best path forward. Time passed, and events unfolded around you without your direct influence.'

      thread.conversationHistory.push({
        turn: state.currentTurn,
        prompt: thread.currentPrompt ?? '',
        choice: defaultChoice,
        narrative,
      })

      // Save to DB
      await prisma.simulationThread.create({
        data: {
          roomId,
          participantId: thread.participantId,
          turnNumber: state.currentTurn,
          prompt: thread.currentPrompt ?? '',
          choice: defaultChoice,
          narrative,
        },
      }).catch(() => {
        // Ignore duplicate key errors from race conditions
      })
    }
  }

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `Time's up for turn ${state.currentTurn}! Moving on...` },
  })

  // Advance to next turn or divergence
  if (state.currentTurn >= state.totalTurns) {
    await completeDivergence(roomId)
  } else {
    await advanceTurn(roomId)
  }
}

// ── Submit Choice ────────────────────────────────────────────────────────────

export async function submitChoice(roomId: string, userId: string, choice: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const thread = state.threads.get(userId)
  if (!thread) throw Object.assign(new Error('Not a participant'), { status: 403 })
  if (thread.hasSubmitted) throw Object.assign(new Error('Already submitted this turn'), { status: 400 })

  // Generate narrative continuation based on scenario + history + choice
  const narrative = await generateNarrativeContinuation(
    state.scenario,
    thread.conversationHistory,
    choice,
  )

  // Save to DB
  await prisma.simulationThread.create({
    data: {
      roomId,
      participantId: thread.participantId,
      turnNumber: state.currentTurn,
      prompt: thread.currentPrompt ?? '',
      choice,
      narrative,
    },
  })

  // Update in-memory state
  thread.conversationHistory.push({
    turn: state.currentTurn,
    prompt: thread.currentPrompt ?? '',
    choice,
    narrative,
  })
  thread.hasSubmitted = true

  // Send the narrative back to this specific participant
  publishToRoom(roomId, {
    type: 'narrative_response',
    data: {
      turnNumber: state.currentTurn,
      narrative,
    },
    targetUserId: userId,
  } as never)

  // Broadcast anonymous progress
  const submittedCount = [...state.threads.values()].filter((t) => t.hasSubmitted).length
  const totalParticipants = state.threads.size
  publishToRoom(roomId, {
    type: 'choice_submitted',
    data: { submittedCount, totalParticipants },
  })

  // If all submitted: clear timer, advance
  if (submittedCount >= totalParticipants) {
    if (state.turnTimerHandle) {
      clearTimeout(state.turnTimerHandle)
      state.turnTimerHandle = null
    }

    // Brief pause to let everyone see the narrative response
    setTimeout(async () => {
      if (state.currentTurn >= state.totalTurns) {
        await completeDivergence(roomId)
      } else {
        await advanceTurn(roomId)
      }
    }, 3000)
  }
}

// ── Complete Divergence ──────────────────────────────────────────────────────

export async function completeDivergence(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  // Collect all threads from DB for the full record
  const dbThreads = await prisma.simulationThread.findMany({
    where: { roomId },
    include: { participant: { include: { user: { select: { name: true } } } } },
    orderBy: [{ participantId: 'asc' }, { turnNumber: 'asc' }],
  })

  // Group by participant
  const pathsByParticipant: Array<{
    name: string
    userId: string
    choices: Array<{ turn: number; choice: string; narrative: string }>
  }> = []

  const participantMap = new Map<string, typeof pathsByParticipant[0]>()
  for (const t of dbThreads) {
    const key = t.participantId
    if (!participantMap.has(key)) {
      const entry = {
        name: t.participant.user.name,
        userId: t.participant.userId,
        choices: [] as Array<{ turn: number; choice: string; narrative: string }>,
      }
      participantMap.set(key, entry)
      pathsByParticipant.push(entry)
    }
    participantMap.get(key)!.choices.push({
      turn: t.turnNumber,
      choice: t.choice,
      narrative: t.narrative,
    })
  }

  // Generate divergence analysis
  const analysis = await generateDivergenceAnalysis(state.scenario, pathsByParticipant)

  // Update room: phase -> REVEAL (DIVERGENCE)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'DIVERGENCE' } })
  publishToRoom(roomId, {
    type: 'divergence_reveal',
    data: {
      paths: pathsByParticipant.map((p) => ({
        name: p.name,
        userId: p.userId,
        choices: p.choices,
      })),
      analysis,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: 'All paths revealed! Take a look at how everyone navigated the same scenario differently. Every choice led somewhere interesting.',
    },
  })

  // After 30s, auto-complete (or host can call endSimulation earlier)
  setTimeout(() => {
    void completeSimulation(roomId)
  }, 30000)
}

// ── Complete Simulation ──────────────────────────────────────────────────────

async function completeSimulation(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: { user: { select: { name: true } } },
      },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  if (room.assessmentMode) {
    await finalizeDivergenceAssessment(roomId)
  }

  const config = room.config as unknown as SimulationConfig
  const state = sessionState.get(roomId)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  // Build summary for chat
  const participantNames = room.participants.map((p) => p.user.name)
  const turnCount = state?.currentTurn ?? config.totalTurns ?? 5

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Simulation Complete -- "${config.topic}"\n\n${participantNames.length} participants explored ${turnCount} turns of branching decisions.\n\nParticipants: ${participantNames.join(', ')}\n\nEvery path had merit -- the value is in seeing how different perspectives lead to different outcomes.`,
      messageType: 'system',
      isSandy: true,
    },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, {
    type: 'complete',
    data: { participants: participantNames },
  })

  // Clean up session state
  if (state?.turnTimerHandle) clearTimeout(state.turnTimerHandle)
  sessionState.delete(roomId)
}

// ── End Simulation (host early termination) ──────────────────────────────────

export async function endSimulation(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.turnTimerHandle) clearTimeout(state.turnTimerHandle)

  await completeSimulation(roomId)
}

// ── AI: Scenario Generation ──────────────────────────────────────────────────

async function generateScenario(
  topic: string,
  scenarioType: string,
  courseName: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return FALLBACK_SCENARIOS[scenarioType] ?? FALLBACK_SCENARIOS['custom']!
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You are Sandy, an AI simulation host at the University of Kentucky. Create an engaging branching scenario for students to explore.

Topic: ${topic}
Type: ${scenarioType}
Course context: ${courseName}

Generate a scenario that:
1. Presents a realistic situation relevant to the topic
2. Has clear decision points where different people might choose differently
3. Has no single "right" answer -- all paths should be educational
4. Is 2-3 paragraphs long

End with: "What do you do?" followed by 2-3 suggested options (but make clear they can type any response).

Return ONLY the scenario text, no JSON wrapper.`,
      messages: [{ role: 'user', content: `Generate a ${scenarioType} scenario about: ${topic}` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 50) {
      return FALLBACK_SCENARIOS[scenarioType] ?? FALLBACK_SCENARIOS['custom']!
    }

    return text.trim()
  } catch (err) {
    console.error('[SimulationEngine] Scenario generation failed:', err)
    return FALLBACK_SCENARIOS[scenarioType] ?? FALLBACK_SCENARIOS['custom']!
  }
}

// ── AI: Turn Continuation ────────────────────────────────────────────────────

async function generateTurnContinuation(
  scenario: string,
  conversationHistory: ParticipantThread['conversationHistory'],
  latestChoice: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return getFallbackContinuation(conversationHistory.length + 1)
  }

  try {
    const historyText = conversationHistory.map((h) =>
      `Turn ${h.turn}:\n  Situation: ${h.prompt.substring(0, 200)}...\n  Choice: ${h.choice}\n  Outcome: ${h.narrative.substring(0, 200)}...`
    ).join('\n\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are Sandy, continuing a branching simulation. The student just made a choice.

Scenario: ${scenario.substring(0, 500)}
Previous turns:
${historyText}
Latest choice: ${latestChoice}

Continue the narrative (2-3 paragraphs):
1. Acknowledge their choice and its immediate consequences
2. Introduce a new situation that follows from their decision
3. Present new decision points

End with "What do you do next?" and 2-3 new options.

Return ONLY the narrative text.`,
      messages: [{ role: 'user', content: `The student chose: "${latestChoice}". Continue the simulation.` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) {
      return getFallbackContinuation(conversationHistory.length + 1)
    }

    return text.trim()
  } catch (err) {
    console.error('[SimulationEngine] Turn continuation failed:', err)
    return getFallbackContinuation(conversationHistory.length + 1)
  }
}

// ── AI: Narrative Continuation (after choice) ────────────────────────────────

async function generateNarrativeContinuation(
  scenario: string,
  conversationHistory: ParticipantThread['conversationHistory'],
  choice: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return `Your decision to "${choice.substring(0, 80)}" sets events in motion. The consequences of your choice begin to unfold, shaping the situation in ways both expected and surprising. The other stakeholders react to your decision, and new dynamics emerge.`
  }

  try {
    const historyText = conversationHistory.map((h) =>
      `Turn ${h.turn}: Chose "${h.choice}" -> ${h.narrative.substring(0, 150)}`
    ).join('\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are Sandy, narrating the consequences of a student's choice in a branching simulation.

Starting scenario: ${scenario.substring(0, 400)}
Previous turns:
${historyText}

The student just chose: "${choice}"

Write 1-2 paragraphs describing the immediate consequences and how the situation evolves. Be specific and vivid. Do NOT present new options -- just narrate what happens as a result of their choice.

Return ONLY the narrative text.`,
      messages: [{ role: 'user', content: `Narrate the consequence of choosing: "${choice}"` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 20) {
      return `Your decision to "${choice.substring(0, 80)}" sets events in motion. The consequences begin to unfold in unexpected ways.`
    }

    return text.trim()
  } catch (err) {
    console.error('[SimulationEngine] Narrative continuation failed:', err)
    return `Your decision to "${choice.substring(0, 80)}" sets events in motion. The consequences begin to unfold, shaping the situation in ways both expected and surprising.`
  }
}

// ── AI: Divergence Analysis ──────────────────────────────────────────────────

async function generateDivergenceAnalysis(
  scenario: string,
  paths: Array<{
    name: string
    choices: Array<{ turn: number; choice: string; narrative: string }>
  }>,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const names = paths.map((p) => p.name).join(', ')
    return `Fascinating divergence! ${names} all started with the same scenario but ended up in very different places. Each path revealed different priorities and approaches. The beauty of this simulation is that there was no single right answer -- every choice taught us something about how we think through complex situations.`
  }

  try {
    const pathDescriptions = paths.map((p) => {
      const choiceList = p.choices.map((c) =>
        `  Turn ${c.turn}: "${c.choice}"`
      ).join('\n')
      return `${p.name}:\n${choiceList}`
    }).join('\n\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are Sandy, analyzing how different students navigated the same scenario.

Starting scenario: ${scenario.substring(0, 400)}

${pathDescriptions}

Write a 2-3 paragraph analysis:
1. Note the key divergence points where people chose differently
2. Highlight what each path reveals about different approaches/values
3. Note any surprising or insightful patterns
4. Be encouraging -- all paths had merit

Return ONLY the analysis text.`,
      messages: [{ role: 'user', content: 'Analyze the divergence across all participant paths.' }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) {
      const names = paths.map((p) => p.name).join(', ')
      return `${names} all navigated the same scenario but made different choices at key moments. Each path was valid and revealed different perspectives on the situation.`
    }

    return text.trim()
  } catch (err) {
    console.error('[SimulationEngine] Divergence analysis failed:', err)
    const names = paths.map((p) => p.name).join(', ')
    return `${names} all started with the same scenario but ended up in very different places. Each path revealed different priorities and approaches -- and that is exactly the point. There was no single right answer.`
  }
}

// ── Fallback Continuations ───────────────────────────────────────────────────

function getFallbackContinuation(turnNumber: number): string {
  const continuations = [
    `Your decision has set things in motion. The immediate reaction from those around you is mixed -- some support your approach, others are skeptical. A new complication emerges that you didn't anticipate.

What do you do next?

Some options to consider:
- Double down on your original strategy
- Adapt your approach based on the new information
- Seek input from someone you haven't consulted yet`,

    `The consequences of your choice are becoming clearer. Some things went as expected, but there's an unexpected twist -- a stakeholder you hadn't considered is now involved, and they have strong opinions.

What do you do next?

Some options to consider:
- Address the new stakeholder's concerns directly
- Stay the course and manage the fallout
- Pivot to a completely different approach`,

    `Time has passed and the situation has evolved. Your earlier decisions have created a new reality, and you're facing a final critical moment. The path forward isn't clear, but you have more information now than when you started.

What do you do next?

Some options to consider:
- Make a bold decisive move to resolve things
- Negotiate a compromise with all parties
- Step back and let events play out naturally`,

    `The situation has reached a turning point. Your choices so far have shaped how others see you and the problem. There's an opportunity to either solidify your approach or make a dramatic change.

What do you do next?

Some options to consider:
- Use what you've learned to make a final decision
- Bring everyone together for a group resolution
- Take an unexpected action that changes the dynamic`,
  ]

  return continuations[(turnNumber - 1) % continuations.length]!
}
