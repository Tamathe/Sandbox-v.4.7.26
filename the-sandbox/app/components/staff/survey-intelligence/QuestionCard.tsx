'use client'

import { Sparkles, Check } from 'lucide-react'

interface QuestionCardProps {
  question: {
    id: string
    questionNumber: number
    questionText: string
    category: string
    status: string
    draftResponse: string | null
    wordLimit: number | null
  }
  isActive: boolean
  onSelect: (id: string) => void
  onGenerateDraft: (id: string) => void
  onApprove: (id: string) => void
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  drafted: 'bg-amber-100 text-amber-800',
  refined: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
}

const CATEGORY_COLORS: Record<string, string> = {
  benefits: 'bg-green-50 text-green-700',
  'community-service': 'bg-teal-50 text-teal-700',
  culture: 'bg-purple-50 text-purple-700',
  wellness: 'bg-pink-50 text-pink-700',
  diversity: 'bg-indigo-50 text-indigo-700',
  'professional-development': 'bg-blue-50 text-blue-700',
  governance: 'bg-amber-50 text-amber-700',
  teaching: 'bg-cyan-50 text-cyan-700',
  facilities: 'bg-orange-50 text-orange-700',
  communication: 'bg-lime-50 text-lime-700',
  research: 'bg-violet-50 text-violet-700',
  'student-success': 'bg-emerald-50 text-emerald-700',
}

export default function QuestionCard({
  question,
  isActive,
  onSelect,
  onGenerateDraft,
  onApprove,
}: QuestionCardProps) {
  const statusStyle = STATUS_STYLES[question.status] ?? 'bg-gray-100 text-gray-700'
  const catStyle = CATEGORY_COLORS[question.category] ?? 'bg-gray-50 text-gray-600'
  const catLabel = question.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <button
      type="button"
      onClick={() => onSelect(question.id)}
      className={`w-full text-left border-2 rounded-2xl p-4 transition-colors ${
        isActive
          ? 'border-[#0033A0] bg-[#0033A0]/5'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Number badge */}
        <div className="size-7 rounded-lg bg-[#0033A0]/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#0033A0]">{question.questionNumber}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 line-clamp-2 leading-snug">
            {question.questionText}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catStyle}`}>
              {catLabel}
            </span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusStyle}`}>
              {question.status}
            </span>
            {question.wordLimit && (
              <span className="text-[10px] text-gray-400">{question.wordLimit} word limit</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            {question.status === 'pending' && (
              <button
                type="button"
                onClick={() => onGenerateDraft(question.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0] text-white hover:bg-[#002580] transition-colors"
              >
                <Sparkles className="size-3.5" /> Generate
              </button>
            )}
            {(question.status === 'drafted' || question.status === 'refined') && (
              <button
                type="button"
                onClick={() => onApprove(question.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <Check className="size-3.5" /> Approve
              </button>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
