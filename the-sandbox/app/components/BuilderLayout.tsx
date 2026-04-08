'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, Code2, FileText, ArrowLeft, BadgeCheck, Globe, Mic, Volume2, Database, Workflow, GitFork } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../lib/auth-context'
import { BuilderSpec, BuilderDocument } from '../lib/types'
import BuilderChatPanel from './BuilderChatPanel'
import PreviewPanel from './PreviewPanel'
import CodePanel from './CodePanel'
import FilesPanel from './FilesPanel'
import BuildMomentOverlay from './BuildMomentOverlay'

const EMPTY_SPEC: BuilderSpec = {
  name: '',
  shortDescription: '',
  fullDescription: '',
  category: 'General',
  toolType: 'CHATBOT',
  systemPrompt: '',
  welcomeMessage: '',
  starterQuestions: [],
  learningObjectives: [],
  difficultyLevel: 'Introductory',
  intendedAudience: '',
  ready: false,
}

function mergeSpec(previous: BuilderSpec, incoming: BuilderSpec): BuilderSpec {
  const mergedStarterQuestions =
    incoming.starterQuestions && incoming.starterQuestions.length > 0
      ? incoming.starterQuestions
      : previous.starterQuestions

  const mergedLearningObjectives =
    incoming.learningObjectives && incoming.learningObjectives.length > 0
      ? incoming.learningObjectives
      : previous.learningObjectives

  const hasIncomingPersona = !!(incoming.persona?.name || incoming.persona?.role)

  return {
    ...previous,
    ...incoming,
    name: incoming.name || previous.name,
    shortDescription: incoming.shortDescription || previous.shortDescription,
    fullDescription: incoming.fullDescription || previous.fullDescription,
    category: incoming.category || previous.category,
    toolType: incoming.toolType || previous.toolType,
    systemPrompt: incoming.systemPrompt || previous.systemPrompt,
    welcomeMessage: incoming.welcomeMessage || previous.welcomeMessage,
    starterQuestions: mergedStarterQuestions,
    learningObjectives: mergedLearningObjectives,
    difficultyLevel: incoming.difficultyLevel || previous.difficultyLevel,
    intendedAudience: incoming.intendedAudience || previous.intendedAudience,
    persona: hasIncomingPersona ? incoming.persona : previous.persona,
    personaName: incoming.personaName || previous.personaName,
    personaAvatar: incoming.personaAvatar || previous.personaAvatar,
    forkedFromId: incoming.forkedFromId || previous.forkedFromId,
    forkedFromName: incoming.forkedFromName || previous.forkedFromName,
    // Once ready, never go back — Claude often resets to false on follow-up turns
    ready: previous.ready || incoming.ready || false,
  }
}

type Tab = 'preview' | 'code' | 'files'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
  { id: 'code', label: 'Code', icon: <Code2 className="w-4 h-4" /> },
  { id: 'files', label: 'Files', icon: <FileText className="w-4 h-4" /> },
]

const MOBILE_VIEWS: ({ id: 'chat'; label: string } | { id: Tab; label: string })[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'preview', label: 'Preview' },
  { id: 'code', label: 'Code' },
  { id: 'files', label: 'Files' },
]

const CONNECTORS = [
  {
    name: 'Speech to Text',
    description: 'Capture spoken prompts, oral exams, interviews, and coaching sessions.',
    status: 'Azure-ready',
    icon: Mic,
  },
  {
    name: 'Text to Speech',
    description: 'Give tutors, podcast interviews, and role-play simulations a voice.',
    status: 'Azure-ready',
    icon: Volume2,
  },
  {
    name: 'Web Access',
    description: 'Reach public web sources when a tool needs current context or live references.',
    status: 'Connector-ready',
    icon: Globe,
  },
  {
    name: 'Course and Document Data',
    description: 'Use course materials, uploaded files, and published knowledge sources.',
    status: 'Platform-ready',
    icon: Database,
  },
  {
    name: 'Workflow Actions',
    description: 'Support review, publishing, and downstream automation from the Sandbox workspace.',
    status: 'Connector-ready',
    icon: Workflow,
  },
]

function formatToolTypeLabel(toolType: string) {
  return toolType.replace(/_/g, ' ').toLowerCase()
}

function getInitialPrompt(searchParams: ReturnType<typeof useSearchParams>) {
  const directPrompt = searchParams.get('prompt')
  if (directPrompt) return directPrompt

  const idea = searchParams.get('idea')
  if (idea) {
    return `Build an AI learning tool around this idea: ${idea}. Create a practical first draft with a strong description, learning objectives, a welcome message, and starter questions.`
  }

  const course = searchParams.get('course')
  const toolName = searchParams.get('toolName')
  const toolType = searchParams.get('toolType')
  const moduleNumber = searchParams.get('moduleNumber')

  if (!course && !toolName && !toolType && !moduleNumber) return ''

  const toolDescriptor = toolType ? formatToolTypeLabel(toolType) : 'learning tool'
  const namePart = toolName ? ` called "${toolName}"` : ''
  const coursePart = course ? ` for ${course}` : ''
  const modulePart = moduleNumber ? ` focused on Module ${moduleNumber}` : ''

  return `Build a ${toolDescriptor}${namePart}${coursePart}${modulePart}. Use the course context to create a practical first draft with learning objectives, a welcome message, and starter questions.`
}

export default function BuilderLayout() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPrompt = getInitialPrompt(searchParams)
  const requestedSessionId = searchParams.get('sessionId')

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [spec, setSpec] = useState<BuilderSpec>(EMPTY_SPEC)
  const [documents, setDocuments] = useState<BuilderDocument[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('preview')
  const [isBuilding, setIsBuilding] = useState(false)
  const [mobileView, setMobileView] = useState<'chat' | Tab>('chat')

  useEffect(() => {
    let cancelled = false

    const createFreshSession = async () => {
      const response = await fetch('/api/builder/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
      })
      const data = await response.json()
      if (!cancelled && data.sessionId) {
        setSessionId(data.sessionId)
        setSpec(EMPTY_SPEC)
        setDocuments([])
      }
    }

    const loadExistingSession = async () => {
      const response = await fetch(`/api/builder/sessions?id=${requestedSessionId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })

      if (!response.ok) {
        await createFreshSession()
        return
      }

      const data = await response.json()
      if (cancelled) return

      setSessionId(data.sessionId ?? requestedSessionId)
      setSpec(mergeSpec(EMPTY_SPEC, (data.toolSpec as BuilderSpec | null) ?? EMPTY_SPEC))
      setDocuments(data.documents ?? [])
    }

    if (requestedSessionId) {
      loadExistingSession().catch(() => {
        createFreshSession().catch(() => {})
      })
    } else {
      createFreshSession().catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [currentUser.email, requestedSessionId])

  const handleSpecUpdate = (newSpec: BuilderSpec) => {
    setSpec((prev) => {
      const merged = mergeSpec(prev, newSpec)

      if (merged.name && !prev.name && activeTab !== 'preview') {
        setTimeout(() => setActiveTab('preview'), 0)
      }

      if (merged.ready && activeTab === 'preview') {
        setTimeout(() => setActiveTab('code'), 800)
      }

      return merged
    })
  }

  const handleBuildComplete = (toolId: string) => {
    router.push(`/tools/${toolId}`)
  }

  return (
    <div className="flex flex-col bg-gray-100">
      {/* Viewport-height builder area */}
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="w-px h-4 bg-gray-200" />
        <span className="font-bold text-[#0033A0] text-sm">Builder</span>
        {spec.name && (
          <>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-gray-600 text-sm truncate max-w-xs">{spec.name}</span>
          </>
        )}

        {/* Mobile tab switcher */}
        <div className="ml-auto flex md:hidden rounded-lg border border-gray-200 overflow-hidden">
          {MOBILE_VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => {
                setMobileView(view.id)
                if (view.id !== 'chat') setActiveTab(view.id)
              }}
              className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                mobileView === view.id ? 'bg-[#0033A0] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main split pane */}
      <div className="min-h-0 flex-1 flex overflow-hidden">
        {/* Left: Chat (hidden on mobile when preview tab active) */}
        <div className={`w-full md:w-[42%] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col ${
          mobileView !== 'chat' ? 'hidden md:flex' : 'flex'
        }`}>
          {spec.forkedFromName && (
            <div className="mx-4 mt-4 mb-0 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <GitFork className="w-3 h-3 flex-shrink-0" />
              <span>
                Forked from <span className="font-semibold">{spec.forkedFromName}</span> - modify it to make it your own.
              </span>
            </div>
          )}
          <BuilderChatPanel
            sessionId={sessionId}
            userEmail={currentUser.email}
            userName={currentUser.name}
            onSpecUpdate={handleSpecUpdate}
            onBuildRequest={() => setIsBuilding(true)}
            currentSpec={spec}
            initialPrompt={initialPrompt}
            forkedFromName={spec.forkedFromName}
          />
        </div>

        {/* Right: Tabbed preview (hidden on mobile when chat tab active) */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Tab bar */}
          <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-4 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setMobileView(tab.id)
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#0033A0] text-[#0033A0]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'files' && documents.length > 0 && (
                  <span className="ml-1 bg-[#0033A0] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {documents.length}
                  </span>
                )}
                {tab.id === 'code' && spec.ready && (
                  <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden p-4">
            {activeTab === 'preview' && <PreviewPanel spec={spec} />}
            {activeTab === 'code' && <CodePanel spec={spec} documents={documents} onBuildRequest={() => setIsBuilding(true)} />}
            {activeTab === 'files' && (
              <FilesPanel
                sessionId={sessionId}
                documents={documents}
                userEmail={currentUser.email}
                onUploaded={doc => setDocuments(prev => [...prev, doc])}
                onDeleted={id => setDocuments(prev => prev.filter(d => d.id !== id))}
              />
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Connectors — below the fold, scroll to see */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0033A0] flex items-center justify-center flex-shrink-0">
            <BadgeCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Available builder connectors</h2>
            <p className="text-xs text-gray-500 max-w-3xl">
              Tools created here are meant to deploy into the Sandbox workspace. These are the connector types the build flow is designed to support as the platform expands.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {CONNECTORS.map((connector) => {
            const Icon = connector.icon
            return (
              <div key={connector.name} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-white text-[#0033A0] border border-blue-100 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                    {connector.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">{connector.name}</div>
                <p className="text-xs text-gray-500 leading-relaxed">{connector.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Build moment overlay */}
      {isBuilding && sessionId && (
        <BuildMomentOverlay
          spec={spec}
          fullSpec={spec}
          sessionId={sessionId}
          userEmail={currentUser.email}
          onComplete={handleBuildComplete}
        />
      )}
    </div>
  )
}
