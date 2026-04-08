import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  GraphMap,
  MapNode,
  ActiveEditor,
  RemoteCursor,
  RemoteEditingNode,
  ConflictInfo,
  CollabToast,
  SnapshotSummary,
  DiffResult,
  MergeResult,
  ActivityEntry,
  CommentEntry,
  SnapshotComparisonResult,
  SnapshotNodeData,
  SnapshotEdgeData,
  NotifType,
  NotifEntry,
  WebhookEntry,
  CanvasMode,
} from './types'
import { PresenceManager } from '../../../../lib/course-map/presence-service'
import type { PresenceUser } from '../../../../lib/course-map/presence-service'
import { CollabEngine } from '../../../../lib/course-map/collab-engine'
import type { ConflictData, RemoteEditNotification } from '../../../../lib/course-map/collab-engine'
import type { EditLockInfo } from '../../../../components/course-map/EditLockIndicator'
import { BranchManager } from '../../../../lib/course-map/branch-service'
import type { BranchInfo, BranchDiffResult } from '../../../../lib/course-map/branch-service'
import { MergeEngine } from '../../../../lib/course-map/merge-engine'
import type { MergePreview, MergeHistoryEntry, CherryPickItem, MergeExecutionResult } from '../../../../lib/course-map/merge-engine'

interface UseCourseMapCollabArgs {
  courseId: string
  userEmail: string | undefined
  userId: string | undefined
  userName: string | undefined
  isEditorRole: boolean
  selectedNodeId: string | null
  setGraphMap: React.Dispatch<React.SetStateAction<GraphMap | null>>
  fetchData: () => Promise<void>
}

export function useCourseMapCollab({
  courseId,
  userEmail,
  userId,
  userName,
  isEditorRole,
  selectedNodeId,
  setGraphMap,
  fetchData,
}: UseCourseMapCollabArgs) {
  // Collab state
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([])
  const [collabToasts, setCollabToasts] = useState<CollabToast[]>([])
  const collabToastIdRef = useRef(0)

  // Remote cursor state (Task 49)
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])
  const lastCursorBroadcastRef = useRef(0)
  const canvasFocusedRef = useRef(false)

  // Remote editing node state (Task 50)
  const [remoteEditingNodes, setRemoteEditingNodes] = useState<RemoteEditingNode[]>([])
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null)

  // Presence & Collab engine refs (Task 91/92)
  const presenceManagerRef = useRef<PresenceManager | null>(null)
  const collabEngineRef = useRef<CollabEngine | null>(null)
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const [collabConflict, setCollabConflict] = useState<ConflictData | null>(null)
  const [remoteEditNotifications, setRemoteEditNotifications] = useState<RemoteEditNotification[]>([])
  const [editLocks, setEditLocks] = useState<EditLockInfo[]>([])

  // Snapshot state
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [snapshotName, setSnapshotName] = useState('')
  const [savingSnapshot, setSavingSnapshot] = useState(false)
  const [showSnapshotDropdown, setShowSnapshotDropdown] = useState(false)
  const [showSnapshotNameInput, setShowSnapshotNameInput] = useState(false)
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)

  // Diff state
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffSnapshotId, setDiffSnapshotId] = useState<string | null>(null)

  // Merge state
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeBaseId, setMergeBaseId] = useState<string | null>(null)
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [mergeResolutions, setMergeResolutions] = useState<Record<string, string | number>>({})
  const [applyingMerge, setApplyingMerge] = useState(false)

  // Activity feed state
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])
  const [activityCursor, setActivityCursor] = useState<string | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)

  // Comment state
  const [showCommentPanel, setShowCommentPanel] = useState(false)
  const [comments, setComments] = useState<CommentEntry[]>([])
  const [commentCounts, setCommentCounts] = useState<{ nodeCounts: Record<string, number>; edgeCounts: Record<string, number> }>({ nodeCounts: {}, edgeCounts: {} })
  const [commentNodeId, setCommentNodeId] = useState<string | null>(null)
  const [commentEdgeId, setCommentEdgeId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [showResolvedComments, setShowResolvedComments] = useState(false)
  const [commentMentionSearch, setCommentMentionSearch] = useState('')

  // Version comparison state
  const [showCompareView, setShowCompareView] = useState(false)
  const [compareSnapshotA, setCompareSnapshotA] = useState<string>('')
  const [compareSnapshotB, setCompareSnapshotB] = useState<string>('')
  const [comparisonResult, setComparisonResult] = useState<SnapshotComparisonResult | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [compareSnapshotDataA, setCompareSnapshotDataA] = useState<{ nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] } | null>(null)
  const [compareSnapshotDataB, setCompareSnapshotDataB] = useState<{ nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] } | null>(null)

  // Branch management state (Task 93/94)
  const branchManagerRef = useRef<BranchManager | null>(null)
  const mergeEngineRef = useRef<MergeEngine | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [currentBranch, setCurrentBranch] = useState<BranchInfo | null>(null)
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [showBranchComparison, setShowBranchComparison] = useState(false)
  const [branchCompareA, setBranchCompareA] = useState<BranchInfo | null>(null)
  const [branchCompareB, setBranchCompareB] = useState<BranchInfo | null>(null)
  const [branchDiff, setBranchDiff] = useState<BranchDiffResult | null>(null)
  const [branchDiffLoading, setBranchDiffLoading] = useState(false)
  const [showMergeBranchDialog, setShowMergeBranchDialog] = useState(false)
  const [mergeBranchSourceId, setMergeBranchSourceId] = useState('')
  const [mergeBranchTargetId, setMergeBranchTargetId] = useState('')

  // Notification center state (Task 69)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifEntries, setNotifEntries] = useState<NotifEntry[]>([])
  const [notifUnreadCount, setNotifUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifFilterType, setNotifFilterType] = useState<NotifType | 'all'>('all')

  // Webhook dashboard state (Task 70)
  const [showWebhookDashboard, setShowWebhookDashboard] = useState(false)
  const [webhookEditId, setWebhookEditId] = useState<string | null>(null)
  const [webhookEditName, setWebhookEditName] = useState('')
  const [webhookEditUrl, setWebhookEditUrl] = useState('')
  const [webhookEditSecret, setWebhookEditSecret] = useState('')
  const [webhookEditEvents, setWebhookEditEvents] = useState<string[]>([])
  const [webhookEditActive, setWebhookEditActive] = useState(true)
  const [webhookDeliveries, setWebhookDeliveries] = useState<Array<{
    id: string; webhookId: string; event: string; status: number | null
    responseTimeMs: number | null; requestBody: unknown; responseBody: string | null
    error: string | null; createdAt: string
  }>>([])
  const [webhookDeliveriesLoading, setWebhookDeliveriesLoading] = useState(false)
  const [webhookDeliveriesForId, setWebhookDeliveriesForId] = useState<string | null>(null)
  const [webhookExpandedDelivery, setWebhookExpandedDelivery] = useState<string | null>(null)
  const [webhookTestResult, setWebhookTestResult] = useState<{ ok: boolean; status?: number; error?: string } | null>(null)

  // ── addCollabToast ──────────────────────────────────────────────────────

  const addCollabToast = useCallback((message: string) => {
    const id = String(++collabToastIdRef.current)
    setCollabToasts((prev) => [...prev.slice(-4), { id, message, timestamp: Date.now() }])
    setTimeout(() => {
      setCollabToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  // ── Handle incoming collab events ──────────────────────────────────────

  const handleCollabEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    presenceManagerRef.current?.handleEvent(event)
    collabEngineRef.current?.handleEvent(event)

    if (collabEngineRef.current) {
      const locks = collabEngineRef.current.getEditLocks()
      setEditLocks(locks.map((l) => ({ nodeId: l.nodeId, ownerName: l.ownerName, isMine: l.isMine })))
    }

    switch (event.type) {
      case 'editors_snapshot': {
        const editors = (event.payload as { editors: ActiveEditor[] }).editors
        setActiveEditors(editors.filter((e) => e.email !== userEmail))
        break
      }
      case 'editor_joined': {
        const editor = event.payload as unknown as ActiveEditor
        if (editor.email !== userEmail) {
          setActiveEditors((prev) => [...prev.filter((e) => e.userId !== editor.userId), editor])
          addCollabToast(`${editor.name} joined the map`)
        }
        break
      }
      case 'editor_left': {
        const { userId: leftUserId } = event.payload as { userId: string }
        setActiveEditors((prev) => {
          const leaving = prev.find((e) => e.userId === leftUserId)
          if (leaving) addCollabToast(`${leaving.name} left the map`)
          return prev.filter((e) => e.userId !== leftUserId)
        })
        setRemoteCursors((prev) => prev.filter((c) => c.userId !== leftUserId))
        setRemoteEditingNodes((prev) => prev.filter((e) => e.userId !== leftUserId))
        break
      }
      case 'node_moved': {
        const { nodeId, xPos, yPos, userId: movedUserId, userName: movedUserName } = event.payload as {
          nodeId: string; xPos: number; yPos: number; userId: string; userName: string
        }
        if (movedUserId !== userId) {
          setGraphMap((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === nodeId ? { ...n, xPos, yPos } : n
              ),
            }
          })
          addCollabToast(`${movedUserName} moved a node`)
        }
        break
      }
      case 'node_updated': {
        const { nodeId, label, unitType, userId: updatedUserId, userName: updatedUserName } = event.payload as {
          nodeId: string; label?: string; unitType?: string; userId: string; userName: string
        }
        if (updatedUserId !== userId) {
          if (selectedNodeId === nodeId) {
            setConflictInfo({ editorName: updatedUserName, label, unitType })
          }
          fetchData()
          addCollabToast(`${updatedUserName} updated a node`)
        }
        break
      }
      case 'edge_created': {
        const { userId: createdUserId, userName: createdUserName } = event.payload as { userId: string; userName: string }
        if (createdUserId !== userId) {
          fetchData()
          addCollabToast(`${createdUserName} created an edge`)
        }
        break
      }
      case 'edge_deleted': {
        const { edgeId, userId: deletedUserId, userName: deletedUserName } = event.payload as {
          edgeId: string; userId: string; userName: string
        }
        if (deletedUserId !== userId) {
          setGraphMap((prev) => {
            if (!prev) return prev
            return { ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }
          })
          addCollabToast(`${deletedUserName} deleted an edge`)
        }
        break
      }
      case 'cursor_moved': {
        const { userId: cursorUserId, userName: cursorUserName, x, y } = event.payload as {
          userId: string; userName: string; x: number; y: number
        }
        if (cursorUserId !== userId) {
          setRemoteCursors((prev) => {
            const filtered = prev.filter((c) => c.userId !== cursorUserId)
            return [...filtered, { userId: cursorUserId, userName: cursorUserName, x, y, lastUpdated: Date.now() }]
          })
        }
        break
      }
      case 'editing_node': {
        const { userId: editUserId, userName: editUserName, nodeId } = event.payload as {
          userId: string; userName: string; nodeId: string | null
        }
        if (editUserId !== userId) {
          setRemoteEditingNodes((prev) => {
            const filtered = prev.filter((e) => e.userId !== editUserId)
            if (nodeId) {
              return [...filtered, { userId: editUserId, userName: editUserName, nodeId }]
            }
            return filtered
          })
        }
        break
      }
    }
  }, [userEmail, userId, fetchData, selectedNodeId, setGraphMap, addCollabToast])

  // ── Collab SSE connection (editors only) ────────────────────────────

  useEffect(() => {
    if (!isEditorRole || !courseId || !userEmail) return

    const controller = new AbortController()
    const connectSSE = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/course-map/edits/stream`, {
          headers: { 'x-demo-user-email': userEmail },
          signal: controller.signal,
        })
        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6))
                handleCollabEvent(event)
              } catch {
                // skip malformed
              }
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[Collab SSE] connection error:', err)
        }
      }
    }

    connectSSE()

    return () => {
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorRole, courseId, userEmail])

  // ── Presence Manager & Collab Engine lifecycle (Task 91/92) ────────────

  useEffect(() => {
    if (!isEditorRole || !courseId || !userEmail || !userId) return

    const pm = new PresenceManager(courseId, userEmail)
    presenceManagerRef.current = pm
    const unsubPresence = pm.onPresenceUpdate((update) => {
      setPresenceUsers(update.users)
    })

    const ce = new CollabEngine(courseId, userEmail, userId, userName || 'You')
    collabEngineRef.current = ce
    const unsubConflict = ce.onConflict((conflict) => {
      setCollabConflict(conflict)
    })
    const unsubRemoteEdit = ce.onRemoteEdit((edit) => {
      setRemoteEditNotifications((prev) => [...prev.slice(-9), edit])
    })

    return () => {
      unsubPresence()
      unsubConflict()
      unsubRemoteEdit()
      pm.destroy()
      ce.destroy()
      presenceManagerRef.current = null
      collabEngineRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorRole, courseId, userEmail, userId])

  // ── Remote cursor broadcast ──────────────────────────────────────────

  const broadcastCursorMove = useCallback((clientX: number, clientY: number, canvasRef: React.RefObject<HTMLDivElement | null>) => {
    if (!isEditorRole || !courseId || !userEmail || !canvasFocusedRef.current) return
    if (!canvasRef.current) return
    const now = Date.now()
    if (now - lastCursorBroadcastRef.current < 200) return
    lastCursorBroadcastRef.current = now

    const rect = canvasRef.current.getBoundingClientRect()
    const scrollLeft = canvasRef.current.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current.parentElement?.scrollTop || 0
    const x = clientX - rect.left + scrollLeft
    const y = clientY - rect.top + scrollTop

    fetch(`/api/courses/${courseId}/course-map/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': userEmail,
      },
      body: JSON.stringify({
        editType: 'cursor_moved',
        payload: { x, y },
      }),
    }).catch(() => { /* silent */ })
  }, [isEditorRole, courseId, userEmail])

  // Fade out remote cursors after 5s of inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setRemoteCursors((prev) => prev.filter((c) => now - c.lastUpdated < 5000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Broadcast editing_node when detail drawer opens/closes (Task 50)
  useEffect(() => {
    if (!isEditorRole || !courseId || !userEmail) return
    fetch(`/api/courses/${courseId}/course-map/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': userEmail,
      },
      body: JSON.stringify({
        editType: 'editing_node',
        payload: { nodeId: selectedNodeId },
      }),
    }).catch(() => { /* silent */ })
  }, [selectedNodeId, isEditorRole, courseId, userEmail])

  // Clear conflict when drawer closes
  useEffect(() => {
    if (!selectedNodeId) setConflictInfo(null)
  }, [selectedNodeId])

  // ── Activity feed helpers ────────────────────────────────────────────────

  const fetchActivity = useCallback(async (reset = false) => {
    if (!courseId || !userEmail) return
    setActivityLoading(true)
    try {
      const cursorParam = reset ? '' : (activityCursor ? `&cursor=${activityCursor}` : '')
      const res = await fetch(
        `/api/courses/${courseId}/course-map/activity?limit=20${cursorParam}`,
        { headers: { 'x-demo-user-email': userEmail } },
      )
      if (res.ok) {
        const data = await res.json()
        if (reset) {
          setActivityEntries(data.entries)
        } else {
          setActivityEntries((prev) => [...prev, ...data.entries])
        }
        setActivityCursor(data.nextCursor)
      }
    } catch (err) {
      console.error('[fetchActivity]', err)
    } finally {
      setActivityLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userEmail, activityCursor])

  const openActivityFeed = useCallback(() => {
    setShowActivityFeed(true)
    setActivityEntries([])
    setActivityCursor(null)
    setTimeout(() => {
      if (!courseId || !userEmail) return
      fetch(`/api/courses/${courseId}/course-map/activity?limit=20`, {
        headers: { 'x-demo-user-email': userEmail },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setActivityEntries(data.entries)
            setActivityCursor(data.nextCursor)
          }
        })
        .catch(console.error)
    }, 0)
  }, [courseId, userEmail])

  // ── Comment helpers ────────────────────────────────────────────────────

  const fetchComments = useCallback(async (nodeId?: string, edgeId?: string) => {
    if (!courseId || !userEmail) return
    try {
      const qp = new URLSearchParams()
      if (nodeId) qp.set('nodeId', nodeId)
      if (edgeId) qp.set('edgeId', edgeId)
      const res = await fetch(`/api/courses/${courseId}/course-map/comments?${qp.toString()}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments ?? [])
        setCommentCounts(data.counts ?? { nodeCounts: {}, edgeCounts: {} })
      }
    } catch { /* silent */ }
  }, [courseId, userEmail])

  const fetchCommentCounts = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setCommentCounts(data.counts ?? { nodeCounts: {}, edgeCounts: {} })
      }
    } catch { /* silent */ }
  }, [courseId, userEmail])

  useEffect(() => {
    if (isEditorRole) fetchCommentCounts()
  }, [isEditorRole, fetchCommentCounts])

  const openCommentPanel = useCallback((nodeId?: string, edgeId?: string) => {
    setShowCommentPanel(true)
    setShowActivityFeed(false)
    setCommentNodeId(nodeId ?? null)
    setCommentEdgeId(edgeId ?? null)
    setNewCommentText('')
    setReplyingTo(null)
    setReplyText('')
    fetchComments(nodeId, edgeId)
  }, [fetchComments])

  const postComment = useCallback(async () => {
    if (!courseId || !userEmail || !newCommentText.trim()) return
    setPostingComment(true)
    try {
      const body: Record<string, string> = { content: newCommentText.trim() }
      if (commentNodeId) body.nodeId = commentNodeId
      if (commentEdgeId) body.edgeId = commentEdgeId
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setNewCommentText('')
        fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
      }
    } catch { /* silent */ }
    setPostingComment(false)
  }, [courseId, userEmail, newCommentText, commentNodeId, commentEdgeId, fetchComments])

  const postReply = useCallback(async (parentId: string) => {
    if (!courseId || !userEmail || !replyText.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ content: replyText.trim(), parentId }),
      })
      if (res.ok) {
        setReplyText('')
        setReplyingTo(null)
        fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
      }
    } catch { /* silent */ }
    setPostingComment(false)
  }, [courseId, userEmail, replyText, commentNodeId, commentEdgeId, fetchComments])

  const resolveCommentHandler = useCallback(async (commentId: string, action: 'resolve' | 'unresolve') => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ action }),
      })
      fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
    } catch { /* silent */ }
  }, [courseId, userEmail, commentNodeId, commentEdgeId, fetchComments])

  const deleteCommentHandler = useCallback(async (commentId: string) => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
    } catch { /* silent */ }
  }, [courseId, userEmail, commentNodeId, commentEdgeId, fetchComments])

  // ── Version comparison helpers ────────────────────────────────────────

  const runComparison = useCallback(async () => {
    if (!courseId || !userEmail || !compareSnapshotA || !compareSnapshotB) return
    setComparisonLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/course-map/snapshots/compare?a=${compareSnapshotA}&b=${compareSnapshotB}`,
        { headers: { 'x-demo-user-email': userEmail } },
      )
      if (res.ok) {
        const data = await res.json() as SnapshotComparisonResult
        setComparisonResult(data)
        const snapA = snapshots.find((s) => s.id === compareSnapshotA)
        const snapB = snapshots.find((s) => s.id === compareSnapshotB)
        if (snapA && snapB) {
          setCompareSnapshotDataA(null)
          setCompareSnapshotDataB(null)
        }
      }
    } catch { /* silent */ }
    setComparisonLoading(false)
  }, [courseId, userEmail, compareSnapshotA, compareSnapshotB, snapshots])

  const closeComparison = useCallback(() => {
    setShowCompareView(false)
    setCompareSnapshotA('')
    setCompareSnapshotB('')
    setComparisonResult(null)
    setCompareSnapshotDataA(null)
    setCompareSnapshotDataB(null)
  }, [])

  const restoreSnapshotFromComparison = useCallback(async (snapshotId: string) => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots/${snapshotId}/restore`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        closeComparison()
        addCollabToast('Snapshot restored')
        fetchData()
      }
    } catch { /* silent */ }
  }, [courseId, userEmail, closeComparison, fetchData, addCollabToast])

  // ── Snapshot helpers ──────────────────────────────────────────────────

  const fetchSnapshots = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || [])
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail])

  useEffect(() => {
    if (isEditorRole) fetchSnapshots()
  }, [isEditorRole, fetchSnapshots])

  const saveSnapshot = useCallback(async () => {
    if (!courseId || !userEmail || !snapshotName.trim()) return
    setSavingSnapshot(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ name: snapshotName.trim() }),
      })
      if (res.ok) {
        setSnapshotName('')
        setShowSnapshotNameInput(false)
        fetchSnapshots()
        addCollabToast('Snapshot saved')
      }
    } catch {
      // Silently fail
    } finally {
      setSavingSnapshot(false)
    }
  }, [courseId, userEmail, snapshotName, fetchSnapshots, addCollabToast])

  const restoreSnapshot = useCallback(async (snapshotId: string) => {
    if (!courseId || !userEmail) return
    setPendingRestoreId(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots/${snapshotId}/restore`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        fetchData()
        addCollabToast('Snapshot restored')
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail, fetchData, addCollabToast])

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots/${snapshotId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        fetchSnapshots()
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail, fetchSnapshots])

  // ── Diff helpers ──────────────────────────────────────────────────────

  const runDiff = useCallback(async (snapshotId: string) => {
    if (!courseId || !userEmail) return
    setDiffLoading(true)
    setDiffSnapshotId(snapshotId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ snapshotIdA: snapshotId }),
      })
      if (res.ok) {
        const data = await res.json()
        setDiffResult(data)
        setShowSnapshotDropdown(false)
      }
    } catch {
      // Silently fail
    }
    setDiffLoading(false)
  }, [courseId, userEmail])

  const closeDiff = useCallback(() => {
    setDiffResult(null)
    setDiffSnapshotId(null)
  }, [])

  // ── Merge helpers ─────────────────────────────────────────────────────

  const runMerge = useCallback(async (baseId: string, sourceId: string) => {
    if (!courseId || !userEmail) return
    setMergeLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ baseSnapshotId: baseId, sourceSnapshotId: sourceId }),
      })
      if (res.ok) {
        const data: MergeResult = await res.json()
        setMergeResult(data)
        setMergeBaseId(baseId)
        setMergeSourceId(sourceId)
        setMergeResolutions({})
        setShowSnapshotDropdown(false)
        setShowMergeDialog(true)
      }
    } catch {
      // Silently fail
    }
    setMergeLoading(false)
  }, [courseId, userEmail])

  const applyMerge = useCallback(async () => {
    if (!courseId || !userEmail || !mergeResult) return
    setApplyingMerge(true)
    try {
      const resolutions = Object.entries(mergeResolutions).map(([key, value]) => {
        const [nodeId, field] = key.split('::')
        return { nodeId, field, chosenValue: value }
      })
      const res = await fetch(`/api/courses/${courseId}/course-map/merge/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          mergedNodes: mergeResult.mergedNodes,
          mergedEdges: mergeResult.mergedEdges,
          resolutions,
        }),
      })
      if (res.ok) {
        setShowMergeDialog(false)
        setMergeResult(null)
        setMergeBaseId(null)
        setMergeSourceId(null)
        setMergeResolutions({})
        fetchData()
        addCollabToast('Merge applied successfully')
      }
    } catch {
      addCollabToast('Failed to apply merge')
    }
    setApplyingMerge(false)
  }, [courseId, userEmail, mergeResult, mergeResolutions, fetchData, addCollabToast])

  // ── Branch management helpers (Task 93/94) ─────────────────────────────

  const fetchBranches = useCallback(async () => {
    if (!courseId || !userEmail) return
    if (!branchManagerRef.current) {
      branchManagerRef.current = new BranchManager(courseId, userEmail)
    }
    if (!mergeEngineRef.current) {
      mergeEngineRef.current = new MergeEngine(courseId, userEmail)
    }
    setBranchesLoading(true)
    try {
      const [branchList, current] = await Promise.all([
        branchManagerRef.current.listBranches(),
        branchManagerRef.current.getCurrentBranch(),
      ])
      setBranches(branchList)
      setCurrentBranch(current)
    } catch {
      // Silently fail
    }
    setBranchesLoading(false)
  }, [courseId, userEmail])

  useEffect(() => {
    if (isEditorRole) fetchBranches()
  }, [isEditorRole, fetchBranches])

  const handleCreateBranch = useCallback(async (name: string, description: string) => {
    if (!branchManagerRef.current) return
    await branchManagerRef.current.createBranch(name, description)
    await fetchBranches()
    addCollabToast(`Branch "${name}" created`)
  }, [fetchBranches, addCollabToast])

  const handleSwitchBranch = useCallback(async (branchId: string) => {
    if (!branchManagerRef.current) return
    await branchManagerRef.current.switchBranch(branchId)
    await fetchBranches()
    await fetchData()
    addCollabToast('Switched branch')
  }, [fetchBranches, fetchData, addCollabToast])

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (!branchManagerRef.current) return
    await branchManagerRef.current.deleteBranch(branchId)
    await fetchBranches()
    addCollabToast('Branch deleted')
  }, [fetchBranches, addCollabToast])

  const handleCompareBranches = useCallback(async (branchAId: string, branchBId: string) => {
    if (!branchManagerRef.current) return
    const a = branches.find((b) => b.id === branchAId)
    const b = branches.find((b) => b.id === branchBId)
    if (!a || !b) return
    setBranchCompareA(a)
    setBranchCompareB(b)
    setBranchDiffLoading(true)
    setShowBranchComparison(true)
    try {
      const diff = await branchManagerRef.current.compareBranches(branchAId, branchBId)
      setBranchDiff(diff)
    } catch {
      setBranchDiff(null)
    }
    setBranchDiffLoading(false)
  }, [branches])

  const handleOpenMergeDialog = useCallback((sourceId: string, targetId: string) => {
    setMergeBranchSourceId(sourceId)
    setMergeBranchTargetId(targetId)
    setShowMergeBranchDialog(true)
  }, [])

  const handleMergeBranchPreview = useCallback(async (sourceId: string, targetId: string) => {
    if (!mergeEngineRef.current) throw new Error('Not initialized')
    return mergeEngineRef.current.getMergePreview(sourceId, targetId)
  }, [])

  const handleMergeBranchExecute = useCallback(async (
    sourceId: string,
    targetId: string,
    resolutions: Record<string, { resolution: 'source' | 'target' | 'manual'; manualValue?: string | number }>
  ) => {
    if (!mergeEngineRef.current) throw new Error('Not initialized')
    const result = await mergeEngineRef.current.mergeBranch(sourceId, targetId, resolutions)
    await fetchBranches()
    await fetchData()
    addCollabToast('Branches merged successfully')
    return result
  }, [fetchBranches, fetchData, addCollabToast])

  const handleCherryPick = useCallback(async (sourceId: string, targetId: string, changes: CherryPickItem[]) => {
    if (!mergeEngineRef.current) throw new Error('Not initialized')
    const result = await mergeEngineRef.current.cherryPick(sourceId, targetId, changes)
    await fetchBranches()
    await fetchData()
    addCollabToast('Cherry-pick applied')
    return result
  }, [fetchBranches, fetchData, addCollabToast])

  const handleGetMergeHistory = useCallback(async (branchId: string) => {
    if (!mergeEngineRef.current) return []
    return mergeEngineRef.current.getMergeHistory(branchId)
  }, [])

  const handleRollbackMerge = useCallback(async (mergeId: string) => {
    if (!mergeEngineRef.current) return
    await mergeEngineRef.current.rollbackMerge(mergeId)
    await fetchBranches()
    await fetchData()
    addCollabToast('Merge rolled back')
  }, [fetchBranches, fetchData, addCollabToast])

  // ── Notification center helpers (Task 69) ────────────────────────────

  const fetchNotifications = useCallback(async (filterType?: NotifType | 'all') => {
    if (!courseId || !userEmail) return
    setNotifLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filterType && filterType !== 'all') params.set('type', filterType)
      const res = await fetch(`/api/courses/${courseId}/course-map/notifications?${params}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setNotifEntries(data.notifications || [])
        setNotifUnreadCount(data.unreadCount ?? 0)
      }
    } catch { /* silently fail */ }
    setNotifLoading(false)
  }, [courseId, userEmail])

  const handleMarkNotifRead = useCallback(async (notifId: string) => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/notifications/${notifId}`, {
        method: 'PATCH',
        headers: { 'x-demo-user-email': userEmail },
      })
      setNotifEntries((prev) => prev.map((n) =>
        n.id === notifId ? { ...n, readBy: [...n.readBy, userId || ''] } : n
      ))
      setNotifUnreadCount((c) => Math.max(0, c - 1))
    } catch { /* silently fail */ }
  }, [courseId, userEmail, userId])

  const handleMarkAllNotifsRead = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      setNotifEntries((prev) => prev.map((n) => ({
        ...n,
        readBy: n.readBy.includes(userId || '') ? n.readBy : [...n.readBy, userId || ''],
      })))
      setNotifUnreadCount(0)
    } catch { /* silently fail */ }
  }, [courseId, userEmail, userId])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!courseId || !userEmail) return
    fetchNotifications(notifFilterType)
    const interval = setInterval(() => {
      fetchNotifications(notifFilterType)
    }, 30_000)
    return () => clearInterval(interval)
  }, [courseId, userEmail, notifFilterType, fetchNotifications])

  // ── Webhook dashboard helpers (Task 70) ──────────────────────────────

  const fetchWebhookDeliveries = useCallback(async (webhookId: string) => {
    if (!courseId || !userEmail) return
    setWebhookDeliveriesLoading(true)
    setWebhookDeliveriesForId(webhookId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks/${webhookId}/deliveries?limit=50`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setWebhookDeliveries(data.deliveries || [])
      }
    } catch { /* silently fail */ }
    setWebhookDeliveriesLoading(false)
  }, [courseId, userEmail])

  return {
    // Collab state
    activeEditors, collabToasts, addCollabToast,
    remoteCursors, canvasFocusedRef, broadcastCursorMove,
    remoteEditingNodes, conflictInfo, setConflictInfo,
    presenceUsers, collabConflict, setCollabConflict,
    remoteEditNotifications, setRemoteEditNotifications, editLocks,

    // Snapshots
    snapshots, snapshotName, setSnapshotName,
    savingSnapshot, showSnapshotDropdown, setShowSnapshotDropdown,
    showSnapshotNameInput, setShowSnapshotNameInput,
    pendingRestoreId, setPendingRestoreId,
    saveSnapshot, restoreSnapshot, deleteSnapshot,

    // Diff
    diffResult, diffLoading, diffSnapshotId,
    runDiff, closeDiff,

    // Merge
    mergeResult, mergeLoading, mergeBaseId, mergeSourceId,
    showMergeDialog, setShowMergeDialog,
    mergeResolutions, setMergeResolutions,
    applyingMerge, applyMerge, runMerge,

    // Activity
    showActivityFeed, setShowActivityFeed,
    activityEntries, activityCursor, activityLoading,
    fetchActivity, openActivityFeed,

    // Comments
    showCommentPanel, setShowCommentPanel,
    comments, commentCounts,
    commentNodeId, commentEdgeId,
    newCommentText, setNewCommentText,
    replyingTo, setReplyingTo, replyText, setReplyText,
    postingComment, showResolvedComments, setShowResolvedComments,
    commentMentionSearch, setCommentMentionSearch,
    openCommentPanel, postComment, postReply,
    resolveCommentHandler, deleteCommentHandler,

    // Version comparison
    showCompareView, setShowCompareView,
    compareSnapshotA, setCompareSnapshotA,
    compareSnapshotB, setCompareSnapshotB,
    comparisonResult, comparisonLoading,
    compareSnapshotDataA, compareSnapshotDataB,
    runComparison, closeComparison, restoreSnapshotFromComparison,

    // Branches
    branches, currentBranch, branchesLoading,
    showBranchComparison, setShowBranchComparison,
    branchCompareA, branchCompareB,
    branchDiff, branchDiffLoading,
    showMergeBranchDialog, setShowMergeBranchDialog,
    mergeBranchSourceId, mergeBranchTargetId,
    handleCreateBranch, handleSwitchBranch, handleDeleteBranch,
    handleCompareBranches, handleOpenMergeDialog,
    handleMergeBranchPreview, handleMergeBranchExecute,
    handleCherryPick, handleGetMergeHistory, handleRollbackMerge,

    // Notifications
    showNotifPanel, setShowNotifPanel,
    notifEntries, notifUnreadCount, notifLoading,
    notifFilterType, setNotifFilterType,
    fetchNotifications, handleMarkNotifRead, handleMarkAllNotifsRead,

    // Webhook dashboard
    showWebhookDashboard, setShowWebhookDashboard,
    webhookEditId, setWebhookEditId,
    webhookEditName, setWebhookEditName,
    webhookEditUrl, setWebhookEditUrl,
    webhookEditSecret, setWebhookEditSecret,
    webhookEditEvents, setWebhookEditEvents,
    webhookEditActive, setWebhookEditActive,
    webhookDeliveries, webhookDeliveriesLoading,
    webhookDeliveriesForId, setWebhookDeliveriesForId,
    webhookExpandedDelivery, setWebhookExpandedDelivery,
    webhookTestResult, setWebhookTestResult,
    fetchWebhookDeliveries,
  }
}
