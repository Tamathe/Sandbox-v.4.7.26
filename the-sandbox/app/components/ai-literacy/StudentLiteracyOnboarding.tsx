'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

interface StudentLiteracyOnboardingProps {
  onComplete: () => void
}

const YEAR_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] as const
const USAGE_OPTIONS = [
  { value: 'never', label: 'Never used AI tools' },
  { value: 'casual', label: 'Tried a few times' },
  { value: 'regular', label: 'Use weekly' },
  { value: 'daily', label: 'Use daily' },
] as const

export default function StudentLiteracyOnboarding({ onComplete }: StudentLiteracyOnboardingProps) {
  const [step, setStep] = useState(1)
  const [year, setYear] = useState<string | null>(null)
  const [usage, setUsage] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [comfort, setComfort] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canAdvance =
    (step === 1 && year !== null) ||
    (step === 2 && usage !== null) ||
    (step === 3 && question.trim().length > 0) ||
    (step === 4 && comfort !== null)

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ai-literacy/student/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 4,
          final: true,
          data: { year, usage, question: question.trim(), comfort },
        }),
      })
      onComplete()
    } catch {
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (step < 4) setStep(step + 1)
    else void handleSubmit()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm p-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`size-2.5 rounded-full transition-colors ${
                s === step ? 'bg-blue-600' : s < step ? 'bg-blue-300' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Year */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">What year are you?</h2>
            <p className="text-sm text-gray-500 mb-4">This helps us tailor examples to your level.</p>
            <div className="space-y-2">
              {YEAR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setYear(opt)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    year === opt
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: AI Usage */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">How often do you use AI tools?</h2>
            <p className="text-sm text-gray-500 mb-4">ChatGPT, Copilot, Claude — anything counts.</p>
            <div className="space-y-2">
              {USAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setUsage(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    usage === opt.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Question */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">What&apos;s your biggest question about AI in school?</h2>
            <p className="text-sm text-gray-500 mb-4">No wrong answers — we&apos;ll build on this.</p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. When is it okay to use AI for homework?"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>
        )}

        {/* Step 4: Comfort scale */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">How comfortable are you with AI?</h2>
            <p className="text-sm text-gray-500 mb-4">1 = not at all, 5 = very comfortable.</p>
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setComfort(n)}
                  className={`size-12 rounded-xl border-2 text-sm font-bold transition-colors ${
                    comfort === n
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
              <span>Not at all</span>
              <span>Very comfortable</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance || submitting}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {step === 4 ? (
              <>
                <Sparkles className="size-4" />
                {submitting ? 'Starting...' : 'Get Started'}
              </>
            ) : (
              <>
                Next <ChevronRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
