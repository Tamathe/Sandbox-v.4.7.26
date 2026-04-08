import { useState, useEffect, useCallback, useRef } from 'react'
import type { GraphMap, MapEdge, CanvasMode } from './types'
import { NODE_WIDTH, NODE_HEIGHT, snapToGrid } from './types'
import type { EdgeRoutingMode, VisNode, GroupedNodeSet } from '../../../../lib/course-map/visualization-service'
import { VisualizationService } from '../../../../lib/course-map/visualization-service'
import { PerformanceService, type RenderMetrics } from '../../../../lib/course-map/performance-service'
import { RealtimeAnalyticsManager, type NodeHeatmapEntry } from '../../../../lib/course-map/realtime-analytics'
import {
  trackRenderTime,
  trackApiLatency,
  initWebVitalsObserver,
  getPerformanceReport,
  checkPerformanceBudget,
  collectMetricsBatch,
  type PerformanceReport as PerfReport,
  type BudgetViolation,
} from '../../../../lib/course-map/perf-monitor'
import { subscribeToPush, unsubscribeFromPush, isPushEnabled } from '../../../../lib/course-map/push-notifications'

interface UseCourseMapCanvasArgs {
  courseId: string
  userEmail: string | undefined
  userId: string | undefined
  isEditorRole: boolean
  graphMap: GraphMap | null
  setGraphMap: React.Dispatch<React.SetStateAction<GraphMap | null>>
  fetchData: () => Promise<void>
  totalNodeCount: number
  visibleNodeCount: number
  whiteboardActive: boolean
}

export function useCourseMapCanvas({
  courseId,
  userEmail,
  userId,
  isEditorRole,
  graphMap,
  setGraphMap,
  fetchData,
  totalNodeCount,
  visibleNodeCount,
  whiteboardActive,
}: UseCourseMapCanvasArgs) {
  // Drag state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Connect mode state
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select')
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [edgeTypePopover, setEdgeTypePopover] = useState<{
    fromNodeId: string
    toNodeId: string
    position: { x: number; y: number }
  } | null>(null)

  // Edge delete confirmation
  const [pendingDeleteEdgeId, setPendingDeleteEdgeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Edge routing mode (Task 101)
  const [edgeRoutingMode, setEdgeRoutingMode] = useState<EdgeRoutingMode>('bezier')

  // Node grouping (Task 101)
  const [showGroups, setShowGroups] = useState(false)
  const [groupedNodes, setGroupedNodes] = useState<GroupedNodeSet | null>(null)

  // Performance service (Task 102)
  const perfServiceRef = useRef<PerformanceService | null>(null)
  const [perfMetrics, setPerfMetrics] = useState<RenderMetrics | null>(null)

  // Analytics panel state
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<{
    editCountByUser: { userId: string; name: string; count: number }[]
    editCountByType: { type: string; count: number }[]
    editsPerDay: { date: string; count: number }[]
    nodeChangeFrequency: { nodeId: string; label: string; changeCount: number }[]
    collaboratorCount: number
    totalEdits: number
    mostActiveDay: string
    averageEditsPerDay: number
  } | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Real-time analytics state (Task 73)
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'realtime' | 'performance'>('overview')
  const [realtimeData, setRealtimeData] = useState<{
    liveEditCount: number
    activeUserCount: number
    activeUsers: { userId: string; name: string; lastActiveAt: string }[]
    heatmap: { nodeId: string; label: string; editCount: number; intensity: number }[]
    engagement: { totalSessions: number; avgSessionDurationMin: number; editsPerSession: number; uniqueEditors7d: number }
    timeSeries: { timestamp: string; edits: number }[]
    timeSeriesRange: '24h' | '7d' | '30d'
  } | null>(null)
  const [realtimeLoading, setRealtimeLoading] = useState(false)
  const [realtimeRange, setRealtimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [heatmapOverlay, setHeatmapOverlay] = useState(false)
  const realtimePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Performance monitoring state (Task 74)
  const [perfReport, setPerfReport] = useState<PerfReport | null>(null)
  const [perfBudgetViolations, setPerfBudgetViolations] = useState<BudgetViolation[]>([])
  const [serverPerfData, setServerPerfData] = useState<{
    renders: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number }>
    api: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number; errorRate: number }>
    webVitals: { lcp: number | null; fid: number | null; cls: number | null }
    updatedAt: string | null
  } | null>(null)

  // PWA/Offline state
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushToggling, setPushToggling] = useState(false)

  // Real-time analytics dashboard panel (Task 81)
  const [showRealtimeDashboard, setShowRealtimeDashboard] = useState(false)
  const [dashboardHeatmapData, setDashboardHeatmapData] = useState<NodeHeatmapEntry[]>([])

  // Performance profiler overlay (Task 82)
  const [showPerfOverlay, setShowPerfOverlay] = useState(false)

  // Whiteboard overlay (Task 83)
  const [whiteboardActiveState, setWhiteboardActive] = useState(false)

  // Annotation layer (Task 84)
  const [annotationLayerActive, setAnnotationLayerActive] = useState(false)
  const [annotationNodeCounts, setAnnotationNodeCounts] = useState<Map<string, number>>(new Map())

  // Search & Filter state (Task 103)
  const [showSearchFilter, setShowSearchFilter] = useState(false)
  const [searchHighlightNodeIds, setSearchHighlightNodeIds] = useState<string[]>([])
  const [filteredNodeIds, setFilteredNodeIds] = useState<Set<string> | null>(null)
  const [filteredEdgeIds, setFilteredEdgeIds] = useState<Set<string> | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── PWA install prompt ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Ctrl+Shift+P keyboard shortcut for perf overlay (Task 82)
  useEffect(() => {
    const handlePerfShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        if (process.env.NODE_ENV === 'development' || localStorage.getItem('uky-perf-profiler') === 'true') {
          setShowPerfOverlay((v) => !v)
        }
      }
    }
    window.addEventListener('keydown', handlePerfShortcut)
    return () => window.removeEventListener('keydown', handlePerfShortcut)
  }, [])

  // Ctrl+F / Cmd+F keyboard shortcut for search panel (Task 103)
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearchFilter((v) => !v)
      }
      if (e.key === 'Escape' && showSearchFilter) {
        setShowSearchFilter(false)
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [showSearchFilter])

  // Initialize push notification state (Task 80)
  useEffect(() => {
    if (courseId) {
      setPushEnabled(isPushEnabled(courseId))
    }
  }, [courseId])

  // Push notification toggle handler (Task 80)
  const handlePushToggle = useCallback(async () => {
    if (!courseId || !userEmail || pushToggling) return
    setPushToggling(true)
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(courseId, userEmail)
        setPushEnabled(false)
      } else {
        const ok = await subscribeToPush(courseId, userEmail)
        setPushEnabled(ok)
      }
    } finally {
      setPushToggling(false)
    }
  }, [courseId, userEmail, pushEnabled, pushToggling])

  // Initialize performance service
  useEffect(() => {
    const svc = new PerformanceService()
    perfServiceRef.current = svc
    svc.startTracking(60)
    return () => svc.dispose()
  }, [])

  // Update perf metrics periodically
  useEffect(() => {
    if (!perfServiceRef.current) return
    const interval = setInterval(() => {
      if (!perfServiceRef.current) return
      const metrics = perfServiceRef.current.measureRenderPerformance(
        totalNodeCount,
        visibleNodeCount,
        graphMap?.edges.length || 0,
      )
      setPerfMetrics(metrics)
    }, 2000)
    return () => clearInterval(interval)
  }, [totalNodeCount, visibleNodeCount, graphMap?.edges.length])

  // Recompute groups when nodes or showGroups changes
  useEffect(() => {
    if (!showGroups || !graphMap) {
      setGroupedNodes(null)
      return
    }
    const unitMapForGroups = new Map<string, { unitType: string; label: string }>()
    for (const unit of graphMap.units) {
      unitMapForGroups.set(unit.id, { unitType: unit.unitType, label: unit.label })
    }
    const visNodes: VisNode[] = graphMap.nodes.map((n) => ({
      ...n,
      label: n.label,
      nodeType: n.nodeType,
      courseUnitId: n.courseUnitId,
    }))
    setGroupedNodes(VisualizationService.groupNodes(visNodes, 'unitType', unitMapForGroups))
  }, [showGroups, graphMap])

  // Group toggle handler
  const handleToggleGroup = useCallback((groupId: string) => {
    if (VisualizationService.isGroupCollapsed(groupId)) {
      VisualizationService.expandGroup(groupId)
    } else {
      VisualizationService.collapseGroup(groupId)
    }
    if (graphMap) {
      const unitMapForGroups = new Map<string, { unitType: string; label: string }>()
      for (const unit of graphMap.units) {
        unitMapForGroups.set(unit.id, { unitType: unit.unitType, label: unit.label })
      }
      const visNodes: VisNode[] = graphMap.nodes.map((n) => ({
        ...n,
        label: n.label,
        nodeType: n.nodeType,
        courseUnitId: n.courseUnitId,
      }))
      setGroupedNodes(VisualizationService.groupNodes(visNodes, 'unitType', unitMapForGroups))
    }
  }, [graphMap])

  // Zoom-to-fit handler
  const handleZoomToFit = useCallback(() => {
    if (!graphMap || !scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const result = VisualizationService.zoomToFit(
      graphMap.nodes as VisNode[],
      { width: container.clientWidth, height: container.clientHeight },
      60,
    )
    container.scrollTo({
      left: Math.max(0, result.panX),
      top: Math.max(0, result.panY),
      behavior: 'smooth',
    })
  }, [graphMap])

  // Minimap pan handler
  const handleMinimapPan = useCallback((scrollLeft: number, scrollTop: number) => {
    if (!scrollContainerRef.current) return
    scrollContainerRef.current.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'auto' })
  }, [])

  // Scroll-to-node helper for keyboard navigation
  const scrollToNode = useCallback((node: { xPos: number; yPos: number }) => {
    const container = canvasRef.current?.parentElement
    if (!container) return
    const targetX = node.xPos - container.clientWidth / 2 + NODE_WIDTH / 2
    const targetY = node.yPos - container.clientHeight / 2 + NODE_HEIGHT / 2
    container.scrollTo({ left: Math.max(0, targetX), top: Math.max(0, targetY), behavior: 'smooth' })
  }, [])

  // ── Drag-and-drop handlers ──────────────────────────────────────────────

  const handleDragStart = useCallback((nodeId: string, clientX: number, clientY: number) => {
    if (!isEditorRole || !graphMap || canvasMode !== 'select' || whiteboardActive) return
    const node = graphMap.nodes.find((n) => n.id === nodeId)
    if (!node) return
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    const scrollLeft = canvasRef.current?.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current?.parentElement?.scrollTop || 0
    setDragOffset({
      x: clientX - canvasRect.left + scrollLeft - node.xPos,
      y: clientY - canvasRect.top + scrollTop - node.yPos,
    })
    setDraggingNodeId(nodeId)
  }, [isEditorRole, graphMap, canvasMode, whiteboardActive])

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingNodeId || !graphMap || !canvasRef.current) return
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const scrollLeft = canvasRef.current.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current.parentElement?.scrollTop || 0
    const rawX = clientX - canvasRect.left + scrollLeft - dragOffset.x
    const rawY = clientY - canvasRect.top + scrollTop - dragOffset.y
    const newX = snapToGrid(Math.max(0, rawX))
    const newY = snapToGrid(Math.max(0, rawY))

    setGraphMap((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === draggingNodeId ? { ...n, xPos: newX, yPos: newY } : n
        ),
      }
    })
  }, [draggingNodeId, graphMap, dragOffset, setGraphMap])

  const handleDragEnd = useCallback(async () => {
    if (!draggingNodeId || !graphMap || !userEmail) {
      setDraggingNodeId(null)
      return
    }
    const node = graphMap.nodes.find((n) => n.id === draggingNodeId)
    setDraggingNodeId(null)
    if (!node) return

    try {
      await fetch(`/api/courses/${courseId}/course-map/edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          editType: 'node_moved',
          payload: { nodeId: node.id, xPos: node.xPos, yPos: node.yPos },
        }),
      })
    } catch {
      // Silently fail — position was already updated optimistically
    }
  }, [draggingNodeId, graphMap, courseId, userEmail])

  // Global mouse/touch move and up listeners for drag
  useEffect(() => {
    if (!draggingNodeId) return

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY)
    const onMouseUp = () => handleDragEnd()
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault()
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const onTouchEnd = () => handleDragEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [draggingNodeId, handleDragMove, handleDragEnd])

  // ── Connect mode: cursor tracking ───────────────────────────────────────

  useEffect(() => {
    if (canvasMode !== 'connect' || !connectSource) return
    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const scrollLeft = canvasRef.current.parentElement?.scrollLeft || 0
      const scrollTop = canvasRef.current.parentElement?.scrollTop || 0
      setCursorPos({
        x: e.clientX - rect.left + scrollLeft,
        y: e.clientY - rect.top + scrollTop,
      })
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectSource(null)
        setCursorPos(null)
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onEscape)
    }
  }, [canvasMode, connectSource])

  // Reset connect state when switching modes
  useEffect(() => {
    if (canvasMode === 'select') {
      setConnectSource(null)
      setCursorPos(null)
      setEdgeTypePopover(null)
    }
  }, [canvasMode])

  // ── Connect mode: node click handler ────────────────────────────────────

  const handleNodeClickConnect = useCallback((nodeId: string, clientX: number, clientY: number) => {
    if (!connectSource) {
      setConnectSource(nodeId)
      return
    }
    if (connectSource === nodeId) {
      setConnectSource(null)
      setCursorPos(null)
      return
    }
    const rect = canvasRef.current?.getBoundingClientRect()
    const scrollLeft = canvasRef.current?.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current?.parentElement?.scrollTop || 0
    setEdgeTypePopover({
      fromNodeId: connectSource,
      toNodeId: nodeId,
      position: {
        x: clientX - (rect?.left || 0) + scrollLeft,
        y: clientY - (rect?.top || 0) + scrollTop,
      },
    })
  }, [connectSource])

  // ── Edge CRUD ───────────────────────────────────────────────────────────

  const createEdge = useCallback(async (fromNodeId: string, toNodeId: string, edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT') => {
    if (!userEmail) return
    setEdgeTypePopover(null)
    setConnectSource(null)
    setCursorPos(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/edges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ fromNodeId, toNodeId, edgeType }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail, fetchData])

  const deleteEdge = useCallback(async (edgeId: string) => {
    if (!userEmail) return
    setPendingDeleteEdgeId(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/edges/${edgeId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        setGraphMap((prev) => {
          if (!prev) return prev
          return { ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }
        })
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail, setGraphMap])

  // ── Analytics panel helpers ─────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    if (!courseId || !userEmail) return
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/analytics`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        setAnalyticsData(await res.json())
      }
    } catch (err) {
      console.error('[fetchAnalytics]', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [courseId, userEmail])

  const fetchRealtimeAnalytics = useCallback(async (range?: '24h' | '7d' | '30d') => {
    if (!courseId || !userEmail) return
    setRealtimeLoading(true)
    const r = range || realtimeRange
    const start = performance.now()
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/analytics/realtime?range=${r}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      trackApiLatency('analytics/realtime', performance.now() - start, res.status)
      if (res.ok) {
        setRealtimeData(await res.json())
      }
    } catch (err) {
      console.error('[fetchRealtimeAnalytics]', err)
    } finally {
      setRealtimeLoading(false)
    }
  }, [courseId, userEmail, realtimeRange])

  const fetchServerPerfData = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/analytics/performance`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) setServerPerfData(await res.json())
    } catch { /* silent */ }
  }, [courseId, userEmail])

  const sendPerfBatch = useCallback(async () => {
    if (!courseId || !userEmail) return
    const batch = collectMetricsBatch()
    try {
      await fetch(`/api/courses/${courseId}/course-map/analytics/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify(batch),
      })
    } catch { /* silent */ }
  }, [courseId, userEmail])

  const refreshPerfReport = useCallback(() => {
    const report = getPerformanceReport()
    setPerfReport(report)
    const violations = checkPerformanceBudget({ maxRenderMs: 100, maxApiMs: 2000, maxLcpMs: 2500, maxCls: 0.1 })
    setPerfBudgetViolations(violations)
  }, [])

  const openAnalyticsPanel = useCallback(() => {
    setShowAnalyticsPanel(true)
    setShowRealtimeDashboard(false)
    fetchAnalytics()
  }, [fetchAnalytics])

  const openRealtimeDashboard = useCallback(() => {
    setShowRealtimeDashboard(true)
    setShowAnalyticsPanel(false)
    setHeatmapOverlay(false)
  }, [])

  // Start/stop real-time polling when analytics panel is open on realtime tab
  useEffect(() => {
    if (showAnalyticsPanel && analyticsTab === 'realtime') {
      fetchRealtimeAnalytics()
      realtimePollRef.current = setInterval(() => fetchRealtimeAnalytics(), 15_000)
    }
    return () => {
      if (realtimePollRef.current) {
        clearInterval(realtimePollRef.current)
        realtimePollRef.current = null
      }
    }
  }, [showAnalyticsPanel, analyticsTab, fetchRealtimeAnalytics])

  // Init Web Vitals observer once
  useEffect(() => {
    const cleanup = initWebVitalsObserver()
    return () => cleanup?.()
  }, [])

  // Refresh perf report when performance tab is open
  useEffect(() => {
    if (showAnalyticsPanel && analyticsTab === 'performance') {
      refreshPerfReport()
      fetchServerPerfData()
    }
  }, [showAnalyticsPanel, analyticsTab, refreshPerfReport, fetchServerPerfData])

  // Send perf batch periodically when panel is open
  useEffect(() => {
    if (!showAnalyticsPanel || analyticsTab !== 'performance') return
    const interval = setInterval(() => {
      sendPerfBatch()
      refreshPerfReport()
    }, 30_000)
    return () => clearInterval(interval)
  }, [showAnalyticsPanel, analyticsTab, sendPerfBatch, refreshPerfReport])

  return {
    // Drag state
    draggingNodeId, canvasRef, scrollContainerRef, longPressTimerRef,

    // Canvas mode
    canvasMode, setCanvasMode,
    connectSource, setConnectSource,
    cursorPos, setCursorPos,
    edgeTypePopover, setEdgeTypePopover,
    pendingDeleteEdgeId, setPendingDeleteEdgeId,
    selectedNodeId, setSelectedNodeId,

    // Edge routing / groups
    edgeRoutingMode, setEdgeRoutingMode,
    showGroups, setShowGroups,
    groupedNodes, handleToggleGroup,
    handleZoomToFit, handleMinimapPan, scrollToNode,

    // Perf metrics
    perfMetrics,

    // Drag handlers
    handleDragStart, handleDragMove, handleDragEnd,

    // Connect handlers
    handleNodeClickConnect,

    // Edge CRUD
    createEdge, deleteEdge,

    // Analytics
    showAnalyticsPanel, setShowAnalyticsPanel,
    analyticsData, analyticsLoading,
    analyticsTab, setAnalyticsTab,
    realtimeData, realtimeLoading,
    realtimeRange, setRealtimeRange,
    heatmapOverlay, setHeatmapOverlay,
    perfReport, perfBudgetViolations, serverPerfData,
    openAnalyticsPanel, fetchRealtimeAnalytics,

    // Dashboard
    showRealtimeDashboard, setShowRealtimeDashboard,
    dashboardHeatmapData, setDashboardHeatmapData,
    openRealtimeDashboard,

    // Perf overlay
    showPerfOverlay, setShowPerfOverlay,

    // Whiteboard & annotation layer
    whiteboardActive: whiteboardActiveState, setWhiteboardActive,
    annotationLayerActive, setAnnotationLayerActive,
    annotationNodeCounts, setAnnotationNodeCounts,

    // Search & Filter
    showSearchFilter, setShowSearchFilter,
    searchHighlightNodeIds, setSearchHighlightNodeIds,
    filteredNodeIds, setFilteredNodeIds,
    filteredEdgeIds, setFilteredEdgeIds,

    // PWA
    installPrompt, showInstallBanner, setShowInstallBanner,
    pushEnabled, pushToggling, handlePushToggle,
  }
}
