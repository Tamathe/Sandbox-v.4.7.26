'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Wrench } from 'lucide-react'

interface ToolCallCardProps {
  toolName: string
  args: Record<string, unknown>
  result: Record<string, unknown> | null
  status: 'running' | 'completed' | 'error'
  error?: string
  /** Index in the tool call sequence — used for staggered entrance (150ms per card) */
  staggerIndex?: number
}

/** Collapsible card showing a tool invocation: name, args, result, animated spinner while running. */
export default function ToolCallCard({ toolName, args, result, status, error, staggerIndex = 0 }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(false)
  const [slowLabel, setSlowLabel] = useState(false)

  // Staggered entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), staggerIndex * 150)
    return () => clearTimeout(timer)
  }, [staggerIndex])

  // "Still working on it..." after 3 seconds in running state
  useEffect(() => {
    if (status !== 'running') {
      setSlowLabel(false)
      return
    }
    const timer = setTimeout(() => setSlowLabel(true), 3000)
    return () => clearTimeout(timer)
  }, [status])

  const friendlyName = toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div
      className={`border border-gray-200 rounded-xl bg-white overflow-hidden transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        {status === 'running' && <Loader2 className="size-4 text-blue-500 animate-spin flex-shrink-0" />}
        {status === 'completed' && <CheckCircle2 className="size-4 text-green-500 flex-shrink-0" />}
        {status === 'error' && <XCircle className="size-4 text-red-500 flex-shrink-0" />}

        <Wrench className="size-3.5 text-gray-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-700 truncate block">
            {status === 'running' ? `Sandy is checking — ${friendlyName}` : friendlyName}
          </span>
          {status === 'running' && slowLabel && (
            <span className="text-[10px] text-gray-400 animate-pulse block">Still working on it...</span>
          )}
        </div>

        {expanded
          ? <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="size-3.5 text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
          {/* Args */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-2 mb-1">Arguments</p>
            <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 overflow-x-auto max-h-32">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {result && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Result</p>
              <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 overflow-x-auto max-h-48">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-2 text-xs text-red-600" role="alert">{error}</div>
          )}
        </div>
      )}
    </div>
  )
}
