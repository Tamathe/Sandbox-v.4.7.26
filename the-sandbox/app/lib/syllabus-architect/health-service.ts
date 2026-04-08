/**
 * Course Map Health Score Service
 *
 * Computes a 0–100 health score for a course map based on coverage,
 * connectivity, sequencing, completeness, and balance. Generates
 * AI-powered recommendations via Haiku.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface HealthGrade {
  dimension: string
  score: number
  label: string
  detail: string
}

export interface CourseMapHealth {
  overallScore: number
  grades: HealthGrade[]
  recommendations: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function letterGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function gradeLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 70) return 'Fair'
  if (score >= 60) return 'Needs Work'
  return 'Critical'
}

// ── Cycle detection (DFS) ────────────────────────────────────────────────────

function hasCycle(
  adjacency: Map<string, string[]>,
  nodeIds: string[],
): boolean {
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  for (const id of nodeIds) color.set(id, WHITE)

  function dfs(u: string): boolean {
    color.set(u, GRAY)
    for (const v of adjacency.get(u) || []) {
      const c = color.get(v)
      if (c === GRAY) return true
      if (c === WHITE && dfs(v)) return true
    }
    color.set(u, BLACK)
    return false
  }

  for (const id of nodeIds) {
    if (color.get(id) === WHITE && dfs(id)) return true
  }
  return false
}

// ── Service ──────────────────────────────────────────────────────────────────

export async function computeCourseMapHealth(courseId: string): Promise<CourseMapHealth> {
  // Fetch course map data, objectives, and modules in parallel
  const [courseMap, objectives] = await Promise.all([
    prisma.courseMap.findUnique({
      where: { courseId },
      include: {
        nodes: { where: { archived: false } },
        edges: true,
        units: {
          include: {
            modules: {
              include: { lessons: true },
            },
          },
        },
      },
    }),
    prisma.learningObjective.findMany({
      where: { courseId },
      select: { id: true, title: true },
    }),
  ])

  if (!courseMap) {
    return {
      overallScore: 0,
      grades: [],
      recommendations: ['No course map found. Create a course map to get started.'],
    }
  }

  const nodes = courseMap.nodes
  const edges = courseMap.edges
  const units = courseMap.units
  const grades: HealthGrade[] = []

  // ── 1. Coverage: % of learning objectives mapped to nodes ──────
  let coverageScore = 100
  if (objectives.length > 0) {
    // A node "covers" an objective if the objective title appears in a node label (case-insensitive)
    const coveredObjectives = objectives.filter((obj) =>
      nodes.some((n) => n.label.toLowerCase().includes(obj.title.toLowerCase().slice(0, 20)))
    )
    coverageScore = Math.round((coveredObjectives.length / objectives.length) * 100)
  } else if (nodes.length === 0) {
    coverageScore = 0
  }
  grades.push({
    dimension: 'Coverage',
    score: coverageScore,
    label: gradeLabel(coverageScore),
    detail: objectives.length > 0
      ? `${Math.round(coverageScore)}% of ${objectives.length} learning objectives mapped to nodes`
      : 'No learning objectives defined — add objectives for better coverage tracking',
  })

  // ── 2. Connectivity: avg edges per node, isolated node count ───
  let connectivityScore = 100
  if (nodes.length > 0) {
    const connectedNodeIds = new Set<string>()
    for (const e of edges) {
      connectedNodeIds.add(e.fromNodeId)
      connectedNodeIds.add(e.toNodeId)
    }
    const isolatedCount = nodes.filter((n) => !connectedNodeIds.has(n.id)).length
    const avgEdgesPerNode = nodes.length > 0 ? edges.length / nodes.length : 0

    // Penalize isolated nodes heavily, reward avg edges >= 1.5
    const isolationPenalty = Math.min(isolatedCount * 15, 60)
    const edgeBonus = Math.min(avgEdgesPerNode * 30, 40)
    connectivityScore = Math.max(0, Math.min(100, 40 + edgeBonus - isolationPenalty))

    grades.push({
      dimension: 'Connectivity',
      score: connectivityScore,
      label: gradeLabel(connectivityScore),
      detail: `${edges.length} edges across ${nodes.length} nodes (avg ${avgEdgesPerNode.toFixed(1)}/node). ${isolatedCount} isolated node${isolatedCount !== 1 ? 's' : ''}.`,
    })
  } else {
    connectivityScore = 0
    grades.push({
      dimension: 'Connectivity',
      score: 0,
      label: gradeLabel(0),
      detail: 'No nodes in the course map',
    })
  }

  // ── 3. Sequencing: prerequisite chain validity ─────────────────
  let sequencingScore = 100
  if (edges.length > 0) {
    const prereqEdges = edges.filter((e) => e.edgeType === 'PREREQUISITE')
    if (prereqEdges.length > 0) {
      const adjacency = new Map<string, string[]>()
      for (const n of nodes) adjacency.set(n.id, [])
      for (const e of prereqEdges) {
        const arr = adjacency.get(e.fromNodeId)
        if (arr) arr.push(e.toNodeId)
      }

      const hasCycles = hasCycle(adjacency, nodes.map((n) => n.id))
      if (hasCycles) {
        sequencingScore = 30
      }
    }
    // No prerequisite edges = neutral (not penalized)
    grades.push({
      dimension: 'Sequencing',
      score: sequencingScore,
      label: gradeLabel(sequencingScore),
      detail: sequencingScore < 50
        ? 'Circular prerequisite chains detected — review prerequisite edges'
        : `${edges.filter((e) => e.edgeType === 'PREREQUISITE').length} prerequisite edges, no cycles detected`,
    })
  } else {
    grades.push({
      dimension: 'Sequencing',
      score: 80,
      label: gradeLabel(80),
      detail: 'No edges defined — add prerequisite/sequence edges for better sequencing',
    })
    sequencingScore = 80
  }

  // ── 4. Completeness: % of nodes with modules/lessons ──────────
  let completenessScore = 100
  if (units.length > 0) {
    const unitsWithContent = units.filter((u) => u.modules.length > 0)
    const modulesWithLessons = units.flatMap((u) => u.modules).filter((m) => m.lessons.length > 0)
    const totalModules = units.flatMap((u) => u.modules).length

    const unitRatio = unitsWithContent.length / units.length
    const moduleRatio = totalModules > 0 ? modulesWithLessons.length / totalModules : 0
    completenessScore = Math.round(((unitRatio * 0.5) + (moduleRatio * 0.5)) * 100)
  } else if (nodes.length > 0) {
    completenessScore = 30
  } else {
    completenessScore = 0
  }
  grades.push({
    dimension: 'Completeness',
    score: completenessScore,
    label: gradeLabel(completenessScore),
    detail: units.length > 0
      ? `${units.filter((u) => u.modules.length > 0).length}/${units.length} units have modules`
      : 'No course units — add content structure for completeness',
  })

  // ── 5. Balance: std dev of content per unit ────────────────────
  let balanceScore = 100
  if (units.length >= 2) {
    const lessonCounts = units.map((u) =>
      u.modules.reduce((sum, m) => sum + m.lessons.length, 0)
    )
    const mean = lessonCounts.reduce((a, b) => a + b, 0) / lessonCounts.length
    const variance = lessonCounts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / lessonCounts.length
    const stdDev = Math.sqrt(variance)
    // Lower std dev is better — perfect = 0, heavily penalize > 5
    const ratio = mean > 0 ? stdDev / mean : 0
    balanceScore = Math.max(0, Math.round(100 - ratio * 50))
  }
  grades.push({
    dimension: 'Balance',
    score: balanceScore,
    label: gradeLabel(balanceScore),
    detail: units.length >= 2
      ? `Content distribution across ${units.length} units — ${gradeLabel(balanceScore).toLowerCase()} balance`
      : 'Not enough units to assess balance',
  })

  // ── Overall score (weighted average) ───────────────────────────
  const weights = { Coverage: 0.25, Connectivity: 0.2, Sequencing: 0.2, Completeness: 0.2, Balance: 0.15 }
  const overallScore = Math.round(
    grades.reduce((sum, g) => {
      const w = weights[g.dimension as keyof typeof weights] || 0.2
      return sum + g.score * w
    }, 0)
  )

  // ── AI recommendations via Haiku ───────────────────────────────
  let recommendations: string[] = []
  try {
    const summaryText = grades
      .map((g) => `${g.dimension}: ${g.score}/100 (${g.label}) — ${g.detail}`)
      .join('\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a curriculum design expert. A course map has been analyzed with these health scores:

${summaryText}

Overall score: ${overallScore}/100

The course has ${nodes.length} nodes, ${edges.length} edges, ${units.length} units, and ${objectives.length} learning objectives.

Provide exactly 3–5 actionable recommendations to improve this course map. Each recommendation should be one sentence. Focus on the weakest dimensions. Return ONLY a JSON array of strings, no other text.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        recommendations = parsed.slice(0, 5).map(String)
      }
    }
  } catch (err) {
    console.error('[computeCourseMapHealth] AI recommendation error:', err)
    // Fallback to rule-based recommendations
    for (const g of grades) {
      if (g.score < 60) {
        recommendations.push(`Improve ${g.dimension.toLowerCase()}: ${g.detail}`)
      }
    }
    if (recommendations.length === 0) {
      recommendations.push('Course map looks healthy! Consider adding more prerequisite edges for clearer sequencing.')
    }
  }

  return { overallScore, grades, recommendations }
}
