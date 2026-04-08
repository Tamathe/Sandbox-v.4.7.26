/**
 * Sandy Universal Agent — Classroom Intelligence Loop Tools
 *
 * 5 tools: get_concept_difficulty, get_teaching_insights,
 *          get_weekly_pulse, get_teaching_intervention_effectiveness,
 *          log_teaching_intervention
 */

import type { ToolModule } from '../agent-types'
import { computeConceptDifficulty } from '../../classroom-intelligence/concept-difficulty-engine'
import {
  getInsightCards,
  getPulseHistory,
} from '../../classroom-intelligence/classroom-intelligence-service'
import {
  getInterventionEffectiveness,
  recordIntervention,
} from '../../classroom-intelligence/intervention-tracker'

export const classroomIntelligenceTools: ToolModule = {
  tools: [
    {
      name: 'get_concept_difficulty',
      description:
        'Get the concept difficulty map for a course — shows which concepts students are struggling with and why.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_teaching_insights',
      description:
        'Get unread teaching insight cards for your courses. Shows what needs attention and suggested interventions.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Optional course ID to filter insights' },
        },
        required: [],
      },
    },
    {
      name: 'get_weekly_pulse',
      description:
        "Get this week's Teaching Pulse summary for a course — concept heatmap, engagement, and key takeaways.",
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_teaching_intervention_effectiveness',
      description:
        'See which teaching interventions have been most effective in your courses.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'log_teaching_intervention',
      description:
        'Record a teaching adjustment you made in response to student difficulty data.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
          approach: { type: 'string', description: 'Type of intervention (e.g. reteach, scaffold, resequence, peer_support, office_hours, resource_add)' },
          description: { type: 'string', description: 'Description of the teaching adjustment made' },
          concepts: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of concept names this intervention targets',
          },
        },
        required: ['courseId', 'approach', 'description', 'concepts'],
      },
    },
  ],

  handlers: {
    async get_concept_difficulty(args: Record<string, unknown>) {
      const { courseId } = args as { courseId: string }
      const difficulties = await computeConceptDifficulty(courseId)
      const top5 = difficulties.slice(0, 5)

      const criticalCount = top5.filter(d => d.difficulty === 'CRITICAL').length
      const veryDifficultCount = top5.filter(d => d.difficulty === 'VERY_DIFFICULT').length

      return {
        courseId,
        topConcepts: top5.map(d => ({
          concept: d.concept,
          conceptLabel: d.conceptLabel,
          difficulty: d.difficulty,
          masteryRate: d.masteryRate,
          avgMastery: d.avgMastery,
          successRate: d.successRate,
          encounterCount: d.encounterCount,
          delta7d: d.delta7d,
          misconceptions: d.misconceptions.slice(0, 3),
        })),
        summary: criticalCount > 0
          ? `${criticalCount} concept(s) at CRITICAL difficulty — students need immediate help.`
          : veryDifficultCount > 0
            ? `${veryDifficultCount} concept(s) at VERY DIFFICULT — consider reviewing these in class.`
            : 'No major difficulty hotspots detected.',
      }
    },

    async get_teaching_insights(args: Record<string, unknown>, user) {
      const { courseId } = args as { courseId?: string }
      const cards = await getInsightCards(user.id, {
        courseId,
        viewed: false,
        limit: 5,
      })

      return {
        count: cards.length,
        insights: cards.map(c => ({
          id: c.id,
          type: c.type,
          urgency: c.urgency,
          title: c.title,
          body: c.body,
          suggestedActions: c.suggestedActions,
          courseName: c.course?.title,
          createdAt: c.createdAt,
        })),
      }
    },

    async get_weekly_pulse(args: Record<string, unknown>) {
      const { courseId } = args as { courseId: string }
      const pulses = await getPulseHistory(courseId, 1)

      if (!pulses || (Array.isArray(pulses) && pulses.length === 0)) {
        return { error: 'No pulse data available for this course yet. Pulse is generated weekly.' }
      }

      const latest = Array.isArray(pulses) ? pulses[0] : pulses
      return latest
    },

    async get_teaching_intervention_effectiveness(args: Record<string, unknown>) {
      const { courseId } = args as { courseId: string }
      const effectiveness = await getInterventionEffectiveness(courseId)
      return effectiveness
    },

    async log_teaching_intervention(args: Record<string, unknown>, user) {
      const { courseId, approach, description, concepts } = args as {
        courseId: string
        approach: string
        description: string
        concepts: string[]
      }

      const interventionId = await recordIntervention({
        courseId,
        instructorId: user.id,
        approach: approach as any,
        description,
        targetConcepts: concepts,
      })

      return {
        success: true,
        interventionId,
        message: `Teaching intervention recorded. I'll track how student performance on ${concepts.join(', ')} changes over the next 7 days.`,
      }
    },
  },
}
