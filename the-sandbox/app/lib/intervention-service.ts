/**
 * Intervention Service
 *
 * generateIntervention(studentId, courseId, educatorEmail) — Checks whether
 * a student meets intervention criteria (≥2 missed concept reviews OR recent
 * high frustration) and, if so, calls Haiku to generate a 2-sentence
 * actionable recommendation for the educator.
 *
 * Results are cached in-memory for 1 hour per `${studentId}:${courseId}` key.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// In-memory cache: key = `${studentId}:${courseId}`
const cache = new Map<string, { text: string; expiresAt: number }>()

export async function generateIntervention(
  studentId: string,
  courseId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _educatorEmail: string,
): Promise<string | null> {
  const cacheKey = `${studentId}:${courseId}`

  // Serve from cache if fresh
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.text
  }

  // ── Check intervention conditions ────────────────────────────────────────

  // 1. Missed reviews: ConceptState with missedReviews >= 2 for this student + course
  const overdueCount = await prisma.conceptState.count({
    where: { userId: studentId, courseId, missedReviews: { gte: 2 } },
  })

  // 2. Recent high frustration: last observation log for this student in this course
  const lastObs = await prisma.learnerObservationLog.findFirst({
    where: {
      userId: studentId,
      frustrationScore: { not: null },
      session: { courseId, sensitiveSession: false },
    },
    orderBy: { createdAt: 'desc' },
    select: { frustrationScore: true },
  })
  const lastFrustration = lastObs?.frustrationScore ?? null
  const highFrustration = lastFrustration !== null && lastFrustration > 0.7

  if (overdueCount === 0 && !highFrustration) {
    return null
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return null
  }

  // ── Gather student context for the prompt ────────────────────────────────

  const [profile, overdueConcepts] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { dominantBloomLevel: true, avgCognitiveLoad: true },
    }),
    prisma.conceptState.findMany({
      where: { userId: studentId, courseId, missedReviews: { gte: 2 } },
      orderBy: { missedReviews: 'desc' },
      take: 3,
      select: { conceptSlug: true, missedReviews: true },
    }),
  ])

  const bloomLevel = profile?.dominantBloomLevel ?? null
  const cogLoad = profile?.avgCognitiveLoad ?? null
  const overdueSlugs = overdueConcepts.map(c => c.conceptSlug)

  // ── Build prompt ─────────────────────────────────────────────────────────

  const contextLines: string[] = []
  if (bloomLevel !== null) contextLines.push(`- Dominant Bloom level: ${bloomLevel}/6`)
  if (cogLoad !== null) contextLines.push(`- Average cognitive load: ${cogLoad.toFixed(2)} (scale 0–1)`)
  if (overdueCount > 0) {
    contextLines.push(`- Overdue spaced-repetition reviews: ${overdueCount} concept(s)`)
    if (overdueSlugs.length > 0) {
      contextLines.push(`  Concepts: ${overdueSlugs.join(', ')}`)
    }
  }
  if (highFrustration && lastFrustration !== null) {
    contextLines.push(`- Most recent session frustration score: ${lastFrustration.toFixed(2)} (high)`)
  }

  const userMessage =
    `Student context:\n${contextLines.join('\n')}\n\n` +
    `Generate a 2-sentence intervention recommendation for an educator to help this student. ` +
    `Be specific and actionable based on the data above. Do not use the student's name.`

  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      system: 'You are an educational AI assistant helping faculty support struggling students. Be concise, evidence-based, and actionable.',
      messages: [{ role: 'user', content: userMessage }],
    })

    const text =
      message.content[0]?.type === 'text' ? message.content[0].text.trim() : null
    if (!text) return null

    cache.set(cacheKey, { text, expiresAt: Date.now() + CACHE_TTL_MS })
    return text
  } catch (err) {
    console.error('[intervention-service] Haiku call failed:', err)
    return null
  }
}
