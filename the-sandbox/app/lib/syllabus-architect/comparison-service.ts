/**
 * Course Map Comparison Service
 *
 * Side-by-side structural comparison of two courses' maps using
 * simple string similarity (Jaccard on tokenized labels). No AI needed.
 */

import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComparisonNodeInfo {
  id: string
  label: string
  nodeType: string
  unitType: string | null
}

export interface OverlapMatch {
  nodeA: ComparisonNodeInfo
  nodeB: ComparisonNodeInfo
  similarity: number
}

export interface CourseInfo {
  id: string
  courseCode: string
  title: string
}

export interface StructuralStats {
  nodeCount: number
  edgeCount: number
  unitTypeDistribution: Record<string, number>
  edgeTypeDistribution: Record<string, number>
}

export interface CourseMapStructuralComparison {
  courseA: CourseInfo
  courseB: CourseInfo
  statsA: StructuralStats
  statsB: StructuralStats
  overlaps: OverlapMatch[]
  uniqueToA: ComparisonNodeInfo[]
  uniqueToB: ComparisonNodeInfo[]
  summary: string[]
}

// ── String Similarity ────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 1),
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  const union = a.size + b.size - intersection
  return union > 0 ? intersection / union : 0
}

// Similarity threshold for considering two nodes a match
const MATCH_THRESHOLD = 0.4

// ── Service ──────────────────────────────────────────────────────────────────

export async function compareCourseMapStructures(
  courseIdA: string,
  courseIdB: string,
): Promise<CourseMapStructuralComparison> {
  // Fetch both course maps in parallel
  const [mapA, mapB] = await Promise.all([
    prisma.courseMap.findUnique({
      where: { courseId: courseIdA },
      include: {
        course: { select: { id: true, courseCode: true, title: true } },
        nodes: {
          where: { archived: false },
          include: { courseUnit: { select: { unitType: true } } },
        },
        edges: true,
      },
    }),
    prisma.courseMap.findUnique({
      where: { courseId: courseIdB },
      include: {
        course: { select: { id: true, courseCode: true, title: true } },
        nodes: {
          where: { archived: false },
          include: { courseUnit: { select: { unitType: true } } },
        },
        edges: true,
      },
    }),
  ])

  if (!mapA) throw new Error(`Course map not found for course ${courseIdA}`)
  if (!mapB) throw new Error(`Course map not found for course ${courseIdB}`)

  // Build structural stats
  const buildStats = (map: typeof mapA): StructuralStats => {
    const unitTypeDistribution: Record<string, number> = {}
    for (const n of map!.nodes) {
      const ut = n.courseUnit?.unitType || 'OTHER'
      unitTypeDistribution[ut] = (unitTypeDistribution[ut] || 0) + 1
    }

    const edgeTypeDistribution: Record<string, number> = {}
    for (const e of map!.edges) {
      edgeTypeDistribution[e.edgeType] = (edgeTypeDistribution[e.edgeType] || 0) + 1
    }

    return {
      nodeCount: map!.nodes.length,
      edgeCount: map!.edges.length,
      unitTypeDistribution,
      edgeTypeDistribution,
    }
  }

  const statsA = buildStats(mapA)
  const statsB = buildStats(mapB)

  // Build node info arrays
  const nodesA: ComparisonNodeInfo[] = mapA.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    nodeType: n.nodeType,
    unitType: n.courseUnit?.unitType ?? null,
  }))

  const nodesB: ComparisonNodeInfo[] = mapB.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    nodeType: n.nodeType,
    unitType: n.courseUnit?.unitType ?? null,
  }))

  // Tokenize all labels
  const tokensA = nodesA.map((n) => ({ node: n, tokens: tokenize(n.label) }))
  const tokensB = nodesB.map((n) => ({ node: n, tokens: tokenize(n.label) }))

  // Find overlapping nodes via greedy best-match
  const overlaps: OverlapMatch[] = []
  const matchedA = new Set<string>()
  const matchedB = new Set<string>()

  // Compute all pairwise similarities
  const candidates: Array<{ a: typeof tokensA[0]; b: typeof tokensB[0]; sim: number }> = []
  for (const a of tokensA) {
    for (const b of tokensB) {
      const sim = jaccardSimilarity(a.tokens, b.tokens)
      if (sim >= MATCH_THRESHOLD) {
        candidates.push({ a, b, sim })
      }
    }
  }

  // Sort by similarity descending, greedily assign matches
  candidates.sort((x, y) => y.sim - x.sim)
  for (const c of candidates) {
    if (matchedA.has(c.a.node.id) || matchedB.has(c.b.node.id)) continue
    overlaps.push({ nodeA: c.a.node, nodeB: c.b.node, similarity: Math.round(c.sim * 100) / 100 })
    matchedA.add(c.a.node.id)
    matchedB.add(c.b.node.id)
  }

  const uniqueToA = nodesA.filter((n) => !matchedA.has(n.id))
  const uniqueToB = nodesB.filter((n) => !matchedB.has(n.id))

  // Generate summary findings
  const summary: string[] = []

  const overlapPct =
    nodesA.length + nodesB.length > 0
      ? Math.round((overlaps.length * 2) / (nodesA.length + nodesB.length) * 100)
      : 0
  summary.push(`${overlapPct}% topic overlap (${overlaps.length} matched nodes out of ${nodesA.length} + ${nodesB.length}).`)

  if (uniqueToA.length > 0) {
    summary.push(
      `${mapA.course.courseCode} has ${uniqueToA.length} unique topic${uniqueToA.length !== 1 ? 's' : ''}: ${uniqueToA.slice(0, 3).map((n) => n.label).join(', ')}${uniqueToA.length > 3 ? '...' : ''}.`,
    )
  }
  if (uniqueToB.length > 0) {
    summary.push(
      `${mapB.course.courseCode} has ${uniqueToB.length} unique topic${uniqueToB.length !== 1 ? 's' : ''}: ${uniqueToB.slice(0, 3).map((n) => n.label).join(', ')}${uniqueToB.length > 3 ? '...' : ''}.`,
    )
  }

  const edgeDiff = Math.abs(statsA.edgeCount - statsB.edgeCount)
  if (edgeDiff > 0) {
    const more = statsA.edgeCount > statsB.edgeCount ? mapA.course.courseCode : mapB.course.courseCode
    summary.push(`${more} has ${edgeDiff} more connection${edgeDiff !== 1 ? 's' : ''}.`)
  }

  return {
    courseA: mapA.course,
    courseB: mapB.course,
    statsA,
    statsB,
    overlaps,
    uniqueToA,
    uniqueToB,
    summary,
  }
}
