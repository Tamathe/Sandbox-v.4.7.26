import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface KeyboardNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

interface KeyboardEdge {
  fromNodeId: string
  toNodeId: string
}

interface MilestoneInfo {
  nodeId: string
  achieved: boolean
  label: string
}

interface UseCourseMapKeyboardOptions {
  nodes: KeyboardNode[]
  edges: KeyboardEdge[]
  milestones?: MilestoneInfo[]
  annotationCounts?: Map<string, number>
  isEditorRole: boolean
  disabled?: boolean
  onSelectNode: (nodeId: string | null) => void
  onFocusNode: (nodeId: string | null) => void
  selectedNodeId: string | null
  connectSource: string | null
  canvasMode: 'select' | 'connect'
  onStartConnect?: (nodeId: string) => void
  onCancelConnect?: () => void
  onScrollToNode?: (node: KeyboardNode) => void
}

interface UseCourseMapKeyboardReturn {
  focusedNodeId: string | null
  announcement: string
  handleCanvasKeyDown: (e: React.KeyboardEvent) => void
  announce: (msg: string) => void
  setFocusedNodeId: (id: string | null) => void
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCourseMapKeyboard(options: UseCourseMapKeyboardOptions): UseCourseMapKeyboardReturn {
  const {
    nodes,
    edges,
    milestones = [],
    annotationCounts,
    isEditorRole,
    disabled = false,
    onSelectNode,
    onFocusNode,
    selectedNodeId,
    connectSource,
    canvasMode,
    onStartConnect,
    onCancelConnect,
    onScrollToNode,
  } = options

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced announce (300ms)
  const announce = useCallback((msg: string) => {
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current)
    setAnnouncement('')
    announceTimerRef.current = setTimeout(() => {
      setAnnouncement(msg)
    }, 50) // Short delay to ensure screen readers pick up the change
  }, [])

  // Clean up timer
  useEffect(() => {
    return () => {
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current)
    }
  }, [])

  // Sync focus changes outward
  useEffect(() => {
    onFocusNode(focusedNodeId)
  }, [focusedNodeId, onFocusNode])

  const getActiveNodes = useCallback(() => {
    return nodes.filter((n) => !n.archived)
  }, [nodes])

  const buildNodeAnnouncement = useCallback((node: KeyboardNode) => {
    const edgeCount = edges.filter((e) => e.fromNodeId === node.id || e.toNodeId === node.id).length
    const milestone = milestones.find((m) => m.nodeId === node.id)
    const annotCount = annotationCounts?.get(node.id) ?? 0

    let msg = `${node.label}, ${node.nodeType} node, ${edgeCount} connection${edgeCount !== 1 ? 's' : ''}`
    if (milestone) {
      msg += `, milestone: ${milestone.label}${milestone.achieved ? ' (achieved)' : ''}`
    }
    if (annotCount > 0) {
      msg += `, ${annotCount} annotation${annotCount !== 1 ? 's' : ''}`
    }
    return msg
  }, [edges, milestones, annotationCounts])

  const focusAndAnnounce = useCallback((node: KeyboardNode) => {
    setFocusedNodeId(node.id)
    announce(buildNodeAnnouncement(node))
    onScrollToNode?.(node)
  }, [announce, buildNodeAnnouncement, onScrollToNode])

  // Navigate to connected node in direction (follows edges first, then spatial)
  const navigateDirection = useCallback((current: KeyboardNode, direction: string, activeNodes: KeyboardNode[]) => {
    // Get connected node IDs
    const connectedIds = new Set<string>()
    for (const edge of edges) {
      if (edge.fromNodeId === current.id) connectedIds.add(edge.toNodeId)
      if (edge.toNodeId === current.id) connectedIds.add(edge.fromNodeId)
    }

    // Try connected nodes first, then all nodes
    const candidates = [
      ...activeNodes.filter((n) => connectedIds.has(n.id)),
      ...activeNodes.filter((n) => !connectedIds.has(n.id) && n.id !== current.id),
    ]

    let bestNode: KeyboardNode | null = null
    let bestDist = Infinity

    for (const node of candidates) {
      if (node.id === current.id) continue
      const dx = node.xPos - current.xPos
      const dy = node.yPos - current.yPos
      const directionMatch =
        (direction === 'ArrowRight' && dx > 0) ||
        (direction === 'ArrowLeft' && dx < 0) ||
        (direction === 'ArrowDown' && dy > 0) ||
        (direction === 'ArrowUp' && dy < 0)
      if (!directionMatch) continue
      const dist = Math.sqrt(dx * dx + dy * dy)
      // Prefer connected nodes (weight them closer)
      const weight = connectedIds.has(node.id) ? 0.5 : 1.0
      if (dist * weight < bestDist) {
        bestDist = dist * weight
        bestNode = node
      }
    }

    return bestNode
  }, [edges])

  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return
    const activeNodes = getActiveNodes()
    if (activeNodes.length === 0) return

    // Arrow keys: navigate between nodes
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const current = focusedNodeId ? activeNodes.find((n) => n.id === focusedNodeId) : null
      if (!current) {
        focusAndAnnounce(activeNodes[0])
        return
      }
      const target = navigateDirection(current, e.key, activeNodes)
      if (target) focusAndAnnounce(target)
      return
    }

    // Tab / Shift+Tab: cycle through all nodes in DOM order
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        const idx = focusedNodeId ? activeNodes.findIndex((n) => n.id === focusedNodeId) : 0
        const prev = activeNodes[(idx - 1 + activeNodes.length) % activeNodes.length]
        focusAndAnnounce(prev)
      } else {
        const idx = focusedNodeId ? activeNodes.findIndex((n) => n.id === focusedNodeId) : -1
        const next = activeNodes[(idx + 1) % activeNodes.length]
        focusAndAnnounce(next)
      }
      return
    }

    // Enter: open node detail drawer
    if (e.key === 'Enter' && focusedNodeId) {
      e.preventDefault()
      onSelectNode(focusedNodeId)
      const node = activeNodes.find((n) => n.id === focusedNodeId)
      if (node) announce(`Opened details for ${node.label}`)
      return
    }

    // Escape: close drawer or cancel connect
    if (e.key === 'Escape') {
      if (selectedNodeId) {
        onSelectNode(null)
        announce('Closed detail drawer')
      } else if (canvasMode === 'connect' && connectSource) {
        onCancelConnect?.()
        announce('Cancelled connect mode')
      }
      return
    }

    // Home: jump to first node
    if (e.key === 'Home') {
      e.preventDefault()
      focusAndAnnounce(activeNodes[0])
      return
    }

    // End: jump to last node
    if (e.key === 'End') {
      e.preventDefault()
      focusAndAnnounce(activeNodes[activeNodes.length - 1])
      return
    }

    // E: enter connect mode from focused node
    if ((e.key === 'e' || e.key === 'E') && focusedNodeId && isEditorRole) {
      e.preventDefault()
      onStartConnect?.(focusedNodeId)
      const node = activeNodes.find((n) => n.id === focusedNodeId)
      announce(`Connect mode started from ${node?.label || 'node'}. Navigate to target and press Enter.`)
      return
    }
  }, [
    disabled, getActiveNodes, focusedNodeId, focusAndAnnounce,
    navigateDirection, onSelectNode, selectedNodeId, canvasMode,
    connectSource, onCancelConnect, isEditorRole, onStartConnect, announce,
  ])

  return {
    focusedNodeId,
    announcement,
    handleCanvasKeyDown,
    announce,
    setFocusedNodeId,
  }
}
