'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowLeft, Loader2, Star, X, Send, AlertTriangle, Fingerprint, HelpCircle, EyeOff } from 'lucide-react'
import type { SeededScenario } from '../../lib/output-eval-constants'

const ERROR_TYPES = [
  { value: 'hallucination', label: 'Hallucination', color: 'bg-red-100 text-red-700 border-red-200', mark: 'bg-red-100/80' },
  { value: 'bias', label: 'Bias', color: 'bg-purple-100 text-purple-700 border-purple-200', mark: 'bg-purple-100/80' },
  { value: 'unsupported', label: 'Unsupported', color: 'bg-orange-100 text-orange-700 border-orange-200', mark: 'bg-orange-100/80' },
  { value: 'missing_context', label: 'Missing Context', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', mark: 'bg-yellow-100/80' },
] as const

const ERROR_ICONS: Record<string, typeof AlertTriangle> = {
  hallucination: AlertTriangle,
  bias: Fingerprint,
  unsupported: HelpCircle,
  missing_context: EyeOff,
}

interface Highlight {
  id: string
  span: string
  type: string
  explanation: string
  startOffset: number
  endOffset: number
}

interface Props {
  scenario: SeededScenario
  userEmail: string
  onSubmit: (result: {
    detectionScore: number
    justificationScore: number
    overallScore: number
    feedback: string
    userHighlights: Highlight[]
    userRating: number
  }) => void
  onBack: () => void
}

export default function OutputEvalScenario({ scenario, userEmail, onSubmit, onBack }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Selection toolbar state
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; startOffset: number; endOffset: number } | null>(null)
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [justification, setJustification] = useState('')
  const textRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const closeToolbar = useCallback(() => {
    setSelectionInfo(null)
    setToolbarPos(null)
    setSelectedType(null)
    setJustification('')
  }, [])

  // Close toolbar on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        closeToolbar()
      }
    }
    if (toolbarPos) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [toolbarPos, closeToolbar])

  function handleTextMouseUp() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !textRef.current) return

    const text = selection.toString().trim()
    if (!text || text.length < 5) return

    // Get offset within the full AI response text
    const range = selection.getRangeAt(0)
    const preRange = document.createRange()
    preRange.selectNodeContents(textRef.current)
    preRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preRange.toString().length
    const endOffset = startOffset + text.length

    // Check for overlapping highlights
    const overlaps = highlights.some(
      (h) => startOffset < h.endOffset && endOffset > h.startOffset,
    )
    if (overlaps) return

    // Position toolbar above selection
    const rect = range.getBoundingClientRect()
    const containerRect = textRef.current.getBoundingClientRect()
    setToolbarPos({
      top: rect.top - containerRect.top - 12,
      left: rect.left - containerRect.left + rect.width / 2,
    })
    setSelectionInfo({ text, startOffset, endOffset })
  }

  function handleAddHighlight() {
    if (!selectionInfo || !selectedType || !justification.trim()) return

    setHighlights((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        span: selectionInfo.text,
        type: selectedType,
        explanation: justification.trim(),
        startOffset: selectionInfo.startOffset,
        endOffset: selectionInfo.endOffset,
      },
    ])
    closeToolbar()
    window.getSelection()?.removeAllRanges()
  }

  function removeHighlight(id: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
  }

  async function handleSubmit() {
    if (highlights.length === 0 || rating === 0) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/ai-literacy/output-eval/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          scenarioId: scenario.id,
          plantedErrors: scenario.plantedErrors,
          userHighlights: highlights.map((h) => ({ span: h.span, type: h.type, explanation: h.explanation })),
          userRating: rating,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const result = await res.json()
      onSubmit({ ...result, userHighlights: highlights, userRating: rating })
    } catch {
      setSubmitting(false)
    }
  }

  // Render AI response with highlights
  function renderHighlightedText() {
    const text = scenario.aiResponse
    if (highlights.length === 0) return <span>{text}</span>

    const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset)
    const segments: React.ReactNode[] = []
    let lastEnd = 0

    for (const h of sorted) {
      if (h.startOffset > lastEnd) {
        segments.push(<span key={`t-${lastEnd}`}>{text.slice(lastEnd, h.startOffset)}</span>)
      }
      const typeInfo = ERROR_TYPES.find((t) => t.value === h.type)
      segments.push(
        <mark
          key={h.id}
          className={`${typeInfo?.mark ?? 'bg-gray-100'} rounded px-0.5 cursor-help relative group`}
          title={`${h.type}: ${h.explanation}`}
        >
          {text.slice(h.startOffset, h.endOffset)}
        </mark>,
      )
      lastEnd = h.endOffset
    }
    if (lastEnd < text.length) {
      segments.push(<span key={`t-${lastEnd}`}>{text.slice(lastEnd)}</span>)
    }
    return <>{segments}</>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <span className="text-xs font-semibold text-[#0033A0] uppercase">Tier {scenario.tier} Evaluation</span>
          <p className="text-sm text-gray-500 mt-0.5">Read the AI response carefully and highlight any errors you find.</p>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Student&apos;s Question</h3>
        <p className="text-gray-800">{scenario.question}</p>
      </div>

      {/* AI Response with highlighting */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 relative">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">AI Response</h3>
        <p className="text-xs text-gray-400 mb-4">Select text to mark errors. Click and drag to highlight suspicious passages.</p>

        <div
          ref={textRef}
          onMouseUp={handleTextMouseUp}
          className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap select-text cursor-text"
        >
          {renderHighlightedText()}
        </div>

        {/* Floating toolbar */}
        {toolbarPos && selectionInfo && (
          <div
            ref={toolbarRef}
            className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 -translate-x-1/2"
            style={{ top: toolbarPos.top, left: toolbarPos.left }}
          >
            {!selectedType ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 font-medium mb-1">What type of error?</p>
                <div className="flex gap-1.5">
                  {ERROR_TYPES.map((et) => {
                    const Icon = ERROR_ICONS[et.value]
                    return (
                      <button
                        key={et.value}
                        onClick={() => setSelectedType(et.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${et.color}`}
                      >
                        {Icon && <Icon className="size-3.5" />} {et.label}
                      </button>
                    )
                  })}
                </div>
                <button onClick={closeToolbar} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 min-w-[280px]">
                <p className="text-xs text-gray-500 font-medium">Why is this an error?</p>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain what's wrong..."
                  rows={2}
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddHighlight}
                    disabled={!justification.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0033A0] text-white rounded-lg text-xs font-medium hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Highlight
                  </button>
                  <button onClick={closeToolbar} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Highlights list */}
      {highlights.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Your Highlights ({highlights.length})</h3>
          <div className="space-y-2">
            {highlights.map((h) => {
              const typeInfo = ERROR_TYPES.find((t) => t.value === h.type)
              return (
                <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${typeInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {typeInfo?.label ?? h.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 line-clamp-1 italic">&ldquo;{h.span}&rdquo;</p>
                    <p className="text-xs text-gray-500 mt-0.5">{h.explanation}</p>
                  </div>
                  <button onClick={() => removeHighlight(h.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="size-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rating + Submit */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Rate Overall AI Response Quality</h3>
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} className="transition-colors">
              <Star className={`size-7 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
            </button>
          ))}
          {rating > 0 && <span className="text-sm text-gray-500 ml-2">{rating}/5</span>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={highlights.length === 0 || rating === 0 || submitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {submitting ? 'Evaluating...' : 'Submit Evaluation'}
        </button>

        {highlights.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">Highlight at least one error in the AI response to submit.</p>
        )}
      </div>
    </div>
  )
}
