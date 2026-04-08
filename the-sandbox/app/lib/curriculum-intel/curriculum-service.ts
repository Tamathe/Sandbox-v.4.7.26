/**
 * Curriculum Intelligence Network — Orchestrator Service
 *
 * CRUD + query interface for the curriculum intelligence graph.
 * Coordinates graph building, gap detection, pathway optimization,
 * and tool effectiveness analysis.
 */

import { prisma } from '../prisma'
import { buildCurriculumGraph, computeNodeMastery } from './graph-builder'
import { detectCurriculumGaps } from './gap-detector'
import { analyzePathwayEffectiveness } from './pathway-optimizer'
import { analyzeToolEffectiveness } from './tool-effectiveness'
import type {
  CurriculumGraphData,
  GraphNode,
  GraphEdge,
  NodeDetail,
  DepartmentView,
  InsightType,
  InsightSeverity,
  InsightStatus,
  BloomLevel,
} from './types'
import { BLOOM_LEVELS } from './types'

// ── Full Refresh (cron) ─────────────────────────────────────────────────────

export async function runFullRefresh(): Promise<{
  graphStats: { nodes: number; edges: number }
  masteryUpdated: number
  insightsGenerated: number
}> {
  // 1. Rebuild graph from source data
  const graphStats = await buildCurriculumGraph()

  // 2. Compute mastery metrics per node
  const masteryUpdated = await computeNodeMastery()

  // 3. Run all detectors
  const [gaps, pathways, toolInsights] = await Promise.all([
    detectCurriculumGaps(),
    analyzePathwayEffectiveness(),
    analyzeToolEffectiveness(),
  ])

  const allInsights = [...gaps, ...pathways, ...toolInsights]

  // 4. Persist new insights (avoid duplicates by title)
  let insightsGenerated = 0
  for (const insight of allInsights) {
    const existing = await prisma.curriculumInsight.findFirst({
      where: { title: insight.title, status: { not: 'dismissed' } },
    })
    if (existing) continue

    await prisma.curriculumInsight.create({
      data: {
        type: insight.type,
        severity: insight.severity,
        title: insight.title,
        description: insight.description,
        affectedNodes: insight.affectedNodes,
        affectedCourses: insight.affectedCourses ?? [],
        recommendation: insight.recommendation,
      },
    })
    insightsGenerated++
  }

  return { graphStats, masteryUpdated, insightsGenerated }
}

// ── Graph Query ─────────────────────────────────────────────────────────────

export async function getGraphData(): Promise<CurriculumGraphData> {
  const [nodes, edges] = await Promise.all([
    prisma.curriculumNode.findMany({
      include: { courses: { select: { courseId: true } } },
    }),
    prisma.curriculumEdge.findMany(),
  ])

  const departments = [
    ...new Set(nodes.map(n => n.department).filter(Boolean) as string[]),
  ]

  const masteryValues = nodes
    .map(n => n.avgMastery)
    .filter((v): v is number => v !== null)
  const avgMastery =
    masteryValues.length > 0
      ? masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length
      : null

  const graphNodes: GraphNode[] = nodes.map(n => ({
    id: n.id,
    label: n.label,
    type: n.type as GraphNode['type'],
    bloomLevel: n.bloomLevel as BloomLevel | null,
    department: n.department,
    avgMastery: n.avgMastery,
    courseCount: n.courses.length,
  }))

  const graphEdges: GraphEdge[] = edges.map(e => ({
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    strength: e.strength,
    evidence: e.evidence,
  }))

  return {
    nodes: graphNodes,
    edges: graphEdges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      departments,
      avgMastery,
    },
  }
}

// ── Insights Query ──────────────────────────────────────────────────────────

export async function getInsights(filters?: {
  type?: InsightType
  severity?: InsightSeverity
  status?: InsightStatus
}) {
  return prisma.curriculumInsight.findMany({
    where: {
      ...(filters?.type && { type: filters.type }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.status ? { status: filters.status } : { status: { not: 'dismissed' } }),
    },
    orderBy: [{ severity: 'desc' }, { discoveredAt: 'desc' }],
  })
}

// ── Insight Action ──────────────────────────────────────────────────────────

export async function updateInsightStatus(
  id: string,
  status: InsightStatus,
) {
  return prisma.curriculumInsight.update({
    where: { id },
    data: { status },
  })
}

// ── Node Detail ─────────────────────────────────────────────────────────────

export async function getNodeDetail(nodeId: string): Promise<NodeDetail | null> {
  const node = await prisma.curriculumNode.findUnique({
    where: { id: nodeId },
    include: {
      courses: { select: { courseId: true, role: true, bloomLevel: true } },
      prerequisites: {
        include: { source: { select: { id: true, label: true } } },
      },
      dependents: {
        include: { target: { select: { id: true, label: true } } },
      },
    },
  })

  if (!node) return null

  return {
    id: node.id,
    label: node.label,
    type: node.type as NodeDetail['type'],
    bloomLevel: node.bloomLevel as BloomLevel | null,
    department: node.department,
    avgMastery: node.avgMastery,
    masteryVariance: node.masteryVariance,
    bestCourse: node.bestCourse,
    bestTool: node.bestTool,
    computedAt: node.computedAt,
    courses: node.courses,
    prerequisites: node.prerequisites.map(e => ({
      id: e.source.id,
      label: e.source.label,
      strength: e.strength,
    })),
    dependents: node.dependents.map(e => ({
      id: e.target.id,
      label: e.target.label,
      strength: e.strength,
    })),
  }
}

// ── Department View ─────────────────────────────────────────────────────────

export async function getDepartmentView(department: string): Promise<DepartmentView> {
  const nodes = await prisma.curriculumNode.findMany({
    where: { department },
    select: { id: true, bloomLevel: true, avgMastery: true },
  })

  // Bloom breakdown
  const bloomBreakdown: Record<BloomLevel, number> = {
    knowledge: 0,
    comprehension: 0,
    application: 0,
    analysis: 0,
    synthesis: 0,
    evaluation: 0,
  }

  for (const node of nodes) {
    const bl = node.bloomLevel as BloomLevel | null
    if (bl && bl in bloomBreakdown) {
      bloomBreakdown[bl]++
    }
  }

  // Average mastery
  const masteryValues = nodes
    .map(n => n.avgMastery)
    .filter((v): v is number => v !== null)
  const avgMastery =
    masteryValues.length > 0
      ? masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length
      : null

  // Top gaps for this department
  const insights = await prisma.curriculumInsight.findMany({
    where: {
      type: 'gap',
      status: { not: 'dismissed' },
      affectedNodes: { hasSome: nodes.map(n => n.id) },
    },
    take: 5,
    orderBy: { severity: 'desc' },
  })

  const topGaps = insights.map(i => ({
    type: i.type as 'gap',
    severity: i.severity as InsightSeverity,
    title: i.title,
    description: i.description,
    affectedNodes: i.affectedNodes,
    affectedCourses: i.affectedCourses,
    recommendation: i.recommendation ?? undefined,
  }))

  return {
    department,
    nodeCount: nodes.length,
    bloomBreakdown,
    avgMastery,
    topGaps,
  }
}

// ── Bloom Breakdown (all departments) ───────────────────────────────────────

export async function getAllDepartmentBloomBreakdowns() {
  const rows: Array<{ department: string; bloomLevel: string; count: bigint }> =
    await prisma.$queryRaw`
      SELECT "department", "bloomLevel", COUNT(*) as count
      FROM "CurriculumNode"
      WHERE "department" IS NOT NULL AND "bloomLevel" IS NOT NULL
      GROUP BY "department", "bloomLevel"
      ORDER BY "department"
    `

  const deptMap = new Map<string, Record<string, number>>()
  for (const row of rows) {
    if (!deptMap.has(row.department)) {
      deptMap.set(row.department, {})
    }
    deptMap.get(row.department)![row.bloomLevel] = Number(row.count)
  }

  return Array.from(deptMap.entries()).map(([department, counts]) => {
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    const breakdown: Record<BloomLevel, number> = {
      knowledge: 0,
      comprehension: 0,
      application: 0,
      analysis: 0,
      synthesis: 0,
      evaluation: 0,
    }
    for (const [bl, c] of Object.entries(counts)) {
      if (bl in breakdown) {
        breakdown[bl as BloomLevel] = c
      }
    }
    return { department, counts: breakdown, total }
  })
}
