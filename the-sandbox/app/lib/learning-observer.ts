/**
 * Learning Observer — Phase 2 Learning Science Layer
 *
 * Async fire-and-forget sidecar triggered from captureStreamCompletion.
 * Runs every OBSERVER_FREQUENCY turns (default: every 3rd turn).
 *
 * Per-turn actions:
 *   1. Single Haiku call → raw bloom/cognitive/frustration/metacognition signals
 *   2. All readings written to LearnerObservationLog (staging table)
 *   3. Readings above 85% confidence threshold written to ToolSession
 *   4. Escalation: 3 consecutive sub-threshold same-direction readings → promoted
 *   5. Jaccard reformulation detection across last 3 user turns
 *   6. Misconception pattern matching against MisconceptionTaxonomy.triggerPatterns
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const HAIKU = 'claude-haiku-4-5-20251001'

const OBSERVER_FREQUENCY = 3     // run every N turns
const CONFIDENCE_THRESHOLD = 0.85
const ESCALATION_WINDOW = 3      // consecutive sub-threshold readings to escalate

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ObserverParams {
  sessionId: string
  userId: string
  courseId: string | null | undefined
  turnNumber: number   // total messages in session (used for frequency gating)
  recentMessages: { role: string; content: string }[]  // last ~6 turns
  lastUserMessage: string
  lastAssistantResponse: string
}

interface ObserverReading {
  bloomLevel: number | null
  bloomConfidence: number | null
  cognitiveLoad: number | null
  cognitiveLoadConf: number | null
  frustrationScore: number | null
  frustrationConf: number | null
  isProductiveStruggle: boolean | null
  metacognitionScore: number | null
  metacognitionConf: number | null
}

// ── Jaccard similarity for reformulation detection ────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2),
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Returns number of likely reformulations in the last 3 user turns.
 * A reformulation is detected when Jaccard(turn_n, turn_n-1) >= 0.35 —
 * meaning the student reused substantial vocabulary while rephrasing.
 */
function detectReformulations(
  messages: { role: string; content: string }[],
): number {
  const userTurns = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => tokenize(m.content))

  if (userTurns.length < 2) return 0

  let count = 0
  for (let i = 1; i < userTurns.length; i++) {
    if (jaccardSimilarity(userTurns[i], userTurns[i - 1]) >= 0.35) count++
  }
  return count
}

// ── Haiku observer call ───────────────────────────────────────────────────────

const OBSERVER_PROMPT = `You are analyzing a student's learning state from a short conversation excerpt.

Return ONLY valid JSON with this exact shape:
{
  "bloomLevel": <1–6 integer or null>,
  "bloomConfidence": <0.0–1.0 float>,
  "cognitiveLoad": <0.0–1.0 float>,
  "cognitiveLoadConf": <0.0–1.0 float>,
  "frustrationScore": <0.0–1.0 float>,
  "frustrationConf": <0.0–1.0 float>,
  "isProductiveStruggle": <true|false|null>,
  "metacognitionScore": <0.0–1.0 float>,
  "metacognitionConf": <0.0–1.0 float>
}

Bloom's Taxonomy levels:
1=Remember (recall facts), 2=Understand (explain concepts), 3=Apply (use in new situations),
4=Analyze (break down, compare), 5=Evaluate (judge, justify), 6=Create (produce, design)

cognitiveLoad: how mentally taxed/overwhelmed the student seems (0=effortless, 1=overwhelmed).
frustrationScore: emotional frustration/distress signals (0=calm, 1=highly frustrated).
isProductiveStruggle: true only when student is clearly trying hard AND making progress.
metacognitionScore: student self-monitoring signals — "I think I need to review X", checking own understanding (0=absent, 1=strong).

If the excerpt is too short to confidently assess a metric, set that value to null (bloomLevel) or 0.5 confidence (others).`

async function callObserver(
  lastUserMessage: string,
  lastAssistantResponse: string,
): Promise<ObserverReading> {
  const excerpt = `Student: ${lastUserMessage.slice(0, 800)}\n\nTutor: ${lastAssistantResponse.slice(0, 800)}`

  try {
    const msg = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 512,
      system: OBSERVER_PROMPT,
      messages: [{ role: 'user', content: excerpt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean) as ObserverReading
    return parsed
  } catch {
    return {
      bloomLevel: null,
      bloomConfidence: null,
      cognitiveLoad: null,
      cognitiveLoadConf: null,
      frustrationScore: null,
      frustrationConf: null,
      isProductiveStruggle: null,
      metacognitionScore: null,
      metacognitionConf: null,
    }
  }
}

// ── Escalation check ──────────────────────────────────────────────────────────

/**
 * If the last 3 LearnerObservationLog entries for this session all have
 * cognitiveLoad > 0.65 or frustrationScore > 0.65 (sub-threshold but consistent),
 * mark them as escalated and promote the signal to ToolSession.
 */
async function checkEscalation(
  sessionId: string,
  current: ObserverReading,
): Promise<boolean> {
  const recent = await prisma.learnerObservationLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: ESCALATION_WINDOW - 1,
    select: {
      id: true,
      cognitiveLoad: true,
      frustrationScore: true,
      escalated: true,
    },
  })

  if (recent.length < ESCALATION_WINDOW - 1) return false

  const allHighLoad = [current, ...recent].every(
    (r) => (r.cognitiveLoad ?? 0) > 0.65,
  )
  const allHighFrustration = [current, ...recent].every(
    (r) => (r.frustrationScore ?? 0) > 0.65,
  )

  if (allHighLoad || allHighFrustration) {
    // Mark prior readings as escalated
    await prisma.learnerObservationLog.updateMany({
      where: { id: { in: recent.map((r) => r.id) } },
      data: { escalated: true },
    })
    return true
  }

  return false
}

// ── Misconception matching ────────────────────────────────────────────────────

/**
 * Matches lastUserMessage against MisconceptionTaxonomy.triggerPatterns (regex).
 * On a match: increments prevalence and upserts firedMisconceptions on ConceptState.
 */
async function matchMisconceptions(
  courseId: string,
  userId: string,
  lastUserMessage: string,
): Promise<string[]> {
  if (!courseId) return []

  const taxonomy = await prisma.misconceptionTaxonomy.findMany({
    where: { courseId },
    select: { id: true, conceptSlug: true, triggerPatterns: true, prevalence: true },
  })

  const fired: string[] = []

  for (const entry of taxonomy) {
    const matched = entry.triggerPatterns.some((pattern) => {
      try {
        return new RegExp(pattern, 'i').test(lastUserMessage)
      } catch {
        // Fallback: simple substring match if regex is invalid
        return lastUserMessage.toLowerCase().includes(pattern.toLowerCase())
      }
    })

    if (matched) {
      fired.push(entry.id)

      // Upsert ConceptState.firedMisconceptions
      await prisma.conceptState.upsert({
        where: {
          userId_courseId_conceptSlug: {
            userId,
            courseId,
            conceptSlug: entry.conceptSlug,
          },
        },
        create: {
          userId,
          courseId,
          conceptSlug: entry.conceptSlug,
          firedMisconceptions: [entry.id],
        },
        update: {
          firedMisconceptions: {
            push: entry.id,
          },
        },
      })

      // Increment prevalence (saturates toward 1.0)
      await prisma.misconceptionTaxonomy.update({
        where: { id: entry.id },
        data: { prevalence: Math.min(1.0, entry.prevalence + 0.05) },
      })
    }
  }

  return fired
}

// ── Main entry: observeLearnerState ──────────────────────────────────────────

/**
 * Fire-and-forget: call this from captureStreamCompletion without awaiting.
 * Guards: only runs every OBSERVER_FREQUENCY turns.
 */
export async function observeLearnerState(params: ObserverParams): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return

  // Frequency gate: only run every 3rd turn
  if (params.turnNumber % OBSERVER_FREQUENCY !== 0) return

  try {
    // 1. Run observer inference
    const reading = await callObserver(
      params.lastUserMessage,
      params.lastAssistantResponse,
    )

    // 2. Detect reformulations (lightweight, no external call)
    const reformulations = detectReformulations(params.recentMessages)

    // 3. Check escalation
    const escalated = await checkEscalation(params.sessionId, reading)

    // 4. Write to LearnerObservationLog (always)
    await prisma.learnerObservationLog.create({
      data: {
        sessionId: params.sessionId,
        userId: params.userId,
        turnNumber: params.turnNumber,
        bloomLevel: reading.bloomLevel ?? null,
        bloomConfidence: reading.bloomConfidence ?? null,
        cognitiveLoad: reading.cognitiveLoad ?? null,
        cognitiveLoadConf: reading.cognitiveLoadConf ?? null,
        frustrationScore: reading.frustrationScore ?? null,
        frustrationConf: reading.frustrationConf ?? null,
        isProductiveStruggle: reading.isProductiveStruggle ?? null,
        metacognitionScore: reading.metacognitionScore ?? null,
        metacognitionConf: reading.metacognitionConf ?? null,
        escalated,
      },
    })

    // 5. Gate: only write confirmed signals to ToolSession
    const bloomAboveThreshold =
      reading.bloomLevel !== null &&
      (reading.bloomConfidence ?? 0) >= CONFIDENCE_THRESHOLD

    const loadAboveThreshold =
      reading.cognitiveLoad !== null &&
      ((reading.cognitiveLoadConf ?? 0) >= CONFIDENCE_THRESHOLD || escalated)

    const frustrationAboveThreshold =
      reading.frustrationScore !== null &&
      ((reading.frustrationConf ?? 0) >= CONFIDENCE_THRESHOLD || escalated)

    const metacognitionAboveThreshold =
      reading.metacognitionScore !== null &&
      (reading.metacognitionConf ?? 0) >= CONFIDENCE_THRESHOLD

    const updateData: Record<string, unknown> = {}

    if (bloomAboveThreshold) {
      updateData.bloomLevel = reading.bloomLevel
      updateData.bloomConfidence = reading.bloomConfidence
    }
    if (loadAboveThreshold) {
      updateData.cognitiveLoad = reading.cognitiveLoad
    }
    if (frustrationAboveThreshold) {
      updateData.frustrationScore = reading.frustrationScore
    }
    if (reading.isProductiveStruggle !== null) {
      updateData.isProductiveStruggle = reading.isProductiveStruggle
    }
    if (metacognitionAboveThreshold) {
      updateData.metacognitionScore = reading.metacognitionScore
    }
    if (reformulations > 0) {
      updateData.reformulationCount = reformulations
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.toolSession.update({
        where: { id: params.sessionId },
        data: updateData,
      })
    }

    // 6. Misconception matching (if course-linked)
    if (params.courseId) {
      await matchMisconceptions(
        params.courseId,
        params.userId,
        params.lastUserMessage,
      ).catch(console.error)
    }

    // 7. Update StudentProfile dominant Bloom level (rolling update)
    if (bloomAboveThreshold && reading.bloomLevel && params.userId) {
      await updateDominantBloomLevel(params.userId, reading.bloomLevel).catch(console.error)
    }
  } catch (err) {
    // Observer is fire-and-forget; never let it surface errors to the user
    console.error('[learning-observer] Error:', err)
  }
}

// ── StudentProfile: rolling dominant Bloom level ──────────────────────────────

async function updateDominantBloomLevel(userId: string, newLevel: number): Promise<void> {
  // Fetch last 20 confirmed bloom readings for this user
  const recentLogs = await prisma.learnerObservationLog.findMany({
    where: { userId, bloomLevel: { not: null }, bloomConfidence: { gte: CONFIDENCE_THRESHOLD } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { bloomLevel: true },
  })

  if (recentLogs.length === 0) return

  // Mode of the last 20 readings
  const freq: Record<number, number> = {}
  for (const log of recentLogs) {
    const level = log.bloomLevel!
    freq[level] = (freq[level] ?? 0) + 1
  }
  const dominant = Number(
    Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0],
  )

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { dominantBloomLevel: true, dominantBloomSince: true },
  })

  const dominantBloomSince =
    profile?.dominantBloomLevel === dominant
      ? profile.dominantBloomSince ?? new Date()
      : new Date()

  await prisma.studentProfile.upsert({
    where: { userId },
    create: {
      userId,
      dominantBloomLevel: dominant,
      dominantBloomSince,
      topConceptsThisWeek: [],
    },
    update: {
      dominantBloomLevel: dominant,
      dominantBloomSince,
    },
  })
}
