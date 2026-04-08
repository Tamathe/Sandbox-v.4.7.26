import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  GraphMap,
  MapEdge,
  WebhookEntry,
  CanvasMode,
} from './types'
import { NODE_WIDTH, NODE_HEIGHT, snapToGrid } from './types'
import { type MapAction } from '../../../../lib/course-map/ai-assistant-service'
import { type FixAction } from '../../../../lib/course-map/smart-automation-service'
import { PluginRegistry } from '../../../../lib/course-map/plugin-registry'
import type { PluginEntry, PluginManifest } from '../../../../lib/course-map/plugin-registry'
import { PluginAPI } from '../../../../lib/course-map/plugin-api'
import type { PluginAPICallbacks } from '../../../../lib/course-map/plugin-api'
import { SAMPLE_PLUGINS, getAvailablePlugins, getSamplePlugin } from '../../../../lib/course-map/sample-plugins'

interface UseCourseMapEditorToolsArgs {
  courseId: string
  userEmail: string | undefined
  isEditorRole: boolean
  graphMap: GraphMap | null
  setGraphMap: React.Dispatch<React.SetStateAction<GraphMap | null>>
  fetchData: () => Promise<void>
  addCollabToast: (message: string) => void
  selectedNodeId: string | null
}

export function useCourseMapEditorTools({
  courseId,
  userEmail,
  isEditorRole,
  graphMap,
  setGraphMap,
  fetchData,
  addCollabToast,
  selectedNodeId,
}: UseCourseMapEditorToolsArgs) {
  // AI suggestions state (Task 43)
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    id: string
    type: 'reorder' | 'add_prerequisite' | 'regroup' | 'remove_redundant'
    description: string
    affectedNodeIds: string[]
    proposedChanges: { action: string; details: Record<string, unknown> }
  }>>([])
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false)
  const [aiSuggestionsPanelOpen, setAiSuggestionsPanelOpen] = useState(false)
  const [aiSuggestionsSummary, setAiSuggestionsSummary] = useState('')
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null)
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set())

  // NL edit state (Task 44)
  const [nlEditOpen, setNlEditOpen] = useState(false)
  const [nlEditInstruction, setNlEditInstruction] = useState('')
  const [nlEditLoading, setNlEditLoading] = useState(false)
  const [nlEditChanges, setNlEditChanges] = useState<Array<{
    action: string
    details: Record<string, unknown>
    description: string
  }>>([])
  const [nlEditSummary, setNlEditSummary] = useState('')
  const [nlEditApplying, setNlEditApplying] = useState(false)

  // Share state
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showSharingPanel, setShowSharingPanel] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareAccessCode, setShareAccessCode] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const [accessCodeInput, setAccessCodeInput] = useState('')

  // Export state
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportIncludeAnnotations, setReportIncludeAnnotations] = useState(true)
  const [reportIncludeMilestones, setReportIncludeMilestones] = useState(true)
  const [reportIncludeHealth, setReportIncludeHealth] = useState(true)
  const [reportIncludeAnalytics, setReportIncludeAnalytics] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)

  // Course comparison state
  const [showCourseCompare, setShowCourseCompare] = useState(false)
  const [compareTargetCourseId, setCompareTargetCourseId] = useState('')
  const [compareCourses, setCompareCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [courseComparisonResult, setCourseComparisonResult] = useState<{
    courseA: { id: string; courseCode: string; title: string }
    courseB: { id: string; courseCode: string; title: string }
    statsA: { nodeCount: number; edgeCount: number; unitTypeDistribution: Record<string, number>; edgeTypeDistribution: Record<string, number> }
    statsB: { nodeCount: number; edgeCount: number; unitTypeDistribution: Record<string, number>; edgeTypeDistribution: Record<string, number> }
    overlaps: Array<{ nodeA: { id: string; label: string }; nodeB: { id: string; label: string }; similarity: number }>
    uniqueToA: Array<{ id: string; label: string; nodeType: string }>
    uniqueToB: Array<{ id: string; label: string; nodeType: string }>
    summary: string[]
  } | null>(null)
  const [courseComparisonLoading, setCourseComparisonLoading] = useState(false)

  // Canvas sync state
  const [showCanvasSyncDialog, setShowCanvasSyncDialog] = useState(false)
  const [canvasCourseIdInput, setCanvasCourseIdInput] = useState('')
  const [canvasSyncing, setCanvasSyncing] = useState(false)
  const [canvasSyncResult, setCanvasSyncResult] = useState<string | null>(null)
  const [canvasSyncError, setCanvasSyncError] = useState<string | null>(null)
  const [canvasSyncStatus, setCanvasSyncStatus] = useState<{
    configured: boolean
    lastSyncAt: string | null
    unitCount: number
    nodeCount: number
  } | null>(null)

  // Embed tab state in share dialog
  const [shareTab, setShareTab] = useState<'share' | 'embed' | 'webhooks'>('share')
  const [embedWidth, setEmbedWidth] = useState(800)
  const [embedHeight, setEmbedHeight] = useState(600)

  // Template state
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Smart template suggestion state (Task 52)
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false)
  const [templateSuggestions, setTemplateSuggestions] = useState<Array<{
    templateId: string; templateName: string; reasoning: string; confidence: number
  }>>([])
  const [templateSuggestLoading, setTemplateSuggestLoading] = useState(false)
  const [applyingPresetId, setApplyingPresetId] = useState<string | null>(null)

  // Notify students state
  const [notifyingStu, setNotifyingStu] = useState(false)
  const [notifyStuResult, setNotifyStuResult] = useState<string | null>(null)

  // Webhook state
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>([])
  const [addingWebhook, setAddingWebhook] = useState(false)
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)

  // Duplicate state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [userCourses, setUserCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [duplicateTargetId, setDuplicateTargetId] = useState('')
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateOverwriteConfirm, setDuplicateOverwriteConfirm] = useState(false)

  // Plugin system state (Task 95/96)
  const pluginRegistryRef = useRef<PluginRegistry | null>(null)
  const pluginApiRef = useRef<PluginAPI | null>(null)
  const [pluginEntries, setPluginEntries] = useState<PluginEntry[]>([])
  const [showPluginMarketplace, setShowPluginMarketplace] = useState(false)
  const [showPluginSettings, setShowPluginSettings] = useState(false)
  const [selectedPluginManifest, setSelectedPluginManifest] = useState<PluginManifest | null>(null)

  // AI Assistant & Smart Automation state (Task 97/98)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showSmartAutomation, setShowSmartAutomation] = useState(false)

  // Panel toggle states
  const [showTeachingAssistant, setShowTeachingAssistant] = useState(false)
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false)
  const [showExportSuite, setShowExportSuite] = useState(false)
  const [showReportingDashboard, setShowReportingDashboard] = useState(false)

  const WEBHOOK_EVENT_OPTIONS = [
    'node.created', 'node.updated', 'node.deleted',
    'edge.created', 'edge.deleted',
    'snapshot.created', 'health.computed', 'milestone.achieved',
  ] as const

  // ── AI Suggestions handler (Task 43) ─────────────────────────────────

  const runAiSuggestions = useCallback(async () => {
    if (!userEmail) return
    setAiSuggestionsLoading(true)
    setAiSuggestions([])
    setAppliedSuggestionIds(new Set())
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-suggestions`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setAiSuggestions(data.suggestions || [])
        setAiSuggestionsSummary(data.summary || '')
        setAiSuggestionsPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setAiSuggestionsLoading(false)
    }
  }, [courseId, userEmail])

  const applyAiSuggestion = useCallback(async (suggestion: typeof aiSuggestions[0]) => {
    if (!userEmail) return
    setApplyingSuggestionId(suggestion.id)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-suggestions/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ suggestion }),
      })
      if (res.ok) {
        setAppliedSuggestionIds((prev) => new Set([...prev, suggestion.id]))
        fetchData()
      }
    } catch {
      // Silently fail
    } finally {
      setApplyingSuggestionId(null)
    }
  }, [courseId, userEmail, fetchData])

  const dismissAiSuggestion = useCallback((id: string) => {
    setAiSuggestions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // ── Smart Template Suggestions (Task 52) ──────────────────────────────

  const runTemplateSuggestions = useCallback(async () => {
    if (!userEmail || !graphMap) return
    setTemplateSuggestLoading(true)
    setTemplateSuggestions([])
    try {
      const syllabusText = graphMap.units
        .map((u) => `${u.label}${u.description ? ': ' + u.description : ''}`)
        .join('\n')
      const textToAnalyze = syllabusText.length > 50
        ? syllabusText
        : graphMap.nodes.map((n) => n.label).join('\n')

      if (textToAnalyze.length < 50) {
        setTemplateSuggestLoading(false)
        return
      }

      const res = await fetch(`/api/courses/${courseId}/course-map/suggest-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ syllabusText: textToAnalyze }),
      })
      if (res.ok) {
        const data = await res.json()
        setTemplateSuggestions(data.suggestions || [])
        setShowTemplateSuggestions(true)
      }
    } catch {
      // Silently fail
    } finally {
      setTemplateSuggestLoading(false)
    }
  }, [courseId, userEmail, graphMap])

  const applyPresetTemplate = useCallback(async (presetId: string) => {
    if (!userEmail) return
    setApplyingPresetId(presetId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/from-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ templateId: presetId, preset: true }),
      })
      if (res.ok) {
        setShowTemplateSuggestions(false)
        setTemplateSuggestions([])
        fetchData()
      }
    } catch {
      // Silently fail
    } finally {
      setApplyingPresetId(null)
    }
  }, [courseId, userEmail, fetchData])

  // ── NL Edit handler (Task 44) ────────────────────────────────────────

  const submitNlEdit = useCallback(async () => {
    if (!userEmail || !nlEditInstruction.trim()) return
    setNlEditLoading(true)
    setNlEditChanges([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ instruction: nlEditInstruction.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setNlEditChanges(data.changes || [])
        setNlEditSummary(data.summary || '')
      }
    } catch {
      // Silently fail
    } finally {
      setNlEditLoading(false)
    }
  }, [courseId, userEmail, nlEditInstruction])

  const applyNlChanges = useCallback(async () => {
    if (!userEmail || nlEditChanges.length === 0) return
    setNlEditApplying(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-edit/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ changes: nlEditChanges }),
      })
      if (res.ok) {
        setNlEditOpen(false)
        setNlEditInstruction('')
        setNlEditChanges([])
        setNlEditSummary('')
        fetchData()
      }
    } catch {
      // Silently fail
    } finally {
      setNlEditApplying(false)
    }
  }, [courseId, userEmail, nlEditChanges, fetchData])

  // ── Share helpers ──────────────────────────────────────────────────────

  const fetchShareStatus = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setShareToken(data.shareToken)
        setShareAccessCode(data.shareAccessCode)
        setShareUrl(data.shareUrl)
        setAccessCodeInput(data.shareAccessCode || '')
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail])

  const enableSharing = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setShareToken(data.shareToken)
        setShareAccessCode(data.shareAccessCode)
        setShareUrl(data.shareUrl)
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail])

  const disableSharing = useCallback(async () => {
    if (!courseId || !userEmail) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        setShareToken(null)
        setShareAccessCode(null)
        setShareUrl(null)
      }
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail])

  const updateAccessCode = useCallback(async (code: string | null) => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ accessCode: code }),
      })
      setShareAccessCode(code)
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail])

  const copyToClipboard = useCallback(async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setter(true)
      setTimeout(() => setter(false), 2000)
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    if (isEditorRole && showShareDialog) fetchShareStatus()
  }, [isEditorRole, showShareDialog, fetchShareStatus])

  // ── Notify Students helper ──────────────────────────────────────────────

  const handleNotifyStudents = useCallback(async () => {
    if (!courseId || !userEmail) return
    setNotifyingStu(true)
    setNotifyStuResult(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/notify`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      const data = await res.json()
      if (res.ok) {
        setNotifyStuResult(`Notified ${data.notified} student${data.notified !== 1 ? 's' : ''}`)
        setTimeout(() => setNotifyStuResult(null), 4000)
      } else {
        setNotifyStuResult('Failed to notify students')
        setTimeout(() => setNotifyStuResult(null), 4000)
      }
    } catch {
      setNotifyStuResult('Failed to notify students')
      setTimeout(() => setNotifyStuResult(null), 4000)
    }
    setNotifyingStu(false)
  }, [courseId, userEmail])

  // ── Webhook helpers ─────────────────────────────────────────────────────

  const fetchWebhooks = useCallback(async () => {
    if (!courseId || !userEmail) return
    setWebhooksLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch { /* silently fail */ }
    setWebhooksLoading(false)
  }, [courseId, userEmail])

  const handleAddWebhook = useCallback(async () => {
    if (!courseId || !userEmail || !webhookUrl.trim() || !webhookSecret.trim()) return
    setAddingWebhook(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ url: webhookUrl.trim(), secret: webhookSecret.trim(), events: webhookEvents }),
      })
      if (res.ok) {
        setWebhookUrl('')
        setWebhookSecret('')
        setWebhookEvents([])
        fetchWebhooks()
      }
    } catch { /* silently fail */ }
    setAddingWebhook(false)
  }, [courseId, userEmail, webhookUrl, webhookSecret, webhookEvents, fetchWebhooks])

  const handleDeleteWebhook = useCallback(async (whId: string) => {
    if (!courseId || !userEmail) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/webhooks/${whId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      setWebhooks((prev) => prev.filter((w) => w.id !== whId))
    } catch { /* silently fail */ }
  }, [courseId, userEmail])

  const handleTestWebhook = useCallback(async (whId: string) => {
    if (!courseId || !userEmail) return
    setTestingWebhookId(whId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ action: 'test', webhookId: whId }),
      })
      const data = await res.json()
      addCollabToast(data.ok ? `Webhook test: ${data.status} OK` : `Webhook test failed: ${data.error || 'unknown error'}`)
    } catch {
      addCollabToast('Webhook test failed')
    }
    setTestingWebhookId(null)
  }, [courseId, userEmail, addCollabToast])

  useEffect(() => {
    if (isEditorRole && showShareDialog && shareTab === 'webhooks') fetchWebhooks()
  }, [isEditorRole, showShareDialog, shareTab, fetchWebhooks])

  const openWebhookDashboard = useCallback(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  // ── Export helpers ─────────────────────────────────────────────────────

  const exportAs = useCallback(async (format: 'csv' | 'svg' | 'json') => {
    if (!courseId || !userEmail) return
    setShowExportDropdown(false)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/export?format=${format}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `course-map.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail])

  const exportAsPng = useCallback(async () => {
    if (!courseId || !userEmail) return
    setShowExportDropdown(false)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/export?format=png`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) return
      const { svg, width, height } = await res.json() as { svg: string; width: number; height: number }

      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(scale, scale)

      const img = new Image()
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return
          const pngUrl = URL.createObjectURL(pngBlob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = `course-map.png`
          a.click()
          URL.revokeObjectURL(pngUrl)
        }, 'image/png')
      }
      img.src = url
    } catch {
      // Silently fail
    }
  }, [courseId, userEmail])

  const handlePrint = useCallback(() => {
    setShowExportDropdown(false)
    document.body.classList.add('course-map-printing')
    window.print()
    const cleanup = () => {
      document.body.classList.remove('course-map-printing')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
  }, [])

  // ── Report helpers ──────────────────────────────────────────────────────

  const openReportInTab = useCallback(async () => {
    if (!courseId || !userEmail) return
    setReportLoading(true)
    try {
      const params = new URLSearchParams({ format: 'html' })
      if (!reportIncludeAnnotations) params.set('annotations', 'false')
      if (!reportIncludeMilestones) params.set('milestones', 'false')
      if (!reportIncludeHealth) params.set('health', 'false')
      if (!reportIncludeAnalytics) params.set('analytics', 'false')
      window.open(`/api/courses/${courseId}/course-map/report?${params}`, '_blank')
    } finally {
      setReportLoading(false)
    }
  }, [courseId, userEmail, reportIncludeAnnotations, reportIncludeMilestones, reportIncludeHealth, reportIncludeAnalytics])

  const downloadReportHtml = useCallback(async () => {
    if (!courseId || !userEmail) return
    setReportLoading(true)
    try {
      const params = new URLSearchParams({ format: 'html' })
      if (!reportIncludeAnnotations) params.set('annotations', 'false')
      if (!reportIncludeMilestones) params.set('milestones', 'false')
      if (!reportIncludeHealth) params.set('health', 'false')
      if (!reportIncludeAnalytics) params.set('analytics', 'false')
      const res = await fetch(`/api/courses/${courseId}/course-map/report?${params}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'course-map-report.html'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setReportLoading(false)
    }
  }, [courseId, userEmail, reportIncludeAnnotations, reportIncludeMilestones, reportIncludeHealth, reportIncludeAnalytics])

  // ── Course comparison helpers ──────────────────────────────────────────

  const fetchCompareCourses = useCallback(async () => {
    if (!userEmail) return
    try {
      const res = await fetch('/api/courses', { headers: { 'x-demo-user-email': userEmail } })
      if (!res.ok) return
      const data = await res.json()
      const courses = (data.courses || data || [])
        .filter((c: { id: string }) => c.id !== courseId)
        .map((c: { id: string; courseCode?: string; title?: string }) => ({
          id: c.id,
          courseCode: c.courseCode || '',
          title: c.title || 'Untitled',
        }))
      setCompareCourses(courses)
    } catch {
      setCompareCourses([])
    }
  }, [courseId, userEmail])

  const runCourseComparison = useCallback(async () => {
    if (!courseId || !userEmail || !compareTargetCourseId) return
    setCourseComparisonLoading(true)
    setCourseComparisonResult(null)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/course-map/compare?targetCourseId=${compareTargetCourseId}`,
        { headers: { 'x-demo-user-email': userEmail } },
      )
      if (!res.ok) return
      const data = await res.json()
      setCourseComparisonResult(data.comparison)
    } finally {
      setCourseComparisonLoading(false)
    }
  }, [courseId, userEmail, compareTargetCourseId])

  // ── Plugin system initialization (Task 95/96) ───────────────────────

  useEffect(() => {
    if (!courseId || !graphMap) return

    const registry = new PluginRegistry()
    pluginRegistryRef.current = registry

    const apiCallbacks: PluginAPICallbacks = {
      getNodes: () => graphMap.nodes,
      getEdges: () => graphMap.edges,
      getSelectedNodeId: () => selectedNodeId,
      getMapId: () => graphMap.id,
      getCourseId: () => courseId,
      onShowNotification: (message) => {
        addCollabToast(message)
      },
    }
    const api = new PluginAPI(apiCallbacks)
    pluginApiRef.current = api

    const init = async () => {
      for (const sample of SAMPLE_PLUGINS) {
        await registry.registerPlugin(sample.manifest, sample.hooks)
      }
      setPluginEntries(registry.listPlugins())
    }
    init()

    const unsub = registry.subscribe(() => {
      setPluginEntries(registry.listPlugins())
    })

    return () => {
      unsub()
      api.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, !!graphMap])

  const handlePluginInstall = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    const sample = getSamplePlugin(pluginId)
    if (!sample) return
    await registry.registerPlugin(sample.manifest, sample.hooks)
    await registry.enablePlugin(pluginId)
  }, [])

  const handlePluginUninstall = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    await registry.unregisterPlugin(pluginId)
  }, [])

  const handlePluginEnable = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    await registry.enablePlugin(pluginId)
  }, [])

  const handlePluginDisable = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    await registry.disablePlugin(pluginId)
  }, [])

  const handlePluginUpdateConfig = useCallback((pluginId: string, config: Record<string, string | number | boolean>) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    registry.updateConfig(pluginId, config)
  }, [])

  const handlePluginClearData = useCallback((pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    registry.clearPluginData(pluginId)
  }, [])

  // ── AI Assistant & Smart Automation handlers (Task 97/98) ─────────────

  const handleAIAssistantActions = useCallback((actions: MapAction[]) => {
    if (!graphMap) return
    for (const action of actions) {
      if (action.type === 'addEdge') {
        const p = action.payload as { fromNodeId: string; toNodeId: string; edgeType: string }
        fetch(`/api/courses/${courseId}/course-map/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail || '' },
          body: JSON.stringify({ fromNodeId: p.fromNodeId, toNodeId: p.toNodeId, edgeType: p.edgeType }),
        }).then(() => fetchData())
      } else if (action.type === 'moveNode') {
        const p = action.payload as { nodeId: string; xPos: number; yPos: number }
        fetch(`/api/courses/${courseId}/course-map/nodes/${p.nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail || '' },
          body: JSON.stringify({ xPos: p.xPos, yPos: p.yPos }),
        }).then(() => fetchData())
      } else if (action.type === 'removeNode') {
        const p = action.payload as { nodeId: string }
        fetch(`/api/courses/${courseId}/course-map/nodes/${p.nodeId}`, {
          method: 'DELETE',
          headers: { 'x-demo-user-email': userEmail || '' },
        }).then(() => fetchData())
      } else if (action.type === 'updateNode') {
        const p = action.payload as { nodeId: string; label: string }
        fetch(`/api/courses/${courseId}/course-map/nodes/${p.nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail || '' },
          body: JSON.stringify({ label: p.label }),
        }).then(() => fetchData())
      }
    }
  }, [graphMap, courseId, userEmail, fetchData])

  const handleSmartAutomationFix = useCallback((action: FixAction) => {
    if (action.type === 'addEdge') {
      fetch(`/api/courses/${courseId}/course-map/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail || '' },
        body: JSON.stringify({ fromNodeId: action.fromNodeId, toNodeId: action.toNodeId, edgeType: action.edgeType }),
      }).then(() => fetchData())
    } else if (action.type === 'moveNode') {
      fetch(`/api/courses/${courseId}/course-map/nodes/${action.nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail || '' },
        body: JSON.stringify({ xPos: action.xPos, yPos: action.yPos }),
      }).then(() => fetchData())
    } else if (action.type === 'removeNode') {
      fetch(`/api/courses/${courseId}/course-map/nodes/${action.nodeId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail || '' },
      }).then(() => fetchData())
    }
  }, [courseId, userEmail, fetchData])

  return {
    // AI suggestions
    aiSuggestions, aiSuggestionsLoading, aiSuggestionsPanelOpen, setAiSuggestionsPanelOpen,
    aiSuggestionsSummary, applyingSuggestionId, appliedSuggestionIds,
    runAiSuggestions, applyAiSuggestion, dismissAiSuggestion,

    // NL edit
    nlEditOpen, setNlEditOpen,
    nlEditInstruction, setNlEditInstruction,
    nlEditLoading, nlEditChanges, nlEditSummary,
    nlEditApplying, submitNlEdit, applyNlChanges,

    // Share
    showShareDialog, setShowShareDialog,
    showSharingPanel, setShowSharingPanel,
    shareToken, shareAccessCode, shareUrl,
    shareCopied, setShareCopied, embedCopied, setEmbedCopied,
    accessCodeInput, setAccessCodeInput,
    enableSharing, disableSharing, updateAccessCode, copyToClipboard,

    // Export
    showExportDropdown, setShowExportDropdown,
    exportAs, exportAsPng, handlePrint,

    // Report
    showReportModal, setShowReportModal,
    reportIncludeAnnotations, setReportIncludeAnnotations,
    reportIncludeMilestones, setReportIncludeMilestones,
    reportIncludeHealth, setReportIncludeHealth,
    reportIncludeAnalytics, setReportIncludeAnalytics,
    reportLoading, openReportInTab, downloadReportHtml,

    // Course comparison
    showCourseCompare, setShowCourseCompare,
    compareTargetCourseId, setCompareTargetCourseId,
    compareCourses, courseComparisonResult,
    courseComparisonLoading, fetchCompareCourses, runCourseComparison,

    // Canvas sync
    showCanvasSyncDialog, setShowCanvasSyncDialog,
    canvasCourseIdInput, setCanvasCourseIdInput,
    canvasSyncing, setCanvasSyncing,
    canvasSyncResult, setCanvasSyncResult,
    canvasSyncError, setCanvasSyncError,
    canvasSyncStatus, setCanvasSyncStatus,

    // Embed/share tabs
    shareTab, setShareTab,
    embedWidth, setEmbedWidth, embedHeight, setEmbedHeight,

    // Template
    showSaveTemplateDialog, setShowSaveTemplateDialog,
    templateName, setTemplateName,
    templateDescription, setTemplateDescription,
    templateCategory, setTemplateCategory,
    savingTemplate, setSavingTemplate,

    // Smart template suggestions
    showTemplateSuggestions, setShowTemplateSuggestions,
    templateSuggestions, templateSuggestLoading,
    applyingPresetId, runTemplateSuggestions, applyPresetTemplate,

    // Notify students
    notifyingStu, notifyStuResult, handleNotifyStudents,

    // Webhooks
    webhooks, webhooksLoading, webhookUrl, setWebhookUrl,
    webhookSecret, setWebhookSecret,
    webhookEvents, setWebhookEvents,
    addingWebhook, testingWebhookId,
    fetchWebhooks, handleAddWebhook, handleDeleteWebhook, handleTestWebhook,
    openWebhookDashboard, WEBHOOK_EVENT_OPTIONS,

    // Duplicate
    showDuplicateDialog, setShowDuplicateDialog,
    userCourses, setUserCourses,
    duplicateTargetId, setDuplicateTargetId,
    duplicating, setDuplicating,
    duplicateOverwriteConfirm, setDuplicateOverwriteConfirm,

    // Plugin system
    pluginEntries, showPluginMarketplace, setShowPluginMarketplace,
    showPluginSettings, setShowPluginSettings,
    selectedPluginManifest, setSelectedPluginManifest,
    handlePluginInstall, handlePluginUninstall,
    handlePluginEnable, handlePluginDisable,
    handlePluginUpdateConfig, handlePluginClearData,

    // AI Assistant & Smart Automation
    showAIAssistant, setShowAIAssistant,
    showSmartAutomation, setShowSmartAutomation,
    handleAIAssistantActions, handleSmartAutomationFix,

    // Panel toggles
    showTeachingAssistant, setShowTeachingAssistant,
    showSmartSuggestions, setShowSmartSuggestions,
    showExportSuite, setShowExportSuite,
    showReportingDashboard, setShowReportingDashboard,
  }
}
