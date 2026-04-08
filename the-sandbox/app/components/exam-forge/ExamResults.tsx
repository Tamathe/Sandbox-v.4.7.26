'use client'

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Brain,
} from 'lucide-react'
import { useState } from 'react'
import ConceptBreakdown from './ConceptBreakdown'
import PrerequisiteUnpackerPanel from '../prerequisite/PrerequisiteUnpackerPanel'

interface QuestionResult {
  questionId: string
  studentAnswer: string
  correct: boolean
  score: number
  feedback: string
}

interface Question {
  id: string
  concept: string
  bloomLevel: string
  type: string
  question: string
  options?: string[]
  correctAnswer?: string
  explanation?: string
  points: number
}

interface ExamResultsProps {
  score: number
  questionCount: number
  correctCount: number
  questionResults: QuestionResult[]
  questions: Question[]
  weaknesses: string[]
  courseId?: string
  onRetake?: () => void
}

export default function ExamResults({
  score,
  questionCount,
  correctCount,
  questionResults,
  questions,
  weaknesses,
  courseId,
  onRetake,
}: ExamResultsProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [unpackConcept, setUnpackConcept] = useState<string | null>(null)

  const pct = Math.round(score * 100)
  const gradeColor =
    pct >= 90
      ? 'text-green-600'
      : pct >= 80
        ? 'text-green-500'
        : pct >= 70
          ? 'text-amber-500'
          : pct >= 60
            ? 'text-orange-500'
            : 'text-red-500'

  const letterGrade =
    pct >= 93
      ? 'A'
      : pct >= 90
        ? 'A-'
        : pct >= 87
          ? 'B+'
          : pct >= 83
            ? 'B'
            : pct >= 80
              ? 'B-'
              : pct >= 77
                ? 'C+'
                : pct >= 73
                  ? 'C'
                  : pct >= 70
                    ? 'C-'
                    : pct >= 67
                      ? 'D+'
                      : pct >= 60
                        ? 'D'
                        : 'F'

  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white text-center">
        <div className={`text-5xl font-extrabold ${gradeColor}`}>{pct}%</div>
        <div className="text-lg font-bold text-gray-700 mt-1">{letterGrade}</div>
        <p className="text-sm text-gray-500 mt-2">
          {correctCount} of {questionCount} correct
        </p>
      </div>

      {/* Concept Breakdown */}
      <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
        <ConceptBreakdown questionResults={questionResults} questions={questions} />
      </div>

      {/* Weakness Report */}
      {weaknesses.length > 0 && (
        <div className="border-2 border-amber-200 rounded-2xl p-5 bg-amber-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-5 text-amber-600" />
            <h3 className="font-bold text-amber-900">Focus Areas</h3>
          </div>
          <p className="text-sm text-amber-800 mb-2">
            Strengthen these concepts before the real exam:
          </p>
          <ul className="space-y-1">
            {weaknesses.map((w) => (
              <li key={w} className="text-sm text-amber-700 capitalize">
                · {w.replace(/-/g, ' ')}
              </li>
            ))}
          </ul>
          {onRetake && (
            <button
              onClick={onRetake}
              className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Generate another exam targeting weak spots
            </button>
          )}
        </div>
      )}

      {/* Prerequisite Trace — accordion for weakness concepts */}
      {weaknesses.length > 0 && courseId && (
        <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-[#0033A0]" />
            <h3 className="font-bold text-gray-900">Trace Prerequisites</h3>
          </div>
          <p className="text-sm text-gray-500">
            Trace why you&apos;re struggling with a concept — find the root gap.
          </p>
          <div className="space-y-2">
            {weaknesses.map((w) => (
              <div key={w}>
                <button
                  onClick={() => setUnpackConcept(unpackConcept === w ? null : w)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="capitalize">{w.replace(/-/g, ' ')}</span>
                  {unpackConcept === w ? (
                    <ChevronUp className="size-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="size-4 text-gray-400 shrink-0" />
                  )}
                </button>
                {unpackConcept === w && (
                  <div className="mt-2">
                    <PrerequisiteUnpackerPanel
                      concept={w}
                      courseId={courseId}
                      onClose={() => setUnpackConcept(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Question Review */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900">Question Review</h3>
        {questions.map((q, i) => {
          const result = questionResults.find((r) => r.questionId === q.id)
          if (!result) return null
          const expanded = expandedQuestion === q.id

          return (
            <div
              key={q.id}
              className={`border-2 rounded-2xl overflow-hidden transition-colors ${
                result.correct ? 'border-green-200' : 'border-red-200'
              }`}
            >
              <button
                onClick={() => setExpandedQuestion(expanded ? null : q.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                {result.correct ? (
                  <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="size-5 text-red-500 shrink-0" />
                )}
                <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                  Q{i + 1}: {q.question.slice(0, 80)}{q.question.length > 80 ? '…' : ''}
                </span>
                <span className="text-sm font-medium text-gray-500 shrink-0 mr-2">
                  {Math.round(result.score * 100)}%
                </span>
                {expanded ? (
                  <ChevronUp className="size-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400 shrink-0" />
                )}
              </button>

              {expanded && (
                <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-2 pt-3 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        BLOOM_COLORS[q.bloomLevel] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Brain className="size-3" />
                      {q.bloomLevel}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      {q.concept.replace(/-/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Question:</p>
                    <p className="text-sm text-gray-600">{q.question}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Your answer:</p>
                    <p className="text-sm text-gray-600">
                      {result.studentAnswer || <span className="italic text-gray-400">No answer</span>}
                    </p>
                  </div>

                  {q.correctAnswer && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Correct answer:</p>
                      <p className="text-sm text-green-700">{q.correctAnswer}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">{result.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const BLOOM_COLORS: Record<string, string> = {
  remember: 'bg-gray-100 text-gray-700',
  understand: 'bg-blue-100 text-blue-700',
  apply: 'bg-green-100 text-green-700',
  analyze: 'bg-amber-100 text-amber-700',
  evaluate: 'bg-orange-100 text-orange-700',
  create: 'bg-red-100 text-red-700',
}
