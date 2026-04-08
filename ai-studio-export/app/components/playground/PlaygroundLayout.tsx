'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, Eye, Code2, Save, Users } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PlaygroundChat from './PlaygroundChat'
import CodeEditor from './CodeEditor'
import AppPreview from './AppPreview'
import ExportModal from './ExportModal'
import DelegatesModal from './DelegatesModal'

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
}: {
  title: string
  subtitle: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0033A0] shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

interface PlaygroundLayoutProps {
  initialPrompt?: string
}

export default function PlaygroundLayout({ initialPrompt = '' }: PlaygroundLayoutProps) {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const loadAppId = searchParams.get('app')

  const [code, setCode] = useState('')
  const [previewCode, setPreviewCode] = useState('')
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [runId, setRunId] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview')
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

  // Load a saved app when ?app=ID is in the URL
  useEffect(() => {
    if (!loadAppId) return
    fetch(`/api/playground/apps/${loadAppId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { id?: string; title?: string; htmlContent?: string }) => {
        if (data.id && data.htmlContent) {
          setAppId(data.id)
          setAppTitle(data.title ?? 'Untitled App')
          setCode(data.htmlContent)
          setLastSavedCode(data.htmlContent)
          setHasStarted(true)
        }
      })
      .catch(() => {})
  }, [loadAppId, currentUser.email])

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
      setSaveState('saved')
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Save failed')
    }
  }, [appId, appTitle, code, currentUser.email])

  const saveButtonLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved' && !isDirty
        ? 'Saved'
        : 'Save'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,51,160,0.14),_transparent_38%),linear-gradient(180deg,#f8fbff_0%,#eef3f8_100%)]">
      <div className="flex h-[680px] max-h-screen flex-col overflow-hidden">
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
                <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">The Playground</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!code.trim() || saveState === 'saving'}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saveButtonLabel}
              </button>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                disabled={!code.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() => setDelegatesOpen(true)}
                disabled={!appId}
                title={appId ? 'Manage delegates' : 'Save the app first'}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Users className="h-4 w-4" />
                Delegates
              </button>

              <Link
                href="/build"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>

          {saveError ? (
            <div className="mx-auto w-full max-w-[1800px] px-4 pb-4 sm:px-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col p-4 sm:p-6">
          <div className="hidden min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-[minmax(320px,30%)_minmax(360px,35%)_minmax(360px,35%)]">
            <PanelFrame
              title="Chat"
              subtitle="Describe and iterate"
              icon={<SparklesIcon />}
            >
              <PlaygroundChat
                currentCode={code}
                runtimeError={runtimeError}
                autoRunOnGenerate={autoRunOnGenerate}
                hasStarted={hasStarted}
                initialPrompt={initialPrompt}
                onClearRuntimeError={() => setRuntimeError(null)}
                onDismissRuntimeError={() => setRuntimeError(null)}
                onStarted={() => setHasStarted(true)}
                onPromptSubmitted={(prompt) => {
                  if (appTitle === 'Untitled App') {
                    setAppTitle(inferAppTitle(prompt))
                  }
                }}
                onCodeGenerated={setCode}
                onRunGeneratedCode={handleRun}
              />
            </PanelFrame>

            <PanelFrame
              title="Editor"
              subtitle="Inspect and tweak the file"
              icon={<Code2 className="h-5 w-5" />}
            >
              <CodeEditor
                code={code}
                autoRunOnGenerate={autoRunOnGenerate}
                onAutoRunChange={setAutoRunOnGenerate}
                onChange={setCode}
                onRun={handleRun}
              />
            </PanelFrame>

            <PanelFrame
              title="Preview"
              subtitle="Run the app in-browser"
              icon={<Eye className="h-5 w-5" />}
            >
              <AppPreview
                appId={appId}
                code={previewCode}
                runId={runId}
                error={runtimeError}
                onError={setRuntimeError}
              />
            </PanelFrame>
          </div>

          <div className="flex flex-1 flex-col gap-4 lg:hidden">
            <div className="h-[46vh] min-h-[360px]">
              <PlaygroundChat
                currentCode={code}
                runtimeError={runtimeError}
                autoRunOnGenerate={autoRunOnGenerate}
                hasStarted={hasStarted}
                initialPrompt={initialPrompt}
                onClearRuntimeError={() => setRuntimeError(null)}
                onDismissRuntimeError={() => setRuntimeError(null)}
                onStarted={() => setHasStarted(true)}
                onPromptSubmitted={(prompt) => {
                  if (appTitle === 'Untitled App') {
                    setAppTitle(inferAppTitle(prompt))
                  }
                }}
                onCodeGenerated={setCode}
                onRunGeneratedCode={handleRun}
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              {([
                { id: 'editor', label: 'Editor', icon: <Code2 className="h-4 w-4" /> },
                { id: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" /> },
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
                  onChange={setCode}
                  onRun={handleRun}
                />
              ) : (
                <AppPreview
                  appId={appId}
                  code={previewCode}
                  runId={runId}
                  error={runtimeError}
                  onError={setRuntimeError}
                />
              )}
            </div>
          </div>
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
    </div>
  )
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zM19 14l.95 2.55L22.5 17.5l-2.55.95L19 21l-.95-2.55L15.5 17.5l2.55-.95L19 14zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15z"
        fill="currentColor"
      />
    </svg>
  )
}
