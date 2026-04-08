'use client'

import { Brain } from 'lucide-react'

interface QuestionCardProps {
  index: number
  question: {
    id: string
    concept: string
    bloomLevel: string
    type: 'multiple_choice' | 'short_answer' | 'scenario' | 'explain'
    question: string
    options?: string[]
    points: number
  }
  answer: string
  onChange: (questionId: string, answer: string) => void
  disabled?: boolean
}

const BLOOM_COLORS: Record<string, string> = {
  remember: 'bg-gray-100 text-gray-700',
  understand: 'bg-blue-100 text-blue-700',
  apply: 'bg-green-100 text-green-700',
  analyze: 'bg-amber-100 text-amber-700',
  evaluate: 'bg-orange-100 text-orange-700',
  create: 'bg-red-100 text-red-700',
}

export default function QuestionCard({ index, question, answer, onChange, disabled }: QuestionCardProps) {
  const bloomColor = BLOOM_COLORS[question.bloomLevel] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
      <div className="flex items-start gap-3 mb-3">
        <span className="flex items-center justify-center size-8 rounded-full bg-[#0033A0] text-white text-sm font-bold shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bloomColor}`}>
              <Brain className="size-3" />
              {question.bloomLevel}
            </span>
            <span className="text-xs text-gray-400">
              {question.concept.replace(/-/g, ' ')} · {question.points} pt{question.points !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-gray-900 font-medium">{question.question}</p>
        </div>
      </div>

      {question.type === 'multiple_choice' && question.options ? (
        <div className="ml-11 space-y-2">
          {question.options.map((option, oi) => {
            const letter = String.fromCharCode(65 + oi) // A, B, C, D
            const selected = answer.toUpperCase() === letter
            return (
              <label
                key={oi}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selected
                    ? 'border-[#0033A0] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={letter}
                  checked={selected}
                  onChange={() => onChange(question.id, letter)}
                  disabled={disabled}
                  className="accent-[#0033A0]"
                />
                <span className="font-medium text-gray-500 text-sm">{letter}.</span>
                <span className="text-gray-900 text-sm">{option}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <div className="ml-11">
          <textarea
            value={answer}
            onChange={(e) => onChange(question.id, e.target.value)}
            disabled={disabled}
            placeholder={
              question.type === 'scenario'
                ? 'Analyze the scenario and provide your response…'
                : question.type === 'explain'
                  ? 'Explain your reasoning…'
                  : 'Type your answer…'
            }
            rows={question.type === 'scenario' ? 6 : question.type === 'explain' ? 5 : 3}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0033A0] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed resize-y"
          />
        </div>
      )}
    </div>
  )
}
