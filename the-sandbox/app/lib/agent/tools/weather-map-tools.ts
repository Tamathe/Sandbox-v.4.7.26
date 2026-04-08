/**
 * Sandy Universal Agent — Learning Weather Map Tools
 *
 * 1 tool: find_study_spot
 *
 * Provides personalized study location recommendations
 * based on campus activity, student schedule, and preferences.
 */

import type { ToolModule } from '../agent-types'
import { getStudyRecommendations } from '../../weather-map/weather-map-service'
import { formatHour } from '../../weather-map/weather-utils'

export const weatherMapTools: ToolModule = {
  tools: [
    {
      name: 'find_study_spot',
      description:
        "Find the best study locations on campus based on the student's courses, preferences, and current building activity levels.",
      category: 'campus',
      permission: 'auto' as const,
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object' as const,
        properties: {
          preference: {
            type: 'string',
            description:
              'Optional filter: "quiet", "social", "near-food", "near-class"',
          },
        },
      },
    },
  ],

  handlers: {
    async find_study_spot(args, user) {
      try {
        const recs = await getStudyRecommendations(user.id)
        if (recs.length === 0) {
          return {
            message:
              'Not enough activity data yet to recommend study spots. Try the campus map to explore buildings.',
          }
        }

        const preference = args.preference as string | undefined
        let filtered = recs

        if (preference === 'quiet')
          filtered = recs.filter((r) => r.noiseLevel === 'quiet')
        if (preference === 'social')
          filtered = recs.filter((r) => r.weatherScore > 0.5)
        if (preference === 'near-food')
          filtered = recs.filter((r) => r.hasFood)
        if (preference === 'near-class')
          filtered = recs.filter((r) => r.courseRelevance.length > 0)

        // Fall back to unfiltered if filter produced no results
        if (filtered.length === 0) filtered = recs

        return {
          recommendations: filtered.slice(0, 3).map((r) => ({
            building: r.buildingName,
            score: Math.round(r.score * 100),
            reason: r.reason,
            peakHours: r.peakHours.map(formatHour),
            noise: r.noiseLevel,
            coursesNearby: r.courseRelevance,
          })),
          note: 'Based on your schedule, study patterns, and campus activity levels. Estimated from session patterns — not real-time occupancy.',
        }
      } catch {
        return { is_error: true, message: 'Failed to retrieve study spot recommendations.' }
      }
    },
  },
}
