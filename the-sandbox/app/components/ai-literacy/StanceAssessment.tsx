'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import type { DisciplineFamily } from '../../generated/prisma'

interface StanceQuestion {
  id: string
  title: string
  prompt: string
  context: string
  options: { label: string; value: number; isUnsure?: boolean }[]
}

interface StanceAssessmentProps {
  questions: StanceQuestion[]
  onComplete: (responses: { questionId: string; selectedValue: number; optionLabel: string }[], disciplineFamily?: DisciplineFamily, reflectionNote?: string) => void
  onCancel: () => void
}

const DISCIPLINE_OPTIONS: { value: DisciplineFamily; label: string }[] = [
  { value: 'STEM', label: 'STEM' },
  { value: 'HUMANITIES', label: 'Humanities' },
  { value: 'SOCIAL_SCIENCES', label: 'Social Sciences' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'HEALTH_SCIENCES', label: 'Health Sciences' },
]

type Phase = 'questions' | 'reflection'

const PRIMER_EXAMPLES = [
  {
    icon: '\u{1F4DD}',
    title: 'Essay prompt \u2192 passable 5-page essay in 30 seconds',
    description: 'Paste a typical essay prompt into ChatGPT and it produces a coherent, cited (though sometimes fabricated) essay that would pass most rubrics.',
  },
  {
    icon: '\u{1F9EE}',
    title: 'Problem set \u2192 8 of 10 solved correctly with shown work',
    description: 'AI solves most undergraduate-level math, physics, and CS problems, showing intermediate steps that look like student work.',
  },
  {
    icon: '\u{1F4AC}',
    title: 'Discussion post \u2192 indistinguishable from student writing',
    description: 'AI generates thoughtful-sounding responses to discussion prompts that peers and instructors often cannot distinguish from genuine student contributions.',
  },
]

export default function StanceAssessment({ questions, onComplete, onCancel }: StanceAssessmentProps) {
  const [phase, setPhase] = useState<Phase>('questions')
  const [disciplineFamily, setDisciplineFamily] = useState<DisciplineFamily | null>(null)
  const [primerOpen, setPrimerOpen] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [responses, setResponses] = useState<Record<string, { value: number; label: string }>>({})
  const [reflectionNote, setReflectionNote] = useState('')

  const question = questions[currentQ]
  const selectedForCurrent = responses[question?.id]
  const allAnswered = questions.every(q => responses[q.id])
  const totalSteps = questions.length + 1 // questions + reflection
  const progressStep = phase === 'questions' ? currentQ : totalSteps - 1

  function handleSelect(questionId: string, value: number, label: string) {
    setResponses(prev => ({ ...prev, [questionId]: { value, label } }))
  }

  function isSelectedOption(opt: { label: string; value: number }) {
    return selectedForCurrent?.value === opt.value && selectedForCurrent?.label === opt.label
  }

  function handleNext() {
    if (phase === 'questions') {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1)
      } else {
        setPhase('reflection')
      }
    }
  }

  function handleBack() {
    if (phase === 'reflection') {
      setPhase('questions')
      setCurrentQ(questions.length - 1)
    } else if (currentQ > 0) {
      setCurrentQ(prev => prev - 1)
    }
  }

  function handleSubmit() {
    const formatted = questions.map(q => ({
      questionId: q.id,
      selectedValue: responses[q.id].value,
      optionLabel: responses[q.id].label,
    }))
    onComplete(formatted, disciplineFamily ?? undefined, reflectionNote || undefined)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Single progress bar — no dots, no percentage */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">
            {phase === 'questions' ? `Question ${currentQ + 1} of ${questions.length}` : 'Almost done'}
          </span>
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0033A0] rounded-full transition-all duration-300"
            style={{ width: `${((progressStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      {phase === 'questions' && question && (
        <div className="space-y-5">
          {/* Discipline picker on first question only — inline, compact */}
          {currentQ === 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Your field:</span>
              {DISCIPLINE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDisciplineFamily(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                    disciplineFamily === opt.value
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Disclaimer + AI primer — first question only */}
          {currentQ === 0 && (
            <>
              <p className="text-sm text-muted-foreground italic mb-4">
                Pick the one that resonates most — your result is a spectrum, not a label.
              </p>

              <button
                onClick={() => setPrimerOpen(!primerOpen)}
                className="flex items-center gap-1.5 text-xs text-[#0033A0] hover:text-[#002880] font-medium transition-colors"
              >
                {primerOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                New to AI? See what it can do first
              </button>
              {primerOpen && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">What generative AI can do right now</p>
                  <div className="space-y-2">
                    {PRIMER_EXAMPLES.map((ex, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <span className="text-sm">{ex.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ex.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{ex.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400">These examples reflect capabilities as of early 2026. AI tools continue to improve.</p>
                </div>
              )}
            </>
          )}

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0033A0]">{question.title}</span>
            <h2 className="text-lg font-extrabold text-gray-900 mt-1">{question.prompt}</h2>
          </div>

          {/* Context — compact */}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            <Lightbulb className="size-3.5 mt-0.5 shrink-0" />
            <span>{question.context}</span>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(question.id, opt.value, opt.label)}
                title={opt.isUnsure ? "This maps to a neutral position and won't skew your result." : undefined}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                  isSelectedOption(opt)
                    ? 'border-[#0033A0] bg-blue-50 text-[#0033A0] font-medium'
                    : opt.isUnsure
                      ? 'border-gray-200 bg-muted/50 text-gray-500 italic hover:border-gray-300'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Nav */}
          <div className="flex justify-between pt-2">
            <button
              onClick={handleBack}
              disabled={currentQ === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-0"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            <button
              onClick={handleNext}
              disabled={!selectedForCurrent}
              className="flex items-center gap-1 px-5 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-30"
            >
              {currentQ < questions.length - 1 ? 'Next' : 'Almost done'}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reflection — optional, minimal */}
      {phase === 'reflection' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Any thoughts to capture?</h2>
            <p className="text-xs text-gray-500 mt-1">Optional. This is private and helps you track your thinking over time.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reflection <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reflectionNote}
              onChange={e => setReflectionNote(e.target.value)}
              placeholder="e.g., I worry about students losing the ability to construct arguments on their own, but I also see potential for..."
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-between">
            <button onClick={handleBack} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="size-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-6 py-2.5 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-30"
            >
              See My Results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
