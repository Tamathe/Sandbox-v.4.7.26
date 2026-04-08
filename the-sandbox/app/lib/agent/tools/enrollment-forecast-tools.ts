/**
 * Sandy Universal Agent — Enrollment Forecast Tools
 *
 * 1 tool: forecast_enrollment
 *
 * Provides enrollment demand forecasts and bottleneck alerts
 * for admin/registrar users.
 *
 * NOTE: Do NOT import this into tool-registry.ts — the integration merge handles wiring.
 */

import type { ToolModule } from '../agent-types'
import { getForecastForCourse, getBottleneckForecasts } from '../../enrollment-forecast/forecast-service'
import { forecastCourseDemand } from '../../enrollment-forecast/demand-forecaster'
import { recommendRooms } from '../../enrollment-forecast/room-optimizer'

export const enrollmentForecastTools: ToolModule = {
  tools: [
    {
      name: 'forecast_enrollment',
      description:
        'Get enrollment demand forecasts for a specific course or view top bottleneck courses for a term. Returns predicted enrollment, capacity gaps, and room recommendations.',
      category: 'analytics',
      permission: 'auto' as const,
      roles: ['ADMIN'],
      input_schema: {
        type: 'object' as const,
        properties: {
          courseCode: {
            type: 'string',
            description:
              'Specific course code to forecast (e.g., "STAT 200"). If omitted, returns top bottlenecks.',
          },
          term: {
            type: 'string',
            description: 'Target term (e.g., "Fall 2026"). Defaults to "Fall 2026".',
          },
        },
      },
    },
  ],

  handlers: {
    async forecast_enrollment(args) {
      const term = (args.term as string) || 'Fall 2026'
      const courseCode = args.courseCode as string | undefined

      if (courseCode) {
        // Single course forecast
        const cached = await getForecastForCourse(courseCode, term)
        if (cached) {
          return {
            courseCode: cached.courseCode,
            term: cached.term,
            predictedEnrollment: cached.predictedEnrollment,
            currentCapacity: cached.currentCapacity,
            capacityGap: cached.capacityGap,
            riskLevel: cached.riskLevel,
            predictedSections: cached.predictedSections,
            confidence: `${Math.round(cached.confidenceLevel * 100)}%`,
            historicalTrend: cached.historicalTrend,
            recommendations: cached.recommendedRooms.slice(0, 3).map((r) => ({
              room: `${r.buildingName} — ${r.roomName}`,
              capacity: r.capacity,
              reason: r.reason,
            })),
          }
        }

        // On-demand computation
        const demand = await forecastCourseDemand(courseCode, term)
        const rooms = await recommendRooms(demand.predictedEnrollment, demand.predictedSections)

        return {
          courseCode: demand.courseCode,
          term: demand.term,
          predictedEnrollment: demand.predictedEnrollment,
          currentCapacity: demand.currentCapacity,
          capacityGap: demand.capacityGap,
          riskLevel: demand.riskLevel,
          predictedSections: demand.predictedSections,
          confidence: `${Math.round(demand.confidenceLevel * 100)}%`,
          historicalTrend: demand.historicalTrend,
          recommendations: rooms.slice(0, 3).map((r) => ({
            room: `${r.buildingName} — ${r.roomName}`,
            capacity: r.capacity,
            reason: r.reason,
          })),
        }
      }

      // Top bottlenecks
      const bottlenecks = await getBottleneckForecasts(term, 5)

      if (bottlenecks.length === 0) {
        return {
          message: `No enrollment bottlenecks found for ${term}. Forecasts may not have been computed yet.`,
        }
      }

      return {
        term,
        bottleneckCount: bottlenecks.length,
        bottlenecks: bottlenecks.map((b) => ({
          courseCode: b.courseCode,
          predicted: b.predictedEnrollment,
          capacity: b.currentCapacity,
          gap: `+${b.capacityGap}`,
          sections: b.predictedSections,
          trend: b.historicalTrend,
        })),
      }
    },
  },
}
