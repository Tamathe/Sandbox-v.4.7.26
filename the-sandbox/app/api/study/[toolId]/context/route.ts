import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getStudentContextJSON } from '../../../../lib/student-context-api'
import { getEpisodicMemory, formatEpisodicBlock } from '../../../../lib/episodic-memory-service'
import { getDueConcepts } from '../../../../lib/sr-scheduler'
import { prisma } from '../../../../lib/prisma'

/**
 * GET /api/study/[toolId]/context
 *
 * Returns the full student learning context for Study Buddy v2:
 * - Student profile (risk, velocity, bloom, modality, peak hour)
 * - Weak/strong concepts with mastery decay applied
 * - SR-due concepts with remediation hints
 * - Episodic memory (recent relevant sessions)
 * - Suggested study mode with reasoning
 * - Recent session stats for this tool
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  const { toolId } = await params

  // Resolve courseId from tool's course link
  const courseLink = await prisma.courseToolLink.findFirst({
    where: { toolId },
    select: { courseId: true },
  }).catch(() => null)
  const courseId = courseLink?.courseId ?? undefined

  // Fetch student context + episodic memory + due concepts + recent tool sessions in parallel
  const [context, episodic, dueConcepts, recentToolSessions] = await Promise.all([
    getStudentContextJSON(user.id, courseId).catch(() => null),

    getEpisodicMemory(
      user.id,
      // Use top concepts from profile as relevance signal
      [],
      5,
    ).catch(() => []),

    getDueConcepts(user.id, courseId).catch(() => []),

    prisma.toolSession.findMany({
      where: {
        toolId,
        userId: user.id,
        messageCount: { gt: 0 },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        score: true,
        conceptsTouched: true,
        startedAt: true,
        bloomLevel: true,
        qualitySignal: true,
      },
    }).catch(() => []),
  ])

  // Build suggested mode
  const suggestion = suggestStudyMode(
    context?.profile ?? null,
    context?.weakConcepts ?? [],
    dueConcepts,
    recentToolSessions,
  )

  return NextResponse.json({
    profile: context?.profile ?? null,
    weakConcepts: context?.weakConcepts ?? [],
    strongConcepts: context?.strongConcepts ?? [],
    dueConcepts: dueConcepts.slice(0, 8).map(d => ({
      conceptSlug: d.conceptSlug,
      daysOverdue: d.daysOverdue,
      bloomHighWater: d.bloomHighWater,
      remediationHints: d.remediationHints,
    })),
    episodicMemory: episodic.map(e => ({
      toolName: e.toolName,
      courseCode: e.courseCode,
      score: e.score,
      conceptsOverlap: e.conceptsOverlap,
      createdAt: e.createdAt.toISOString(),
    })),
    episodicBlock: formatEpisodicBlock(episodic),
    recentToolSessions: recentToolSessions.map(s => ({
      id: s.id,
      score: s.score,
      conceptsTouched: s.conceptsTouched,
      startedAt: s.startedAt.toISOString(),
      bloomLevel: s.bloomLevel,
      qualitySignal: s.qualitySignal,
    })),
    suggestedMode: suggestion.mode,
    suggestedReason: suggestion.reason,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// ── Deterministic mode suggestion ──────────────────────────────────────────

type Mode = 'tutor' | 'quiz' | 'flashcards' | 'socratic' | 'teach-back' | 'debate' | 'essay'

interface ProfileSlice {
  riskScore: number | null
  dominantBloomLevel: number | null
  learningVelocity: number | null
  lastSessionAt: string | null
}

interface WeakConcept {
  concept: string
  effectiveMastery: number
  isStale: boolean
}

interface DueConcept {
  conceptSlug: string
  daysOverdue: number
}

interface RecentSession {
  score: number | null
  bloomLevel: number | null
  qualitySignal: string | null
}

function suggestStudyMode(
  profile: ProfileSlice | null,
  weakConcepts: WeakConcept[],
  dueConcepts: DueConcept[],
  recentSessions: RecentSession[],
): { mode: Mode | null; reason: string | null } {
  // Rule 1: If many concepts are due for SR review → flashcards
  if (dueConcepts.length >= 3) {
    return {
      mode: 'flashcards',
      reason: `You have ${dueConcepts.length} concept${dueConcepts.length !== 1 ? 's' : ''} due for review — spaced repetition keeps them fresh.`,
    }
  }

  // Rule 2: If weak concepts are stale (once strong, now decayed) → quiz to diagnose
  const staleConcepts = weakConcepts.filter(c => c.isStale)
  if (staleConcepts.length > 0) {
    return {
      mode: 'quiz',
      reason: `"${staleConcepts[0].concept}" has faded since you last studied it — a quick quiz will show where you stand.`,
    }
  }

  // Rule 3: High risk score → tutor (supportive, scaffolded)
  if (profile?.riskScore != null && profile.riskScore > 0.6) {
    return {
      mode: 'tutor',
      reason: `Let's work through the material together — I'll break things down step by step.`,
    }
  }

  // Rule 4: High Bloom level → push to teach-back or debate
  if (profile?.dominantBloomLevel != null && profile.dominantBloomLevel >= 4) {
    // If recent sessions are mostly quiz, suggest teach-back for variety
    const recentQuizCount = recentSessions.filter(s => s.qualitySignal).length
    if (recentQuizCount >= 3) {
      return {
        mode: 'teach-back',
        reason: `You've been quizzing a lot — try explaining concepts to test real mastery.`,
      }
    }
    return {
      mode: 'debate',
      reason: `You're working at an advanced level — debate will sharpen your critical thinking.`,
    }
  }

  // Rule 5: Many weak concepts → tutor
  if (weakConcepts.length >= 3) {
    return {
      mode: 'tutor',
      reason: `You have ${weakConcepts.length} concepts below 50% mastery — let's build a stronger foundation.`,
    }
  }

  // Rule 6: No sessions at all → tutor (onboarding)
  if (!profile?.lastSessionAt) {
    return {
      mode: 'tutor',
      reason: `Welcome! Start by telling me what you're working on.`,
    }
  }

  // No strong signal — let the student choose
  return { mode: null, reason: null }
}
