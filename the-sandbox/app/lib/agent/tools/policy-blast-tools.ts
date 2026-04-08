/**
 * Sandy Universal Agent — Policy Blast Radius Tools
 *
 * 1 tool: check_policy_impact
 *
 * NOTE: Not yet registered in tool-registry.ts — integration merge will import this.
 */

import type { ToolModule } from '../agent-types'
import { prisma } from '../../prisma'
import { analyzeImpact } from '../../policy-blast/impact-analyzer'

export const policyBlastTools: ToolModule = {
  tools: [
    {
      name: 'check_policy_impact',
      description:
        'Check what courses, faculty, and students are affected by a policy change. Returns impact counts, conflicts, and suggested actions. For admin and staff use.',
      category: 'analytics',
      permission: 'auto',
      roles: ['ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {
          policyTitle: {
            type: 'string',
            description: 'Name or keyword of the policy to analyze',
          },
        },
        required: ['policyTitle'],
      },
    },
  ],

  handlers: {
    async check_policy_impact(args) {
      try {
        const policyTitle = args.policyTitle as string
        if (!policyTitle) return { error: 'policyTitle is required' }

        const policy = await prisma.policyDocument.findFirst({
          where: { title: { contains: policyTitle, mode: 'insensitive' } },
        })
        if (!policy) return { message: `No policy found matching "${policyTitle}"` }

        const report = await analyzeImpact(policy.id)

        return {
          policy: policy.title,
          policyNumber: policy.policyNumber,
          severity: report.severity,
          affectedCourses: report.affectedCourses,
          affectedFaculty: report.affectedFaculty,
          affectedStudents: report.affectedStudents,
          conflictingAIPolicies: report.conflictingAIPolicies,
          triggeredCompliance: report.triggeredCompliance,
          activePetitions: report.activePetitions,
          conflicts: report.impacts.filter((i) => i.severity === 'conflict').length,
          suggestedActions: report.suggestedActions,
        }
      } catch (err) {
        return { error: (err as Error).message }
      }
    },
  },
}
