// ── Smart Suggestions Engine ─────────────────────────────────────────────────
// Client-side graph analysis to detect structural issues in the course map,
// with optional AI enhancement for resource recommendations.

// ── Types ────────────────────────────────────────────────────────────────────

export type SuggestionCategory = 'prerequisites' | 'ordering' | 'content-gaps' | 'resources'
export type SuggestionSeverity = 'critical' | 'warning' | 'info'

export interface Suggestion {
  id: string
  category: SuggestionCategory
  severity: SuggestionSeverity
  title: string
  description: string
  nodeId?: string
  nodeLabel?: string
  applied: boolean
  dismissed: boolean
}

export interface AnalysisResult {
  suggestions: Suggestion[]
  stats: {
    total: number
    critical: number
    warning: number
    info: number
  }
}

interface MapNode {
  id: string
  label: string
  nodeType: string
  courseUnitId: string | null
}

interface MapEdge {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT' | string
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
  nodes: MapNode[]
  edges: MapEdge[]
  units: CourseUnit[]
}

let idCounter = 0
function nextId(): string {
  return `sug-${++idCounter}-${Date.now()}`
}

// ── Detect Missing Prerequisites ─────────────────────────────────────────────

export function detectMissingPrerequisites(nodes: MapNode[], edges: MapEdge[]): Suggestion[] {
  const suggestions: Suggestion[] = []
  const hasIncoming = new Set(edges.filter((e) => e.edgeType === 'PREREQUISITE').map((e) => e.toNodeId))
  const hasOutgoing = new Set(edges.filter((e) => e.edgeType === 'PREREQUISITE').map((e) => e.fromNodeId))

  // Nodes that have outgoing prereqs but no incoming — potential root. Skip those.
  // Nodes that are NOT root AND have no incoming prerequisites may be missing them.
  for (const node of nodes) {
    if (node.nodeType === 'ROOT' || node.nodeType === 'MILESTONE') continue
    const isRoot = hasOutgoing.has(node.id) && !hasIncoming.has(node.id)
    if (isRoot) continue

    // If node has no prerequisite edges at all (neither incoming nor outgoing)
    if (!hasIncoming.has(node.id) && !hasOutgoing.has(node.id)) {
      // Check if it has any sequence edges
      const hasAnyEdge = edges.some((e) => e.fromNodeId === node.id || e.toNodeId === node.id)
      if (!hasAnyEdge) {
        suggestions.push({
          id: nextId(),
          category: 'prerequisites',
          severity: 'warning',
          title: `Isolated node: "${node.label}"`,
          description: `This node has no connections to other nodes. Consider adding prerequisite or sequence relationships.`,
          nodeId: node.id,
          nodeLabel: node.label,
          applied: false,
          dismissed: false,
        })
      }
    }
  }

  // Detect cycles in prerequisite edges
  const prereqEdges = edges.filter((e) => e.edgeType === 'PREREQUISITE')
  const adj = new Map<string, string[]>()
  for (const e of prereqEdges) {
    if (!adj.has(e.fromNodeId)) adj.set(e.fromNodeId, [])
    adj.get(e.fromNodeId)!.push(e.toNodeId)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId)
    inStack.add(nodeId)
    for (const neighbor of adj.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true
      } else if (inStack.has(neighbor)) {
        return true
      }
    }
    inStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
      suggestions.push({
        id: nextId(),
        category: 'prerequisites',
        severity: 'critical',
        title: 'Circular prerequisite detected',
        description: `A circular dependency exists in the prerequisite chain involving "${node.label}". This could prevent students from finding a valid learning path.`,
        nodeId: node.id,
        nodeLabel: node.label,
        applied: false,
        dismissed: false,
      })
      break // Report once
    }
  }

  return suggestions
}

// ── Suggest Optimal Ordering ─────────────────────────────────────────────────

export function suggestOptimalOrdering(nodes: MapNode[], edges: MapEdge[]): Suggestion[] {
  const suggestions: Suggestion[] = []
  const prereqEdges = edges.filter((e) => e.edgeType === 'PREREQUISITE')

  // Build adjacency for topological sort
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adj.set(node.id, [])
  }
  for (const e of prereqEdges) {
    adj.get(e.fromNodeId)?.push(e.toNodeId)
    inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) ?? 0) + 1)
  }

  // Kahn's algorithm
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }
  const topoOrder: string[] = []
  while (queue.length > 0) {
    const curr = queue.shift()!
    topoOrder.push(curr)
    for (const neighbor of adj.get(curr) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  // If topoOrder is shorter than nodes, there's a cycle (already caught above)
  if (topoOrder.length < nodes.length) return suggestions

  // Check if any node has many prerequisites (potential bottleneck)
  const prereqCounts = new Map<string, number>()
  for (const e of prereqEdges) {
    prereqCounts.set(e.toNodeId, (prereqCounts.get(e.toNodeId) ?? 0) + 1)
  }
  for (const [nodeId, count] of prereqCounts) {
    if (count >= 4) {
      const node = nodes.find((n) => n.id === nodeId)
      suggestions.push({
        id: nextId(),
        category: 'ordering',
        severity: 'warning',
        title: `Bottleneck: "${node?.label ?? nodeId}"`,
        description: `This node has ${count} prerequisites. Consider whether all are necessary or if some could run concurrently.`,
        nodeId,
        nodeLabel: node?.label,
        applied: false,
        dismissed: false,
      })
    }
  }

  // Check for long sequential chains (>5 in a row)
  const sequenceEdges = edges.filter((e) => e.edgeType === 'SEQUENCE')
  const seqAdj = new Map<string, string>()
  for (const e of sequenceEdges) {
    seqAdj.set(e.fromNodeId, e.toNodeId)
  }
  for (const node of nodes) {
    let chainLen = 0
    let curr: string | undefined = node.id
    const seen = new Set<string>()
    while (curr && !seen.has(curr)) {
      seen.add(curr)
      chainLen++
      curr = seqAdj.get(curr)
    }
    if (chainLen > 5) {
      suggestions.push({
        id: nextId(),
        category: 'ordering',
        severity: 'info',
        title: `Long sequential chain starting at "${node.label}"`,
        description: `A chain of ${chainLen} sequential nodes starts here. Consider grouping some into modules or adding parallel tracks.`,
        nodeId: node.id,
        nodeLabel: node.label,
        applied: false,
        dismissed: false,
      })
      break // Report longest once
    }
  }

  return suggestions
}

// ── Identify Content Gaps ────────────────────────────────────────────────────

export function identifyContentGaps(units: CourseUnit[]): Suggestion[] {
  const suggestions: Suggestion[] = []

  for (const unit of units) {
    // Units with no modules
    if (unit.modules.length === 0) {
      suggestions.push({
        id: nextId(),
        category: 'content-gaps',
        severity: 'critical',
        title: `Empty unit: "${unit.label}"`,
        description: `This unit has no modules. Add at least one module with lessons to provide content.`,
        nodeLabel: unit.label,
        applied: false,
        dismissed: false,
      })
      continue
    }

    // Units without descriptions
    if (!unit.description || unit.description.trim().length === 0) {
      suggestions.push({
        id: nextId(),
        category: 'content-gaps',
        severity: 'info',
        title: `Missing description: "${unit.label}"`,
        description: `This unit has no description. Adding one helps students understand the purpose of the unit.`,
        nodeLabel: unit.label,
        applied: false,
        dismissed: false,
      })
    }

    // Modules with too few lessons
    for (const mod of unit.modules) {
      if (mod.lessons.length === 0) {
        suggestions.push({
          id: nextId(),
          category: 'content-gaps',
          severity: 'warning',
          title: `Empty module: "${mod.label}" in "${unit.label}"`,
          description: `This module has no lessons. Consider adding content or removing the module.`,
          nodeLabel: unit.label,
          applied: false,
          dismissed: false,
        })
      }
    }
  }

  return suggestions
}

// ── Recommend Related Resources (AI-enhanced) ────────────────────────────────

export async function recommendRelatedResources(
  nodeLabel: string,
  courseContext: string,
  userEmail: string,
): Promise<Suggestion[]> {
  try {
    const res = await fetch('/api/courses/course-map/teaching-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
      body: JSON.stringify({
        action: 'resources',
        question: `Suggest 2-3 related resources or cross-references for the topic: "${nodeLabel}"`,
        context: courseContext,
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const answer = data.answer as string

    return [{
      id: nextId(),
      category: 'resources',
      severity: 'info',
      title: `Resources for "${nodeLabel}"`,
      description: answer,
      nodeLabel,
      applied: false,
      dismissed: false,
    }]
  } catch {
    return []
  }
}

// ── Full Analysis ────────────────────────────────────────────────────────────

export function runFullAnalysis(graphMap: GraphMap): AnalysisResult {
  idCounter = 0

  const allSuggestions: Suggestion[] = [
    ...detectMissingPrerequisites(graphMap.nodes, graphMap.edges),
    ...suggestOptimalOrdering(graphMap.nodes, graphMap.edges),
    ...identifyContentGaps(graphMap.units),
  ]

  // Sort by severity priority
  const severityOrder: Record<SuggestionSeverity, number> = { critical: 0, warning: 1, info: 2 }
  allSuggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    suggestions: allSuggestions,
    stats: {
      total: allSuggestions.length,
      critical: allSuggestions.filter((s) => s.severity === 'critical').length,
      warning: allSuggestions.filter((s) => s.severity === 'warning').length,
      info: allSuggestions.filter((s) => s.severity === 'info').length,
    },
  }
}
