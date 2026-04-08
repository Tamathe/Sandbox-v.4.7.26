// ── Teaching Assistant Service ────────────────────────────────────────────────
// AI-powered teaching assistant for course map: context-aware Q&A, node
// improvement suggestions, structure analysis, and narrative summaries.

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface NodeContext {
  id: string
  label: string
  nodeType: string
  unitDescription: string | null
  modules: { label: string; lessonCount: number }[]
  incomingEdges: { fromLabel: string; edgeType: string }[]
  outgoingEdges: { toLabel: string; edgeType: string }[]
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
  edgeType: string
}

interface CourseModule {
  label: string
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

// ── Context building ─────────────────────────────────────────────────────────

export function getContextSummary(graphMap: GraphMap): string {
  const nodeCount = graphMap.nodes.length
  const edgeCount = graphMap.edges.length
  const unitCount = graphMap.units.length
  const totalModules = graphMap.units.reduce((sum, u) => sum + u.modules.length, 0)
  const totalLessons = graphMap.units.reduce(
    (sum, u) => sum + u.modules.reduce((ms, m) => ms + m.lessons.length, 0),
    0,
  )

  const unitSummaries = graphMap.units.map((u) => {
    const mods = u.modules.map((m) => `  - ${m.label} (${m.lessons.length} lessons)`).join('\n')
    return `Unit: ${u.label}${u.description ? ` — ${u.description}` : ''}\n${mods || '  (no modules)'}`
  }).join('\n\n')

  const edgeSummary = graphMap.edges.map((e) => {
    const from = graphMap.nodes.find((n) => n.id === e.fromNodeId)?.label ?? e.fromNodeId
    const to = graphMap.nodes.find((n) => n.id === e.toNodeId)?.label ?? e.toNodeId
    return `${from} --[${e.edgeType}]--> ${to}`
  }).join('\n')

  return [
    `Course Map Overview: ${nodeCount} nodes, ${edgeCount} edges, ${unitCount} units, ${totalModules} modules, ${totalLessons} lessons.`,
    '',
    '## Units & Modules',
    unitSummaries,
    '',
    '## Relationships',
    edgeSummary || '(no edges)',
  ].join('\n')
}

export function getNodeContext(nodeId: string, graphMap: GraphMap): NodeContext | null {
  const node = graphMap.nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const unit = graphMap.units.find((u) => u.id === node.courseUnitId)

  return {
    id: node.id,
    label: node.label,
    nodeType: node.nodeType,
    unitDescription: unit?.description ?? null,
    modules: (unit?.modules ?? []).map((m) => ({
      label: m.label,
      lessonCount: m.lessons.length,
    })),
    incomingEdges: graphMap.edges
      .filter((e) => e.toNodeId === nodeId)
      .map((e) => ({
        fromLabel: graphMap.nodes.find((n) => n.id === e.fromNodeId)?.label ?? e.fromNodeId,
        edgeType: e.edgeType,
      })),
    outgoingEdges: graphMap.edges
      .filter((e) => e.fromNodeId === nodeId)
      .map((e) => ({
        toLabel: graphMap.nodes.find((n) => n.id === e.toNodeId)?.label ?? e.toNodeId,
        edgeType: e.edgeType,
      })),
  }
}

// ── AI calls ─────────────────────────────────────────────────────────────────

export async function askAssistant(
  question: string,
  contextSummary: string,
  userEmail: string,
): Promise<string> {
  const res = await fetch('/api/courses/course-map/teaching-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    body: JSON.stringify({ action: 'ask', question, context: contextSummary }),
  })
  if (!res.ok) throw new Error('Teaching assistant request failed')
  const data = await res.json()
  return data.answer as string
}

export async function suggestNodeImprovements(
  nodeContext: NodeContext,
  contextSummary: string,
  userEmail: string,
): Promise<string> {
  const res = await fetch('/api/courses/course-map/teaching-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    body: JSON.stringify({ action: 'improve-node', nodeContext, context: contextSummary }),
  })
  if (!res.ok) throw new Error('Node improvement request failed')
  const data = await res.json()
  return data.answer as string
}

export async function generateContentSummary(
  contextSummary: string,
  userEmail: string,
): Promise<string> {
  const res = await fetch('/api/courses/course-map/teaching-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    body: JSON.stringify({ action: 'summarize', context: contextSummary }),
  })
  if (!res.ok) throw new Error('Summary request failed')
  const data = await res.json()
  return data.answer as string
}

export async function answerStructureQuestion(
  question: string,
  contextSummary: string,
  userEmail: string,
): Promise<string> {
  const res = await fetch('/api/courses/course-map/teaching-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    body: JSON.stringify({ action: 'structure', question, context: contextSummary }),
  })
  if (!res.ok) throw new Error('Structure question request failed')
  const data = await res.json()
  return data.answer as string
}
