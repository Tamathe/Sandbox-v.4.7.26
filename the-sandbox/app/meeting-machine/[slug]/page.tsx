'use client'

import { useParams, redirect } from 'next/navigation'
import { useState, useReducer, useRef, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import {
  ArrowLeft, Loader2, Copy, Check, ChevronRight, RotateCcw, Wrench,
  CalendarClock, NotebookPen, ListChecks, Forward,
  type LucideIcon,
} from 'lucide-react'
import { getMeetingMachineTool } from '../../lib/meeting-machine'
import type { MeetingMachineField } from '../../lib/meeting-machine'
import { useAuth } from '../../lib/auth-context'

const ICON_MAP: Record<string, LucideIcon> = {
  CalendarClock, NotebookPen, ListChecks, Forward, Wrench,
}

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Wrench
}

// ── Markdown renderer ───────────────────────────────────────────────────────
const mdComponents = {
  p:          ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong:     ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em:         ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul:         ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol:         ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li:         ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1:         ({ children }: { children?: React.ReactNode }) => <h1 className="font-extrabold text-xl mt-3 mb-1">{children}</h1>,
  h2:         ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
  h3:         ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-base mt-2 mb-0.5">{children}</h3>,
  code:       ({ children }: { children?: React.ReactNode }) => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600">{children}</blockquote>,
  a:          ({ href, children }: { href?: string; children?: React.ReactNode }) => <a href={href} className="text-[#0033A0] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
  table:      ({ children }: { children?: React.ReactNode }) => <div className="overflow-x-auto"><table className="w-full text-sm border-collapse border border-gray-200">{children}</table></div>,
  thead:      ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>,
  th:         ({ children }: { children?: React.ReactNode }) => <th className="border border-gray-200 px-3 py-2 text-left font-semibold">{children}</th>,
  td:         ({ children }: { children?: React.ReactNode }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
}

// ── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
      } ${className ?? ''}`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Form field ──────────────────────────────────────────────────────────────
function FormField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: MeetingMachineField
  value: string
  onChange: (val: string) => void
  disabled: boolean
}) {
  const baseClass =
    'w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 disabled:bg-gray-50'

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
          className={baseClass + ' resize-none'}
        />
      ) : field.type === 'select' ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={baseClass}
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseClass}
        />
      )}
    </div>
  )
}

// ── Step indicator ──────────────────────────────────────────────────────────
function StepBar({
  steps,
  currentStep,
}: {
  steps: readonly { label: string }[]
  currentStep: number
}) {
  return (
    <>
      {/* Desktop step bar */}
      <div className="hidden sm:flex items-center justify-center gap-0 mb-8">
        {steps.map((step, i) => {
          const isComplete = i < currentStep
          const isCurrent = i === currentStep
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center size-9 rounded-full text-sm font-bold transition-colors ${
                    isComplete
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isComplete ? <Check className="size-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs mt-1.5 whitespace-nowrap font-medium ${
                    isCurrent ? 'text-[#0033A0]' : isComplete ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 mt-[-18px] ${
                    isComplete ? 'bg-emerald-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile step indicator */}
      <div className="sm:hidden flex items-center justify-center gap-2 mb-6">
        <span className="text-sm font-semibold text-gray-700">
          Step {currentStep + 1} of {steps.length}
        </span>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`size-2 rounded-full ${
                i < currentStep ? 'bg-emerald-400' : i === currentStep ? 'bg-[#0033A0]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// ── Wizard state ────────────────────────────────────────────────────────────
type WizardState = {
  currentStep: number
  stepData: Record<number, string>
}

type WizardAction =
  | { type: 'SET_STEP_DATA'; step: number; data: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP_DATA':
      return { ...state, stepData: { ...state.stepData, [action.step]: action.data } }
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 }
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) }
    case 'RESET':
      return { currentStep: 0, stepData: {} }
    default:
      return state
  }
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function MeetingMachineToolPage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string

  // Elevated tools have dedicated pages — redirect
  if (slug === 'agenda-builder') redirect('/meeting-machine/agenda-builder')
  if (slug === 'minutes-taker') redirect('/meeting-machine/minutes-taker')
  if (slug === 'action-items') redirect('/meeting-machine/action-items')
  if (slug === 'follow-up-drafter') redirect('/meeting-machine/follow-up-drafter')

  const tool = getMeetingMachineTool(slug)

  const [state, dispatch] = useReducer(wizardReducer, { currentStep: 0, stepData: {} })
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [textInput, setTextInput] = useState('')
  const [editableContent, setEditableContent] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const setField = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  // Build user message from step 0 input
  const buildInputMessage = useCallback((): string => {
    if (!tool) return ''
    const step0 = tool.steps[0]

    if (step0.inputType === 'form' && step0.fields) {
      return step0.fields
        .filter(f => formData[f.name]?.trim())
        .map(f => `**${f.label}:** ${formData[f.name].trim()}`)
        .join('\n\n')
    }

    return textInput.trim()
  }, [tool, formData, textInput])

  const canProceed = (() => {
    if (!tool) return false
    const step0 = tool.steps[0]
    if (step0.inputType === 'form' && step0.fields) {
      return step0.fields.filter(f => f.required).every(f => formData[f.name]?.trim())
    }
    return textInput.trim().length > 0
  })()

  // Stream AI response for a given step
  const streamStep = useCallback(async (step: number, context: Record<number, string>) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setEditableContent('')

    try {
      // Convert numeric keys to string keys for JSON
      const contextPayload: Record<string, string> = {}
      for (const [k, v] of Object.entries(context)) {
        contextPayload[String(k)] = v
      }

      const res = await fetch('/api/meeting-machine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ slug, step, context: contextPayload }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('Request failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        accumulated += chunk
        setEditableContent(accumulated)
      }

      return accumulated
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return ''
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setEditableContent(`_Error: ${msg}_`)
      return ''
    } finally {
      setLoading(false)
    }
  }, [slug, currentUser.email])

  // Step 0 → Step 1: Generate AI draft
  const handleNext = useCallback(async () => {
    if (!canProceed || loading) return

    const inputMsg = buildInputMessage()
    dispatch({ type: 'SET_STEP_DATA', step: 0, data: inputMsg })
    dispatch({ type: 'NEXT_STEP' })

    const result = await streamStep(1, { 0: inputMsg })
    if (result) {
      dispatch({ type: 'SET_STEP_DATA', step: 1, data: result })
    }
  }, [canProceed, loading, buildInputMessage, streamStep])

  // Step 1 → Step 2: Finalize edited draft
  const handleFinalize = useCallback(async () => {
    if (loading) return

    dispatch({ type: 'SET_STEP_DATA', step: 1, data: editableContent })
    dispatch({ type: 'NEXT_STEP' })

    const result = await streamStep(2, {
      0: state.stepData[0] ?? '',
      1: editableContent,
    })
    if (result) {
      dispatch({ type: 'SET_STEP_DATA', step: 2, data: result })
    }
  }, [loading, editableContent, state.stepData, streamStep])

  const handleBack = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    dispatch({ type: 'PREV_STEP' })
  }, [])

  const handleStartOver = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setFormData({})
    setTextInput('')
    setEditableContent('')
    dispatch({ type: 'RESET' })
  }, [])

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tool not found</h1>
        <p className="text-gray-500 mb-6">This Meeting Machine tool doesn&apos;t exist yet.</p>
        <Link
          href="/meeting-machine"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Meeting Machine
        </Link>
      </div>
    )
  }

  const Icon = getIcon(tool.icon)
  const currentStepConfig = tool.steps[state.currentStep]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Link
            href="/meeting-machine"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-3 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Meeting Machine
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
              <Icon className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">{tool.title}</h1>
              <p className="text-sm text-gray-500">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step bar */}
        <StepBar steps={tool.steps} currentStep={state.currentStep} />

        {/* Step content */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
          {/* Step 0: Input (form or textarea) */}
          {state.currentStep === 0 && (
            <div className="space-y-5">
              <h2 className="font-bold text-gray-900 text-lg">{currentStepConfig.label}</h2>

              {currentStepConfig.inputType === 'form' && currentStepConfig.fields ? (
                currentStepConfig.fields.map(field => (
                  <FormField
                    key={field.name}
                    field={field}
                    value={formData[field.name] ?? ''}
                    onChange={val => setField(field.name, val)}
                    disabled={loading}
                  />
                ))
              ) : (
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={currentStepConfig.placeholder ?? 'Enter your content...'}
                  disabled={loading}
                  rows={10}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 resize-none"
                />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || loading}
                className="w-full py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /> Processing...</>
                ) : (
                  <>Next <ChevronRight className="size-4" /></>
                )}
              </button>
            </div>
          )}

          {/* Step 1: AI output (editable) */}
          {state.currentStep === 1 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">{currentStepConfig.label}</h2>
                {!loading && editableContent && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    Edit below, then finalize
                  </span>
                )}
              </div>

              {loading && !editableContent ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                  <p className="text-sm text-gray-400">Generating draft...</p>
                </div>
              ) : (
                <textarea
                  value={editableContent}
                  onChange={e => setEditableContent(e.target.value)}
                  disabled={loading}
                  rows={16}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 resize-none font-mono leading-relaxed"
                />
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={loading || !editableContent.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="size-4 animate-spin" /> Finalizing...</>
                  ) : (
                    <>Finalize <ChevronRight className="size-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Final output (read-only) */}
          {state.currentStep === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">{currentStepConfig.label}</h2>
                {editableContent && <CopyButton text={editableContent} />}
              </div>

              {loading && !editableContent ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                  <p className="text-sm text-gray-400">Polishing final version...</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-800 bg-gray-50 rounded-xl p-6">
                  <DynamicMarkdown components={mdComponents}>{editableContent}</DynamicMarkdown>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartOver}
                className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="size-4" />
                Start Over
              </button>
            </div>
          )}
        </div>

        {/* Privacy */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Meeting Machine provides AI-generated content — always review before sharing.
        </p>
      </div>
    </div>
  )
}
