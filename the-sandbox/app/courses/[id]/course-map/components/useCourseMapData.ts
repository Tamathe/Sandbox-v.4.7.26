import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  GraphMap,
  ValidationReport,
  MapNode,
  MapEdge,
  CourseUnit,
  NodeProgress,
  LearningPathEntry,
  GapFinding,
  EdgeSuggestion,
  StudyRecommendation,
  PrereqValidation,
  HeatmapEntry,
  StudyPlanEntry,
  AnnotationLayerData,
  AnnotationData,
  StudyGroupSummary,
  StudyGroupDetail,
  GroupMessage,
  GroupProgress,
  MilestoneData,
  MilestoneSummary,
} from './types'
import { trackApiLatency } from '../../../../lib/course-map/perf-monitor'

interface UseCourseMapDataArgs {
  courseId: string
  userEmail: string | undefined
  userId: string | undefined
  isStudent: boolean
  isEditorRole: boolean
}

export function useCourseMapData({
  courseId,
  userEmail,
  userId,
  isStudent,
  isEditorRole,
}: UseCourseMapDataArgs) {
  const [graphMap, setGraphMap] = useState<GraphMap | null>(null)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [syllabusStatus, setSyllabusStatus] = useState<{
    assignmentCount: number
    objectiveCount: number
    unitCount: number | null
    edgeCount: number | null
    lastParseDate: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodeProgressMap, setNodeProgressMap] = useState<Map<string, NodeProgress>>(new Map())
  const [lessonProgressMap, setLessonProgressMap] = useState<Map<string, boolean>>(new Map())
  const [learningPath, setLearningPath] = useState<LearningPathEntry[]>([])
  const [showLearningPath, setShowLearningPath] = useState(true)

  // Gap analysis state
  const [gapFindings, setGapFindings] = useState<GapFinding[]>([])
  const [gapLoading, setGapLoading] = useState(false)
  const [gapPanelOpen, setGapPanelOpen] = useState(false)
  const [hoveredGapNodeId, setHoveredGapNodeId] = useState<string | null>(null)

  // Edge suggestions state
  const [edgeSuggestions, setEdgeSuggestions] = useState<EdgeSuggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)

  // Study recommendations state (Task 59)
  const [studyRecommendations, setStudyRecommendations] = useState<StudyRecommendation[]>([])
  const [studyRecsLoading, setStudyRecsLoading] = useState(false)
  const [studyRecsPanelOpen, setStudyRecsPanelOpen] = useState(false)

  // Prerequisite validation state (Task 60)
  const [prereqValidations, setPrereqValidations] = useState<PrereqValidation[]>([])
  const [prereqValidLoading, setPrereqValidLoading] = useState(false)
  const [prereqValidPanelOpen, setPrereqValidPanelOpen] = useState(false)
  const [hoveredPrereqNodeId, setHoveredPrereqNodeId] = useState<string | null>(null)

  // Annotation layers state (Task 62)
  const [annotationLayers, setAnnotationLayers] = useState<AnnotationLayerData[]>([])
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<'none' | 'note' | 'highlight'>('none')
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(new Set())
  const [newLayerName, setNewLayerName] = useState('')
  const [creatingLayer, setCreatingLayer] = useState(false)
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const [annotationNoteText, setAnnotationNoteText] = useState('')

  // Study groups state (Task 63)
  const [studyGroups, setStudyGroups] = useState<StudyGroupSummary[]>([])
  const [showStudyGroupPanel, setShowStudyGroupPanel] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<StudyGroupDetail | null>(null)
  const [selectedGroupProgress, setSelectedGroupProgress] = useState<GroupProgress | null>(null)
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [groupMessageInput, setGroupMessageInput] = useState('')
  const [sendingGroupMsg, setSendingGroupMsg] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupNodeId, setNewGroupNodeId] = useState<string | null>(null)
  const [nodeGroupCounts, setNodeGroupCounts] = useState<Record<string, number>>({})

  // Milestones state (Task 64)
  const [milestones, setMilestones] = useState<MilestoneData[]>([])
  const [milestoneTotal, setMilestoneTotal] = useState(0)
  const [milestoneAchieved, setMilestoneAchieved] = useState(0)
  const [showMilestonePanel, setShowMilestonePanel] = useState(false)
  const [celebratingMilestone, setCelebratingMilestone] = useState<string | null>(null)
  const [milestoneNodeIds, setMilestoneNodeIds] = useState<Set<string>>(new Set())

  // Study plan state (students)
  const [showStudyPlan, setShowStudyPlan] = useState(false)
  const [studyPlanEntries, setStudyPlanEntries] = useState<StudyPlanEntry[]>([])
  const [studyPlanStats, setStudyPlanStats] = useState<{ planned: number; completed: number; overdue: number }>({ planned: 0, completed: 0, overdue: 0 })
  const [planNodeId, setPlanNodeId] = useState<string | null>(null)
  const [planDate, setPlanDate] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  // Peer progress heatmap state
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapData, setHeatmapData] = useState<Map<string, HeatmapEntry>>(new Map())
  const [heatmapLoading, setHeatmapLoading] = useState(false)

  // LMS deep links state
  const [lmsLinks, setLmsLinks] = useState<Map<string, { lmsUrl: string; linkType: string; title: string }>>(new Map())
  const [lmsLinksLoading, setLmsLinksLoading] = useState(false)
  const [lmsLinksConfigured, setLmsLinksConfigured] = useState(false)

  // Health score state
  const [healthData, setHealthData] = useState<{
    overallScore: number
    grades: { dimension: string; score: number; label: string; detail: string }[]
    recommendations: string[]
  } | null>(null)
  const [showHealthPanel, setShowHealthPanel] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)

  // ── Core data fetching ──────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!courseId || !userEmail) return
    const fetchStart = performance.now()
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/courses/${courseId}/course-map`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
        fetch(`/api/courses/${courseId}/syllabus-status`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
      ]

      if (isStudent) {
        fetches.push(
          fetch(`/api/courses/${courseId}/course-map/progress`, {
            headers: { 'x-demo-user-email': userEmail },
          })
        )
      }

      const results = await Promise.all(fetches)
      trackApiLatency('course-map/fetch', performance.now() - fetchStart, results[0].status)
      const [mapRes, statusRes] = results

      if (!mapRes.ok) {
        if (mapRes.status === 403) {
          setError('forbidden')
        } else {
          setError('fetch')
        }
        return
      }
      const data = await mapRes.json()
      setGraphMap(data.graphMap || null)
      setValidation(data.validation || null)

      if (statusRes.ok) {
        const status = await statusRes.json()
        setSyllabusStatus({
          assignmentCount: status.assignmentCount ?? 0,
          objectiveCount: status.objectiveCount ?? 0,
          unitCount: status.unitCount ?? null,
          edgeCount: status.edgeCount ?? null,
          lastParseDate: status.lastParseDate ?? null,
        })
      }

      if (isStudent && results[2]?.ok) {
        const progressData = await results[2].json()
        const npMap = new Map<string, NodeProgress>()
        const lpMap = new Map<string, boolean>()

        if (progressData.nodeProgress) {
          for (const np of progressData.nodeProgress as NodeProgress[]) {
            npMap.set(np.nodeId, np)
            for (const lp of np.lessons) {
              lpMap.set(lp.lessonId, lp.completed)
            }
          }
        }
        setNodeProgressMap(npMap)
        setLessonProgressMap(lpMap)

        try {
          const pathRes = await fetch(`/api/courses/${courseId}/course-map/learning-path`, {
            headers: { 'x-demo-user-email': userEmail },
          })
          if (pathRes.ok) {
            const pathData = await pathRes.json()
            setLearningPath(pathData.path || [])
          }
        } catch {
          // Silently fail — learning path is supplementary
        }
      }
    } catch {
      setError('fetch')
    } finally {
      setLoading(false)
    }
  }, [courseId, userEmail, isStudent])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── LMS Links fetch ──────────────────────────────────────────────────────

  const fetchLmsLinks = useCallback(async () => {
    if (!courseId || !isEditorRole) return
    setLmsLinksLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/lms-links`, {
        headers: { 'x-demo-user-email': userEmail || '' },
      })
      if (!res.ok) return
      const data = await res.json()
      setLmsLinksConfigured(data.configured)
      const map = new Map<string, { lmsUrl: string; linkType: string; title: string }>()
      for (const link of data.links || []) {
        map.set(link.nodeId, { lmsUrl: link.lmsUrl, linkType: link.linkType, title: link.title })
      }
      setLmsLinks(map)
    } catch {
      // silent
    } finally {
      setLmsLinksLoading(false)
    }
  }, [courseId, isEditorRole, userEmail])

  // ── Annotation layers fetch (educators only) ─────────────────────────────

  const fetchAnnotations = useCallback(async () => {
    if (!courseId || !userEmail || !isEditorRole) return
    try {
      const [layersRes, annsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
        fetch(`/api/courses/${courseId}/course-map/annotations`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
      ])
      if (layersRes.ok) {
        const data = await layersRes.json()
        setAnnotationLayers(data.layers || [])
        if (!activeLayerId && data.layers?.length > 0) {
          setActiveLayerId(data.layers[0].id)
        }
      }
      if (annsRes.ok) {
        const data = await annsRes.json()
        setAnnotations(data.annotations || [])
      }
    } catch {
      // silent — annotations are supplementary
    }
  }, [courseId, userEmail, isEditorRole, activeLayerId])

  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  // ── Study groups fetch ──────────────────────────────────────────────────

  const fetchStudyGroups = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const [groupsRes, countsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/course-map/study-groups`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
        fetch(`/api/courses/${courseId}/course-map/study-groups?nodeCounts=true`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
      ])
      if (groupsRes.ok) {
        const data = await groupsRes.json()
        setStudyGroups(data.groups || [])
      }
      if (countsRes.ok) {
        const data = await countsRes.json()
        setNodeGroupCounts(data.counts || {})
      }
    } catch { /* silent */ }
  }, [courseId, userEmail])

  useEffect(() => {
    fetchStudyGroups()
  }, [fetchStudyGroups])

  // ── Milestones fetch ────────────────────────────────────────────────────

  const fetchMilestones = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const check = isStudent ? '&check=true' : ''
      const res = await fetch(`/api/courses/${courseId}/course-map/milestones?${check}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data: MilestoneSummary = await res.json()
        setMilestones(data.milestones || [])
        setMilestoneTotal(data.total)
        setMilestoneAchieved(data.achieved)
        setMilestoneNodeIds(new Set(data.milestones.map((m) => m.nodeId)))
        if (data.newlyAchieved && data.newlyAchieved.length > 0) {
          setCelebratingMilestone(data.newlyAchieved[0].label)
          setTimeout(() => setCelebratingMilestone(null), 4000)
        }
      }
    } catch { /* silent */ }
  }, [courseId, userEmail, isStudent])

  useEffect(() => {
    fetchMilestones()
  }, [fetchMilestones])

  // ── Health score helpers ────────────────────────────────────────────────

  const fetchHealth = useCallback(async () => {
    if (!courseId || !userEmail) return
    setHealthLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/health`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        setHealthData(await res.json())
      }
    } catch (err) {
      console.error('[fetchHealth]', err)
    } finally {
      setHealthLoading(false)
    }
  }, [courseId, userEmail])

  const openHealthPanel = useCallback(() => {
    setShowHealthPanel(true)
    fetchHealth()
  }, [fetchHealth])

  // ── Gap Analysis handler ─────────────────────────────────────────────────

  const runGapAnalysis = useCallback(async () => {
    if (!userEmail) return
    setGapLoading(true)
    setGapFindings([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/gap-analysis`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setGapFindings(data.findings || [])
        setGapPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setGapLoading(false)
    }
  }, [courseId, userEmail])

  // ── Suggest Edges handler ──────────────────────────────────────────────

  const runSuggestEdges = useCallback(async () => {
    if (!userEmail) return
    setSuggestLoading(true)
    setEdgeSuggestions([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/suggest-edges`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setEdgeSuggestions(data.suggestions || [])
      }
    } catch {
      // Silently fail
    } finally {
      setSuggestLoading(false)
    }
  }, [courseId, userEmail])

  // ── Study Recommendations handler (Task 59) ──────────────────────────────

  const fetchStudyRecommendations = useCallback(async () => {
    if (!userEmail) return
    setStudyRecsLoading(true)
    setStudyRecommendations([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-recommendations`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setStudyRecommendations(data.recommendations || [])
        setStudyRecsPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setStudyRecsLoading(false)
    }
  }, [courseId, userEmail])

  // ── Prerequisite Validation handler (Task 60) ───────────────────────────

  const runPrereqValidation = useCallback(async () => {
    if (!userEmail) return
    setPrereqValidLoading(true)
    setPrereqValidations([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/prerequisite-validation`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setPrereqValidations(data.validations || [])
        setPrereqValidPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setPrereqValidLoading(false)
    }
  }, [courseId, userEmail])

  // ── Annotation handlers (Task 62) ──────────────────────────────────────

  const createAnnotationLayer = useCallback(async (name: string) => {
    if (!userEmail || !name.trim()) return
    setCreatingLayer(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnnotationLayers((prev) => [...prev, data.layer])
        setActiveLayerId(data.layer.id)
        setNewLayerName('')
      }
    } catch { /* silent */ } finally {
      setCreatingLayer(false)
    }
  }, [courseId, userEmail])

  const deleteAnnotationLayerHandler = useCallback(async (layerId: string) => {
    if (!userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ layerId, action: 'delete' }),
      })
      setAnnotationLayers((prev) => prev.filter((l) => l.id !== layerId))
      setAnnotations((prev) => prev.filter((a) => a.layerId !== layerId))
      if (activeLayerId === layerId) {
        setActiveLayerId(annotationLayers.find((l) => l.id !== layerId)?.id ?? null)
      }
    } catch { /* silent */ }
  }, [courseId, userEmail, activeLayerId, annotationLayers])

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setHiddenLayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return next
    })
    if (userEmail) {
      const visible = hiddenLayerIds.has(layerId)
      fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ layerId, action: 'toggleVisibility', visible }),
      }).catch(() => {})
    }
  }, [courseId, userEmail, hiddenLayerIds])

  const addAnnotationToCanvas = useCallback(async (
    type: 'note' | 'highlight',
    positionX: number,
    positionY: number,
    content: string,
    targetNodeId?: string,
  ) => {
    if (!userEmail || !activeLayerId) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ layerId: activeLayerId, type, content, positionX, positionY, targetNodeId }),
      })
      if (res.ok) {
        const data = await res.json()
        const layer = annotationLayers.find((l) => l.id === activeLayerId)
        setAnnotations((prev) => [...prev, {
          ...data.annotation,
          layer: layer ? { id: layer.id, name: layer.name, color: layer.color } : { id: activeLayerId, name: '', color: '#3B82F6' },
        }])
        setAnnotationLayers((prev) => prev.map((l) =>
          l.id === activeLayerId ? { ...l, _count: { annotations: l._count.annotations + 1 } } : l
        ))
      }
    } catch { /* silent */ }
  }, [courseId, userEmail, activeLayerId, annotationLayers])

  const deleteAnnotationHandler = useCallback(async (annotationId: string) => {
    if (!userEmail) return
    const ann = annotations.find((a) => a.id === annotationId)
    try {
      await fetch(`/api/courses/${courseId}/course-map/annotations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ annotationId }),
      })
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
      if (ann) {
        setAnnotationLayers((prev) => prev.map((l) =>
          l.id === ann.layerId ? { ...l, _count: { annotations: Math.max(0, l._count.annotations - 1) } } : l
        ))
      }
    } catch { /* silent */ }
  }, [courseId, userEmail, annotations])

  const handleAnnotationCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (annotationMode === 'none' || !activeLayerId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft
    const y = e.clientY - rect.top + e.currentTarget.scrollTop

    if (annotationMode === 'note') {
      setAnnotationNoteText('')
      const tempId = `temp-${Date.now()}`
      const layer = annotationLayers.find((l) => l.id === activeLayerId)
      setAnnotations((prev) => [...prev, {
        id: tempId,
        layerId: activeLayerId,
        type: 'note',
        content: '',
        positionX: x,
        positionY: y,
        targetNodeId: null,
        layer: layer ? { id: layer.id, name: layer.name, color: layer.color } : { id: activeLayerId, name: '', color: '#3B82F6' },
      }])
      setEditingAnnotationId(tempId)
    } else if (annotationMode === 'highlight') {
      const nodes = graphMap?.nodes || []
      let nearestNode: MapNode | null = null
      let minDist = 60
      for (const node of nodes) {
        const dist = Math.sqrt((node.xPos - x) ** 2 + (node.yPos - y) ** 2)
        if (dist < minDist) {
          minDist = dist
          nearestNode = node
        }
      }
      if (nearestNode) {
        addAnnotationToCanvas('highlight', nearestNode.xPos, nearestNode.yPos, '', nearestNode.id)
      }
    }
  }, [annotationMode, activeLayerId, annotationLayers, graphMap?.nodes, addAnnotationToCanvas])

  const saveAnnotationNote = useCallback(async (tempId: string, content: string) => {
    if (!content.trim()) {
      setAnnotations((prev) => prev.filter((a) => a.id !== tempId))
      setEditingAnnotationId(null)
      return
    }
    const tempAnn = annotations.find((a) => a.id === tempId)
    if (!tempAnn) return
    setAnnotations((prev) => prev.filter((a) => a.id !== tempId))
    await addAnnotationToCanvas('note', tempAnn.positionX, tempAnn.positionY, content.trim())
    setEditingAnnotationId(null)
    setAnnotationNoteText('')
  }, [annotations, addAnnotationToCanvas])

  const totalAnnotationCount = annotationLayers.reduce((sum, l) => sum + l._count.annotations, 0)

  // ── Study group handlers (Task 63) ─────────────────────────────────────

  const openGroupDetail = useCallback(async (groupId: string) => {
    if (!userEmail) return
    setSelectedGroupId(groupId)
    try {
      const [detailRes, msgsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/course-map/study-groups?groupId=${groupId}`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
        fetch(`/api/courses/${courseId}/course-map/study-groups/${groupId}/messages`, {
          headers: { 'x-demo-user-email': userEmail },
        }),
      ])
      if (detailRes.ok) {
        const data = await detailRes.json()
        setSelectedGroupDetail(data.group)
        setSelectedGroupProgress(data.progress)
      }
      if (msgsRes.ok) {
        const data = await msgsRes.json()
        setGroupMessages(data.messages || [])
      }
    } catch { /* silent */ }
  }, [courseId, userEmail])

  const handleCreateGroup = useCallback(async () => {
    if (!userEmail || !newGroupName.trim() || !newGroupNodeId) return
    setCreatingGroup(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ action: 'create', nodeId: newGroupNodeId, name: newGroupName.trim() }),
      })
      if (res.ok) {
        setNewGroupName('')
        setNewGroupNodeId(null)
        fetchStudyGroups()
      }
    } catch { /* silent */ } finally {
      setCreatingGroup(false)
    }
  }, [courseId, userEmail, newGroupName, newGroupNodeId, fetchStudyGroups])

  const handleJoinGroup = useCallback(async (groupId: string) => {
    if (!userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ action: 'join', groupId }),
      })
      fetchStudyGroups()
      if (selectedGroupId === groupId) openGroupDetail(groupId)
    } catch { /* silent */ }
  }, [courseId, userEmail, fetchStudyGroups, selectedGroupId, openGroupDetail])

  const handleLeaveGroup = useCallback(async (groupId: string) => {
    if (!userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ action: 'leave', groupId }),
      })
      fetchStudyGroups()
      if (selectedGroupId === groupId) openGroupDetail(groupId)
    } catch { /* silent */ }
  }, [courseId, userEmail, fetchStudyGroups, selectedGroupId, openGroupDetail])

  const handleSendGroupMessage = useCallback(async () => {
    if (!userEmail || !selectedGroupId || !groupMessageInput.trim()) return
    setSendingGroupMsg(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-groups/${selectedGroupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ content: groupMessageInput.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setGroupMessages((prev) => [...prev, data.message])
        setGroupMessageInput('')
      }
    } catch { /* silent */ } finally {
      setSendingGroupMsg(false)
    }
  }, [courseId, userEmail, selectedGroupId, groupMessageInput])

  // ── Milestone handlers (Task 64) ───────────────────────────────────────

  const handleSetMilestone = useCallback(async (nodeId: string, label: string, description?: string) => {
    if (!userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ nodeId, label, description }),
      })
      fetchMilestones()
    } catch { /* silent */ }
  }, [courseId, userEmail, fetchMilestones])

  const handleRemoveMilestone = useCallback(async (nodeId: string) => {
    if (!userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/milestones`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ nodeId }),
      })
      fetchMilestones()
    } catch { /* silent */ }
  }, [courseId, userEmail, fetchMilestones])

  const acceptSuggestion = useCallback(async (suggestion: EdgeSuggestion) => {
    if (!userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/edges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          fromNodeId: suggestion.fromNodeId,
          toNodeId: suggestion.toNodeId,
          edgeType: suggestion.edgeType,
        }),
      })
      if (res.ok) {
        setEdgeSuggestions((prev) => prev.filter((s) =>
          s.fromNodeId !== suggestion.fromNodeId || s.toNodeId !== suggestion.toNodeId
        ))
        fetchData()
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail, fetchData])

  const dismissSuggestion = useCallback((suggestion: EdgeSuggestion) => {
    setEdgeSuggestions((prev) => prev.filter((s) =>
      s.fromNodeId !== suggestion.fromNodeId || s.toNodeId !== suggestion.toNodeId
    ))
  }, [])

  // ── Study Plan helpers ──────────────────────────────────────────────────

  const fetchStudyPlan = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-plan`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setStudyPlanEntries(data.entries || [])
        setStudyPlanStats(data.stats || { planned: 0, completed: 0, overdue: 0 })
      }
    } catch { /* silently fail */ }
  }, [courseId, userEmail])

  const handleSavePlanEntry = useCallback(async () => {
    if (!courseId || !userEmail || !planNodeId || !planDate) return
    setSavingPlan(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ nodeId: planNodeId, targetDate: planDate }),
      })
      if (res.ok) {
        fetchStudyPlan()
        setPlanNodeId(null)
        setPlanDate('')
      }
    } catch { /* silently fail */ }
    setSavingPlan(false)
  }, [courseId, userEmail, planNodeId, planDate, fetchStudyPlan])

  const handleRemovePlanEntry = useCallback(async (nodeId: string) => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-plan/${nodeId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      setStudyPlanEntries((prev) => prev.filter((e) => e.nodeId !== nodeId))
      setStudyPlanStats((prev) => ({ ...prev, planned: Math.max(0, prev.planned - 1) }))
    } catch { /* silently fail */ }
  }, [courseId, userEmail])

  const handleCompletePlanEntry = useCallback(async (nodeId: string) => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ nodeId, complete: true }),
      })
      fetchStudyPlan()
    } catch { /* silently fail */ }
  }, [courseId, userEmail, fetchStudyPlan])

  useEffect(() => {
    if (isStudent && showStudyPlan) fetchStudyPlan()
  }, [isStudent, showStudyPlan, fetchStudyPlan])

  const studyPlanMap = new Map(studyPlanEntries.map((e) => [e.nodeId, e]))

  // ── Peer Progress Heatmap helpers ───────────────────────────────────────

  const fetchHeatmap = useCallback(async () => {
    if (!courseId || !userEmail) return
    setHeatmapLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/peer-progress`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        const map = new Map<string, HeatmapEntry>()
        for (const entry of (data.heatmap || [])) {
          map.set(entry.nodeId, entry)
        }
        setHeatmapData(map)
      }
    } catch { /* silently fail */ }
    setHeatmapLoading(false)
  }, [courseId, userEmail])

  useEffect(() => {
    if (showHeatmap) fetchHeatmap()
  }, [showHeatmap, fetchHeatmap])

  return {
    // Core data
    graphMap, setGraphMap, validation, syllabusStatus,
    loading, error, fetchData,
    nodeProgressMap, lessonProgressMap,
    learningPath, showLearningPath, setShowLearningPath,

    // Gap analysis
    gapFindings, gapLoading, gapPanelOpen, setGapPanelOpen,
    hoveredGapNodeId, setHoveredGapNodeId, runGapAnalysis,

    // Edge suggestions
    edgeSuggestions, setEdgeSuggestions, suggestLoading, runSuggestEdges,
    acceptSuggestion, dismissSuggestion,

    // Study recommendations
    studyRecommendations, studyRecsLoading, studyRecsPanelOpen,
    setStudyRecsPanelOpen, fetchStudyRecommendations,

    // Prereq validation
    prereqValidations, prereqValidLoading, prereqValidPanelOpen,
    setPrereqValidPanelOpen, hoveredPrereqNodeId, setHoveredPrereqNodeId,
    runPrereqValidation,

    // Annotations
    annotationLayers, annotations, setAnnotations,
    showAnnotationPanel, setShowAnnotationPanel,
    annotationMode, setAnnotationMode,
    activeLayerId, setActiveLayerId,
    hiddenLayerIds, newLayerName, setNewLayerName,
    creatingLayer, editingAnnotationId, setEditingAnnotationId,
    annotationNoteText, setAnnotationNoteText,
    createAnnotationLayer, deleteAnnotationLayerHandler,
    toggleLayerVisibility, addAnnotationToCanvas,
    deleteAnnotationHandler, handleAnnotationCanvasClick,
    saveAnnotationNote, totalAnnotationCount,

    // Study groups
    studyGroups, showStudyGroupPanel, setShowStudyGroupPanel,
    selectedGroupId, setSelectedGroupId,
    selectedGroupDetail, selectedGroupProgress,
    groupMessages, groupMessageInput, setGroupMessageInput,
    sendingGroupMsg, creatingGroup, newGroupName, setNewGroupName,
    newGroupNodeId, setNewGroupNodeId, nodeGroupCounts,
    openGroupDetail, handleCreateGroup, handleJoinGroup,
    handleLeaveGroup, handleSendGroupMessage,

    // Milestones
    milestones, milestoneTotal, milestoneAchieved,
    showMilestonePanel, setShowMilestonePanel,
    celebratingMilestone, milestoneNodeIds,
    handleSetMilestone, handleRemoveMilestone,

    // Study plan
    showStudyPlan, setShowStudyPlan,
    studyPlanEntries, studyPlanStats, studyPlanMap,
    planNodeId, setPlanNodeId, planDate, setPlanDate,
    savingPlan, handleSavePlanEntry,
    handleRemovePlanEntry, handleCompletePlanEntry,

    // Heatmap
    showHeatmap, setShowHeatmap,
    heatmapData, heatmapLoading,

    // Health
    healthData, showHealthPanel, setShowHealthPanel,
    healthLoading, fetchHealth, openHealthPanel,

    // LMS Links
    lmsLinks, lmsLinksLoading, lmsLinksConfigured, fetchLmsLinks,
  }
}
