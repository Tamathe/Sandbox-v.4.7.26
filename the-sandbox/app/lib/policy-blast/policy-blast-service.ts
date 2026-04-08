/**
 * Policy Blast Radius — Report CRUD Service
 *
 * Create, list, get, and resolve policy impact reports.
 * Integration hooks exported for use by other systems.
 */

import { prisma } from '../prisma'
import { analyzeImpact } from './impact-analyzer'
import type { PolicyImpactReportSummary, PolicyImpactReportFull } from './types'

// ── Create Report ────────────────────────────────────────────────────────────

export async function createImpactReport(
  policyId: string,
  generatedBy: string,
  changeDescription?: string,
): Promise<PolicyImpactReportFull> {
  const data = await analyzeImpact(policyId, changeDescription)

  const report = await prisma.policyImpactReport.create({
    data: {
      policyId: data.policyId,
      generatedBy,
      changeDescription: data.changeDescription,
      severity: data.severity,
      affectedCourses: data.affectedCourses,
      affectedFaculty: data.affectedFaculty,
      affectedStudents: data.affectedStudents,
      conflictingAIPolicies: data.conflictingAIPolicies,
      triggeredCompliance: data.triggeredCompliance,
      activePetitions: data.activePetitions,
      suggestedActions: data.suggestedActions,
      impacts: {
        create: data.impacts.map((i) => ({
          impactType: i.impactType,
          targetId: i.targetId,
          targetLabel: i.targetLabel,
          description: i.description,
          severity: i.severity,
          actionNeeded: i.actionNeeded ?? null,
        })),
      },
    },
    include: {
      policy: {
        select: { id: true, title: true, policyNumber: true, category: true },
      },
      impacts: true,
    },
  })

  return serializeReportFull(report)
}

// ── List Reports ─────────────────────────────────────────────────────────────

export async function getImpactReports(options?: {
  status?: string
  limit?: number
}): Promise<PolicyImpactReportSummary[]> {
  const where: Record<string, unknown> = {}
  if (options?.status) where.status = options.status

  const reports = await prisma.policyImpactReport.findMany({
    where,
    include: {
      policy: { select: { title: true, policyNumber: true } },
    },
    orderBy: { generatedAt: 'desc' },
    take: options?.limit ?? 50,
  })

  return reports.map((r) => ({
    id: r.id,
    policyId: r.policyId,
    policyTitle: r.policy.title,
    policyNumber: r.policy.policyNumber,
    generatedAt: r.generatedAt.toISOString(),
    severity: r.severity,
    affectedCourses: r.affectedCourses,
    affectedFaculty: r.affectedFaculty,
    affectedStudents: r.affectedStudents,
    conflictingAIPolicies: r.conflictingAIPolicies,
    triggeredCompliance: r.triggeredCompliance,
    activePetitions: r.activePetitions,
    status: r.status,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }))
}

// ── Get Single Report ────────────────────────────────────────────────────────

export async function getImpactReport(
  reportId: string,
): Promise<PolicyImpactReportFull | null> {
  const report = await prisma.policyImpactReport.findUnique({
    where: { id: reportId },
    include: {
      policy: {
        select: { id: true, title: true, policyNumber: true, category: true },
      },
      impacts: {
        orderBy: [{ severity: 'asc' }, { impactType: 'asc' }],
      },
    },
  })

  if (!report) return null
  return serializeReportFull(report)
}

// ── Resolve Report ───────────────────────────────────────────────────────────

export async function resolveImpactReport(reportId: string): Promise<PolicyImpactReportFull> {
  const report = await prisma.policyImpactReport.update({
    where: { id: reportId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
    },
    include: {
      policy: {
        select: { id: true, title: true, policyNumber: true, category: true },
      },
      impacts: true,
    },
  })

  return serializeReportFull(report)
}

// ── Integration Hooks (for external systems) ─────────────────────────────────

/**
 * Quick impact check for a policy — returns counts only, no persistence.
 * Used by Sandy tool and proactive suggestions.
 */
export { analyzeImpact } from './impact-analyzer'

// ── Serialization ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeReportFull(report: any): PolicyImpactReportFull {
  return {
    id: report.id,
    policyId: report.policyId,
    policy: report.policy,
    generatedAt: report.generatedAt.toISOString(),
    generatedBy: report.generatedBy,
    changeDescription: report.changeDescription,
    severity: report.severity,
    affectedCourses: report.affectedCourses,
    affectedFaculty: report.affectedFaculty,
    affectedStudents: report.affectedStudents,
    conflictingAIPolicies: report.conflictingAIPolicies,
    triggeredCompliance: report.triggeredCompliance,
    activePetitions: report.activePetitions,
    impacts: report.impacts.map((i: Record<string, unknown>) => ({
      id: i.id,
      impactType: i.impactType,
      targetId: i.targetId,
      targetLabel: i.targetLabel,
      description: i.description,
      severity: i.severity,
      actionNeeded: i.actionNeeded ?? null,
    })),
    suggestedActions: report.suggestedActions,
    status: report.status,
    resolvedAt: report.resolvedAt
      ? (report.resolvedAt as Date).toISOString()
      : null,
  }
}
