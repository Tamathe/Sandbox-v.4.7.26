'use client'

import { useState } from 'react'
import DynamicMarkdown from '../DynamicMarkdown'
import { Sunrise, FileText, BarChart3, PenLine, ChevronDown, ChevronUp, Check, X, TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface AsyncTask {
  id: string
  prompt: string
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  result: string | null
  resultType: string | null
  queuedAt: string
  completedAt: string | null
  reviewedAt: string | null
  accepted: boolean | null
}

const ICON_MAP: Record<string, typeof FileText> = {
  document: FileText,
  summary: BarChart3,
  analysis: BarChart3,
  draft: PenLine,
}

export default function OvernightSandyCard({ tasks }: { tasks: AsyncTask[] }) {
  const { currentUser } = useAuth()
  const completedUnreviewed = tasks.filter(t => t.status === 'COMPLETED' && !t.reviewedAt)
  const queued = tasks.filter(t => t.status === 'QUEUED' || t.status === 'PROCESSING')

  if (completedUnreviewed.length === 0 && queued.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-3">
        <Sunrise className="size-4 text-amber-600" />
        <h2 className="text-sm font-extrabold text-gray-900">Sandy prepared overnight</h2>
      </div>

      <div className="divide-y divide-amber-100 px-5">
        {completedUnreviewed.map((task, i) => (
          <TaskCard key={task.id} task={task} userEmail={currentUser.email} defaultExpanded={i === 0} />
        ))}
        {queued.map(task => (
          <div key={task.id} className="py-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="size-2 animate-pulse rounded-full bg-amber-400" />
              <span>{task.status === 'PROCESSING' ? 'Processing...' : 'Queued'}</span>
              <span className="text-xs text-gray-400 truncate max-w-xs">{task.prompt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeltaBadge({ value }: { value: string }) {
  const isPositive = value.startsWith('+')
  const isNegative = value.startsWith('-')
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
      isPositive ? 'bg-green-50 text-green-700' : isNegative ? 'bg-red-50 text-red-700' : 'text-gray-500'
    }`}>
      {isPositive && <TrendingUp className="size-3" />}
      {isNegative && <TrendingDown className="size-3" />}
      {value}
    </span>
  )
}

const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-extrabold text-gray-900 mb-3">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-extrabold text-[#0033A0] mt-4 mb-2 flex items-center gap-1.5">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => {
    const text = String(children ?? '')
    const icon = text === 'Highlights' ? <Lightbulb className="size-3.5 text-amber-500" />
      : text === 'Concerns' ? <AlertTriangle className="size-3.5 text-red-400" />
      : text === 'Recommendations' ? <TrendingUp className="size-3.5 text-[#0033A0]" />
      : null
    return (
      <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1.5 flex items-center gap-1.5">
        {icon}{children}
      </h3>
    )
  },
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 mt-1 mb-2 list-disc pl-4 marker:text-gray-300">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1.5 mt-1 mb-2 list-decimal pl-4 marker:text-[#0033A0] marker:font-semibold">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm text-gray-700 leading-relaxed pl-1">{children}</li>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="rounded-lg border border-gray-200 overflow-hidden my-2">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</th>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-t border-gray-100">{children}</tr>
  ),
  td: ({ children }: { children?: React.ReactNode }) => {
    const text = String(children ?? '')
    const isDelta = /^[+-]\d/.test(text.trim())
    return (
      <td className="px-3 py-2 text-sm text-gray-700">
        {isDelta ? <DeltaBadge value={text.trim()} /> : children}
      </td>
    )
  },
}

function TaskCard({ task, userEmail, defaultExpanded = false }: { task: AsyncTask; userEmail: string; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [reviewing, setReviewing] = useState(false)
  const [reviewed, setReviewed] = useState(false)

  const Icon = ICON_MAP[task.resultType ?? 'document'] ?? FileText
  const wordCount = task.result ? task.result.split(/\s+/).length : 0

  const handleReview = async (accepted: boolean) => {
    setReviewing(true)
    try {
      await fetch(`/api/faculty/overnight-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ accepted }),
      })
      setReviewed(true)
    } catch {
      // Silently fail
    } finally {
      setReviewing(false)
    }
  }

  if (reviewed) return null

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-[#0033A0]" />
          <span className="text-sm font-semibold text-gray-900 truncate max-w-sm">{task.prompt}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{wordCount} words</span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {expanded && task.result && (
        <div className="mt-3 rounded-xl bg-white border border-gray-200 p-4 overflow-x-auto">
          <DynamicMarkdown
            components={mdComponents}
          >
            {task.result.length > 2000 ? task.result.slice(0, 2000) + '...' : task.result}
          </DynamicMarkdown>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-blue-50"
        >
          {expanded ? 'Collapse' : 'Review'}
        </button>
        <button
          type="button"
          onClick={() => handleReview(true)}
          disabled={reviewing}
          className="flex items-center gap-1 rounded-lg border border-green-200 px-3 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
        >
          <Check className="size-3" /> Accept
        </button>
        <button
          type="button"
          onClick={() => handleReview(false)}
          disabled={reviewing}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <X className="size-3" /> Dismiss
        </button>
      </div>
    </div>
  )
}
