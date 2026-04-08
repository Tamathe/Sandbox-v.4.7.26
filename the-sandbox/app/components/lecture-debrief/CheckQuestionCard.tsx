'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface CheckQuestion {
  question: string
  type: 'multiple_choice' | 'short_answer'
  options?: string[]
  correctAnswer: string
  explanation: string
  bloomLevel: number
  conceptSlug: string
}

const BLOOM_LABELS = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
const BLOOM_COLORS = ['', 'bg-emerald-50 text-emerald-700', 'bg-blue-50 text-blue-700', 'bg-violet-50 text-violet-700', 'bg-amber-50 text-amber-700', 'bg-orange-50 text-orange-700', 'bg-red-50 text-red-700']

export default function CheckQuestionCard({
  question,
  index,
}: {
  question: CheckQuestion
  index: number
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [shortAnswer, setShortAnswer] = useState('')

  const isCorrect =
    question.type === 'multiple_choice'
      ? selectedAnswer?.toLowerCase() === question.correctAnswer?.toLowerCase()
      : null // short answer isn't auto-graded

  function handleReveal() {
    setRevealed(true)
  }

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center size-7 rounded-full bg-gray-100 text-xs font-bold text-gray-600 shrink-0">
            {index + 1}
          </span>
          <p className="text-sm font-semibold text-gray-900 leading-relaxed">{question.question}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${BLOOM_COLORS[question.bloomLevel] || 'bg-gray-100 text-gray-600'}`}>
          {BLOOM_LABELS[question.bloomLevel] || `L${question.bloomLevel}`}
        </span>
      </div>

      <div className="mt-4 ml-10">
        {question.type === 'multiple_choice' && question.options ? (
          <div className="space-y-2">
            {question.options.map((option, i) => {
              const letter = String.fromCharCode(65 + i)
              const isSelected = selectedAnswer === letter
              const isRight = revealed && letter.toLowerCase() === question.correctAnswer?.toLowerCase()
              const isWrong = revealed && isSelected && !isRight

              return (
                <button
                  key={i}
                  type="button"
                  disabled={revealed}
                  onClick={() => setSelectedAnswer(letter)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-all cursor-pointer ${
                    isRight
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : isWrong
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : isSelected
                          ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  } ${revealed ? 'cursor-default' : ''}`}
                >
                  <span className="font-bold mr-2">{letter}.</span>
                  {option}
                  {isRight && <CheckCircle2 className="inline size-4 ml-2 text-emerald-600" />}
                  {isWrong && <XCircle className="inline size-4 ml-2 text-red-500" />}
                </button>
              )
            })}
          </div>
        ) : (
          <textarea
            value={shortAnswer}
            onChange={(e) => setShortAnswer(e.target.value)}
            disabled={revealed}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0033A0] disabled:bg-gray-50"
            rows={3}
          />
        )}

        {!revealed && (selectedAnswer || shortAnswer.trim()) && (
          <button
            type="button"
            onClick={handleReveal}
            className="mt-3 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] transition-colors cursor-pointer"
          >
            Check Answer
          </button>
        )}

        {revealed && (
          <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              {question.type === 'multiple_choice' ? (
                isCorrect ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <XCircle className="size-4 text-red-500" />
                )
              ) : null}
              <span className="text-sm font-bold text-gray-700">
                {question.type === 'multiple_choice'
                  ? isCorrect ? 'Correct!' : `Correct answer: ${question.correctAnswer}`
                  : `Answer: ${question.correctAnswer}`}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
