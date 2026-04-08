/**
 * Curriculum Intelligence Network — Gap Detector
 *
 * Finds teaching gaps, redundancies, and Bloom taxonomy imbalances
 * across the curriculum graph.
 */

import { prisma } from '../prisma'
import type { CurriculumInsightData, BloomLevel } from './types'
import { BLOOM_LEVELS } from './types'

// ── Orphan Prerequisites (gaps) ─────────────────────────────────────────────

async function findOrphanPrerequisites(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  // Nodes that are prerequisites for 2+ other nodes but no course teaches them
  const rows: Array<{ sourceId: string; label: string; dependent_count: bigint }> =
    await prisma.$queryRaw`
      SELECT ce."sourceId", cn."label", COUNT(ce."targetId") as dependent_count
      FROM "CurriculumEdge" ce
      JOIN "CurriculumNode" cn ON cn.id = ce."sourceId"
      LEFT JOIN "CurriculumNodeCourse" cnc ON cnc."nodeId" = cn.id AND cnc."role" = 'teaches'
      WHERE cnc.id IS NULL
      GROUP BY ce."sourceId", cn."label"
      HAVING COUNT(ce."targetId") >= 2
      ORDER BY dependent_count DESC
    `

  for (const gap of rows) {
    const count = Number(gap.dependent_count)
    insights.push({
      type: 'gap',
      severity: count >= 4 ? 'significant' : 'moderate',
      title: `No course teaches "${gap.label}" — required by ${count} concepts`,
      description: `The concept "${gap.label}" is a prerequisite for ${count} upper-level concepts, but no course in the curriculum teaches it as a primary objective.`,
      affectedNodes: [gap.sourceId],
      affectedCourses: [],
      recommendation: `Consider adding "${gap.label}" as a learning objective to an appropriate introductory course.`,
    })
  }

  return insights
}

// ── Redundancies ────────────────────────────────────────────────────────────

async function findRedundancies(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  // Same node taught in 3+ courses at the same bloom level
  const rows: Array<{
    nodeId: string
    label: string
    bloomLevel: string | null
    course_count: bigint
    course_ids: string[]
  }> = await prisma.$queryRaw`
    SELECT cn.id as "nodeId", cn."label", cnc."bloomLevel",
           COUNT(cnc."courseId") as course_count,
           ARRAY_AGG(cnc."courseId") as course_ids
    FROM "CurriculumNode" cn
    JOIN "CurriculumNodeCourse" cnc ON cnc."nodeId" = cn.id AND cnc."role" = 'teaches'
    GROUP BY cn.id, cn."label", cnc."bloomLevel"
    HAVING COUNT(cnc."courseId") >= 3
    ORDER BY course_count DESC
  `

  for (const dup of rows) {
    const count = Number(dup.course_count)
    const bloomLabel = dup.bloomLevel ? ` at the ${dup.bloomLevel} level` : ''
    insights.push({
      type: 'redundancy',
      severity: count >= 5 ? 'significant' : 'moderate',
      title: `"${dup.label}" taught in ${count} courses${bloomLabel}`,
      description: `${count} courses independently teach "${dup.label}"${bloomLabel}. Students may encounter this content multiple times without progression.`,
      affectedNodes: [dup.nodeId],
      affectedCourses: dup.course_ids ?? [],
      recommendation: `Coordinate across departments to ensure each course engages "${dup.label}" at a progressively higher Bloom level.`,
    })
  }

  return insights
}

// ── Bloom Imbalances ────────────────────────────────────────────────────────

async function findBloomImbalances(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  // Per-department bloom distribution
  const rows: Array<{ department: string; bloomLevel: string; count: bigint }> =
    await prisma.$queryRaw`
      SELECT cn."department", cn."bloomLevel", COUNT(*) as count
      FROM "CurriculumNode" cn
      WHERE cn."department" IS NOT NULL AND cn."bloomLevel" IS NOT NULL
      GROUP BY cn."department", cn."bloomLevel"
      ORDER BY cn."department", count DESC
    `

  // Aggregate per department
  const deptMap = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!deptMap.has(row.department)) deptMap.set(row.department, new Map())
    deptMap.get(row.department)!.set(row.bloomLevel, Number(row.count))
  }

  for (const [dept, bloomCounts] of deptMap) {
    const total = Array.from(bloomCounts.values()).reduce((s, v) => s + v, 0)
    if (total < 5) continue // Skip tiny departments

    const knowledgeCount = bloomCounts.get('knowledge') ?? 0
    const knowledgePct = knowledgeCount / total

    if (knowledgePct > 0.5) {
      // Check higher-order bloom levels
      const higherOrder = BLOOM_LEVELS.slice(3) // analysis, synthesis, evaluation
      const higherCount = higherOrder.reduce((s, bl) => s + (bloomCounts.get(bl) ?? 0), 0)
      const higherPct = higherCount / total

      insights.push({
        type: 'bloom-imbalance',
        severity: knowledgePct > 0.65 ? 'significant' : 'moderate',
        title: `${dept}: ${(knowledgePct * 100).toFixed(0)}% knowledge-level objectives`,
        description: `The ${dept} department has ${(knowledgePct * 100).toFixed(0)}% of objectives at the knowledge level and only ${(higherPct * 100).toFixed(0)}% at analysis or above. This suggests insufficient higher-order thinking opportunities.`,
        affectedNodes: [],
        affectedCourses: [],
        recommendation: `Consider revising some knowledge-level objectives in ${dept} to target application, analysis, or synthesis.`,
      })
    }
  }

  return insights
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function detectCurriculumGaps(): Promise<CurriculumInsightData[]> {
  const [gaps, redundancies, bloomImbalances] = await Promise.all([
    findOrphanPrerequisites(),
    findRedundancies(),
    findBloomImbalances(),
  ])

  return [...gaps, ...redundancies, ...bloomImbalances]
}
