'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, Sparkles } from 'lucide-react'

const STEPS = [
  'Generating persona & voice',
  'Writing system prompt',
  'Configuring experience',
  'Attaching knowledge base',
  'Polishing learning objectives',
  'Deploying to The Sandbox',
]

interface BuildMomentOverlayProps {
  spec: { name: string; toolType: string }
  onComplete: (toolId: string) => void
  sessionId: string
  userEmail: string
  fullSpec: object
}

export default function BuildMomentOverlay({
  spec,
  onComplete,
  sessionId,
  userEmail,
  fullSpec,
}: BuildMomentOverlayProps) {
  const [completedSteps, setCompletedSteps] = useState<number>(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Advance steps visually
    let step = 0
    const advance = () => {
      step++
      setCompletedSteps(step)
      if (step < STEPS.length) {
        setTimeout(advance, 550 + Math.random() * 300)
      }
    }
    setTimeout(advance, 400)

    // Fire the actual publish in parallel
    fetch(`/api/builder/${sessionId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': userEmail,
      },
      body: JSON.stringify({ spec: fullSpec }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.toolId) {
          setTimeout(() => {
            setDone(true)
            setTimeout(() => onComplete(data.toolId), 900)
          }, Math.max(0, STEPS.length * 650 - 200))
        } else {
          setError(data.error || 'Build failed')
        }
      })
      .catch(() => setError('Network error during build'))
  }, [sessionId, userEmail, fullSpec, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0033A0] via-blue-700 to-purple-700 px-8 py-7 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <span className="text-sm font-semibold text-blue-200 uppercase tracking-widest">Publishing</span>
          </div>
          <h2 className="text-2xl font-bold leading-tight">{spec.name || 'Your Tool'}</h2>
          <p className="text-blue-200 text-sm mt-1">{spec.toolType?.replace('_', ' ')} Experience</p>
        </div>

        {/* Steps */}
        <div className="px-8 py-7 space-y-4">
          {STEPS.map((step, i) => {
            const isComplete = i < completedSteps
            const isCurrent = i === completedSteps && !done
            return (
              <div key={step} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {isComplete || done ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-[#0033A0] animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                  )}
                </div>
                <span
                  className={`text-sm transition-colors ${
                    isComplete || done
                      ? 'text-gray-800 font-medium'
                      : isCurrent
                      ? 'text-[#0033A0] font-semibold'
                      : 'text-gray-300'
                  }`}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>

        {done && (
          <div className="px-8 pb-7">
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 font-semibold text-sm">Done! Launching your tool...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="px-8 pb-7">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-red-700 text-sm font-medium">Build failed: {error}</p>
              <p className="text-red-500 text-xs mt-1">Try refreshing and building again.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
