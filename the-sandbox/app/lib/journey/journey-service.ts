import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { JourneySnapshot, JourneyMilestone, EngagementFingerprint } from '../../generated/prisma'
import type { StudentJourney, FingerprintSummary } from './types'

const anthropic = new Anthropic()

function weeksAgo(weeks: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - weeks * 7)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function getStudentJourney(
  userId: string,
  options?: { weeks?: number; layer?: string },
): Promise<StudentJourney> {
  const weeks = options?.weeks ?? 16
  const since = weeksAgo(weeks)

  const [snapshots, milestones, fingerprint] = await Promise.all([
    prisma.journeySnapshot.findMany({
      where: { userId, weekOf: { gte: since } },
      orderBy: { weekOf: 'asc' },
    }),
    prisma.journeyMilestone.findMany({
      where: {
        userId,
        occurredAt: { gte: since },
        ...(options?.layer && { layer: options.layer }),
      },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.engagementFingerprint.findFirst({ where: { userId } }),
  ])

  const narrative = await generateJourneyNarrative(snapshots, milestones, fingerprint)

  return {
    userId,
    timeRange: { from: since, to: new Date() },
    snapshots,
    milestones,
    fingerprint: fingerprint ? buildFingerprintSummary(fingerprint) : null,
    narrative,
    currentTrajectory: snapshots.length > 0
      ? snapshots[snapshots.length - 1].trajectoryLabel
      : 'insufficient-data',
  }
}

function buildFingerprintSummary(fp: EngagementFingerprint): FingerprintSummary {
  return {
    chronotype: fp.chronotype,
    cadence: fp.sessionCadence,
    socialOrientation: fp.socialOrientation,
    learningVelocity: fp.learningVelocity,
  }
}

async function generateJourneyNarrative(
  snapshots: JourneySnapshot[],
  milestones: JourneyMilestone[],
  fingerprint: EngagementFingerprint | null,
): Promise<string> {
  if (snapshots.length < 2) return 'Insufficient data for a journey narrative. Keep using the platform!'

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: 'You are an academic advisor summarizing a student\'s learning journey. Write a 3-4 sentence narrative that highlights trajectory, inflection points, and strengths. Be encouraging but honest. Do not mention specific scores or metrics — speak in terms of patterns and growth.',
    messages: [{
      role: 'user',
      content: JSON.stringify({
        weeksOfData: snapshots.length,
        trajectoryArc: snapshots.map(s => s.trajectoryLabel),
        engagementArc: snapshots.map(s => s.engagementScore),
        milestoneCount: milestones.length,
        milestoneTypes: milestones.map(m => m.type),
        fingerprint: fingerprint ? {
          chronotype: fingerprint.chronotype,
          cadence: fingerprint.sessionCadence,
          socialOrientation: fingerprint.socialOrientation,
        } : null,
      }),
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : 'Journey data available.'
}

// ── Integration hooks (wired by integration merge) ──

export async function buildJourneySandyContext(userId: string): Promise<string> {
  const journey = await getStudentJourney(userId, { weeks: 8 })
  if (journey.snapshots.length === 0) return ''

  const latest = journey.snapshots[journey.snapshots.length - 1]
  const recentMilestones = journey.milestones.slice(-5)

  return `<journey_context>
<trajectory>${journey.currentTrajectory}</trajectory>
<engagement_score>${latest.engagementScore}</engagement_score>
<study_sessions_per_week>${latest.studySessions}</study_sessions_per_week>
<messages_per_week>${latest.messagesSent}</messages_per_week>
<recent_milestones>
${recentMilestones.map(m => `  <milestone type="${m.type}">${m.title}</milestone>`).join('\n')}
</recent_milestones>
${journey.fingerprint ? `<fingerprint chronotype="${journey.fingerprint.chronotype}" cadence="${journey.fingerprint.cadence}" social="${journey.fingerprint.socialOrientation}" />` : ''}
</journey_context>`
}

export async function buildJourneyBriefingBlock(userId: string): Promise<{
  trajectory: string
  engagementScore: number
  milestoneCount: number
  recentMilestones: Array<{ type: string; title: string }>
} | null> {
  const journey = await getStudentJourney(userId, { weeks: 4 })
  if (journey.snapshots.length === 0) return null

  const latest = journey.snapshots[journey.snapshots.length - 1]

  return {
    trajectory: journey.currentTrajectory,
    engagementScore: latest.engagementScore,
    milestoneCount: journey.milestones.length,
    recentMilestones: journey.milestones.slice(-3).map(m => ({
      type: m.type,
      title: m.title,
    })),
  }
}
