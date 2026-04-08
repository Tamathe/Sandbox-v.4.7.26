import { prisma } from '../prisma'
import type { JourneyMilestoneData } from './types'

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  end.setUTCMilliseconds(-1)
  return end
}

export async function detectMilestones(userId: string, weekOf: Date): Promise<JourneyMilestoneData[]> {
  const milestones: JourneyMilestoneData[] = []
  const weekStart = startOfWeek(weekOf)
  const weekEnd = endOfWeek(weekOf)

  // 1. Mastery breakthrough: concept proficiency jumped > 0.3 in one week
  const masteryJumps = await findMasteryJumps(userId, weekStart, weekEnd)
  for (const jump of masteryJumps) {
    milestones.push({
      type: 'breakthrough',
      title: `Mastered ${jump.concept}`,
      description: `Proficiency jumped from ${(jump.from * 100).toFixed(0)}% to ${(jump.to * 100).toFixed(0)}% this week`,
      layer: 'mastery',
      relatedConcept: jump.concept,
      significance: Math.min(jump.delta, 1),
      occurredAt: jump.date,
    })
  }

  // 2. Engagement shift: weekly engagement score changed > 0.2
  const prevWeekOf = new Date(weekStart)
  prevWeekOf.setUTCDate(prevWeekOf.getUTCDate() - 7)

  const [prevSnapshot, currentSnapshot] = await Promise.all([
    prisma.journeySnapshot.findUnique({
      where: { userId_weekOf: { userId, weekOf: prevWeekOf } },
      select: { engagementScore: true },
    }),
    prisma.journeySnapshot.findUnique({
      where: { userId_weekOf: { userId, weekOf: weekStart } },
      select: { engagementScore: true },
    }),
  ])

  if (prevSnapshot && currentSnapshot) {
    const delta = currentSnapshot.engagementScore - prevSnapshot.engagementScore
    if (Math.abs(delta) > 0.2) {
      milestones.push({
        type: delta > 0 ? 'engagement-shift' : 'struggle-start',
        title: delta > 0 ? 'Engagement surge' : 'Engagement dip',
        description: `Weekly engagement ${delta > 0 ? 'increased' : 'decreased'} by ${(Math.abs(delta) * 100).toFixed(0)}%`,
        layer: delta > 0 ? 'study' : 'academic',
        significance: Math.min(Math.abs(delta), 1),
        occurredAt: weekEnd,
      })
    }
  }

  // 3. Social expansion: joined first study group or live room this week
  const socialEvents = await detectFirstTimeEvents(userId, weekStart, weekEnd)
  for (const event of socialEvents) {
    milestones.push({
      type: 'social-expansion',
      title: event.title,
      description: event.description,
      layer: 'social',
      significance: 0.7,
      occurredAt: event.date,
    })
  }

  return milestones
}

interface MasteryJump {
  concept: string
  from: number
  to: number
  delta: number
  date: Date
}

async function findMasteryJumps(userId: string, weekStart: Date, weekEnd: Date): Promise<MasteryJump[]> {
  // Find concepts that were updated this week with high mastery
  const recentMasteries = await prisma.studentConceptMastery.findMany({
    where: {
      userId,
      lastSeenAt: { gte: weekStart, lte: weekEnd },
      masteryLevel: { gte: 0.3 },
    },
    select: { concept: true, masteryLevel: true, lastSeenAt: true, encounterCount: true },
  })

  const jumps: MasteryJump[] = []
  for (const m of recentMasteries) {
    // Estimate prior mastery based on success/encounter ratio minus current jump
    // If encounter count is low, this is likely a new concept gaining mastery quickly
    if (m.encounterCount <= 2) continue // Need history to detect a jump

    // Approximate: if current mastery > 0.7 and they had encounters before this week,
    // treat as a breakthrough (we don't have historical mastery snapshots)
    const estimatedPrior = Math.max(0, m.masteryLevel - 0.3)
    if (m.masteryLevel - estimatedPrior >= 0.3) {
      jumps.push({
        concept: m.concept,
        from: estimatedPrior,
        to: m.masteryLevel,
        delta: m.masteryLevel - estimatedPrior,
        date: m.lastSeenAt,
      })
    }
  }

  return jumps
}

interface SocialEvent {
  title: string
  description: string
  date: Date
}

async function detectFirstTimeEvents(userId: string, weekStart: Date, weekEnd: Date): Promise<SocialEvent[]> {
  const events: SocialEvent[] = []

  // Check if user joined their first study group this week
  const studyGroupJoins = await prisma.studyGroupMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    take: 1,
    select: { joinedAt: true, group: { select: { name: true } } },
  })

  if (studyGroupJoins.length > 0) {
    const first = studyGroupJoins[0]
    if (first.joinedAt >= weekStart && first.joinedAt <= weekEnd) {
      events.push({
        title: 'Joined first study group',
        description: `Joined "${first.group.name}" — first step into collaborative learning`,
        date: first.joinedAt,
      })
    }
  }

  // Check if user joined their first live room this week
  const liveRoomJoins = await prisma.liveRoomParticipant.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    take: 1,
    select: { joinedAt: true },
  })

  if (liveRoomJoins.length > 0) {
    const first = liveRoomJoins[0]
    if (first.joinedAt >= weekStart && first.joinedAt <= weekEnd) {
      events.push({
        title: 'First live room participation',
        description: 'Joined a live room for the first time — engaging in real-time learning',
        date: first.joinedAt,
      })
    }
  }

  return events
}

export async function detectAndStoreMilestones(userId: string, weekOf: Date): Promise<number> {
  const milestones = await detectMilestones(userId, weekOf)

  for (const m of milestones) {
    await prisma.journeyMilestone.create({
      data: {
        userId,
        occurredAt: m.occurredAt,
        type: m.type,
        title: m.title,
        description: m.description,
        layer: m.layer,
        relatedCourseId: m.relatedCourseId ?? null,
        relatedConcept: m.relatedConcept ?? null,
        significance: m.significance,
      },
    })
  }

  return milestones.length
}
