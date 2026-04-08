'use client'

import { useState } from 'react'
import { GitBranch, ArrowRight, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { CrossCourseResource } from '../../lib/concept-bridge/types'

interface BridgeRecommendation {
  id: string
  concept: string
  courseId: string
  resources: CrossCourseResource[]
  status: string
  createdAt: string
}

interface Props {
  recommendation: BridgeRecommendation
  onDismiss: (id: string) => void
}

export default function BridgeNudgeCard({ recommendation, onDismiss }: Props) {
  const { currentUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)

  async function handleFeedback(helpful: boolean) {
    try {
      await apiFetch(currentUser.email, `/api/concept-bridge/recommendations/${recommendation.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ helpful }),
      })
      setFeedbackGiven(true)
    } catch {
      // Silently fail — feedback is non-critical
    }
  }

  async function handleDismiss() {
    setDismissed(true)
    try {
      await apiFetch(currentUser.email, `/api/concept-bridge/recommendations/${recommendation.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ helpful: false, actedOn: 'dismissed' }),
      })
    } catch {
      // Silently fail
    }
    onDismiss(recommendation.id)
  }

  if (dismissed) return null

  const topResources = recommendation.resources.slice(0, 3)
  const flashcards = topResources.find(r => r.type === 'flashcards')
  const experts = topResources.find(r => r.type === 'peer-experts')
  const groups = topResources.find(r => r.type === 'study-groups')

  return (
    <div className="border rounded-2xl shadow-sm p-5 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#0033A0]/10 rounded-xl">
            <GitBranch className="size-5 text-[#0033A0]" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm">Concept Bridge</h3>
            <p className="text-xs text-gray-500">Cross-course help available</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          title="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-3 text-sm text-gray-700">
        Struggling with <span className="font-semibold">&quot;{recommendation.concept}&quot;</span>?
        Help is available from other courses.
      </p>

      <div className="mt-3 space-y-2">
        {flashcards && (
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
              Flashcards
            </span>
            <span className="text-gray-600">{flashcards.reason}</span>
          </div>
        )}
        {experts && (
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
              Peer Experts
            </span>
            <span className="text-gray-600">{experts.reason}</span>
          </div>
        )}
        {groups && (
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 bg-blue-50 text-[#0033A0] rounded-full text-xs font-medium">
              Study Groups
            </span>
            <span className="text-gray-600">{groups.reason}</span>
          </div>
        )}
      </div>

      {!feedbackGiven ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => handleFeedback(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors"
          >
            Get Help <ArrowRight className="size-3.5" />
          </button>
          <button
            onClick={() => handleFeedback(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Not helpful"
          >
            <ThumbsDown className="size-4" />
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
          <ThumbsUp className="size-4" />
          <span>Thanks for the feedback!</span>
        </div>
      )}
    </div>
  )
}
