/**
 * Reflect — Structured Metacognition service.
 * Reflections, confidence calibration, weekly journals, growth comparison.
 */

import { prisma } from './prisma'
import type { ReflectionTrigger } from '../generated/prisma'

// ── Reflections ─────────────────────────────────────────────────────────

export async function createReflection(
  userId: string,
  data: {
    trigger: ReflectionTrigger
    prompt?: string
    content: string
    tags?: string[]
    sessionId?: string
    courseId?: string
    concept?: string
    sharedWithGroup?: boolean
  },
) {
  return prisma.learningReflection.create({
    data: {
      userId,
      trigger: data.trigger,
      prompt: data.prompt ?? null,
      content: data.content,
      tags: data.tags ?? [],
      sessionId: data.sessionId ?? null,
      courseId: data.courseId ?? null,
      concept: data.concept ?? null,
      sharedWithGroup: data.sharedWithGroup ?? false,
    },
  })
}

export async function listReflections(userId: string, limit = 20, trigger?: ReflectionTrigger) {
  return prisma.learningReflection.findMany({
    where: { userId, ...(trigger ? { trigger } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getSharedReflections(courseId: string, limit = 10) {
  return prisma.learningReflection.findMany({
    where: { courseId, sharedWithGroup: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
}

export async function toggleReflectionSharing(userId: string, reflectionId: string) {
  const r = await prisma.learningReflection.findFirst({ where: { id: reflectionId, userId } })
  if (!r) return null
  return prisma.learningReflection.update({
    where: { id: reflectionId },
    data: { sharedWithGroup: !r.sharedWithGroup },
  })
}

// ── Confidence Calibration ──────────────────────────────────────────────

export async function createConfidenceCheck(
  userId: string,
  data: { concept: string; predictedScore: number; courseId?: string },
) {
  return prisma.confidenceCheck.create({
    data: {
      userId,
      concept: data.concept,
      predictedScore: Math.min(5, Math.max(1, data.predictedScore)),
      courseId: data.courseId ?? null,
    },
  })
}

export async function resolveConfidenceCheck(
  userId: string,
  checkId: string,
  data: { actualScore: number; sessionId?: string },
) {
  const check = await prisma.confidenceCheck.findFirst({ where: { id: checkId, userId } })
  if (!check) return null

  const actual = Math.min(5, Math.max(1, data.actualScore))
  return prisma.confidenceCheck.update({
    where: { id: checkId },
    data: {
      actualScore: actual,
      actualAt: new Date(),
      sessionId: data.sessionId ?? null,
      calibrationDelta: actual - check.predictedScore,
    },
  })
}

export async function getCalibrationHistory(userId: string, limit = 20) {
  return prisma.confidenceCheck.findMany({
    where: { userId, actualScore: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getCalibrationSummary(userId: string) {
  const checks = await prisma.confidenceCheck.findMany({
    where: { userId, actualScore: { not: null } },
    select: { predictedScore: true, actualScore: true, calibrationDelta: true },
  })

  if (checks.length === 0) return { totalChecks: 0, avgDelta: 0, tendency: 'none' as const }

  const avgDelta = checks.reduce((sum, c) => sum + (c.calibrationDelta ?? 0), 0) / checks.length

  return {
    totalChecks: checks.length,
    avgDelta: Math.round(avgDelta * 100) / 100,
    tendency: avgDelta > 0.5 ? 'underconfident' as const
      : avgDelta < -0.5 ? 'overconfident' as const
      : 'well-calibrated' as const,
  }
}

// ── Weekly Journal ──────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function getOrCreateWeeklyJournal(userId: string) {
  const weekOf = getMonday(new Date())

  const existing = await prisma.weeklyJournal.findUnique({
    where: { userId_weekOf: { userId, weekOf } },
  })
  if (existing) return existing

  const weekStart = weekOf
  const weekEnd = new Date(weekOf)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [sessions, concepts] = await Promise.all([
    prisma.toolSession.findMany({
      where: { userId, startedAt: { gte: weekStart, lt: weekEnd } },
      select: { durationSeconds: true, score: true, conceptsTouched: true, tool: { select: { name: true } } },
    }),
    prisma.studentConceptMastery.findMany({
      where: { userId, lastSeenAt: { gte: weekStart, lt: weekEnd } },
      select: { concept: true, masteryLevel: true },
      orderBy: { masteryLevel: 'desc' },
      take: 5,
    }),
  ])

  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60)
  const topConcepts = concepts.map(c => c.concept)

  const prompts = [
    'What concept clicked for you this week that didn\'t before?',
    'What surprised you about your learning this week?',
    'If you could teach one thing you learned this week, what would it be?',
    'What study approach worked best for you this week?',
    'What was the hardest thing you tackled this week, and how did you handle it?',
  ]
  const prompt = prompts[Math.floor(Math.random() * prompts.length)]

  return prisma.weeklyJournal.create({
    data: {
      userId,
      weekOf,
      prompt,
      activitySummary: {
        toolSessions: sessions.length,
        studyMinutes: totalMinutes,
        topConcepts,
        toolsUsed: [...new Set(sessions.map(s => s.tool.name))].slice(0, 5),
      },
    },
  })
}

export async function updateWeeklyJournal(
  userId: string,
  journalId: string,
  data: { biggestInsight?: string; biggestChallenge?: string; nextWeekFocus?: string; freeform?: string },
) {
  const journal = await prisma.weeklyJournal.findFirst({ where: { id: journalId, userId } })
  if (!journal) return null

  return prisma.weeklyJournal.update({
    where: { id: journalId },
    data: {
      ...(data.biggestInsight !== undefined ? { biggestInsight: data.biggestInsight } : {}),
      ...(data.biggestChallenge !== undefined ? { biggestChallenge: data.biggestChallenge } : {}),
      ...(data.nextWeekFocus !== undefined ? { nextWeekFocus: data.nextWeekFocus } : {}),
      ...(data.freeform !== undefined ? { freeform: data.freeform } : {}),
    },
  })
}

export async function listJournals(userId: string, limit = 10) {
  return prisma.weeklyJournal.findMany({
    where: { userId },
    orderBy: { weekOf: 'desc' },
    take: limit,
  })
}

// ── Growth Comparison ───────────────────────────────────────────────────

export async function getGrowthComparison(userId: string, concept: string) {
  const mastery = await prisma.studentConceptMastery.findUnique({
    where: { userId_concept: { userId, concept } },
  })

  const sessions = await prisma.toolSession.findMany({
    where: { userId, conceptsTouched: { has: concept }, score: { not: null } },
    orderBy: { startedAt: 'asc' },
    select: { score: true, startedAt: true, tool: { select: { name: true } } },
  })

  return {
    concept,
    mastery: mastery ? {
      level: mastery.masteryLevel,
      encounters: mastery.encounterCount,
      successes: mastery.successCount,
      firstSeen: mastery.firstSeenAt,
      lastSeen: mastery.lastSeenAt,
    } : null,
    scoreTimeline: sessions.map(s => ({
      score: s.score,
      date: s.startedAt,
      tool: s.tool.name,
    })),
  }
}

export async function getTopGrowthConcepts(userId: string) {
  return prisma.studentConceptMastery.findMany({
    where: { userId, encounterCount: { gte: 3 } },
    orderBy: { masteryLevel: 'desc' },
    take: 5,
    select: { concept: true, masteryLevel: true, encounterCount: true, successCount: true },
  })
}

// ── Sandy Context for Reflect ───────────────────────────────────────────

export async function getReflectionContextForSandy(userId: string): Promise<string> {
  const [recentReflections, calibration, topGrowth] = await Promise.all([
    prisma.learningReflection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { content: true, trigger: true, concept: true, createdAt: true },
    }),
    getCalibrationSummary(userId),
    getTopGrowthConcepts(userId),
  ])

  if (recentReflections.length === 0 && calibration.totalChecks === 0) return ''

  const parts: string[] = ['## STUDENT METACOGNITION']

  if (recentReflections.length > 0) {
    parts.push('Recent reflections:')
    recentReflections.forEach(r => {
      parts.push(`- ${r.content.slice(0, 100)}${r.content.length > 100 ? '...' : ''} (${r.trigger})`)
    })
  }

  if (calibration.totalChecks > 0) {
    parts.push(`\nConfidence calibration: ${calibration.tendency} (avg delta: ${calibration.avgDelta}, ${calibration.totalChecks} checks)`)
  }

  if (topGrowth.length > 0) {
    parts.push(`\nStrongest growth concepts: ${topGrowth.map(c => `${c.concept} (${Math.round(c.masteryLevel * 100)}%)`).join(', ')}`)
  }

  return parts.join('\n')
}
