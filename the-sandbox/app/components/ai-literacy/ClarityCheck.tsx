'use client'

import { useState, useCallback } from 'react'
import { HelpCircle, Check, X, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface ClarityQuestion {
  question: string
  correctAnswer: 'yes' | 'no' | 'depends'
  explanation: string
}

interface ClarityCheckProps {
  courseId: string
  policyId: string
  onComplete?: (score: number) => void
}

export default function ClarityCheck({ courseId, policyId, onComplete }: ClarityCheckProps) {
  const { currentUser } = useAuth()
  const [phase, setPhase] = useState<'prompt' | 'loading' | 'quiz' | 'results'>('prompt')
  const [questions, setQuestions] = useState<ClarityQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [result, setResult] = useState<{ score: number; correct: number; total: number; feedback: { question: string; yourAnswer: string; correct: boolean; explanation: string }[] } | null>(null)

  const loadQuestions = useCallback(async () => {
    setPhase('loading')
    try {
      const res = await fetch(`/api/ai-literacy/clarity-check?policyId=${policyId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setQuestions(data.questions)
      setPhase('quiz')
    } catch {
      setPhase('prompt')
    }
  }, [policyId, currentUser.email])

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      void submitAnswers(newAnswers)
    }
  }

  const submitAnswers = async (finalAnswers: string[]) => {
    setPhase('loading')
    const responses = questions.map((q, i) => ({
      question: q.question,
      answer: finalAnswers[i],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }))

    try {
      const res = await fetch('/api/ai-literacy/clarity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ courseId, policyId, responses }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setResult(data)
      setPhase('results')
      onComplete?.(data.score)
    } catch {
      setPhase('prompt')
    }
  }

  if (phase === 'prompt') {
    return (
      <button
        onClick={loadQuestions}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
      >
        <HelpCircle className="size-4" />
        Test Your Understanding
      </button>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </div>
    )
  }

  if (phase === 'quiz' && questions[currentQ]) {
    const q = questions[currentQ]
    return (
      <div className="border rounded-2xl p-5 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">Question {currentQ + 1} of {questions.length}</span>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`size-2 rounded-full ${i < currentQ ? 'bg-[#0033A0]' : i === currentQ ? 'bg-[#0033A0]/50' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <p className="text-sm font-medium text-gray-900 mb-4">{q.question}</p>

        <div className="flex gap-2">
          {['yes', 'no', 'depends'].map(opt => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors capitalize"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'results' && result) {
    return (
      <div className="border rounded-2xl p-5 bg-white shadow-sm space-y-4">
        <div className="text-center">
          <p className={`text-2xl font-extrabold ${result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
            {result.score}%
          </p>
          <p className="text-sm text-gray-600">{result.correct} of {result.total} correct</p>
        </div>

        <div className="space-y-2">
          {result.feedback.map((f, i) => (
            <div key={i} className={`p-3 rounded-lg text-xs ${f.correct ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-start gap-2">
                {f.correct ? <Check className="size-3.5 text-green-600 mt-0.5 shrink-0" /> : <X className="size-3.5 text-red-600 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-medium text-gray-900">{f.question}</p>
                  <p className="text-gray-600 mt-0.5">
                    {!f.correct && <span>You answered &quot;{f.yourAnswer}&quot;. </span>}
                    {f.explanation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
