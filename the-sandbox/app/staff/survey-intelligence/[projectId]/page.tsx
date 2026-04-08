'use client'

import { useState, useCallback, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DynamicMarkdown from '../../../components/DynamicMarkdown'
import { ArrowLeft, Loader2, Info, CheckCircle2, Sparkles, FileText, AlertTriangle, Download, ChevronDown, ChevronRight, Copy, Check, Bot, Upload } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { useSurveyIntelligence } from '../../../hooks/useSurveyIntelligence'
import type { SurveyQuestionSummary } from '../../../hooks/useSurveyIntelligence'
import SandyInterviewPanel from '../../../components/SandyInterviewPanel'
import VaultPanel from '../../../components/staff/survey-intelligence/VaultPanel'

/* ── Markdown components ─────────────────────────────────────────── */

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-base mt-2 mb-1">{children}</h3>,
}

/* ── QuestionList (inline) ───────────────────────────────────────── */

function QuestionList({
  questions,
  activeId,
  onSelect,
}: {
  questions: SurveyQuestionSummary[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const statusLabel = (status: string) => {
    if (status === 'approved') return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-green-600"><CheckCircle2 className="size-3" />Approved</span>
    if (status === 'drafted' || status === 'refined') return <span className="text-[10px] font-bold uppercase text-blue-600">Drafted</span>
    return <span className="text-[10px] font-bold uppercase text-gray-400">Pending</span>
  }

  return (
    <div className="space-y-1">
      {questions.map((q) => (
        <button
          key={q.id}
          onClick={() => onSelect(q.id)}
          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
            activeId === q.id
              ? 'bg-[#0033A0]/5 border-2 border-[#0033A0]/30 shadow-sm'
              : 'hover:bg-gray-50 border-2 border-transparent'
          }`}
        >
          <div className={`size-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
            activeId === q.id ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {q.questionNumber}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-800 line-clamp-2">{q.questionText}</p>
            <div className="flex items-center gap-2 mt-1">
              {statusLabel(q.status)}
              <span className="text-[10px] text-gray-400">{q.category.replace(/-/g, ' ')}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ── Copy button ──────────────────────────────────────────────────── */

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button type="button" onClick={handleCopy} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

/* ── SectionedOutput (from Data Desk pattern) ────────────────────── */

function SectionedOutput({ output }: { output: string }) {
  const sections = output.split(/^## /m).filter((s) => s.trim()).map((s) => {
    const nl = s.indexOf('\n')
    return { title: nl > -1 ? s.slice(0, nl).trim() : s.trim(), content: nl > -1 ? s.slice(nl + 1).trim() : '' }
  })
  if (sections.length <= 1) {
    return (
      <div className="prose prose-sm max-w-none text-gray-800">
        <DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-gray-900">{sec.title}</h4>
            <CopyBtn text={sec.content} />
          </div>
          <div className="prose prose-sm max-w-none text-gray-700">
            <DynamicMarkdown components={mdComponents}>{sec.content}</DynamicMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── QuestionDraftPanel (inline) ─────────────────────────────────── */

function QuestionDraftPanel({
  question,
  draftContent,
  isGenerating,
}: {
  question: SurveyQuestionSummary
  draftContent: string
  isGenerating: boolean
}) {
  const wordCount = draftContent.split(/\s+/).filter(Boolean).length
  const overLimit = question.wordLimit ? wordCount > question.wordLimit : false

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-[#0033A0]" />
          <h3 className="text-base font-extrabold text-gray-900">
            Q{question.questionNumber} — Draft Response
          </h3>
          <span className={`text-xs ml-auto ${overLimit ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
            {wordCount} {question.wordLimit ? `/ ${question.wordLimit}` : ''} words
            {!question.wordLimit && <span className="text-gray-300 ml-1">· no limit</span>}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{question.questionText}</p>
      </div>
      <div className="p-5">
        {draftContent ? (
          <SectionedOutput output={draftContent} />
        ) : isGenerating ? (
          <div className="flex items-center gap-2 py-8">
            <Loader2 className="size-5 text-[#0033A0] animate-spin" />
            <span className="text-sm text-gray-500">Searching evidence and generating draft...</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ── EvidenceTable (collapsible accordion) ─────────────────────── */

function EvidenceTable({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false)

  if (!data) return null

  let rows: { claim?: string; source: string; sourceType?: string; confidence?: string; excerpt?: string; relevance?: string }[] = []
  try {
    if (typeof data === 'string') rows = JSON.parse(data)
    else if (Array.isArray(data)) rows = data as typeof rows
  } catch {
    return null
  }

  if (rows.length === 0) return null

  const confidenceColor = (c?: string) => {
    if (!c) return 'text-gray-500'
    const lc = c.toLowerCase()
    if (lc === 'high') return 'text-green-600'
    if (lc === 'medium') return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        {open ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
        <Sparkles className="size-4 text-[#0033A0]" />
        <span className="text-sm font-extrabold text-gray-900">Evidence Used</span>
        <span className="text-xs text-gray-400 ml-auto">{rows.length} citation{rows.length !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Claim</th>
                <th className="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Source</th>
                <th className="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-700 max-w-xs">{row.claim ?? row.excerpt ?? '—'}</td>
                  <td className="px-5 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                    {row.source}
                    {row.sourceType && <span className="ml-1 text-[10px] text-gray-400">({row.sourceType})</span>}
                  </td>
                  <td className={`px-5 py-3 text-xs font-semibold whitespace-nowrap ${confidenceColor(row.confidence ?? row.relevance)}`}>
                    {row.confidence ?? row.relevance ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── GapAnalysisCard (collapsible accordion) ──────────────────── */

function GapAnalysisCard({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false)

  if (!data) return null

  let gaps: { gap?: string; area?: string; suggestion: string }[] = []
  try {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data)
      gaps = Array.isArray(parsed) ? parsed : parsed.gaps ?? []
    } else if (Array.isArray(data)) {
      gaps = data as typeof gaps
    } else if (typeof data === 'object' && data !== null && 'gaps' in data) {
      gaps = (data as { gaps: typeof gaps }).gaps
    }
  } catch {
    return null
  }

  if (gaps.length === 0) return null

  return (
    <div className="border-2 border-amber-200 rounded-2xl bg-amber-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center gap-2 hover:bg-amber-100/50 transition-colors"
      >
        {open ? <ChevronDown className="size-4 text-amber-500" /> : <ChevronRight className="size-4 text-amber-500" />}
        <AlertTriangle className="size-4 text-amber-600" />
        <span className="text-sm font-extrabold text-amber-900">Evidence Gaps</span>
        <span className="text-xs text-amber-600 ml-auto">{gaps.length} gap{gaps.length !== 1 ? 's' : ''} found</span>
      </button>
      {open && (
        <div className="border-t border-amber-200 p-5 space-y-3">
          {gaps.map((g, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">{g.gap ?? g.area ?? ''}</p>
                {g.suggestion && <p className="text-xs text-amber-700 mt-0.5">{g.suggestion}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── ExportPanel (inline) ────────────────────────────────────────── */

function ExportPanel({
  questions,
  projectTitle,
}: {
  questions: SurveyQuestionSummary[]
  projectTitle: string
}) {
  const approved = questions.filter((q) => q.status === 'approved')
  const drafted = questions.filter((q) => q.status === 'drafted' || q.status === 'refined')

  const handleExport = (subset: SurveyQuestionSummary[]) => {
    const lines = subset.map((q) => {
      return `## Q${q.questionNumber}: ${q.questionText}\n\n${q.draftResponse ?? '(No draft)'}\n`
    })
    const blob = new Blob([`# ${projectTitle}\n\n${lines.join('\n---\n\n')}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectTitle.replace(/\s+/g, '-').toLowerCase()}-export.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Download className="size-5 text-[#0033A0]" />
        <h3 className="text-base font-extrabold text-gray-900">Export Responses</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-green-600">{approved.length}</p>
            <p className="text-xs text-gray-500 font-medium">Approved</p>
          </div>
          <div className="border-2 border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-blue-600">{drafted.length}</p>
            <p className="text-xs text-gray-500 font-medium">Drafted</p>
          </div>
        </div>

        <button
          onClick={() => handleExport(approved)}
          disabled={approved.length === 0}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0033A0] text-white hover:bg-[#002580] disabled:opacity-50 transition-colors"
        >
          <Download className="size-4" />
          Export Approved ({approved.length})
        </button>

        <button
          onClick={() => handleExport([...approved, ...drafted])}
          disabled={approved.length === 0 && drafted.length === 0}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Download className="size-4" />
          Export All Drafted + Approved ({approved.length + drafted.length})
        </button>
      </div>
    </div>
  )
}

/* ── Main workspace page ─────────────────────────────────────────── */

type WorkspaceTab = 'questions' | 'vault' | 'export'

export default function SurveyProjectWorkspace({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const { currentUser } = useAuth()
  const router = useRouter()

  if (currentUser.role !== 'STAFF' && currentUser.role !== 'ADMIN') {
    router.replace('/')
    return null
  }

  const hook = useSurveyIntelligence(projectId)
  const {
    isPreflightLoading,
    project,
    activeQuestionId,
    generationOutput,
    isGenerating,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    generateDraft,
    approveQuestion,
    sendMessage,
    selectChip,
    startOver,
  } = hook

  const [tab, setTab] = useState<WorkspaceTab>('questions')
  const [mobilePanel, setMobilePanel] = useState<'output' | 'sandy'>('output')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  // Auto-select first pending question when project loads and nothing is selected
  useEffect(() => {
    if (project && !selectedQuestionId && !activeQuestionId) {
      const firstPending = project.questions.find((q) => q.status === 'pending')
      if (firstPending) setSelectedQuestionId(firstPending.id)
      else if (project.questions.length > 0) setSelectedQuestionId(project.questions[0].id)
    }
  }, [project, selectedQuestionId, activeQuestionId])

  const activeQuestion = project?.questions.find(
    (q) => q.id === (selectedQuestionId ?? activeQuestionId),
  )

  // Subtitle stats
  const questionCount = project?.questions.length ?? 0
  const vaultDocCount = 0 // fetched separately by VaultPanel
  const draftedCount = project?.questions.filter(
    (q) => q.status === 'drafted' || q.status === 'refined' || q.status === 'approved',
  ).length ?? 0

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 text-[#0033A0] animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 text-[#0033A0] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  const handleSelectQuestion = (id: string) => {
    setSelectedQuestionId(id)
    setTab('questions')
  }

  // Determine draft content to show
  const draftContent = (() => {
    if (!activeQuestion) return ''
    if (isGenerating && activeQuestion.id === activeQuestionId) return generationOutput
    return activeQuestion.draftResponse ?? ''
  })()

  const TABS: { key: WorkspaceTab; label: string }[] = [
    { key: 'questions', label: 'Questions' },
    { key: 'vault', label: 'Vault' },
    { key: 'export', label: 'Export' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/staff/survey-intelligence"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline mb-3"
          >
            <ArrowLeft className="size-3.5" />
            All Projects
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">{project.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {questionCount} question{questionCount !== 1 ? 's' : ''} &middot; {draftedCount} drafted
          </p>
        </div>
      </div>

      {/* Amber banner */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <Info className="size-4 shrink-0" />
          <span>
            <strong>Simulated data</strong> — Demo survey project with sample vault documents
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'text-[#0033A0] border-[#0033A0]'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile panel toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => setMobilePanel('output')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobilePanel === 'output'
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500'
            }`}
          >
            Output
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('sandy')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobilePanel === 'sandy'
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500'
            }`}
          >
            Sandy
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          style={{ minHeight: 'calc(100vh - 320px)' }}
        >
          {/* LEFT panel */}
          <div
            className={`lg:col-span-7 space-y-4 overflow-y-auto ${
              mobilePanel !== 'output' ? 'hidden lg:block' : ''
            }`}
          >
            {tab === 'questions' && (
              <>
                {/* Question list */}
                <div className="border-2 border-gray-200 rounded-2xl bg-white p-4">
                  <h3 className="text-sm font-extrabold text-gray-700 mb-3">
                    Survey Questions ({project.questions.length})
                  </h3>
                  {project.questions.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="size-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No questions loaded yet.</p>
                      <p className="text-xs text-gray-300 mt-1">Ask Sandy to add questions from a template.</p>
                    </div>
                  ) : (
                    <QuestionList
                      questions={project.questions}
                      activeId={selectedQuestionId ?? activeQuestionId}
                      onSelect={handleSelectQuestion}
                    />
                  )}
                </div>

                {/* Question detail area */}
                {activeQuestion ? (
                  <div className="space-y-4">
                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {!activeQuestion.draftResponse && !isGenerating && (
                        <button
                          onClick={() => void generateDraft(activeQuestion.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#0033A0] text-white hover:bg-[#002580] transition-colors"
                        >
                          <Sparkles className="size-4" />
                          Generate Draft
                        </button>
                      )}
                      {activeQuestion.draftResponse && activeQuestion.status !== 'approved' && (
                        <button
                          onClick={() => void approveQuestion(activeQuestion.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle2 className="size-4" />
                          Approve
                        </button>
                      )}
                      {activeQuestion.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="size-4" />
                          Approved
                        </span>
                      )}
                    </div>

                    {/* Draft panel */}
                    {(draftContent || isGenerating) && (
                      <QuestionDraftPanel
                        question={activeQuestion}
                        draftContent={draftContent}
                        isGenerating={isGenerating && activeQuestion.id === activeQuestionId}
                      />
                    )}

                    {/* Evidence table */}
                    <EvidenceTable data={activeQuestion.evidenceTable} />

                    {/* Gap analysis */}
                    <GapAnalysisCard data={activeQuestion.gapAnalysis} />
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-2xl bg-white flex flex-col items-center justify-center h-48">
                    <Sparkles className="size-8 text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Select a question to get started</p>
                    <p className="text-xs text-gray-300 mt-1">Click any question above, then hit Generate Draft</p>
                  </div>
                )}
              </>
            )}

            {tab === 'vault' && (
              <VaultPanel projectId={projectId} userEmail={currentUser.email} />
            )}

            {tab === 'export' && (
              <ExportPanel
                questions={project.questions}
                projectTitle={project.title}
              />
            )}
          </div>

          {/* RIGHT panel — Sandy */}
          <div
            className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${
              mobilePanel !== 'sandy' ? 'hidden lg:flex' : ''
            }`}
            style={{ minHeight: 400 }}
          >
            {/* Sandy header label */}
            <div className="px-4 py-2.5 border-b border-gray-100 bg-[#0033A0]/5 flex items-center gap-2">
              <Bot className="size-4 text-[#0033A0]" />
              <span className="text-xs font-bold text-gray-600">Sandy — Survey Intelligence</span>
              {activeQuestion && (
                <span className="text-[10px] text-gray-400 ml-auto">Q{activeQuestion.questionNumber}</span>
              )}
            </div>
            <SandyInterviewPanel
              messages={messages}
              chips={chips}
              isSandyTyping={isSandyTyping}
              stepCount={5}
              currentStep={currentStep}
              onSendMessage={sendMessage}
              onChipSelect={selectChip}
              onStartOver={startOver}
              placeholder="Ask Sandy about this survey..."
              disabled={isSandyTyping}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
