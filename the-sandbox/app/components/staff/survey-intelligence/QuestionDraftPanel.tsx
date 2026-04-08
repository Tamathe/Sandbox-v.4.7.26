'use client'

import { useState, useCallback } from 'react'
import { Loader2, Copy, Check, FileText } from 'lucide-react'

interface QuestionDraftPanelProps {
  questionText: string
  questionNumber: number
  wordLimit: number | null
  output: string
  isGenerating: boolean
}

function CopyBtn({ text }: { text: string }) {
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
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function QuestionDraftPanel({
  questionText,
  questionNumber,
  wordLimit,
  output,
  isGenerating,
}: QuestionDraftPanelProps) {
  const wordCount = countWords(output)
  const overLimit = wordLimit ? wordCount > wordLimit : false

  // Split on ## headers into section cards
  const sections = output
    .split(/^## /m)
    .filter((s) => s.trim())
    .map((s) => {
      const nl = s.indexOf('\n')
      return {
        title: nl > -1 ? s.slice(0, nl).trim() : s.trim(),
        content: nl > -1 ? s.slice(nl + 1).trim() : '',
      }
    })

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-[#0033A0] shrink-0" />
            <div>
              <h3 className="text-base font-extrabold text-gray-900">
                Question {questionNumber}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{questionText}</p>
            </div>
          </div>
          {isGenerating && (
            <Loader2 className="size-5 text-[#0033A0] animate-spin shrink-0" />
          )}
        </div>

        {/* Word count bar */}
        {output && (
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className={overLimit ? 'font-semibold text-red-600' : 'text-gray-500'}>
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
            {wordLimit && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-400">{wordLimit} limit</span>
                {overLimit && (
                  <span className="text-red-500 font-semibold">
                    ({wordCount - wordLimit} over)
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {!output && !isGenerating && (
          <p className="text-sm text-gray-400 text-center py-8">
            Select a question and generate a draft to see results here.
          </p>
        )}

        {isGenerating && !output && (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Generating draft response...
          </div>
        )}

        {output && sections.length <= 1 ? (
          <div>
            <div className="flex justify-end mb-2">
              <CopyBtn text={output} />
            </div>
            <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
              {output}
            </div>
          </div>
        ) : output && sections.length > 1 ? (
          <div className="space-y-4">
            {sections.map((sec, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-900 text-sm">{sec.title}</h4>
                  <CopyBtn text={sec.content} />
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
