'use client'

// ── Assignment Creation Wizard ──────────────────────────────────
// 3-step guided flow: (1) Template + Course, (2) Sandy drafts
// description + rubric, (3) Set dates + publish.
// Reuses existing API endpoints — no new routes needed.

import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  Check,
  ClipboardCheck,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface AssignmentWizardProps {
  open: boolean
  onClose: () => void
  courseId: string
  courseCode: string
  onCreated?: () => void
}

const TEMPLATES = [
  { key: 'essay', label: 'Short Essay', icon: FileText, type: 'LEGACY_SUBMISSION' as const, points: 50, desc: 'Write a 2-3 paragraph essay responding to a prompt. Use evidence from course materials.' },
  { key: 'reflection', label: 'AI Chat Reflection', icon: MessageSquare, type: 'AI_EXPERIENCE' as const, points: 25, desc: 'Complete an AI tool session, then write a 200-300 word reflection.' },
  { key: 'quiz', label: 'Quiz Review', icon: Target, type: 'AI_EXPERIENCE' as const, points: 20, desc: 'Complete a quiz review session focused on this week\'s concepts.' },
  { key: 'authentic', label: 'Authentic Tool Build', icon: Sparkles, type: 'LEGACY_SUBMISSION' as const, points: 100, desc: 'Students publish a tool, gather real usage, and submit it for authentic audience assessment.' },
  { key: 'critique', label: 'Peer Critique', icon: BookOpen, type: 'LEGACY_SUBMISSION' as const, points: 30, desc: 'Read a peer\'s work and provide constructive feedback using the rubric.' },
  { key: 'custom', label: 'Custom', icon: ClipboardCheck, type: 'LEGACY_SUBMISSION' as const, points: 100, desc: 'Start from scratch with a blank assignment.' },
]

type Step = 1 | 2 | 3

interface RubricPreview {
  id: string
  title: string
  criteria: Array<{
    id: string
    title: string
    description: string | null
    maxPoints: number
    bands: Array<{ label: string; minPoints: number; maxPoints: number; description: string }>
  }>
}

export default function AssignmentWizard({ open, onClose, courseId, courseCode, onCreated }: AssignmentWizardProps) {
  const { currentUser } = useAuth()
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Step 2
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'LEGACY_SUBMISSION' | 'AI_EXPERIENCE'>('LEGACY_SUBMISSION')
  const [assessmentMode, setAssessmentMode] = useState<'TRADITIONAL' | 'AUTHENTIC'>('TRADITIONAL')
  const [points, setPoints] = useState('50')
  const [rubric, setRubric] = useState<RubricPreview | null>(null)
  const [generatingRubric, setGeneratingRubric] = useState(false)
  const [sandyDrafting, setSandyDrafting] = useState(false)

  // Step 3
  const [dueAt, setDueAt] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)

  if (!open) return null

  function selectTemplate(key: string) {
    const tpl = TEMPLATES.find(t => t.key === key)
    if (!tpl) return
    setSelectedTemplate(key)
    setAssessmentMode(key === 'authentic' ? 'AUTHENTIC' : 'TRADITIONAL')
    if (key !== 'custom') {
      setTitle(tpl.label)
      setDescription(tpl.desc)
      setType(tpl.type)
      setPoints(String(tpl.points))
    } else {
      setTitle('')
      setDescription('')
      setType('LEGACY_SUBMISSION')
      setAssessmentMode('TRADITIONAL')
      setPoints('100')
    }
  }

  async function handleSandyDraft() {
    setSandyDrafting(true)
    // Use Sandy to suggest a description based on course context
    window.dispatchEvent(new CustomEvent('sandy-prefill', {
      detail: {
        message: `Draft an assignment description for "${title || 'a new assignment'}" in ${courseCode}. The assignment is worth ${points} points and is a ${type === 'AI_EXPERIENCE' ? 'AI tool experience' : 'submission-based assignment'}. Write clear instructions for students.`,
        autoSend: true,
      },
    }))
    setSandyDrafting(false)
  }

  async function generateRubric() {
    if (!title.trim() || !points) return
    setGeneratingRubric(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/rubrics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          assignmentTitle: title,
          assignmentDescription: description || undefined,
          pointsPossible: Number(points),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setRubric(data)
      }
    } catch { /* fail silently */ }
    setGeneratingRubric(false)
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          assessmentMode,
          evidenceTypes: assessmentMode === 'AUTHENTIC' ? ['TOOL_USAGE'] : [],
          pointsPossible: Number(points),
          dueAt: dueAt || null,
          isPublished,
          ...(rubric ? { rubricId: rubric.id } : {}),
        }),
      })
      if (res.ok) {
        setCreated(true)
        onCreated?.()
      }
    } catch { /* fail silently */ }
    setCreating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Create Assignment</h2>
            <p className="text-xs text-gray-500">{courseCode} — Step {step} of 3</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                s < step ? 'bg-emerald-500 text-white' : s === step ? 'bg-[#0033A0] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? <Check className="size-3.5" /> : s}
              </div>
              <span className={`text-xs font-medium ${s === step ? 'text-gray-900' : 'text-gray-400'}`}>
                {s === 1 ? 'Template' : s === 2 ? 'Details' : 'Publish'}
              </span>
              {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[320px]">
          {/* ── Step 1: Template Selection ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Choose a starting template or start from scratch.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => selectTemplate(tpl.key)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      selectedTemplate === tpl.key
                        ? 'border-[#0033A0] bg-blue-50 ring-1 ring-[#0033A0]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <tpl.icon className={`size-5 mb-2 ${selectedTemplate === tpl.key ? 'text-[#0033A0]' : 'text-gray-400'}`} />
                    <p className="text-sm font-semibold text-gray-900">{tpl.label}</p>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{tpl.desc}</p>
                    <p className="mt-1.5 text-xs text-gray-400">{tpl.points} pts</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Details + Rubric ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Assignment title"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Description</label>
                  <button
                    type="button"
                    onClick={handleSandyDraft}
                    disabled={sandyDrafting}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0033A0] hover:underline"
                  >
                    <Bot className="size-3" /> Sandy: Draft for me
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Instructions for students..."
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700">Points</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={points}
                      onChange={e => setPoints(e.target.value)}
                      min={1}
                      className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
                    />
                    {[10, 25, 50, 100].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPoints(String(p))}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                          points === String(p) ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as typeof type)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
                  >
                    <option value="LEGACY_SUBMISSION">Student Submission</option>
                    <option value="AI_EXPERIENCE">AI Tool Experience</option>
                  </select>
                </div>
              </div>

              {/* Rubric generation */}
              <div className="rounded-xl border border-dashed border-gray-300 p-4">
                {rubric ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-emerald-500" />
                        <span className="text-sm font-semibold text-gray-900">{rubric.title}</span>
                      </div>
                      <button type="button" onClick={() => setRubric(null)} className="text-xs text-gray-400 hover:text-gray-600">Remove</button>
                    </div>
                    <div className="space-y-1">
                      {rubric.criteria.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">{c.title}</span>
                          <span className="text-gray-400">{c.maxPoints} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Sparkles className="mx-auto size-5 text-gray-300 mb-1" />
                    <p className="text-sm text-gray-500">Auto-generate a rubric?</p>
                    <button
                      type="button"
                      onClick={generateRubric}
                      disabled={generatingRubric || !title.trim()}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#002880] disabled:opacity-40 transition-colors"
                    >
                      {generatingRubric ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                      {generatingRubric ? 'Generating...' : 'Generate Rubric'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Due date + Publish ── */}
          {step === 3 && !created && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-700">Due Date</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={e => setDueAt(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
                  />
                  {[
                    { label: '+1 week', days: 7 },
                    { label: '+2 weeks', days: 14 },
                    { label: '+1 month', days: 30 },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + opt.days)
                        d.setHours(23, 59)
                        setDueAt(d.toISOString().slice(0, 16))
                      }}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-300 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review summary */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Review</p>
                <div className="text-sm text-gray-900 font-medium">{title || 'Untitled'}</div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{points} pts</span>
                  <span>{type === 'AI_EXPERIENCE' ? 'AI Tool' : 'Submission'}</span>
                  {dueAt && <span className="flex items-center gap-1"><Calendar className="size-3" /> Due {new Date(dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  {rubric && <span className="flex items-center gap-1"><Sparkles className="size-3" /> Rubric attached</span>}
                </div>
                {description && <p className="text-xs text-gray-500 line-clamp-2">{description}</p>}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                />
                <span className="text-sm text-gray-700">Publish immediately (visible to students)</span>
              </label>
            </div>
          )}

          {/* ── Success state ── */}
          {created && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 mb-4">
                <Check className="size-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Assignment Created</h3>
              <p className="mt-1 text-sm text-gray-500">{title} — {points} pts{isPublished ? ', published' : ', saved as draft'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          {created ? (
            <button type="button" onClick={onClose} className="ml-auto rounded-xl bg-[#0033A0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#002880] transition-colors">
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => step > 1 ? setStep((step - 1) as Step) : onClose()}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="size-4" /> {step === 1 ? 'Cancel' : 'Back'}
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((step + 1) as Step)}
                  disabled={step === 1 && !selectedTemplate}
                  className="flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002880] disabled:opacity-40 transition-colors"
                >
                  Next <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !title.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {creating ? 'Creating...' : isPublished ? 'Create & Publish' : 'Create Draft'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
