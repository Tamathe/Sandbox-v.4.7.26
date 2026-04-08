// ── AI Course Map Assistant Service (Task 97) ──────────────────────────────
// Heuristic/pattern-matching NLP command processing — no LLM API calls.

// ── Types ───────────────────────────────────────────────────────────────────

export type CommandType =
  | 'ADD_NODE'
  | 'REMOVE_NODE'
  | 'CONNECT'
  | 'MOVE'
  | 'REORDER'
  | 'GROUP'
  | 'DISCONNECT'
  | 'RENAME'
  | 'UNKNOWN'

export interface ParsedCommand {
  type: CommandType
  description: string
  params: Record<string, string | string[] | number | null>
  confidence: number // 0-1
}

export interface CommandResult {
  command: ParsedCommand
  preview: string // human-readable description of what will change
  actions: MapAction[]
}

export interface MapAction {
  type: 'addNode' | 'removeNode' | 'addEdge' | 'removeEdge' | 'moveNode' | 'updateNode'
  payload: Record<string, unknown>
}

export interface ConnectionSuggestion {
  fromNodeId: string
  fromLabel: string
  toNodeId: string
  toLabel: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
  reason: string
  confidence: number
}

export interface LayoutRecommendation {
  nodeId: string
  label: string
  suggestedX: number
  suggestedY: number
  reason: string
}

export interface ContextualHelp {
  title: string
  tips: string[]
  warnings: string[]
  relatedNodes: { id: string; label: string; relationship: string }[]
}

interface MapNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
  archived: boolean
}

interface MapEdge {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
}

interface CourseUnit {
  id: string
  label: string
  position: number
}

// ── Command pattern definitions ─────────────────────────────────────────────

interface CommandPattern {
  regex: RegExp
  type: CommandType
  extract: (match: RegExpMatchArray, nodes: MapNode[]) => ParsedCommand
}

function findNodeByFuzzy(nodes: MapNode[], query: string): MapNode | null {
  const lower = query.toLowerCase().trim()
  // Exact match first
  const exact = nodes.find((n) => n.label.toLowerCase() === lower)
  if (exact) return exact
  // Starts with
  const starts = nodes.find((n) => n.label.toLowerCase().startsWith(lower))
  if (starts) return starts
  // Contains
  const contains = nodes.find((n) => n.label.toLowerCase().includes(lower))
  if (contains) return contains
  // Match by number pattern (e.g., "unit 3", "lab 2")
  const numMatch = lower.match(/(\w+)\s*(\d+)/)
  if (numMatch) {
    const [, prefix, num] = numMatch
    return nodes.find((n) => {
      const nl = n.label.toLowerCase()
      return nl.includes(prefix) && nl.includes(num)
    }) || null
  }
  return null
}

function findNodesByType(nodes: MapNode[], typeHint: string): MapNode[] {
  const lower = typeHint.toLowerCase()
  return nodes.filter((n) => {
    const nl = n.label.toLowerCase()
    const nt = n.nodeType.toLowerCase()
    return nl.includes(lower) || nt.includes(lower)
  })
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // "add a quiz after Unit 3"
  {
    regex: /add\s+(?:a\s+)?(\w[\w\s]*?)\s+(?:after|following|behind)\s+(.+)/i,
    type: 'ADD_NODE',
    extract: (match, nodes) => {
      const nodeType = match[1].trim()
      const afterNode = findNodeByFuzzy(nodes, match[2])
      return {
        type: 'ADD_NODE',
        description: `Add "${nodeType}" after "${afterNode?.label || match[2]}"`,
        params: { nodeType, afterNodeId: afterNode?.id || null, afterLabel: match[2] },
        confidence: afterNode ? 0.9 : 0.5,
      }
    },
  },
  // "add a quiz before Unit 3"
  {
    regex: /add\s+(?:a\s+)?(\w[\w\s]*?)\s+(?:before|preceding)\s+(.+)/i,
    type: 'ADD_NODE',
    extract: (match, nodes) => {
      const nodeType = match[1].trim()
      const beforeNode = findNodeByFuzzy(nodes, match[2])
      return {
        type: 'ADD_NODE',
        description: `Add "${nodeType}" before "${beforeNode?.label || match[2]}"`,
        params: { nodeType, beforeNodeId: beforeNode?.id || null, beforeLabel: match[2] },
        confidence: beforeNode ? 0.9 : 0.5,
      }
    },
  },
  // "add <type>" (simple)
  {
    regex: /add\s+(?:a\s+)?(\w[\w\s]*?)$/i,
    type: 'ADD_NODE',
    extract: (match) => ({
      type: 'ADD_NODE',
      description: `Add new "${match[1].trim()}" node`,
      params: { nodeType: match[1].trim() },
      confidence: 0.7,
    }),
  },
  // "remove/delete <node>"
  {
    regex: /(?:remove|delete)\s+(.+)/i,
    type: 'REMOVE_NODE',
    extract: (match, nodes) => {
      const target = findNodeByFuzzy(nodes, match[1])
      return {
        type: 'REMOVE_NODE',
        description: `Remove "${target?.label || match[1]}"`,
        params: { nodeId: target?.id || null, nodeLabel: target?.label || match[1] },
        confidence: target ? 0.9 : 0.4,
      }
    },
  },
  // "connect all labs to the final exam"
  {
    regex: /connect\s+all\s+(\w+)s?\s+to\s+(?:the\s+)?(.+)/i,
    type: 'CONNECT',
    extract: (match, nodes) => {
      const sourceType = match[1]
      const targetNode = findNodeByFuzzy(nodes, match[2])
      const sourceNodes = findNodesByType(nodes, sourceType)
      return {
        type: 'CONNECT',
        description: `Connect all ${sourceType}s to "${targetNode?.label || match[2]}"`,
        params: {
          sourceNodeIds: sourceNodes.map((n) => n.id),
          targetNodeId: targetNode?.id || null,
          targetLabel: targetNode?.label || match[2],
          edgeType: 'PREREQUISITE',
        },
        confidence: targetNode && sourceNodes.length > 0 ? 0.85 : 0.4,
      }
    },
  },
  // "connect X to Y"
  {
    regex: /connect\s+(.+?)\s+to\s+(.+)/i,
    type: 'CONNECT',
    extract: (match, nodes) => {
      const fromNode = findNodeByFuzzy(nodes, match[1])
      const toNode = findNodeByFuzzy(nodes, match[2])
      return {
        type: 'CONNECT',
        description: `Connect "${fromNode?.label || match[1]}" → "${toNode?.label || match[2]}"`,
        params: {
          fromNodeId: fromNode?.id || null,
          toNodeId: toNode?.id || null,
          fromLabel: fromNode?.label || match[1],
          toLabel: toNode?.label || match[2],
          edgeType: 'PREREQUISITE',
        },
        confidence: fromNode && toNode ? 0.9 : 0.4,
      }
    },
  },
  // "disconnect X from Y"
  {
    regex: /disconnect\s+(.+?)\s+from\s+(.+)/i,
    type: 'DISCONNECT',
    extract: (match, nodes) => {
      const fromNode = findNodeByFuzzy(nodes, match[1])
      const toNode = findNodeByFuzzy(nodes, match[2])
      return {
        type: 'DISCONNECT',
        description: `Disconnect "${fromNode?.label || match[1]}" from "${toNode?.label || match[2]}"`,
        params: {
          fromNodeId: fromNode?.id || null,
          toNodeId: toNode?.id || null,
        },
        confidence: fromNode && toNode ? 0.9 : 0.4,
      }
    },
  },
  // "move X before/after Y"
  {
    regex: /move\s+(.+?)\s+(before|after)\s+(.+)/i,
    type: 'MOVE',
    extract: (match, nodes) => {
      const target = findNodeByFuzzy(nodes, match[1])
      const anchor = findNodeByFuzzy(nodes, match[3])
      return {
        type: 'MOVE',
        description: `Move "${target?.label || match[1]}" ${match[2]} "${anchor?.label || match[3]}"`,
        params: {
          nodeId: target?.id || null,
          anchorNodeId: anchor?.id || null,
          position: match[2].toLowerCase(),
        },
        confidence: target && anchor ? 0.9 : 0.4,
      }
    },
  },
  // "rename X to Y"
  {
    regex: /rename\s+(.+?)\s+to\s+(.+)/i,
    type: 'RENAME',
    extract: (match, nodes) => {
      const target = findNodeByFuzzy(nodes, match[1])
      return {
        type: 'RENAME',
        description: `Rename "${target?.label || match[1]}" to "${match[2]}"`,
        params: { nodeId: target?.id || null, newLabel: match[2].trim() },
        confidence: target ? 0.9 : 0.4,
      }
    },
  },
  // "group X, Y, Z"
  {
    regex: /group\s+(.+)/i,
    type: 'GROUP',
    extract: (match, nodes) => {
      const names = match[1].split(/,\s*|\s+and\s+/)
      const found = names.map((n) => findNodeByFuzzy(nodes, n.trim())).filter(Boolean) as MapNode[]
      return {
        type: 'GROUP',
        description: `Group ${found.map((n) => `"${n.label}"`).join(', ')}`,
        params: { nodeIds: found.map((n) => n.id) },
        confidence: found.length > 0 ? 0.8 : 0.3,
      }
    },
  },
  // "reorder by due date / alphabetically"
  {
    regex: /(?:reorder|sort|arrange)\s+(?:by\s+)?(.+)/i,
    type: 'REORDER',
    extract: (match) => ({
      type: 'REORDER',
      description: `Reorder nodes by ${match[1].trim()}`,
      params: { criterion: match[1].trim() },
      confidence: 0.7,
    }),
  },
]

// ── Main class ──────────────────────────────────────────────────────────────

export class CourseMapAIAssistant {
  /**
   * Parse natural language input into structured map operations.
   */
  processCommand(input: string, nodes: MapNode[], edges: MapEdge[]): CommandResult {
    const trimmed = input.trim()

    for (const pattern of COMMAND_PATTERNS) {
      const match = trimmed.match(pattern.regex)
      if (match) {
        const command = pattern.extract(match, nodes)
        return {
          command,
          preview: this.buildPreview(command, nodes, edges),
          actions: this.buildActions(command, nodes, edges),
        }
      }
    }

    // Unknown command
    return {
      command: {
        type: 'UNKNOWN',
        description: `Could not parse: "${trimmed}"`,
        params: { raw: trimmed },
        confidence: 0,
      },
      preview: 'Sorry, I didn\'t understand that command. Try things like "add a quiz after Unit 3" or "connect Lab 1 to Lab 2".',
      actions: [],
    }
  }

  /**
   * Suggest missing connections based on node structure.
   */
  suggestConnections(nodes: MapNode[], edges: MapEdge[]): ConnectionSuggestion[] {
    const suggestions: ConnectionSuggestion[] = []
    const existingEdges = new Set(edges.map((e) => `${e.fromNodeId}->${e.toNodeId}`))
    const activeNodes = nodes.filter((n) => !n.archived)

    // Pattern 1: Sequential numbering (Lab 1 → Lab 2 → Lab 3)
    const numberGroups = new Map<string, { node: MapNode; num: number }[]>()
    for (const node of activeNodes) {
      const match = node.label.match(/^(.+?)\s*(\d+)\s*$/i)
      if (match) {
        const prefix = match[1].trim().toLowerCase()
        if (!numberGroups.has(prefix)) numberGroups.set(prefix, [])
        numberGroups.get(prefix)!.push({ node, num: parseInt(match[2], 10) })
      }
    }
    for (const [, group] of numberGroups) {
      if (group.length < 2) continue
      group.sort((a, b) => a.num - b.num)
      for (let i = 0; i < group.length - 1; i++) {
        const from = group[i]
        const to = group[i + 1]
        const key = `${from.node.id}->${to.node.id}`
        if (!existingEdges.has(key)) {
          suggestions.push({
            fromNodeId: from.node.id,
            fromLabel: from.node.label,
            toNodeId: to.node.id,
            toLabel: to.node.label,
            edgeType: 'SEQUENCE',
            reason: `Sequential numbering: ${from.node.label} → ${to.node.label}`,
            confidence: 0.85,
          })
        }
      }
    }

    // Pattern 2: Intro → Advanced
    const introNodes = activeNodes.filter((n) => /\b(intro|introduction|basics|fundamentals)\b/i.test(n.label))
    const advancedNodes = activeNodes.filter((n) => /\b(advanced|intermediate|deep\s*dive)\b/i.test(n.label))
    for (const intro of introNodes) {
      for (const adv of advancedNodes) {
        const key = `${intro.id}->${adv.id}`
        if (!existingEdges.has(key) && this.topicOverlap(intro.label, adv.label)) {
          suggestions.push({
            fromNodeId: intro.id,
            fromLabel: intro.label,
            toNodeId: adv.id,
            toLabel: adv.label,
            edgeType: 'PREREQUISITE',
            reason: `"${intro.label}" is likely a prerequisite for "${adv.label}"`,
            confidence: 0.75,
          })
        }
      }
    }

    // Pattern 3: Same unit nodes should be connected sequentially
    const unitGroups = new Map<string, MapNode[]>()
    for (const node of activeNodes) {
      if (node.courseUnitId) {
        if (!unitGroups.has(node.courseUnitId)) unitGroups.set(node.courseUnitId, [])
        unitGroups.get(node.courseUnitId)!.push(node)
      }
    }
    for (const [, group] of unitGroups) {
      if (group.length < 2) continue
      // Sort by y position (top to bottom)
      group.sort((a, b) => a.yPos - b.yPos)
      for (let i = 0; i < group.length - 1; i++) {
        const key = `${group[i].id}->${group[i + 1].id}`
        if (!existingEdges.has(key)) {
          suggestions.push({
            fromNodeId: group[i].id,
            fromLabel: group[i].label,
            toNodeId: group[i + 1].id,
            toLabel: group[i + 1].label,
            edgeType: 'SEQUENCE',
            reason: 'Nodes in the same unit without a connection',
            confidence: 0.6,
          })
        }
      }
    }

    // Pattern 4: Orphan nodes — suggest connecting to nearest neighbor
    const connectedNodeIds = new Set<string>()
    for (const e of edges) {
      connectedNodeIds.add(e.fromNodeId)
      connectedNodeIds.add(e.toNodeId)
    }
    const orphans = activeNodes.filter((n) => !connectedNodeIds.has(n.id))
    for (const orphan of orphans) {
      let nearest: MapNode | null = null
      let minDist = Infinity
      for (const other of activeNodes) {
        if (other.id === orphan.id) continue
        const dist = Math.hypot(other.xPos - orphan.xPos, other.yPos - orphan.yPos)
        if (dist < minDist) {
          minDist = dist
          nearest = other
        }
      }
      if (nearest) {
        suggestions.push({
          fromNodeId: nearest.id,
          fromLabel: nearest.label,
          toNodeId: orphan.id,
          toLabel: orphan.label,
          edgeType: 'SEQUENCE',
          reason: `"${orphan.label}" is an orphan node — nearest neighbor is "${nearest.label}"`,
          confidence: 0.5,
        })
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Recommend optimal node positions.
   */
  recommendLayout(nodes: MapNode[], edges: MapEdge[], units: CourseUnit[]): LayoutRecommendation[] {
    const activeNodes = nodes.filter((n) => !n.archived)
    if (activeNodes.length === 0) return []

    const recommendations: LayoutRecommendation[] = []
    const NODE_WIDTH = 200
    const NODE_HEIGHT = 80
    const MARGIN_X = 60
    const MARGIN_Y = 40
    const START_X = 100
    const START_Y = 100

    // Build adjacency for topological sort
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()
    for (const n of activeNodes) {
      inDegree.set(n.id, 0)
      adj.set(n.id, [])
    }
    for (const e of edges) {
      if (inDegree.has(e.fromNodeId) && inDegree.has(e.toNodeId)) {
        adj.get(e.fromNodeId)!.push(e.toNodeId)
        inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) || 0) + 1)
      }
    }

    // Kahn's algorithm for topological layers
    const layers: string[][] = []
    const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id)
    const visited = new Set<string>()
    while (queue.length > 0) {
      const layer = [...queue]
      layers.push(layer)
      queue.length = 0
      for (const id of layer) {
        visited.add(id)
        for (const next of adj.get(id) || []) {
          inDegree.set(next, (inDegree.get(next) || 0) - 1)
          if (inDegree.get(next) === 0 && !visited.has(next)) {
            queue.push(next)
          }
        }
      }
    }

    // Any remaining nodes (cycles) go in the last layer
    const remaining = activeNodes.filter((n) => !visited.has(n.id)).map((n) => n.id)
    if (remaining.length > 0) layers.push(remaining)

    // Assign positions per layer
    const nodeMap = new Map(activeNodes.map((n) => [n.id, n]))
    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx]
      for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
        const node = nodeMap.get(layer[nodeIdx])
        if (!node) continue
        const suggestedX = START_X + nodeIdx * (NODE_WIDTH + MARGIN_X)
        const suggestedY = START_Y + layerIdx * (NODE_HEIGHT + MARGIN_Y)
        const dx = Math.abs(node.xPos - suggestedX)
        const dy = Math.abs(node.yPos - suggestedY)
        // Only suggest if move is significant
        if (dx > 30 || dy > 30) {
          recommendations.push({
            nodeId: node.id,
            label: node.label,
            suggestedX,
            suggestedY,
            reason: `Layer ${layerIdx + 1}, position ${nodeIdx + 1} (topological order)`,
          })
        }
      }
    }

    return recommendations
  }

  /**
   * Generate context-aware help for a selected node.
   */
  getContextualHelp(
    selectedNodeId: string | null,
    nodes: MapNode[],
    edges: MapEdge[],
    units: CourseUnit[],
  ): ContextualHelp {
    if (!selectedNodeId) {
      return {
        title: 'Course Map Help',
        tips: [
          'Select a node to see context-specific tips.',
          'Try typing a command like "add a quiz after Unit 1".',
          'Use "suggest connections" to find missing prerequisites.',
        ],
        warnings: [],
        relatedNodes: [],
      }
    }

    const node = nodes.find((n) => n.id === selectedNodeId)
    if (!node) {
      return { title: 'Node Not Found', tips: ['The selected node was not found.'], warnings: [], relatedNodes: [] }
    }

    const tips: string[] = []
    const warnings: string[] = []
    const relatedNodes: ContextualHelp['relatedNodes'] = []

    // Incoming / outgoing edges
    const incoming = edges.filter((e) => e.toNodeId === node.id)
    const outgoing = edges.filter((e) => e.fromNodeId === node.id)

    if (incoming.length === 0 && outgoing.length > 0) {
      tips.push('This is a root node — students start here.')
    }
    if (outgoing.length === 0 && incoming.length > 0) {
      tips.push('This is a terminal node — no further content follows.')
    }
    if (incoming.length === 0 && outgoing.length === 0) {
      warnings.push('This node is disconnected. Consider connecting it to the map.')
    }
    if (incoming.length > 3) {
      warnings.push(`This node has ${incoming.length} prerequisites — students may struggle to reach it.`)
    }

    // Find related nodes
    for (const e of incoming) {
      const from = nodes.find((n) => n.id === e.fromNodeId)
      if (from) relatedNodes.push({ id: from.id, label: from.label, relationship: `prerequisite (${e.edgeType})` })
    }
    for (const e of outgoing) {
      const to = nodes.find((n) => n.id === e.toNodeId)
      if (to) relatedNodes.push({ id: to.id, label: to.label, relationship: `leads to (${e.edgeType})` })
    }

    // Node type tips
    const type = node.nodeType.toLowerCase()
    if (type.includes('quiz') || type.includes('exam') || type.includes('assessment')) {
      tips.push('Assessment nodes should have prerequisites. Students need content before being tested.')
    }
    if (type.includes('lab') || type.includes('practical')) {
      tips.push('Lab nodes often work well after lecture content. Consider adding a PREREQUISITE edge.')
    }

    // Unit association
    if (!node.courseUnitId) {
      warnings.push('This node is not assigned to a unit. It may be overlooked in the syllabus.')
    }

    return {
      title: node.label,
      tips: tips.length > 0 ? tips : ['This node looks well-connected.'],
      warnings,
      relatedNodes,
    }
  }

  /**
   * Get autocomplete suggestions for partial input.
   */
  getAutocompleteSuggestions(partial: string, nodes: MapNode[]): string[] {
    const lower = partial.toLowerCase().trim()
    if (!lower) {
      return [
        'add a quiz after...',
        'connect ... to ...',
        'move ... before ...',
        'remove ...',
        'rename ... to ...',
        'reorder by due date',
        'group ...',
      ]
    }

    const suggestions: string[] = []
    const nodeLabels = nodes.filter((n) => !n.archived).map((n) => n.label)

    if (lower.startsWith('add')) {
      suggestions.push('add a quiz after...', 'add a lecture before...', 'add an assignment')
    } else if (lower.startsWith('connect')) {
      for (const label of nodeLabels.slice(0, 5)) {
        suggestions.push(`connect ${label} to...`)
      }
    } else if (lower.startsWith('remove') || lower.startsWith('delete')) {
      for (const label of nodeLabels.slice(0, 5)) {
        suggestions.push(`remove ${label}`)
      }
    } else if (lower.startsWith('move')) {
      for (const label of nodeLabels.slice(0, 5)) {
        suggestions.push(`move ${label} before...`)
      }
    } else if (lower.startsWith('rename')) {
      for (const label of nodeLabels.slice(0, 5)) {
        suggestions.push(`rename ${label} to...`)
      }
    } else if (lower.startsWith('reorder') || lower.startsWith('sort')) {
      suggestions.push('reorder by due date', 'reorder alphabetically', 'reorder by type')
    } else if (lower.startsWith('group')) {
      suggestions.push('group ...', `group ${nodeLabels.slice(0, 2).join(', ')}`)
    } else {
      // General suggestions
      suggestions.push(
        'add a...', 'connect ... to ...', 'remove ...', 'move ... before ...',
        'rename ... to ...', 'reorder by...', 'group ...',
      )
    }

    return suggestions.slice(0, 8)
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private buildPreview(command: ParsedCommand, nodes: MapNode[], edges: MapEdge[]): string {
    switch (command.type) {
      case 'ADD_NODE': {
        const { nodeType, afterNodeId, beforeNodeId } = command.params
        if (afterNodeId) {
          const after = nodes.find((n) => n.id === afterNodeId)
          return `Will add a new "${nodeType}" node after "${after?.label}". A SEQUENCE edge will be created.`
        }
        if (beforeNodeId) {
          const before = nodes.find((n) => n.id === beforeNodeId)
          return `Will add a new "${nodeType}" node before "${before?.label}". A SEQUENCE edge will be created.`
        }
        return `Will add a new "${nodeType}" node to the map.`
      }
      case 'REMOVE_NODE': {
        const target = nodes.find((n) => n.id === command.params.nodeId)
        if (!target) return `Could not find the node "${command.params.nodeLabel}".`
        const connectedEdges = edges.filter((e) => e.fromNodeId === target.id || e.toNodeId === target.id)
        return `Will remove "${target.label}" and its ${connectedEdges.length} connection(s).`
      }
      case 'CONNECT': {
        const { sourceNodeIds, fromNodeId, targetNodeId, toNodeId, edgeType } = command.params
        if (Array.isArray(sourceNodeIds) && sourceNodeIds.length > 0) {
          const targetLabel = command.params.targetLabel as string
          return `Will create ${sourceNodeIds.length} ${edgeType} edge(s) pointing to "${targetLabel}".`
        }
        const from = nodes.find((n) => n.id === fromNodeId)
        const to = nodes.find((n) => n.id === toNodeId)
        return `Will create a ${edgeType || 'PREREQUISITE'} edge: "${from?.label}" → "${to?.label}".`
      }
      case 'MOVE':
        return command.description
      case 'RENAME':
        return `Will rename the node to "${command.params.newLabel}".`
      case 'REORDER':
        return `Will rearrange all nodes by ${command.params.criterion}.`
      case 'GROUP':
        return `Will group ${(command.params.nodeIds as string[])?.length || 0} nodes together.`
      case 'DISCONNECT':
        return command.description
      default:
        return command.description
    }
  }

  private buildActions(command: ParsedCommand, nodes: MapNode[], edges: MapEdge[]): MapAction[] {
    const actions: MapAction[] = []

    switch (command.type) {
      case 'ADD_NODE': {
        const afterId = command.params.afterNodeId as string | null
        const beforeId = command.params.beforeNodeId as string | null
        const anchor = nodes.find((n) => n.id === (afterId || beforeId))
        const newId = `temp-${Date.now()}`
        const x = anchor ? anchor.xPos + 220 : 300
        const y = anchor ? anchor.yPos : 200
        actions.push({
          type: 'addNode',
          payload: {
            id: newId,
            label: `New ${command.params.nodeType}`,
            nodeType: (command.params.nodeType as string)?.toUpperCase() || 'CONTENT',
            xPos: x,
            yPos: y,
          },
        })
        if (afterId) {
          actions.push({ type: 'addEdge', payload: { fromNodeId: afterId, toNodeId: newId, edgeType: 'SEQUENCE' } })
        }
        if (beforeId) {
          actions.push({ type: 'addEdge', payload: { fromNodeId: newId, toNodeId: beforeId, edgeType: 'SEQUENCE' } })
        }
        break
      }
      case 'REMOVE_NODE': {
        const nodeId = command.params.nodeId as string
        if (nodeId) {
          actions.push({ type: 'removeNode', payload: { nodeId } })
        }
        break
      }
      case 'CONNECT': {
        const sourceIds = command.params.sourceNodeIds as string[] | undefined
        const targetId = command.params.targetNodeId as string | null
        if (sourceIds && sourceIds.length > 0 && targetId) {
          for (const srcId of sourceIds) {
            actions.push({
              type: 'addEdge',
              payload: { fromNodeId: srcId, toNodeId: targetId, edgeType: command.params.edgeType || 'PREREQUISITE' },
            })
          }
        } else {
          const fromId = command.params.fromNodeId as string | null
          const toId = command.params.toNodeId as string | null
          if (fromId && toId) {
            actions.push({
              type: 'addEdge',
              payload: { fromNodeId: fromId, toNodeId: toId, edgeType: command.params.edgeType || 'PREREQUISITE' },
            })
          }
        }
        break
      }
      case 'MOVE': {
        const nodeId = command.params.nodeId as string | null
        const anchorId = command.params.anchorNodeId as string | null
        if (nodeId && anchorId) {
          const anchor = nodes.find((n) => n.id === anchorId)
          if (anchor) {
            const position = command.params.position as string
            actions.push({
              type: 'moveNode',
              payload: {
                nodeId,
                xPos: anchor.xPos,
                yPos: position === 'before' ? anchor.yPos - 100 : anchor.yPos + 100,
              },
            })
          }
        }
        break
      }
      case 'RENAME': {
        const nodeId = command.params.nodeId as string | null
        if (nodeId) {
          actions.push({
            type: 'updateNode',
            payload: { nodeId, label: command.params.newLabel },
          })
        }
        break
      }
      // REORDER, GROUP, DISCONNECT handled at panel level
    }

    return actions
  }

  private topicOverlap(label1: string, label2: string): boolean {
    const words1 = new Set(label1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3))
    const words2 = new Set(label2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3))
    const stopWords = new Set(['intro', 'introduction', 'advanced', 'intermediate', 'basics', 'fundamentals', 'deep', 'dive'])
    let overlap = 0
    for (const w of words1) {
      if (words2.has(w) && !stopWords.has(w)) overlap++
    }
    return overlap > 0
  }
}
