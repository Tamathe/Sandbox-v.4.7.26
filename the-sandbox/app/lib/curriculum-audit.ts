/**
 * Curriculum Audit Engine
 *
 * Four detectors scan a course's data and produce CurriculumAuditAlert rows.
 * Haiku generates human-readable narratives for each alert in batches of ≤8.
 *
 * Detectors:
 *   1. detectConceptGaps     — objectives with <20% mastery cohort-wide
 *   2. detectToolFatigue     — same tool used >4× per student/week with declining score
 *   3. detectAssessmentDrift — avg scores declining ≥15% over last 3 weeks
 *   4. detectEngagementCliff — >30% drop in session starts vs prior equivalent period
 *
 * Called by: /api/cron/curriculum-audit  (nightly)
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import type { AuditAlertType, AlertSeverity } from '../generated/prisma'
import { Prisma } from '../generated/prisma'

const anthropic = new Anthropic()

// ── Types ─────────────────────────────────────────────────────────────────────

interface DetectorResult {
  alertType: AuditAlertType
  severity: AlertSeverity
  title: string
  dataSnapshot: Record<string, unknown>
  objectiveId?: string
  toolId?: string
}

// ── 1. Concept Gap Detector ───────────────────────────────────────────────────

/**
 * Fires when an objective has <20% of enrolled students at mastery = "mastered".
 * Severity: HIGH if <10%, MEDIUM if 10–19%, LOW otherwise (unreachable in this fn).
 */
export async function detectConceptGaps(courseId: string): Promise<DetectorResult[]> {
  const [enrollment, objectives] = await Promise.all([
    prisma.courseEnrollment.count({ where: { courseId } }),
    prisma.learningObjective.findMany({
      where: { courseId },
      select: { id: true, title: true },
    }),
  ])
  if (enrollment === 0 || objectives.length === 0) return []

  const masteryGroups = await prisma.studentObjectiveProgress.groupBy({
    by: ['objectiveId', 'masteryLevel'],
    where: { courseId },
    _count: { id: true },
  })

  const masteredByObjective = new Map<string, number>()
  for (const row of masteryGroups) {
    if (row.masteryLevel === 'mastered') {
      masteredByObjective.set(row.objectiveId, row._count.id)
    }
  }

  const results: DetectorResult[] = []
  for (const obj of objectives) {
    const mastered = masteredByObjective.get(obj.id) ?? 0
    const rate = mastered / enrollment
    if (rate >= 0.2) continue

    const severity: AlertSeverity = rate < 0.1 ? 'HIGH' : 'MEDIUM'
    results.push({
      alertType: 'CONCEPT_GAP',
      severity,
      title: `Low mastery on "${obj.title.slice(0, 60)}"`,
      dataSnapshot: {
        objectiveTitle: obj.title,
        masteredCount: mastered,
        enrolledCount: enrollment,
        masteryRate: Math.round(rate * 100) / 100,
      },
      objectiveId: obj.id,
    })
  }
  return results
}

// ── 2. Tool Fatigue Detector ──────────────────────────────────────────────────

/**
 * Fires when a tool is used >4× per student per week AND the avg score for
 * that tool has declined ≥10% from the prior week in this course.
 */
export async function detectToolFatigue(courseId: string): Promise<DetectorResult[]> {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 86_400_000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000)

  const enrollment = await prisma.courseEnrollment.count({ where: { courseId } })
  if (enrollment === 0) return []

  // Sessions this week vs last week per tool
  const [thisWeek, lastWeek] = await Promise.all([
    prisma.toolSession.groupBy({
      by: ['toolId'],
      where: { courseId, startedAt: { gte: oneWeekAgo }, sensitiveSession: false },
      _count: { id: true },
      _avg: { score: true },
    }),
    prisma.toolSession.groupBy({
      by: ['toolId'],
      where: {
        courseId,
        startedAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        sensitiveSession: false,
      },
      _count: { id: true },
      _avg: { score: true },
    }),
  ])

  const lastWeekMap = new Map(lastWeek.map((r) => [r.toolId, r]))

  // Load tool names for any candidates
  const candidateToolIds = thisWeek
    .filter((r) => r._count.id / enrollment > 4)
    .map((r) => r.toolId)
  if (candidateToolIds.length === 0) return []

  const tools = await prisma.tool.findMany({
    where: { id: { in: candidateToolIds } },
    select: { id: true, name: true },
  })
  const toolMap = new Map(tools.map((t) => [t.id, t.name]))

  const results: DetectorResult[] = []
  for (const row of thisWeek) {
    const usagePerStudent = row._count.id / enrollment
    if (usagePerStudent <= 4) continue

    const prior = lastWeekMap.get(row.toolId)
    const currentAvg = row._avg.score ?? null
    const priorAvg = prior?._avg.score ?? null

    let scoreDrop = 0
    if (currentAvg !== null && priorAvg !== null && priorAvg > 0) {
      scoreDrop = (priorAvg - currentAvg) / priorAvg
    }

    if (scoreDrop < 0.1) continue  // <10% drop — not fatigue

    const severity: AlertSeverity = scoreDrop >= 0.25 ? 'HIGH' : scoreDrop >= 0.15 ? 'MEDIUM' : 'LOW'
    const toolName = toolMap.get(row.toolId) ?? row.toolId
    results.push({
      alertType: 'TOOL_FATIGUE',
      severity,
      title: `Fatigue signal on "${toolName.slice(0, 50)}"`,
      dataSnapshot: {
        toolName,
        usagePerStudent: Math.round(usagePerStudent * 10) / 10,
        currentWeekSessions: row._count.id,
        currentAvgScore: currentAvg,
        priorAvgScore: priorAvg,
        scoreDropPct: Math.round(scoreDrop * 100),
      },
      toolId: row.toolId,
    })
  }
  return results
}

// ── 3. Assessment Drift Detector ──────────────────────────────────────────────

/**
 * Fires when the weekly average ToolSession.score has declined ≥15% comparing
 * week 3 back to week 1 (oldest to newest).
 */
export async function detectAssessmentDrift(courseId: string): Promise<DetectorResult[]> {
  const now = new Date()

  // 3 contiguous 7-day buckets ending now
  const windows = [
    { start: new Date(now.getTime() - 21 * 86_400_000), end: new Date(now.getTime() - 14 * 86_400_000) },
    { start: new Date(now.getTime() - 14 * 86_400_000), end: new Date(now.getTime() - 7 * 86_400_000) },
    { start: new Date(now.getTime() - 7 * 86_400_000), end: now },
  ]

  const weeklyAvgs = await Promise.all(
    windows.map(({ start, end }) =>
      prisma.toolSession.aggregate({
        where: {
          courseId,
          startedAt: { gte: start, lt: end },
          score: { not: null },
          sensitiveSession: false,
        },
        _avg: { score: true },
        _count: { id: true },
      }),
    ),
  )

  // Need at least 3 sessions per week to be meaningful
  const avgs = weeklyAvgs.map((w) => (w._count.id >= 3 ? (w._avg.score ?? null) : null))
  const [wk1, , wk3] = avgs  // oldest, middle, newest

  if (wk1 === null || wk3 === null || wk1 === 0) return []

  const drift = (wk1 - wk3) / wk1
  if (drift < 0.15) return []  // < 15% decline — fine

  const severity: AlertSeverity = drift >= 0.30 ? 'HIGH' : drift >= 0.20 ? 'MEDIUM' : 'LOW'
  return [
    {
      alertType: 'ASSESSMENT_DRIFT',
      severity,
      title: `Score decline of ${Math.round(drift * 100)}% over 3 weeks`,
      dataSnapshot: {
        week1Avg: wk1,
        week2Avg: avgs[1],
        week3Avg: wk3,
        driftPct: Math.round(drift * 100),
        sessionsPerWeek: weeklyAvgs.map((w) => w._count.id),
      },
    },
  ]
}

// ── 4. Engagement Cliff Detector ──────────────────────────────────────────────

/**
 * Fires when this week's session count is >30% lower than the prior week's.
 * Uses raw counts (not per-student) to catch cohort-wide disengagement.
 */
export async function detectEngagementCliff(courseId: string): Promise<DetectorResult[]> {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 86_400_000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000)

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.toolSession.count({
      where: { courseId, startedAt: { gte: oneWeekAgo }, sensitiveSession: false },
    }),
    prisma.toolSession.count({
      where: {
        courseId,
        startedAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        sensitiveSession: false,
      },
    }),
  ])

  if (lastWeek < 5) return []  // too sparse to be meaningful
  const drop = (lastWeek - thisWeek) / lastWeek
  if (drop < 0.30) return []

  const severity: AlertSeverity = drop >= 0.60 ? 'HIGH' : drop >= 0.45 ? 'MEDIUM' : 'LOW'
  return [
    {
      alertType: 'ENGAGEMENT_CLIFF',
      severity,
      title: `Session volume dropped ${Math.round(drop * 100)}% vs last week`,
      dataSnapshot: {
        thisWeekSessions: thisWeek,
        lastWeekSessions: lastWeek,
        dropPct: Math.round(drop * 100),
      },
    },
  ]
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * Run all four detectors for a course, deduplicate against still-open alerts,
 * persist new alerts (without narratives), then generate narratives in batches.
 *
 * Returns the IDs of newly created alerts.
 */
export async function runCurriculumAudit(courseId: string): Promise<string[]> {
  // 1. Run all detectors in parallel
  const [gaps, fatigue, drift, cliff] = await Promise.all([
    detectConceptGaps(courseId),
    detectToolFatigue(courseId),
    detectAssessmentDrift(courseId),
    detectEngagementCliff(courseId),
  ])

  const candidates = [...gaps, ...fatigue, ...drift, ...cliff]
  if (candidates.length === 0) return []

  // 2. Fetch still-open alerts of same type for this course to avoid duplicates
  const openAlerts = await prisma.curriculumAuditAlert.findMany({
    where: { courseId, resolvedAt: null },
    select: { alertType: true, objectiveId: true, toolId: true },
  })

  const openKey = (
    type: AuditAlertType,
    objectiveId?: string | null,
    toolId?: string | null,
  ) => `${type}:${objectiveId ?? ''}:${toolId ?? ''}`
  const openSet = new Set(openAlerts.map((a) => openKey(a.alertType, a.objectiveId, a.toolId)))

  // 3. Filter to only net-new alerts
  const newAlerts = candidates.filter(
    (c) => !openSet.has(openKey(c.alertType, c.objectiveId, c.toolId)),
  )
  if (newAlerts.length === 0) return []

  // 4. Persist (narrative left empty — filled by generateAlertNarratives)
  const created = await Promise.all(
    newAlerts.map((alert) =>
      prisma.curriculumAuditAlert.create({
        data: {
          courseId,
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          narrative: '',  // filled by generateAlertNarratives
          dataSnapshot: alert.dataSnapshot as Prisma.InputJsonValue,
          objectiveId: alert.objectiveId ?? null,
          toolId: alert.toolId ?? null,
        },
        select: { id: true },
      }),
    ),
  )

  const newIds = created.map((c) => c.id)

  // 5. Generate narratives for new alerts (batched, ≤8 per call)
  for (let i = 0; i < newIds.length; i += 8) {
    await generateAlertNarratives(newIds.slice(i, i + 8))
  }

  return newIds
}

// ── Narrative Generator ───────────────────────────────────────────────────────

/**
 * Generate educator-facing narrative text for up to 8 CurriculumAuditAlerts in
 * a single Haiku call.  Writes the narrative back to each alert row.
 *
 * Cost estimate: ~8 alerts × ~50 tokens each = ~400 tokens output ≈ $0.00013/call
 */
export async function generateAlertNarratives(alertIds: string[]): Promise<void> {
  if (alertIds.length === 0) return
  const alerts = await prisma.curriculumAuditAlert.findMany({
    where: { id: { in: alertIds } },
    select: { id: true, alertType: true, severity: true, title: true, dataSnapshot: true },
  })
  if (alerts.length === 0) return

  const alertsText = alerts
    .map(
      (a, i) =>
        `ALERT ${i + 1} [${a.alertType} / ${a.severity}]\nTitle: ${a.title}\nData: ${JSON.stringify(a.dataSnapshot)}`,
    )
    .join('\n\n')

  const prompt = `You are an AI assistant helping a university professor understand curriculum analytics alerts. Write a concise, action-oriented narrative for each alert below. Each narrative should:
- Be 2–3 sentences maximum
- Explain what the data is showing in plain language
- End with one concrete suggestion the educator could act on
- Avoid jargon; assume a non-technical faculty audience

${alertsText}

Respond with ONLY valid JSON — an array of objects in the SAME ORDER as the alerts above:
[{"id": 1, "narrative": "..."},{"id": 2, "narrative": "..."}, ...]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const parsed = JSON.parse(text.trim()) as Array<{ id: number; narrative: string }>

    await Promise.all(
      parsed.map(({ id: idx, narrative }) => {
        const alert = alerts[idx - 1]
        if (!alert || typeof narrative !== 'string') return
        return prisma.curriculumAuditAlert.update({
          where: { id: alert.id },
          data: { narrative: narrative.trim() },
        })
      }),
    )
  } catch (err) {
    console.error('[curriculum-audit] generateAlertNarratives failed:', err)
    // Non-fatal — alerts still exist, just without narratives
  }
}
