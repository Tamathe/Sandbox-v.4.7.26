'use client'

import { useState } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'

interface ExamConfigModalProps {
  assignmentTitle?: string
  onGenerate: (questionCount: number) => void
  onClose: () => void
  generating: boolean
}

export default function ExamConfigModal({
  assignmentTitle,
  onGenerate,
  onClose,
  generating,
}: ExamConfigModalProps) {
  const [questionCount, setQuestionCount] = useState(10)

  return (
    <ModalShell title="Configure Practice Exam" icon={FlaskConical} onClose={onClose} zIndex={50} maxWidth="md">
        {assignmentTitle && (
          <div className="px-5 -mt-1 pb-2 text-sm text-gray-500 border-b border-gray-100">
            Targeting: {assignmentTitle}
          </div>
        )}

        <div className="px-5 py-5 space-y-5">
          {/* Question Count Slider */}
          <div>
            <label htmlFor="question-count" className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Questions
            </label>
            <div className="flex items-center gap-4">
              <input
                id="question-count"
                type="range"
                min={5}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                disabled={generating}
                className="flex-1 accent-[#0033A0]"
              />
              <span className="w-8 text-center text-lg font-bold text-[#0033A0]">{questionCount}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 (quick)</span>
              <span>20 (thorough)</span>
            </div>
          </div>

          {/* Generation Info */}
          {generating && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Loader2 className="size-5 animate-spin text-[#0033A0]" />
              <div>
                <p className="text-sm font-medium text-blue-900">Generating your exam…</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  AI is crafting questions targeting your weak spots. This may take 15–30 seconds.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(questionCount)}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-[#0033A0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FlaskConical className="size-4" />
            )}
            {generating ? 'Generating…' : 'Generate Exam'}
          </button>
        </div>
    </ModalShell>
  )
}
