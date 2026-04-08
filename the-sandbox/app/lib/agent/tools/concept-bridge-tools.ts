/**
 * Sandy Universal Agent — Cross-Course Concept Bridge Tools
 *
 * 1 tool: find_cross_course_help
 *
 * NOT imported into tool-registry.ts — integration merge handles wiring.
 */

import type { ToolModule } from '../agent-types'
import { generateBridgeRecommendations } from '../../concept-bridge/bridge-recommender'

export const conceptBridgeTools: ToolModule = {
  tools: [
    {
      name: 'find_cross_course_help',
      description:
        'Find resources from other courses to help with a concept the student is struggling with. Searches for flashcards, peer experts, study groups, and materials across all courses that teach the same concept.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          concept: {
            type: 'string',
            description: 'The concept to find cross-course help for',
          },
          courseId: {
            type: 'string',
            description: 'The course context (optional — narrows results to bridges from this course)',
          },
        },
        required: ['concept'],
      },
    },
  ],

  handlers: {
    async find_cross_course_help(args: Record<string, unknown>, user) {
      const { concept, courseId } = args as { concept: string; courseId?: string }

      const recs = await generateBridgeRecommendations(
        user.id,
        concept,
        courseId || '',
      )

      if (recs.resources.length === 0) {
        return {
          message: `No cross-course resources found for "${concept}". Try a broader search term or check that concept bridges have been discovered.`,
        }
      }

      return {
        concept,
        courseId: courseId || '(any)',
        resourceCount: recs.resources.length,
        resources: recs.resources.slice(0, 5).map(r => ({
          type: r.type,
          count: r.count,
          reason: r.reason,
          sourceCourse: r.sourceCourse,
          matchScore: Math.round(r.score * 100) + '%',
        })),
        summary: `Found ${recs.resources.length} cross-course resource(s) for "${concept}". Top types: ${[...new Set(recs.resources.map(r => r.type))].join(', ')}.`,
      }
    },
  },
}
