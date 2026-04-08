'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import DynamicMarkdown from '../DynamicMarkdown'
import {
  Bot,
  Check,
  ClipboardCopy,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
  Send,
  Sparkles,
  StickyNote,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { buildAssignmentContext } from '../../lib/assignment-workspace-service'
import SubmissionPanel from './SubmissionPanel'
import StepIndicator from '../StepIndicator'
import ProcessAnnotator from '../assessment/ProcessAnnotator'
import type { WorkflowSuggestion } from '../../lib/assignment-workspace-service'

// ── Types ──────────────────────────────────────────────────────────────────────

import type { ChatMessage } from '../../lib/types'
import type { RubricCriterion } from '../courses/course-types'

interface WorkspaceToolPanelProps {
  assignmentId: string
  assignment: {
    title: string
    courseCode: string
    courseName: string
    description: string | null
    type: string
    assessmentMode: string
    dueAt: string | null
    dueLabel: string
    urgency: 'critical' | 'warning' | 'info'
    pointsPossible: number
    acceptingLate: boolean
    rubric: { criteria: RubricCriterion[] } | null
  }
  submission: {
    status: 'not-started' | 'draft' | 'submitted' | 'graded'
    sessionId: string | null
    submittedAt: string | null
    grade: string | null
    feedback: string | null
  }
  relatedConcepts: string[]
  rubricText: string | null
  workflow: WorkflowSuggestion
  activeTab: string
  onTabChange: (tab: string) => void
  onSubmitted: () => void
}

type TabId = 'sandy' | 'notes' | 'draft' | 'submit'

const TABS: Array<{ id: TabId; label: string; icon: typeof Sparkles }> = [
  { id: 'sandy', label: 'Sandy', icon: Sparkles },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'draft', label: 'Draft', icon: FileText },
  { id: 'submit', label: 'Submit', icon: Send },
]

const INITIAL_CHIPS = [
  'Explain the rubric',
  'Help me outline my response',
  'What key concepts do I need?',
]

const STORAGE_KEY_NOTES = (id: string) => `workspace-notes-${id}`
const STORAGE_KEY_DRAFT = (id: string) => `workspace-draft-${id}`

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorkspaceToolPanel({
  assignmentId,
  assignment,
  submission,
  relatedConcepts,
  rubricText,
  workflow,
  activeTab,
  onTabChange,
  onSubmitted,
}: WorkspaceToolPanelProps) {
  const { currentUser } = useAuth()

  // Sandy chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sandyInput, setSandyInput] = useState('')
  const [isSandyTyping, setIsSandyTyping] = useState(false)
  const [chips, setChips] = useState<string[]>(INITIAL_CHIPS)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Notes state (localStorage-persisted)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  // Draft state (localStorage-persisted)
  const [draft, setDraft] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)

  // Load notes/draft from localStorage
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(STORAGE_KEY_NOTES(assignmentId))
      if (savedNotes) setNotes(savedNotes)
      const savedDraft = localStorage.getItem(STORAGE_KEY_DRAFT(assignmentId))
      if (savedDraft) setDraft(savedDraft)
    } catch {
      // localStorage unavailable
    }
  }, [assignmentId])

  // Auto-save notes
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_NOTES(assignmentId), notes)
        if (notes) { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 1500) }
      } catch { /* ignore */ }
    }, 1000)
    return () => clearTimeout(t)
  }, [notes, assignmentId])

  // Auto-save draft
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_DRAFT(assignmentId), draft)
        if (draft) { setDraftSaved(true); setTimeout(() => setDraftSaved(false), 1500) }
      } catch { /* ignore */ }
    }, 1000)
    return () => clearTimeout(t)
  }, [draft, assignmentId])

  // Auto-scroll Sandy messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSandyTyping])

  // Sandy send
  const sendToSandy = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
      setMessages((prev) => [...prev, userMsg])
      setChips([])
      setIsSandyTyping(true)

      try {
        const systemContext = buildAssignmentContext({
          title: assignment.title,
          courseCode: assignment.courseCode,
          courseName: assignment.courseName,
          description: assignment.description,
          dueLabel: assignment.dueLabel,
          rubricText,
          currentDraft: draft || null,
          relatedConcepts,
        })

        // Use concierge API with assignment context injected via briefingContext
        const res = await fetch('/api/concierge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
            currentPage: `/assignments/${assignmentId}/workspace`,
            briefingContext: systemContext,
          }),
        })

        if (!res.ok) throw new Error('Chat failed')

        // Stream raw text chunks (concierge streams raw text, not SSE)
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No reader')

        const decoder = new TextDecoder()
        let assistantContent = ''
        const assistantId = `a-${Date.now()}`

        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          assistantContent += decoder.decode(value, { stream: true })
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
          )
        }

        // Suggest follow-up chips
        if (draft) {
          setChips(['Review my draft', 'Suggest improvements', 'Check against rubric'])
        } else {
          setChips(['Help me get started', 'Break this down for me'])
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' },
        ])
      } finally {
        setIsSandyTyping(false)
      }
    },
    [assignment, assignmentId, currentUser.email, draft, messages, relatedConcepts, rubricText]
  )

  const handleSandySend = useCallback(() => {
    const text = sandyInput.trim()
    if (!text || isSandyTyping) return
    setSandyInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    sendToSandy(text)
  }, [sandyInput, isSandyTyping, sendToSandy])

  const handleSandyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSandySend()
      }
    },
    [handleSandySend]
  )

  const handleCopyMessage = async (content: string) => {
    try { await navigator.clipboard.writeText(content) } catch { /* ignore */ }
  }

  const handleInsertToDraft = (content: string) => {
    setDraft((prev) => (prev ? prev + '\n\n' + content : content))
    onTabChange('draft')
  }

  const handleAddToNotes = (content: string) => {
    setNotes((prev) => (prev ? prev + '\n\n---\n\n' + content : content))
    onTabChange('notes')
  }

  const isPastDue = assignment.dueAt ? new Date(assignment.dueAt) < new Date() : false
  const isProcessAssessment =
    assignment.assessmentMode === 'PROCESS' && assignment.type === 'AI_EXPERIENCE'

  // Workflow step indicator
  const currentWorkflowStep = workflow.steps.findIndex((s) => s.tab === activeTab)

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-b-2 border-[#0033A0] text-[#0033A0]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Workflow indicator */}
      <div className="border-b border-gray-50 px-4 py-2">
        <StepIndicator stepCount={workflow.steps.length} currentStep={currentWorkflowStep >= 0 ? currentWorkflowStep : 0} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sandy' && (
          <SandyTab
            messages={messages}
            chips={chips}
            isSandyTyping={isSandyTyping}
            sandyInput={sandyInput}
            setSandyInput={setSandyInput}
            textareaRef={textareaRef}
            messagesEndRef={messagesEndRef}
            onSend={handleSandySend}
            onKeyDown={handleSandyKeyDown}
            onChipSelect={(chip) => sendToSandy(chip)}
            onCopy={handleCopyMessage}
            onInsertDraft={handleInsertToDraft}
            onAddNotes={handleAddToNotes}
            onStartOver={() => { setMessages([]); setChips(INITIAL_CHIPS) }}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab notes={notes} setNotes={setNotes} saved={notesSaved} />
        )}

        {activeTab === 'draft' && (
          <DraftTab
            draft={draft}
            setDraft={setDraft}
            saved={draftSaved}
            onAskSandyReview={() => {
              onTabChange('sandy')
              sendToSandy('Please review my draft against the rubric and suggest improvements.')
            }}
          />
        )}

        {activeTab === 'submit' && (
          isProcessAssessment ? (
            <ProcessAnnotator
              assignmentId={assignmentId}
              assignmentTitle={assignment.title}
              courseHeaders={{ 'x-demo-user-email': currentUser.email }}
              alreadySubmitted={submission.status === 'submitted' || submission.status === 'graded'}
              initialSessionId={submission.sessionId}
              onSubmitted={onSubmitted}
            />
          ) : (
            <SubmissionPanel
              assignmentId={assignmentId}
              draft={draft}
              rubricCriteria={assignment.rubric?.criteria.map((c) => ({ id: c.id, title: c.title, maxPoints: c.maxPoints })) ?? []}
              pointsPossible={assignment.pointsPossible}
              alreadySubmitted={submission.status === 'submitted' || submission.status === 'graded'}
              acceptingLate={assignment.acceptingLate}
              isPastDue={isPastDue}
              onSubmitted={onSubmitted}
            />
          )
        )}
      </div>
    </div>
  )
}

// ── Sandy Tab ──────────────────────────────────────────────────────────────────

function SandyTab({
  messages,
  chips,
  isSandyTyping,
  sandyInput,
  setSandyInput,
  textareaRef,
  messagesEndRef,
  onSend,
  onKeyDown,
  onChipSelect,
  onCopy,
  onInsertDraft,
  onAddNotes,
  onStartOver,
}: {
  messages: ChatMessage[]
  chips: string[]
  isSandyTyping: boolean
  sandyInput: string
  setSandyInput: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onChipSelect: (chip: string) => void
  onCopy: (content: string) => void
  onInsertDraft: (content: string) => void
  onAddNotes: (content: string) => void
  onStartOver: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-50 bg-[#0033A0] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-white/20">
            <Bot className="size-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">Sandy</span>
            <span className="ml-1.5 text-xs text-white/60">Assignment Helper</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={onStartOver} className="text-white/50 hover:text-white" title="Start over">
            <RotateCcw className="size-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="mx-auto mb-3 size-10 text-gray-200" />
            <p className="text-sm text-gray-500">
              I have your full assignment context loaded. Ask me anything!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'ml-auto bg-[#0033A0] text-white rounded-tr-sm'
                  : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <DynamicMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {msg.content}
                </DynamicMarkdown>
              ) : (
                msg.content
              )}
            </div>

            {/* Action menu for assistant messages */}
            {msg.role === 'assistant' && msg.content && (
              <div className="mt-1 flex gap-1 pl-1">
                <ActionButton icon={ClipboardCopy} label="Copy" onClick={() => onCopy(msg.content)} />
                <ActionButton icon={StickyNote} label="Add to notes" onClick={() => onAddNotes(msg.content)} />
                <ActionButton icon={Pencil} label="Insert into draft" onClick={() => onInsertDraft(msg.content)} />
              </div>
            )}
          </div>
        ))}

        {isSandyTyping && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="size-3 animate-spin" />
            Sandy is thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-gray-50 px-4 py-2">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChipSelect(chip)}
              className="rounded-full border border-[#0033A0]/20 bg-[#0033A0]/5 px-3 py-1 text-xs font-medium text-[#0033A0] transition-colors hover:bg-[#0033A0]/10"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={sandyInput}
            onChange={(e) => {
              setSandyInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask Sandy about this assignment..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]/20"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!sandyInput.trim() || isSandyTyping}
            className="flex size-9 items-center justify-center rounded-xl bg-[#0033A0] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Notes Tab ──────────────────────────────────────────────────────────────────

function NotesTab({
  notes,
  setNotes,
  saved,
}: {
  notes: string
  setNotes: (v: string) => void
  saved: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-2">
        <span className="text-xs font-semibold text-gray-500">Scratchpad</span>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="size-3" /> Saved
          </span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Jot down research notes, brainstorming ideas, or an outline..."
        className="flex-1 resize-none p-4 text-sm text-gray-700 outline-none placeholder:text-gray-300"
      />
    </div>
  )
}

// ── Draft Tab ──────────────────────────────────────────────────────────────────

function DraftTab({
  draft,
  setDraft,
  saved,
  onAskSandyReview,
}: {
  draft: string
  setDraft: (v: string) => void
  saved: boolean
  onAskSandyReview: () => void
}) {
  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Draft</span>
          <span className="text-xs text-gray-400">{wordCount} words</span>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="size-3" /> Saved
            </span>
          )}
        </div>
        {draft.trim() && (
          <button
            type="button"
            onClick={onAskSandyReview}
            className="flex items-center gap-1 rounded-lg bg-[#0033A0]/5 px-2.5 py-1 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-[#0033A0]/10"
          >
            <Sparkles className="size-3" />
            Ask Sandy to review
          </button>
        )}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write your assignment response here..."
        className="flex-1 resize-none p-4 text-sm leading-relaxed text-gray-700 outline-none placeholder:text-gray-300"
      />
    </div>
  )
}

// ── Action Button ──────────────────────────────────────────────────────────────

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof ClipboardCopy; label: string; onClick: () => void }) {
  const [clicked, setClicked] = useState(false)

  const handleClick = () => {
    onClick()
    setClicked(true)
    setTimeout(() => setClicked(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
      title={label}
    >
      {clicked ? <Check className="size-3 text-green-500" /> : <Icon className="size-3" />}
      {clicked ? 'Done' : label}
    </button>
  )
}
