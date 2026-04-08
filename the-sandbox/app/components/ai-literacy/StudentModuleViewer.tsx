'use client'

import { useState } from 'react'
import { ArrowLeft, CheckCircle, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import type { LiteracyLesson } from '../../lib/student-ai-literacy-service'

interface StudentModuleViewerProps {
  module: LiteracyLesson
  onBack: () => void
}

type View = 'lesson' | 'quiz' | 'results'

export default function StudentModuleViewer({ module, onBack }: StudentModuleViewerProps) {
  const [view, setView] = useState<View>('lesson')
  const [sectionIndex, setSectionIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})

  function nextSection() {
    if (sectionIndex < module.sections.length - 1) {
      setSectionIndex(prev => prev + 1)
    } else {
      setView('quiz')
    }
  }

  function prevSection() {
    if (sectionIndex > 0) setSectionIndex(prev => prev - 1)
  }

  function submitQuiz() {
    setView('results')
  }

  const quizScore = module.quizQuestions.reduce(
    (acc, q, i) => acc + (quizAnswers[i] === q.correctIndex ? 1 : 0), 0
  )

  if (view === 'lesson') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" /> All modules
          </button>
          <span className="text-xs text-gray-400">
            Section {sectionIndex + 1} of {module.sections.length}
          </span>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0033A0] rounded-full transition-all"
            style={{ width: `${((sectionIndex + 1) / module.sections.length) * 100}%` }}
          />
        </div>

        <div className="border rounded-2xl shadow-sm p-6 bg-white">
          <h2 className="text-lg font-extrabold text-gray-900">{module.sections[sectionIndex].heading}</h2>
          <div className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {module.sections[sectionIndex].content}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={prevSection}
            disabled={sectionIndex === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" /> Previous
          </button>
          <button
            onClick={nextSection}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] font-medium text-sm"
          >
            {sectionIndex < module.sections.length - 1 ? 'Next' : 'Take Quiz'}
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  if (view === 'quiz') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('lesson')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" /> Back to lesson
          </button>
          <span className="text-xs text-gray-400">Quick Check</span>
        </div>

        <h2 className="text-lg font-extrabold text-gray-900">Check Your Understanding</h2>

        <div className="space-y-6">
          {module.quizQuestions.map((q, qi) => (
            <div key={qi} className="border rounded-2xl shadow-sm p-5 bg-white">
              <p className="text-sm font-medium text-gray-900 mb-3">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                    className={`w-full text-left p-3 rounded-xl border-2 text-sm transition-all ${
                      quizAnswers[qi] === oi
                        ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <button
            onClick={submitQuiz}
            disabled={Object.keys(quizAnswers).length < module.quizQuestions.length}
            className="w-full px-6 py-3 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] font-medium text-sm disabled:opacity-40"
          >
            Check Answers
          </button>
          {Object.keys(quizAnswers).length < module.quizQuestions.length && (
            <p className="text-xs text-gray-400 text-center">
              Answer all {module.quizQuestions.length} questions to continue
            </p>
          )}
        </div>
      </div>
    )
  }

  // Results view
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center py-4">
        <div className="mx-auto size-16 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
          <Check className="size-8 text-green-500" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">
          {quizScore === module.quizQuestions.length ? 'Perfect!' : `${quizScore} of ${module.quizQuestions.length} correct`}
        </h2>
      </div>

      <div className="space-y-4">
        {module.quizQuestions.map((q, qi) => {
          const correct = quizAnswers[qi] === q.correctIndex
          return (
            <div key={qi} className={`p-4 rounded-xl border ${correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm font-medium text-gray-900">{q.question}</p>
              <p className={`text-xs mt-1 ${correct ? 'text-green-700' : 'text-red-700'}`}>
                {correct ? 'Correct' : `Your answer: ${q.options[quizAnswers[qi]]}`}
              </p>
              {!correct && <p className="text-xs text-gray-600 mt-1">Correct answer: {q.options[q.correctIndex]}</p>}
              <p className="text-xs text-gray-500 mt-2">{q.explanation}</p>
            </div>
          )
        })}
      </div>

      {/* Key takeaways */}
      <div className="border rounded-2xl shadow-sm p-5 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Key Takeaways</h3>
        <ul className="space-y-1.5">
          {module.keyTakeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" /> {t}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onBack}
        className="w-full px-6 py-3 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] font-medium text-sm"
      >
        Back to All Modules
      </button>
    </div>
  )
}
