/**
 * Sandy Universal Agent — Accreditation Autopilot Tools
 *
 * 4 tools: get_accreditation_readiness, get_compliance_gaps,
 *          generate_compliance_narrative, simulate_peer_review
 */

import type { ToolModule } from '../agent-types'
import { getComplianceDashboard, getActiveCycle, buildSandyAccreditationContext } from '../../accreditation/dashboard-service'
import { prisma } from '../../prisma'
import { generateAndSaveNarrative } from '../../accreditation/narrative-generator'
import { generatePeerReviewQuestions } from '../../accreditation/peer-review-prep'

export const accreditationTools: ToolModule = {
  tools: [
    {
      name: 'get_accreditation_readiness',
      description:
        'Get overall accreditation readiness status including standards met, gaps, timeline, and compliance score. For admin use.',
      category: 'analytics',
      permission: 'auto',
      roles: ['ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_compliance_gaps',
      description:
        'List current compliance gaps sorted by severity. Shows missing evidence, remediation suggestions, and estimated effort. For admin/staff use.',
      category: 'analytics',
      permission: 'auto',
      roles: ['ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['critical', 'major', 'minor', 'all'],
            description: 'Filter by severity level',
          },
        },
      },
    },
    {
      name: 'generate_compliance_narrative',
      description:
        'Generate an AI draft compliance narrative for a specific SACSCOC standard. Creates a formal compliance argument using collected evidence. Admin only.',
      category: 'content',
      permission: 'confirm',
      roles: ['ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          standardNumber: {
            type: 'string',
            description: 'SACSCOC standard number (e.g., "8.2a", "12.1")',
          },
        },
        required: ['standardNumber'],
      },
    },
    {
      name: 'simulate_peer_review',
      description:
        'Generate simulated peer reviewer questions based on current compliance state. Returns 8-12 questions with difficulty ratings and suggested responses. Admin only.',
      category: 'content',
      permission: 'auto',
      roles: ['ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
  ],

  handlers: {
    async get_accreditation_readiness() {
      try {
        const cycle = await getActiveCycle()
        if (!cycle) return { error: 'No active accreditation cycle found' }

        const dashboard = await getComplianceDashboard(cycle.id)
        return {
          cycleName: dashboard.cycleName,
          phase: dashboard.phase,
          readiness: `${Math.round(dashboard.overallReadiness * 100)}%`,
          standardsMet: dashboard.standardsSummary.met,
          standardsPartial: dashboard.standardsSummary.partial,
          standardsGapped: dashboard.standardsSummary.gapped,
          standardsTotal: dashboard.standardsSummary.total,
          criticalGaps: dashboard.gapSummary.critical,
          majorGaps: dashboard.gapSummary.major,
          daysUntilSiteVisit: dashboard.daysUntilSiteVisit,
          narrativesApproved: dashboard.narrativeSummary.approved + dashboard.narrativeSummary.final,
          narrativesTotal: dashboard.standardsSummary.total,
        }
      } catch (err) {
        return { error: (err as Error).message }
      }
    },

    async get_compliance_gaps(args) {
      try {
        const cycle = await getActiveCycle()
        if (!cycle) return { error: 'No active accreditation cycle found' }

        const severity = (args.severity as string) ?? 'all'
        const where: Record<string, unknown> = {
          cycleId: cycle.id,
          remediationStatus: { not: 'resolved' },
        }
        if (severity !== 'all') where.severity = severity

        const gaps = await prisma.complianceGap.findMany({
          where,
          include: { standard: { select: { standardNumber: true, standardTitle: true } } },
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
          take: 20,
        })

        return {
          totalGaps: gaps.length,
          gaps: gaps.map(g => ({
            standard: g.standard.standardNumber,
            title: g.title,
            severity: g.severity,
            estimatedEffort: g.estimatedEffort,
            status: g.remediationStatus,
            suggestedActions: (g.suggestedActions as { action: string }[]).map(a => a.action),
          })),
        }
      } catch (err) {
        return { error: (err as Error).message }
      }
    },

    async generate_compliance_narrative(args) {
      try {
        const standardNumber = args.standardNumber as string
        if (!standardNumber) return { error: 'standardNumber is required' }

        const cycle = await getActiveCycle()
        if (!cycle) return { error: 'No active accreditation cycle found' }

        const standard = await prisma.accreditationStandard.findFirst({
          where: { standardNumber, isActive: true },
        })
        if (!standard) return { error: `Standard ${standardNumber} not found` }

        const result = await generateAndSaveNarrative(standard.id, cycle.id)

        return {
          standard: standardNumber,
          version: result.version,
          confidenceScore: `${Math.round(result.confidenceScore * 100)}%`,
          message: `Draft narrative v${result.version} generated for Standard ${standardNumber}. Review it at /accreditation/narratives.`,
        }
      } catch (err) {
        return { error: (err as Error).message }
      }
    },

    async simulate_peer_review() {
      try {
        const cycle = await getActiveCycle()
        if (!cycle) return { error: 'No active accreditation cycle found' }

        const questions = await generatePeerReviewQuestions(cycle.id)
        return {
          questionCount: questions.length,
          questions: questions.map(q => ({
            standard: q.standard,
            question: q.question,
            difficulty: q.difficulty,
            suggestedResponse: q.suggestedResponse,
          })),
        }
      } catch (err) {
        return { error: (err as Error).message }
      }
    },
  },
}
