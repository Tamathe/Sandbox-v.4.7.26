/**
 * Curriculum Intelligence Network — Tool Effectiveness Mapper
 *
 * Analyzes which study modes/tools produce the best mastery outcomes
 * at each Bloom taxonomy level.
 */

import { prisma } from '../prisma'
import type { CurriculumInsightData, BloomLevel } from './types'
import { BLOOM_LEVELS } from './types'

// ── Public API ──────────────────────────────────────────────────────────────

export async function analyzeToolEffectiveness(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  for (const bloom of BLOOM_LEVELS) {
    // Map bloom level to a numeric range for bloomHighWater in ConceptState
    const bloomIndex = BLOOM_LEVELS.indexOf(bloom as BloomLevel) + 1

    // Find tool sessions where the user has concept mastery at this bloom level
    // We approximate by checking ToolSession scores grouped by any metadata studyMode
    const rows: Array<{ mode: string; avg_score: number; session_count: bigint }> =
      await prisma.$queryRaw`
        SELECT
          ts.metadata->>'studyMode' as mode,
          AVG(ts.score) as avg_score,
          COUNT(*) as session_count
        FROM "ToolSession" ts
        JOIN "ConceptState" cs ON cs."userId" = ts."userId"
          AND cs."courseId" = ts."courseId"
          AND cs."bloomHighWater" = ${bloomIndex}
        WHERE ts.metadata->>'studyMode' IS NOT NULL
          AND ts.score IS NOT NULL
        GROUP BY mode
        HAVING COUNT(*) >= 10
        ORDER BY avg_score DESC
      `

    const modes = rows.map(r => ({
      mode: r.mode,
      avgScore: Number(r.avg_score),
      sessionCount: Number(r.session_count),
    }))

    if (modes.length < 2) continue

    const best = modes[0]
    const worst = modes[modes.length - 1]
    const delta = best.avgScore - worst.avgScore

    if (delta > 0.1) {
      const totalSessions = modes.reduce((s, m) => s + m.sessionCount, 0)
      insights.push({
        type: 'tool-effectiveness',
        severity: 'info',
        title: `${best.mode} mode is most effective for ${bloom}-level concepts (+${(delta * 100).toFixed(0)}%)`,
        description: `For ${bloom}-level concepts, ${best.mode} mode averages ${(best.avgScore * 100).toFixed(1)}% vs. ${(worst.avgScore * 100).toFixed(1)}% for ${worst.mode} (n=${totalSessions}).`,
        affectedNodes: [],
        affectedCourses: [],
        recommendation: `Sandy should prefer ${best.mode} for ${bloom}-level study tasks.`,
      })
    }
  }

  return insights
}
