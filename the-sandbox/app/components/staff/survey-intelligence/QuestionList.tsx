'use client'

import { ListChecks } from 'lucide-react'
import QuestionCard from './QuestionCard'

interface QuestionListProps {
  questions: Array<{
    id: string
    questionNumber: number
    questionText: string
    category: string
    status: string
    draftResponse: string | null
    wordLimit: number | null
  }>
  activeQuestionId: string | null
  onSelectQuestion: (id: string) => void
  onGenerateDraft: (id: string) => void
  onApproveQuestion: (id: string) => void
}

export default function QuestionList({
  questions,
  activeQuestionId,
  onSelectQuestion,
  onGenerateDraft,
  onApproveQuestion,
}: QuestionListProps) {
  const pending = questions.filter((q) => q.status === 'pending').length
  const drafted = questions.filter((q) => q.status === 'drafted' || q.status === 'refined').length
  const approved = questions.filter((q) => q.status === 'approved').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-[#0033A0]" />
          <h3 className="text-base font-extrabold text-gray-900">Questions</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">{pending} pending</span>
          <span className="text-amber-600">{drafted} drafted</span>
          <span className="text-green-600">{approved} approved</span>
        </div>
      </div>

      {/* Question cards */}
      {questions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No questions in this project yet.
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isActive={activeQuestionId === q.id}
              onSelect={onSelectQuestion}
              onGenerateDraft={onGenerateDraft}
              onApprove={onApproveQuestion}
            />
          ))}
        </div>
      )}
    </div>
  )
}
