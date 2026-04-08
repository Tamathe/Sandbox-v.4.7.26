/**
 * Sandy Universal Agent — Curriculum Intelligence Network Tools
 *
 * 1 tool: query_curriculum_network
 */

import type { ToolModule } from '../agent-types'
import { getInsights, getNodeDetail } from '../../curriculum-intel/curriculum-service'
import type { InsightType } from '../../curriculum-intel/types'

export const curriculumIntelTools: ToolModule = {
  tools: [
    {
      name: 'query_curriculum_network',
      description:
        'Query the curriculum intelligence network for gaps, redundancies, pathway recommendations, or concept information across courses.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query about curriculum (used for context)',
          },
          type: {
            type: 'string',
            enum: ['gaps', 'redundancies', 'pathways', 'bloom', 'tool-effectiveness'],
            description: 'Type of curriculum insight to retrieve',
          },
          nodeId: {
            type: 'string',
            description: 'Optional node ID for detailed concept info',
          },
        },
        required: [],
      },
    },
  ],

  handlers: {
    async query_curriculum_network(args: Record<string, unknown>) {
      const { type, nodeId } = args as {
        query?: string
        type?: string
        nodeId?: string
      }

      // If a specific node is requested, return its detail
      if (nodeId) {
        const detail = await getNodeDetail(nodeId)
        if (!detail) return { error: 'Node not found' }
        return {
          node: {
            label: detail.label,
            type: detail.type,
            bloomLevel: detail.bloomLevel,
            department: detail.department,
            avgMastery: detail.avgMastery,
            courseCount: detail.courses.length,
            prerequisiteCount: detail.prerequisites.length,
            dependentCount: detail.dependents.length,
          },
        }
      }

      // Map user-facing type names to DB type values
      const typeMap: Record<string, InsightType> = {
        gaps: 'gap',
        redundancies: 'redundancy',
        pathways: 'pathway-optimization',
        bloom: 'bloom-imbalance',
        'tool-effectiveness': 'tool-effectiveness',
      }

      const insightType = type ? typeMap[type] : undefined

      const insights = await getInsights({
        ...(insightType && { type: insightType }),
        status: undefined, // show non-dismissed
      })

      const top5 = insights.slice(0, 5)

      return {
        insightCount: insights.length,
        showing: top5.length,
        insights: top5.map(i => ({
          type: i.type,
          severity: i.severity,
          title: i.title,
          recommendation: i.recommendation,
        })),
        summary:
          insights.length === 0
            ? 'No curriculum insights found. The graph may need to be refreshed.'
            : `Found ${insights.length} curriculum insight(s).`,
      }
    },
  },
}
