// ── Reporting Service ────────────────────────────────────────────────────────
// Course map analytics: completion projections, progress heatmaps,
// prerequisite chain analysis, and printable summary reports.

// ── Types ────────────────────────────────────────────────────────────────────

interface MapNode {
  id: string
  label: string
  nodeType: string
  courseUnitId: string | null
}

interface MapEdge {
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface CourseModule {
  label: string
  description?: string | null
  lessons: { label: string }[]
}

interface CourseUnit {
  id: string
  label: string
  description: string | null
  modules: CourseModule[]
}

interface GraphMap {
  id: string
  courseCode?: string
  courseTitle?: string
  nodes: MapNode[]
  edges: MapEdge[]
  units: CourseUnit[]
}

export interface ProgressEntry {
  nodeId: string
  completed: boolean
  completedAt?: string | null
  startedAt?: string | null
  score?: number | null
}

export interface CompletionProjection {
  nodeId: string
  nodeLabel: string
  estimatedCompletionDate: string
  confidence: 'high' | 'medium' | 'low'
  daysRemaining: number
  percentComplete: number
}

export interface HeatmapCell {
  nodeId: string
  nodeLabel: string
  unitLabel: string
  engagementLevel: 0 | 1 | 2 | 3 | 4
  completionRate: number
  averageScore: number | null
  studentCount: number
}

export interface ChainAnalysis {
  criticalPath: { nodeId: string; nodeLabel: string }[]
  criticalPathLength: number
  longestChains: { chain: { nodeId: string; nodeLabel: string }[]; length: number }[]
  bottleneckNodes: { nodeId: string; nodeLabel: string; dependentCount: number; inDegree: number; outDegree: number }[]
  stats: {
    totalNodes: number
    totalEdges: number
    prereqEdges: number
    avgChainLength: number
    maxChainLength: number
    isolatedNodes: number
  }
}

export interface PrintableSummary {
  courseTitle: string
  courseCode: string
  generatedAt: string
  overview: {
    totalUnits: number
    totalModules: number
    totalLessons: number
    totalNodes: number
    totalEdges: number
  }
  units: {
    label: string
    description: string | null
    moduleCount: number
    lessonCount: number
    modules: { label: string; lessonCount: number }[]
  }[]
  prerequisites: {
    criticalPathLength: number
    bottleneckCount: number
    isolatedNodeCount: number
  }
  projections?: {
    estimatedCompletionDate: string
    averageConfidence: string
    completedCount: number
    remainingCount: number
  }
}

// ── Completion Projections ──────────────────────────────────────────────────

export function getCompletionProjections(
  nodes: MapNode[],
  progressData: ProgressEntry[],
): CompletionProjection[] {
  const progressMap = new Map(progressData.map((p) => [p.nodeId, p]))

  // Calculate average pace from completed items
  const completedEntries = progressData.filter((p) => p.completed && p.completedAt && p.startedAt)
  let avgDaysPerNode = 3 // default assumption

  if (completedEntries.length >= 2) {
    const durations = completedEntries.map((e) => {
      const start = new Date(e.startedAt!).getTime()
      const end = new Date(e.completedAt!).getTime()
      return (end - start) / (1000 * 60 * 60 * 24)
    })
    avgDaysPerNode = Math.max(0.5, durations.reduce((a, b) => a + b, 0) / durations.length)
  }

  const completedCount = progressData.filter((p) => p.completed).length
  const totalCount = nodes.length
  const percentDone = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const projections: CompletionProjection[] = []
  let dayOffset = 0

  for (const node of nodes) {
    const progress = progressMap.get(node.id)

    if (progress?.completed) {
      projections.push({
        nodeId: node.id,
        nodeLabel: node.label,
        estimatedCompletionDate: progress.completedAt || new Date().toISOString(),
        confidence: 'high',
        daysRemaining: 0,
        percentComplete: 100,
      })
      continue
    }

    dayOffset += avgDaysPerNode
    const estimatedDate = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000)

    // Confidence degrades with distance
    const confidence: 'high' | 'medium' | 'low' =
      dayOffset <= avgDaysPerNode * 3 ? 'high' : dayOffset <= avgDaysPerNode * 7 ? 'medium' : 'low'

    projections.push({
      nodeId: node.id,
      nodeLabel: node.label,
      estimatedCompletionDate: estimatedDate.toISOString(),
      confidence,
      daysRemaining: Math.ceil(dayOffset),
      percentComplete: progress?.startedAt ? 50 : 0,
    })
  }

  // Adjust percentComplete based on overall progress
  for (const p of projections) {
    if (p.percentComplete === 0 && percentDone > 0) {
      p.percentComplete = Math.round(percentDone * 0.1) // slight bump for overall momentum
    }
  }

  return projections
}

// ── Progress Heatmap ────────────────────────────────────────────────────────

export function getProgressHeatmap(
  nodes: MapNode[],
  units: CourseUnit[],
  studentProgress: ProgressEntry[],
): HeatmapCell[] {
  const unitMap = new Map(units.map((u) => [u.id, u.label]))

  // Group progress by node
  const nodeProgress = new Map<string, ProgressEntry[]>()
  for (const entry of studentProgress) {
    const existing = nodeProgress.get(entry.nodeId) || []
    existing.push(entry)
    nodeProgress.set(entry.nodeId, existing)
  }

  return nodes.map((node) => {
    const entries = nodeProgress.get(node.id) || []
    const completedCount = entries.filter((e) => e.completed).length
    const totalStudents = Math.max(entries.length, 1)
    const completionRate = completedCount / totalStudents

    const scores = entries.filter((e) => e.score != null).map((e) => e.score!)
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null

    // Engagement: 0=none, 1=low, 2=medium, 3=high, 4=complete
    let engagementLevel: 0 | 1 | 2 | 3 | 4
    if (entries.length === 0) engagementLevel = 0
    else if (completionRate >= 0.9) engagementLevel = 4
    else if (completionRate >= 0.6) engagementLevel = 3
    else if (completionRate >= 0.3) engagementLevel = 2
    else engagementLevel = 1

    return {
      nodeId: node.id,
      nodeLabel: node.label,
      unitLabel: unitMap.get(node.courseUnitId || '') || 'Unassigned',
      engagementLevel,
      completionRate: Math.round(completionRate * 100),
      averageScore,
      studentCount: entries.length,
    }
  })
}

// ── Prerequisite Chain Analysis ─────────────────────────────────────────────

export function getPrerequisiteChainAnalysis(
  nodes: MapNode[],
  edges: MapEdge[],
): ChainAnalysis {
  const prereqEdges = edges.filter((e) => e.edgeType === 'PREREQUISITE')
  const nodeLabels = new Map(nodes.map((n) => [n.id, n.label]))
  const nodeIds = new Set(nodes.map((n) => n.id))

  // Build adjacency lists
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()

  for (const edge of prereqEdges) {
    const outs = outgoing.get(edge.fromNodeId) || []
    outs.push(edge.toNodeId)
    outgoing.set(edge.fromNodeId, outs)

    const ins = incoming.get(edge.toNodeId) || []
    ins.push(edge.fromNodeId)
    incoming.set(edge.toNodeId, ins)
  }

  // Find longest path from each node using DFS + memoization
  const longestFrom = new Map<string, string[]>()

  function dfs(nodeId: string, visited: Set<string>): string[] {
    if (longestFrom.has(nodeId)) return longestFrom.get(nodeId)!
    if (visited.has(nodeId)) return [nodeId] // cycle — break

    visited.add(nodeId)
    const successors = outgoing.get(nodeId) || []
    let bestChain: string[] = [nodeId]

    for (const succ of successors) {
      if (!nodeIds.has(succ)) continue
      const chain = dfs(succ, visited)
      if (chain.length + 1 > bestChain.length) {
        bestChain = [nodeId, ...chain]
      }
    }

    visited.delete(nodeId)
    longestFrom.set(nodeId, bestChain)
    return bestChain
  }

  // Compute longest chains from all roots (nodes with no incoming prereqs)
  const roots = nodes.filter((n) => !(incoming.get(n.id)?.length))
  const allChains: { chain: { nodeId: string; nodeLabel: string }[]; length: number }[] = []

  for (const root of roots) {
    const chain = dfs(root.id, new Set())
    allChains.push({
      chain: chain.map((id) => ({ nodeId: id, nodeLabel: nodeLabels.get(id) || id })),
      length: chain.length,
    })
  }

  // Also check non-root nodes for chains (cycle scenarios)
  for (const node of nodes) {
    if (!longestFrom.has(node.id)) {
      const chain = dfs(node.id, new Set())
      allChains.push({
        chain: chain.map((id) => ({ nodeId: id, nodeLabel: nodeLabels.get(id) || id })),
        length: chain.length,
      })
    }
  }

  // Sort by length descending
  allChains.sort((a, b) => b.length - a.length)

  const criticalPath = allChains.length > 0 ? allChains[0].chain : []
  const longestChains = allChains.slice(0, 5)

  // Bottleneck nodes: high in+out degree in prereq graph
  const bottleneckNodes = nodes
    .map((n) => ({
      nodeId: n.id,
      nodeLabel: n.label,
      inDegree: incoming.get(n.id)?.length || 0,
      outDegree: outgoing.get(n.id)?.length || 0,
      dependentCount: (outgoing.get(n.id)?.length || 0) + (incoming.get(n.id)?.length || 0),
    }))
    .filter((n) => n.dependentCount >= 2)
    .sort((a, b) => b.dependentCount - a.dependentCount)
    .slice(0, 10)

  // Isolated nodes (no prereq edges at all)
  const connectedNodes = new Set<string>()
  for (const edge of prereqEdges) {
    connectedNodes.add(edge.fromNodeId)
    connectedNodes.add(edge.toNodeId)
  }
  const isolatedNodes = nodes.filter((n) => !connectedNodes.has(n.id))

  // Chain length stats
  const chainLengths = allChains.map((c) => c.length)
  const avgChainLength = chainLengths.length > 0 ? chainLengths.reduce((a, b) => a + b, 0) / chainLengths.length : 0

  return {
    criticalPath,
    criticalPathLength: criticalPath.length,
    longestChains,
    bottleneckNodes,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      prereqEdges: prereqEdges.length,
      avgChainLength: Math.round(avgChainLength * 10) / 10,
      maxChainLength: chainLengths.length > 0 ? Math.max(...chainLengths) : 0,
      isolatedNodes: isolatedNodes.length,
    },
  }
}

// ── Printable Summary ───────────────────────────────────────────────────────

export function generatePrintableSummary(
  graphMap: GraphMap,
  chainAnalysis?: ChainAnalysis,
  projections?: CompletionProjection[],
): PrintableSummary {
  const totalModules = graphMap.units.reduce((s, u) => s + u.modules.length, 0)
  const totalLessons = graphMap.units.reduce(
    (s, u) => s + u.modules.reduce((ms, m) => ms + m.lessons.length, 0),
    0,
  )

  const summary: PrintableSummary = {
    courseTitle: graphMap.courseTitle || 'Course Map',
    courseCode: graphMap.courseCode || 'N/A',
    generatedAt: new Date().toISOString(),
    overview: {
      totalUnits: graphMap.units.length,
      totalModules,
      totalLessons,
      totalNodes: graphMap.nodes.length,
      totalEdges: graphMap.edges.length,
    },
    units: graphMap.units.map((u) => ({
      label: u.label,
      description: u.description,
      moduleCount: u.modules.length,
      lessonCount: u.modules.reduce((s, m) => s + m.lessons.length, 0),
      modules: u.modules.map((m) => ({
        label: m.label,
        lessonCount: m.lessons.length,
      })),
    })),
    prerequisites: chainAnalysis
      ? {
          criticalPathLength: chainAnalysis.criticalPathLength,
          bottleneckCount: chainAnalysis.bottleneckNodes.length,
          isolatedNodeCount: chainAnalysis.stats.isolatedNodes,
        }
      : {
          criticalPathLength: 0,
          bottleneckCount: 0,
          isolatedNodeCount: 0,
        },
  }

  if (projections && projections.length > 0) {
    const completed = projections.filter((p) => p.daysRemaining === 0)
    const remaining = projections.filter((p) => p.daysRemaining > 0)
    const lastProjection = remaining.length > 0
      ? remaining.reduce((latest, p) =>
          new Date(p.estimatedCompletionDate) > new Date(latest.estimatedCompletionDate) ? p : latest,
        )
      : null

    const confidenceCounts = { high: 0, medium: 0, low: 0 }
    for (const p of projections) confidenceCounts[p.confidence]++
    const avgConfidence =
      confidenceCounts.high >= confidenceCounts.medium && confidenceCounts.high >= confidenceCounts.low
        ? 'high'
        : confidenceCounts.medium >= confidenceCounts.low
          ? 'medium'
          : 'low'

    summary.projections = {
      estimatedCompletionDate: lastProjection?.estimatedCompletionDate || new Date().toISOString(),
      averageConfidence: avgConfidence,
      completedCount: completed.length,
      remainingCount: remaining.length,
    }
  }

  return summary
}
