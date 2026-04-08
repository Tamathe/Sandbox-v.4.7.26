'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, RotateCcw, Mail } from 'lucide-react'

interface BeforeAfterViewProps {
  originalEmail: string
  rewrittenEmail: string
  isRefining: boolean
  subjectLine: string | null
  onStartOver: () => void
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
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
      }`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label ?? (copied ? 'Copied' : 'Copy')}
    </button>
  )
}

export default function BeforeAfterView({
  originalEmail,
  rewrittenEmail,
  isRefining,
  subjectLine,
  onStartOver,
}: BeforeAfterViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto p-4">
        {/* Before */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Original</span>
            <span className="text-xs text-gray-400">{originalEmail.split(/\s+/).length} words</span>
          </div>
          <div className="flex-1 bg-gray-50 rounded-xl p-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border border-gray-200">
            {originalEmail}
          </div>
        </div>

        {/* After */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#0033A0] uppercase tracking-wider">
              {isRefining ? 'Refining...' : 'Rewritten'}
            </span>
            <span className="text-xs text-gray-400">{rewrittenEmail.split(/\s+/).length} words</span>
          </div>
          <div
            className={`flex-1 bg-white rounded-2xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border-2 transition-colors ${
              isRefining ? 'border-[#0033A0]/30' : 'border-gray-200'
            }`}
          >
            {rewrittenEmail}
          </div>
        </div>
      </div>

      {/* Export bar */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap">
        <CopyBtn text={rewrittenEmail} label="Copy" />
        {subjectLine && (
          <CopyBtn
            text={`Subject: ${subjectLine}\n\n${rewrittenEmail}`}
            label="Copy with subject"
          />
        )}
        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors ml-auto"
        >
          <RotateCcw className="size-3.5" />
          Try a different email
        </button>
      </div>
    </div>
  )
}
