'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, Eye, Code2, Globe, History, Maximize2, Minimize2, PlusCircle, Save, Tag, Trash2, Users, X } from 'lucide-react'
import { getTemplate, type PlaygroundTemplate } from '../../lib/playground-templates'
import { useAuth } from '../../lib/auth-context'
import ContrastWarning from '../accessibility/ContrastWarning'
import type { ContrastResult } from '../../lib/accessibility/types'
import PlaygroundChat from './PlaygroundChat'
import WarmStartBanner from './WarmStartBanner'
import CodeEditor from './CodeEditor'
import AppPreview from './AppPreview'
import ExportModal from './ExportModal'
import DelegatesModal from './DelegatesModal'
import SnapshotHistoryDrawer from './SnapshotHistoryDrawer'

type MobileTab = 'editor' | 'preview'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function inferAppTitle(prompt: string) {
  const condensed = prompt
    .replace(/\s+/g, ' ')
    .replace(/^build\s+/i, '')
    .trim()

  if (!condensed) return 'Untitled App'
  return condensed.length > 60 ? `${condensed.slice(0, 57).trim()}...` : condensed
}

function PanelFrame({
  title,
  subtitle,
  icon,
  children,
  alert = false,
  isFullscreen = false,
  onToggleFullscreen,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  children: ReactNode
  alert?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}) {
  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(0,51,160,0.14),_transparent_38%),linear-gradient(180deg,#f8fbff_0%,#eef3f8_100%)] p-4'
          : `flex h-full min-h-0 flex-col${alert ? ' rounded-[28px] ring-2 ring-red-400' : ''}`
      }
    >
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="relative flex size-10 items-center justify-center rounded-2xl bg-white text-[#0033A0] shadow-sm">
          {icon}
          {alert && (
            <span className="absolute -right-1 -top-1 size-3 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="flex size-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

interface PlaygroundLayoutProps {
  initialPrompt?: string
  returnTo?: string
}

export default function PlaygroundLayout({ initialPrompt = '', returnTo = '/studio' }: PlaygroundLayoutProps) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const loadAppId = searchParams.get('app')

  const [code, setCode] = useState('')
  const [previewCode, setPreviewCode] = useState('')
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [runId, setRunId] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>(loadAppId ? 'preview' : 'editor')
  const [autoRunOnGenerate, setAutoRunOnGenerate] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [appId, setAppId] = useState<string | null>(null)
  const [appTitle, setAppTitle] = useState(
    initialPrompt ? inferAppTitle(initialPrompt) : 'Untitled App'
  )
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedCode, setLastSavedCode] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [delegatesOpen, setDelegatesOpen] = useState(false)
  const [isAutoSavingTitle, setIsAutoSavingTitle] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [newSessionConfirm, setNewSessionConfirm] = useState(false)
  const [previewFullscreen, setPreviewFullscreen] = useState(false)
  const [isLoadingApp, setIsLoadingApp] = useState(false)
  const [contrastResult, setContrastResult] = useState<ContrastResult | null>(null)
  const [hasManualEdits, setHasManualEdits] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [appDescription, setAppDescription] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [snapshotDrawerOpen, setSnapshotDrawerOpen] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [warmStartBanner, setWarmStartBanner] = useState<string | null>(null)
  const [warmStartCtaLabel, setWarmStartCtaLabel] = useState<string | undefined>(undefined)
  const [warmStartPulse, setWarmStartPulse] = useState(false)
  const [warmStartChatCollapsed, setWarmStartChatCollapsed] = useState(false)
  const [toolEvent, setToolEvent] = useState<Record<string, unknown> | null>(null)
  const templateRef = useRef<PlaygroundTemplate | null>(null)
  const editorRef = useRef<{ editor: unknown; monaco: unknown } | null>(null)
  const scrollAppliedRef = useRef(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const lastSavedTitleRef = useRef(appTitle)

  // Load a saved app when ?app=ID is in the URL
  useEffect(() => {
    if (!loadAppId) return
    setIsLoadingApp(true)
    fetch(`/api/playground/apps/${loadAppId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { id?: string; title?: string; htmlContent?: string; description?: string; tags?: string[]; publishedAt?: string | null }) => {
        if (data.id && data.htmlContent) {
          setAppId(data.id)
          const loadedTitle = data.title ?? 'Untitled App'
          setAppTitle(loadedTitle)
          lastSavedTitleRef.current = loadedTitle
          setCode(data.htmlContent)
          setLastSavedCode(data.htmlContent)
          setAppDescription(data.description ?? '')
          setTags(data.tags ?? [])
          setPublishedAt(data.publishedAt ?? null)
          setHasStarted(true)
        }
        setIsLoadingApp(false)
      })
      .catch(() => {
        setIsLoadingApp(false)
      })
  }, [loadAppId, currentUser.email])

  // Warm Start: template hydration from ?template=&warm=true
  useEffect(() => {
    const templateKey = searchParams.get('template')
    const warm = searchParams.get('warm')
    if (!templateKey || warm !== 'true') return

    let cancelled = false
    void getTemplate(templateKey).then((result) => {
      if (cancelled || !result) return

      const { template, htmlContent } = result
      templateRef.current = template
      scrollAppliedRef.current = false

      // Set editor code
      setCode(htmlContent)
      setHasStarted(true)
      setAppTitle(template.title)

      // Auto-run preview
      if (template.warmStartConfig.autoRunPreview) {
        setPreviewCode(htmlContent)
        setRunId((prev) => prev + 1)
      }

      // Collapse chat
      if (template.warmStartConfig.chatCollapsed) {
        setWarmStartChatCollapsed(true)
      }

      // Banner + CTA
      setWarmStartBanner(template.warmStartConfig.bannerText)
      setWarmStartCtaLabel(template.warmStartConfig.ctaLabel)

      // Pulse animation with auto-stop
      setWarmStartPulse(true)
      setTimeout(() => {
        setWarmStartPulse(false)
      }, template.warmStartConfig.ctaPulseDurationMs)

      // Clean URL params to avoid re-trigger on refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('template')
      url.searchParams.delete('warm')
      window.history.replaceState({}, '', url.pathname + url.search)

      // Scroll to target if editor is already mounted
      if (editorRef.current && template.editorScrollTarget) {
        applyScrollToTarget(editorRef.current.editor, editorRef.current.monaco, template.editorScrollTarget)
      }
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Monaco scroll-to-target helper
  // Uses `any` for Monaco types since monaco-editor types aren't directly importable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyScrollToTarget(editor: any, monaco: any, target: string) {
    if (scrollAppliedRef.current) return
    scrollAppliedRef.current = true

    const model = editor.getModel()
    if (!model) return

    // Find the line containing the target string
    const match = model.findMatches(target, false, false, false, null, false)
    if (match.length === 0) return

    const lineNumber = match[0].range.startLineNumber
    editor.revealLineInCenter(lineNumber)

    // Brief highlight decoration (yellow background for 2s)
    const decorations = editor.deltaDecorations([], [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
        options: {
          isWholeLine: true,
          className: 'warm-start-highlight-line',
        },
      },
    ])

    setTimeout(() => {
      editor.deltaDecorations(decorations, [])
    }, 2000)
  }

  // Editor mount handler — stores ref and applies pending scroll target
  const handleEditorMount = useCallback((editor: unknown, monaco: unknown) => {
    editorRef.current = { editor, monaco }
    const template = templateRef.current
    if (template?.editorScrollTarget && !scrollAppliedRef.current) {
      // Small delay to let Monaco render the content
      setTimeout(() => {
        applyScrollToTarget(editor, monaco, template.editorScrollTarget)
      }, 100)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewFullscreen) {
        setPreviewFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewFullscreen])

  // Beforeunload guard — warn on unsaved changes
  useEffect(() => {
    const isDirtyNow = Boolean(code.trim()) && code !== lastSavedCode
    if (!isDirtyNow) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [code, lastSavedCode])

  const handleRun = useCallback((nextCode: string) => {
    setPreviewCode(nextCode)
    setRuntimeError(null)
    setRunId((previous) => previous + 1)
  }, [])

  const isDirty = useMemo(
    () => Boolean(code.trim()) && code !== lastSavedCode,
    [code, lastSavedCode]
  )

  const handleSave = useCallback(async () => {
    if (!code.trim()) return

    setSaveState('saving')
    setSaveError(null)

    try {
      const response = await fetch(appId ? `/api/playground/apps/${appId}` : '/api/playground/apps', {
        method: appId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          title: appTitle.trim() || 'Untitled App',
          htmlContent: code,
          description: appDescription.trim() || null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Save failed')
      }

      const payload = (await response.json()) as { id?: string; title?: string }
      if (payload.id) {
        setAppId(payload.id)
      }

      if (payload.title) {
        setAppTitle(payload.title)
      }

      setLastSavedCode(code)
      lastSavedTitleRef.current = appTitle.trim() || 'Untitled App'
      setSaveState('saved')

      // Non-blocking contrast check after successful save
      import('../../lib/accessibility/contrast-checker')
        .then(({ checkContrast }) => {
          const result = checkContrast(code)
          setContrastResult(result.passes ? null : result)
        })
        .catch(() => {})
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Save failed')
    }
  }, [appId, appTitle, code, currentUser.email])

  const handleTitleBlur = useCallback(async () => {
    if (!appId) return
    const trimmed = appTitle.trim() || 'Untitled App'
    if (trimmed === lastSavedTitleRef.current) return
    setIsAutoSavingTitle(true)
    try {
      await fetch(`/api/playground/apps/${appId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ title: trimmed }),
      })
      lastSavedTitleRef.current = trimmed
    } catch {
      // silent — full Save will catch it
    } finally {
      setIsAutoSavingTitle(false)
    }
  }, [appId, appTitle, currentUser.email])

  const handleNewSession = useCallback(() => {
    setCode('')
    setPreviewCode('')
    setRuntimeError(null)
    setRunId(0)
    setAppId(null)
    setAppTitle('Untitled App')
    lastSavedTitleRef.current = 'Untitled App'
    setLastSavedCode('')
    setHasStarted(false)
    setSaveState('idle')
    setSaveError(null)
    setHasManualEdits(false)
    setAppDescription('')
    setTags([])
    setTagsExpanded(false)
    setTagInput('')
    setNewSessionConfirm(false)
    setChatKey((k) => k + 1)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }, [pendingNavigation, router])

  const handleBack = useCallback(() => {
    if (isDirty) {
      setPendingNavigation(returnTo)
      setNewSessionConfirm(true)
    } else {
      router.push(returnTo)
    }
  }, [isDirty, returnTo, router])

  const handleDelete = useCallback(async () => {
    if (!appId) return
    setIsDeleting(true)
    try {
      await fetch(`/api/playground/apps/${appId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      router.push('/my-apps')
    } catch {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }, [appId, currentUser.email, router])

  const handlePublishToggle = useCallback(async () => {
    if (!appId) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/playground/apps/${appId}/publish`, {
        method: publishedAt ? 'DELETE' : 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = (await res.json()) as { publishedAt: string | null }
        setPublishedAt(data.publishedAt)
      }
    } finally {
      setIsPublishing(false)
    }
  }, [appId, publishedAt, currentUser.email])

  const handleRestored = useCallback((htmlContent: string, title: string) => {
    setCode(htmlContent)
    setAppTitle(title)
    setLastSavedCode(htmlContent)
    lastSavedTitleRef.current = title
  }, [])

  const saveTags = useCallback(async (newTags: string[]) => {
    if (!appId) return
    try {
      await fetch(`/api/playground/apps/${appId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ tags: newTags }),
      })
    } catch {
      // silent — tags are not critical path
    }
  }, [appId, currentUser.email])

  const handleAddTag = useCallback(() => {
    const newTag = tagInput.trim().toLowerCase().slice(0, 30)
    if (!newTag || tags.includes(newTag) || tags.length >= 5) {
      setTagInput('')
      return
    }
    const newTags = [...tags, newTag]
    setTags(newTags)
    setTagInput('')
    void saveTags(newTags)
  }, [tagInput, tags, saveTags])

  const handleRemoveTag = useCallback((tag: string) => {
    const newTags = tags.filter((t) => t !== tag)
    setTags(newTags)
    void saveTags(newTags)
  }, [tags, saveTags])

  const saveButtonLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved' && !isDirty
        ? 'Saved'
        : 'Save'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,51,160,0.14),_transparent_38%),linear-gradient(180deg,#f8fbff_0%,#eef3f8_100%)]">
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="border-b border-white/70 bg-white/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0033A0]">
                    Playground
                  </span>
                  <span className="hidden text-xs text-gray-400 sm:inline">
                    Building as {currentUser.name}
                  </span>
                  {appId ? (
                    <span className="hidden rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 sm:inline-flex">
                      Saved App
                    </span>
                  ) : null}
                </div>
                <input
                  ref={titleInputRef}
                  value={appTitle}
                  onChange={(event) => setAppTitle(event.target.value.slice(0, 120))}
                  onBlur={() => void handleTitleBlur()}
                  maxLength={120}
                  aria-label="App title"
                  className={`mt-1 w-full bg-transparent border-b border-transparent focus:border-[#0033A0] focus:outline-none text-xl font-bold text-gray-900 sm:text-2xl ${isAutoSavingTitle ? 'opacity-60' : ''}`}
                />
                <input
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value.slice(0, 160))}
                  maxLength={160}
                  placeholder="Short description (optional)"
                  aria-label="App description"
                  className="mt-0.5 w-full bg-transparent border-b border-transparent focus:border-[#0033A0]/50 focus:outline-none text-sm text-gray-500"
                />

                {appId ? (
                  <div className="mt-1.5 min-h-[22px]">
                    {tagsExpanded ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              aria-label={`Remove tag ${tag}`}
                              className="text-blue-400 hover:text-blue-700"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                        {tags.length < 5 && (
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value.slice(0, 30))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
                            }}
                            onBlur={handleAddTag}
                            placeholder="Add tag…"
                            aria-label="New tag"
                            className="w-24 border-b border-gray-300 bg-transparent text-xs text-gray-600 focus:border-[#0033A0] focus:outline-none"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setTagsExpanded(false)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTagsExpanded(true)}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        <Tag className="size-3" />
                        {tags.length > 0 ? tags.join(', ') : 'Add tags'}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isDirty) {
                    setNewSessionConfirm(true)
                  } else {
                    handleNewSession()
                  }
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <PlusCircle className="size-4" />
                New
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!code.trim() || saveState === 'saving'}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="size-4" />
                {saveButtonLabel}
                {isDirty && <span className="ml-1 text-amber-400">●</span>}
              </button>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                disabled={!code.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() => setDelegatesOpen(true)}
                disabled={!appId}
                title={appId ? 'Share access with teammates' : 'Save the app first'}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Users className="size-4" />
                Share Access
              </button>

              {appId ? (
                <button
                  type="button"
                  onClick={() => void handlePublishToggle()}
                  disabled={isPublishing}
                  title={publishedAt ? 'Click to unpublish' : 'Publish this app publicly'}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    publishedAt
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="size-4" />
                  <span className="hidden sm:inline">{publishedAt ? 'Published' : 'Publish'}</span>
                </button>
              ) : null}

              {appId ? (
                <button
                  type="button"
                  onClick={() => setSnapshotDrawerOpen(true)}
                  title="Version history"
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                >
                  <History className="size-4" />
                  <span className="hidden sm:inline">History</span>
                </button>
              ) : null}

              {appId ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  title="Delete this app"
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            </div>
          </div>

          {saveError ? (
            <div className="mx-auto w-full max-w-[1800px] px-4 pb-4 sm:px-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            </div>
          ) : null}

          {contrastResult && !contrastResult.passes && (
            <div className="mx-auto w-full max-w-[1800px] px-4 pb-4 sm:px-6">
              <ContrastWarning
                result={contrastResult}
                onDismiss={() => setContrastResult(null)}
              />
            </div>
          )}

          {newSessionConfirm ? (
            <div className="mx-auto w-full max-w-[1800px] px-4 pb-4 sm:px-6">
              <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="flex-1 font-medium">Start a new app? Unsaved changes will be lost.</span>
                <button
                  type="button"
                  onClick={() => { setNewSessionConfirm(false); setPendingNavigation(null) }}
                  className="rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                >
                  {pendingNavigation ? 'Leave page' : 'Start fresh'}
                </button>
              </div>
            </div>
          ) : null}

          {confirmDelete ? (
            <div className="mx-auto w-full max-w-[1800px] px-4 pb-4 sm:px-6">
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                <span className="flex-1 font-medium">Delete &ldquo;{appTitle}&rdquo;? This cannot be undone.</span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting…' : 'Delete app'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col p-4 sm:p-6">
          {isLoadingApp ? (
            <>
              <PlaygroundSkeleton />
              <div className="flex flex-1 items-center justify-center lg:hidden">
                <SpinnerIcon />
              </div>
            </>
          ) : (
          <>{warmStartBanner ? (
            <WarmStartBanner
              bannerText={warmStartBanner}
              onDismiss={() => setWarmStartBanner(null)}
              onShowChat={() => setWarmStartChatCollapsed(false)}
            />
          ) : null}
          <div className={`hidden min-h-0 flex-1 gap-4 lg:grid ${warmStartChatCollapsed ? 'lg:grid-cols-[minmax(360px,45%)_minmax(360px,55%)]' : 'lg:grid-cols-[minmax(320px,30%)_minmax(360px,35%)_minmax(360px,35%)]'}`}>
            {!warmStartChatCollapsed ? (
            <PanelFrame
              title="Chat"
              subtitle="Describe and iterate"
              icon={<SparklesIcon />}
            >
              <PlaygroundChat
                key={chatKey}
                appId={appId}
                currentCode={code}
                runtimeError={runtimeError}
                autoRunOnGenerate={autoRunOnGenerate}
                hasStarted={hasStarted}
                hasManualEdits={hasManualEdits}
                initialPrompt={initialPrompt}
                warmStartContext={templateRef.current ? {
                  templateKey: templateRef.current.key,
                  templateTitle: templateRef.current.title,
                  templateDescription: templateRef.current.description,
                  editorScrollTarget: templateRef.current.editorScrollTarget,
                } : undefined}
                onClearRuntimeError={() => setRuntimeError(null)}
                onDismissRuntimeError={() => setRuntimeError(null)}
                onStarted={() => setHasStarted(true)}
                onGeneratingChange={setIsGenerating}
                onPromptSubmitted={(prompt) => {
                  if (appTitle === 'Untitled App') {
                    setAppTitle(inferAppTitle(prompt))
                  }
                  if (!appDescription) {
                    setAppDescription(prompt.slice(0, 160))
                  }
                }}
                onCodeGenerated={(newCode) => {
                  setHasManualEdits(false)
                  setCode(newCode)
                }}
                onRunGeneratedCode={handleRun}
                toolEvent={toolEvent}
                onToolEventHandled={() => setToolEvent(null)}
              />
            </PanelFrame>
            ) : null}

            <PanelFrame
              title="Editor"
              subtitle="Inspect and tweak the file"
              icon={<Code2 className="size-5" />}
            >
              <CodeEditor
                code={code}
                autoRunOnGenerate={autoRunOnGenerate}
                onAutoRunChange={setAutoRunOnGenerate}
                onChange={(newCode) => {
                  setHasManualEdits(true)
                  setCode(newCode)
                }}
                onRun={handleRun}
                runLabel={warmStartCtaLabel}
                runPulse={warmStartPulse}
                onEditorMount={handleEditorMount}
              />
            </PanelFrame>

            <PanelFrame
              title="Preview"
              subtitle="Run the app in-browser"
              icon={<Eye className="size-5" />}
              alert={!!runtimeError}
              isFullscreen={previewFullscreen}
              onToggleFullscreen={() => setPreviewFullscreen((v) => !v)}
            >
              <AppPreview
                appId={appId}
                code={previewCode}
                runId={runId}
                error={runtimeError}
                isGenerating={isGenerating}
                onError={setRuntimeError}
                onToolEvent={setToolEvent}
              />
            </PanelFrame>
          </div>

          <div className="flex flex-1 flex-col gap-4 lg:hidden">
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              AI Chat
            </p>
            <div className="h-[46vh] min-h-[360px]">
              <PlaygroundChat
                key={chatKey}
                appId={appId}
                currentCode={code}
                runtimeError={runtimeError}
                autoRunOnGenerate={autoRunOnGenerate}
                hasStarted={hasStarted}
                hasManualEdits={hasManualEdits}
                initialPrompt={initialPrompt}
                warmStartContext={templateRef.current ? {
                  templateKey: templateRef.current.key,
                  templateTitle: templateRef.current.title,
                  templateDescription: templateRef.current.description,
                  editorScrollTarget: templateRef.current.editorScrollTarget,
                } : undefined}
                onClearRuntimeError={() => setRuntimeError(null)}
                onDismissRuntimeError={() => setRuntimeError(null)}
                onStarted={() => setHasStarted(true)}
                onGeneratingChange={setIsGenerating}
                onPromptSubmitted={(prompt) => {
                  if (appTitle === 'Untitled App') {
                    setAppTitle(inferAppTitle(prompt))
                  }
                  if (!appDescription) {
                    setAppDescription(prompt.slice(0, 160))
                  }
                }}
                onCodeGenerated={(newCode) => {
                  setHasManualEdits(false)
                  setCode(newCode)
                }}
                onRunGeneratedCode={handleRun}
                toolEvent={toolEvent}
                onToolEventHandled={() => setToolEvent(null)}
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              {([
                { id: 'editor', label: 'Editor', icon: <Code2 className="size-4" /> },
                { id: 'preview', label: 'Preview', icon: <Eye className="size-4" /> },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                    mobileTab === tab.id
                      ? 'bg-[#0033A0] text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1">
              {mobileTab === 'editor' ? (
                <CodeEditor
                  code={code}
                  autoRunOnGenerate={autoRunOnGenerate}
                  onAutoRunChange={setAutoRunOnGenerate}
                  onChange={(newCode) => {
                    setHasManualEdits(true)
                    setCode(newCode)
                  }}
                  onRun={handleRun}
                  runLabel={warmStartCtaLabel}
                  runPulse={warmStartPulse}
                  onEditorMount={handleEditorMount}
                />
              ) : (
                <AppPreview
                  appId={appId}
                  code={previewCode}
                  runId={runId}
                  error={runtimeError}
                  isGenerating={isGenerating}
                  onError={setRuntimeError}
                  onToolEvent={setToolEvent}
                />
              )}
            </div>
          </div>
          </>)}
        </div>
      </div>

      <ExportModal
        open={exportOpen}
        code={code}
        defaultAppName={appTitle}
        onClose={() => setExportOpen(false)}
      />

      <DelegatesModal
        appId={appId}
        open={delegatesOpen}
        onClose={() => setDelegatesOpen(false)}
      />

      {appId && snapshotDrawerOpen ? (
        <SnapshotHistoryDrawer
          appId={appId}
          userEmail={currentUser.email}
          open={snapshotDrawerOpen}
          onClose={() => setSnapshotDrawerOpen(false)}
          onRestored={handleRestored}
        />
      ) : null}
    </div>
  )
}

function PlaygroundSkeleton() {
  return (
    <div className="hidden min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-[minmax(320px,30%)_minmax(360px,35%)_minmax(360px,35%)]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-[28px] bg-gray-200" />
      ))}
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg className="size-8 animate-spin text-[#0033A0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zM19 14l.95 2.55L22.5 17.5l-2.55.95L19 21l-.95-2.55L15.5 17.5l2.55-.95L19 14zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15z"
        fill="currentColor"
      />
    </svg>
  )
}
