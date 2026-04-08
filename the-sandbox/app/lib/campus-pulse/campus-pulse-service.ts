/**
 * Campus Pulse Early Warning — Service Layer
 *
 * Orchestrates: scan → correlate → summarize → persist → query.
 * All business logic for PulseEvent CRUD, acknowledge, resolve.
 */

import { prisma } from '../prisma'
import type { Prisma } from '../../generated/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { runCorrelationScan } from './correlation-engine'
import {
  classifySeverity,
  severityRank,
  extractKeywords,
  keywordOverlap,
} from './types'
import type { CorrelationResult, PulseSeverity, PulseEventData } from './types'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// ---------------------------------------------------------------------------
// Pulse Scan (called by cron or manual trigger)
// ---------------------------------------------------------------------------

export async function runPulseScan(): Promise<{
  newEvents: number
  updatedEvents: number
  totalActive: number
}> {
  const correlations = await runCorrelationScan(48)

  let newEvents = 0
  let updatedEvents = 0

  for (const correlation of correlations) {
    const existing = await findExistingEvent(correlation.theme)

    if (existing) {
      await updatePulseEvent(existing.id, correlation)
      updatedEvents++
    } else {
      await createPulseEvent(correlation)
      newEvents++
    }
  }

  // Auto-resolve stale events (no new signals in 72h)
  await resolveStaleEvents()

  const totalActive = await prisma.pulseEvent.count({
    where: { status: 'active' },
  })

  return { newEvents, updatedEvents, totalActive }
}

// ---------------------------------------------------------------------------
// Public Query Functions
// ---------------------------------------------------------------------------

export async function getActiveEvents(options?: {
  severity?: string
  role?: string
  limit?: number
  status?: string
}): Promise<PulseEventData[]> {
  const statusFilter = options?.status || 'active'
  return prisma.pulseEvent.findMany({
    where: {
      status: statusFilter,
      ...(options?.severity && { severity: options.severity }),
      ...(options?.role && { affectedRoles: { has: options.role } }),
    },
    include: { signals: true },
    orderBy: [{ detectedAt: 'desc' }],
    take: options?.limit || 20,
  }) as unknown as PulseEventData[]
}

export async function getAllEvents(options?: {
  severity?: string
  status?: string
  limit?: number
}): Promise<PulseEventData[]> {
  return prisma.pulseEvent.findMany({
    where: {
      ...(options?.severity && { severity: options.severity }),
      ...(options?.status && { status: options.status }),
    },
    include: { signals: true },
    orderBy: [{ detectedAt: 'desc' }],
    take: options?.limit || 50,
  }) as unknown as PulseEventData[]
}

export async function getEventById(eventId: string): Promise<PulseEventData | null> {
  return prisma.pulseEvent.findUnique({
    where: { id: eventId },
    include: { signals: true },
  }) as unknown as PulseEventData | null
}

export async function acknowledgeEvent(eventId: string, userId: string): Promise<void> {
  await prisma.pulseEvent.update({
    where: { id: eventId },
    data: {
      status: 'acknowledged',
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    },
  })
}

export async function resolveEvent(eventId: string, userId: string, note: string): Promise<void> {
  await prisma.pulseEvent.update({
    where: { id: eventId },
    data: {
      status: 'resolved',
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolvedNote: note,
    },
  })
}

export async function markFalseAlarm(eventId: string, userId: string): Promise<void> {
  await prisma.pulseEvent.update({
    where: { id: eventId },
    data: {
      status: 'false-alarm',
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolvedNote: 'Marked as false alarm',
    },
  })
}

/**
 * Get KPI counts for the dashboard header strip.
 */
export async function getPulseKpis(): Promise<{
  active: number
  critical: number
  high: number
  resolvedThisWeek: number
}> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [active, critical, high, resolvedThisWeek] = await Promise.all([
    prisma.pulseEvent.count({ where: { status: 'active' } }),
    prisma.pulseEvent.count({ where: { status: 'active', severity: 'critical' } }),
    prisma.pulseEvent.count({ where: { status: 'active', severity: 'high' } }),
    prisma.pulseEvent.count({
      where: {
        status: { in: ['resolved', 'false-alarm'] },
        resolvedAt: { gte: weekAgo },
      },
    }),
  ])

  return { active, critical, high, resolvedThisWeek }
}

// ---------------------------------------------------------------------------
// Integration Hooks (for external consumers — Sandy, briefing, etc.)
// ---------------------------------------------------------------------------

/**
 * Get a compact pulse context string for Sandy's system prompt.
 */
export async function buildPulseContext(userRole: string): Promise<string | null> {
  const events = await getActiveEvents({ role: userRole, limit: 3 })
  if (events.length === 0) return null

  const lines = events.map(
    e => `- [${e.severity.toUpperCase()}] "${e.theme}": ${e.summary}`,
  )

  return [
    'Active campus concerns detected by multi-signal intelligence:',
    ...lines,
  ].join('\n')
}

/**
 * Get pulse alerts for a faculty member's courses (briefing integration).
 */
export async function getPulseAlertsForCourses(
  courseIds: string[],
): Promise<Array<{ theme: string; severity: string; summary: string; signalCount: number }>> {
  if (courseIds.length === 0) return []

  const events = await prisma.pulseEvent.findMany({
    where: {
      status: 'active',
      affectedCourses: { hasSome: courseIds },
    },
    include: { signals: true },
    orderBy: { detectedAt: 'desc' },
    take: 3,
  })

  return events.map(e => ({
    theme: e.theme,
    severity: e.severity,
    summary: e.summary,
    signalCount: e.signals.length,
  }))
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

async function createPulseEvent(correlation: CorrelationResult): Promise<void> {
  const severity = classifySeverity(correlation.signals)
  const { summary, suggestedActions } = await generateEventIntelligence(correlation)
  const affectedRoles = deriveAffectedRoles(correlation.signals)
  const affectedCourses = deriveAffectedCourses(correlation.signals)

  await prisma.pulseEvent.create({
    data: {
      theme: correlation.theme,
      severity,
      summary,
      suggestedActions,
      affectedRoles,
      affectedCourses,
      signals: {
        create: correlation.signals.map(s => ({
          stream: s.stream,
          evidence: s.evidence,
          dataPoints: s.dataPoints,
          strength: s.strength,
          firstSeen: s.firstSeen,
          lastSeen: s.lastSeen,
          sourceIds: s.sourceIds,
          metadata: (s.metadata ?? {}) as Prisma.InputJsonValue,
        })),
      },
    },
  })
}

async function updatePulseEvent(eventId: string, correlation: CorrelationResult): Promise<void> {
  const severity = classifySeverity(correlation.signals)

  // Add new signals (avoid duplicates by stream + sourceId overlap)
  const existingSignals = await prisma.pulseSignal.findMany({
    where: { eventId },
    select: { stream: true, sourceIds: true },
  })

  for (const signal of correlation.signals) {
    const isDuplicate = existingSignals.some(
      es =>
        es.stream === signal.stream &&
        signal.sourceIds.some(id => es.sourceIds.includes(id)),
    )
    if (!isDuplicate) {
      await prisma.pulseSignal.create({
        data: {
          eventId,
          stream: signal.stream,
          evidence: signal.evidence,
          dataPoints: signal.dataPoints,
          strength: signal.strength,
          firstSeen: signal.firstSeen,
          lastSeen: signal.lastSeen,
          sourceIds: signal.sourceIds,
          metadata: (signal.metadata ?? {}) as Prisma.InputJsonValue,
        },
      })
    }
  }

  // Upgrade severity if warranted (never downgrade)
  const currentEvent = await prisma.pulseEvent.findUnique({
    where: { id: eventId },
    select: { severity: true },
  })

  const currentSev = (currentEvent?.severity ?? 'low') as PulseSeverity
  if (severityRank(severity) > severityRank(currentSev)) {
    await prisma.pulseEvent.update({
      where: { id: eventId },
      data: { severity, escalatedAt: new Date() },
    })
  }
}

async function findExistingEvent(theme: string): Promise<{ id: string } | null> {
  const active = await prisma.pulseEvent.findMany({
    where: { status: 'active' },
    select: { id: true, theme: true },
  })

  const themeKeywords = extractKeywords(theme)
  for (const event of active) {
    const eventKeywords = extractKeywords(event.theme)
    if (keywordOverlap(themeKeywords, eventKeywords) >= 0.4) {
      return { id: event.id }
    }
  }

  return null
}

async function resolveStaleEvents(): Promise<void> {
  const staleThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000)

  await prisma.pulseEvent.updateMany({
    where: {
      status: 'active',
      updatedAt: { lt: staleThreshold },
    },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedNote: 'Auto-resolved: no new signals in 72 hours',
    },
  })
}

async function generateEventIntelligence(
  correlation: CorrelationResult,
): Promise<{ summary: string; suggestedActions: string[] }> {
  const signalDescriptions = correlation.signals
    .map(s => `- [${s.stream}] ${s.evidence}`)
    .join('\n')

  try {
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 300,
      system:
        'You are an institutional intelligence analyst for the University of Kentucky. Given converging signals from multiple data streams, produce a concise 2-sentence summary of the emerging situation and 2-4 suggested actions. Be specific and actionable. Output JSON: { "summary": "...", "suggestedActions": ["...", "..."] }',
      messages: [
        {
          role: 'user',
          content: `Theme: "${correlation.theme}"\nCorrelation score: ${correlation.correlationScore.toFixed(2)}\n\nConverging signals:\n${signalDescriptions}\n\nGenerate intelligence summary and actions.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)
    return {
      summary: parsed.summary || 'Multiple signals converging around this theme.',
      suggestedActions: parsed.suggestedActions || ['Monitor situation', 'Review source data'],
    }
  } catch {
    return {
      summary: `${correlation.signals.length} signals converging around "${correlation.theme}" across ${new Set(correlation.signals.map(s => s.stream)).size} data streams.`,
      suggestedActions: ['Review source data', 'Monitor for escalation'],
    }
  }
}

function deriveAffectedRoles(signals: CorrelationResult['signals']): string[] {
  const roles = new Set<string>()

  for (const signal of signals) {
    switch (signal.stream) {
      case 'at-risk':
      case 'submissions':
        roles.add('STUDENT')
        roles.add('EDUCATOR')
        break
      case 'email-urgency':
        roles.add('EDUCATOR')
        roles.add('STAFF')
        break
      case 'office-hours':
      case 'course-posts':
        roles.add('STUDENT')
        roles.add('EDUCATOR')
        break
      case 'uknow':
      case 'policy':
      case 'sentiment':
        roles.add('ADMIN')
        roles.add('STAFF')
        roles.add('EDUCATOR')
        break
    }
  }

  return Array.from(roles)
}

function deriveAffectedCourses(signals: CorrelationResult['signals']): string[] {
  const courseIds = new Set<string>()

  for (const signal of signals) {
    const courseId = (signal.metadata as Record<string, unknown>)?.courseId
    if (typeof courseId === 'string') {
      courseIds.add(courseId)
    }
  }

  return Array.from(courseIds)
}
