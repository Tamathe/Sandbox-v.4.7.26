'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../../../../lib/auth-context'
import { apiFetch } from '../../../../../lib/api-client'
import type { ConceptDifficulty } from '../../../../../lib/classroom-intelligence/types'
import ConceptDetailPanel from '../../../../../components/classroom-intelligence/ConceptDetailPanel'
import InsightCardList from '../../../../../components/classroom-intelligence/InsightCardList'
import InterventionTimeline from '../../../../../components/classroom-intelligence/InterventionTimeline'
import LoadingSpinner from '../../../../../components/LoadingSpinner'
import ErrorBanner from '../../../../../components/ErrorBanner'

interface Intervention {
  id: string
  approach: string
  description: string
  targetConcepts: string[]
  createdAt: string
  status: string
}

export default function ConceptDeepDivePage() {
  const params = useParams()
  const courseId = params?.courseId as string
  const concept = decodeURIComponent(params?.concept as string)
  const { currentUser } = useAuth()
  const email = currentUser?.email ?? ''

  const [conceptData, setConceptData] = useState<ConceptDifficulty | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConcept = useCallback(async () => {
    if (!email || !courseId || !concept) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<ConceptDifficulty[]>(
        email,
        `/api/classroom-intelligence/concepts?courseId=${courseId}`,
      )
      const match = data.find((c) => c.concept === concept || c.conceptLabel === concept)
      setConceptData(match ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concept data')
    } finally {
      setLoading(false)
    }
  }, [email, courseId, concept])

  useEffect(() => {
    fetchConcept()
  }, [fetchConcept])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <Link href="/analytics/teaching" className="hover:text-[#0033A0] transition-colors">
          Teaching Intelligence
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-gray-400">Course</span>
        <ChevronRight className="size-3.5" />
        <span className="font-semibold text-gray-900">{concept}</span>
      </nav>

      <Link
        href="/analytics/teaching"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] hover:underline mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Teaching Intelligence
      </Link>

      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {!loading && !error && (
        <div className="space-y-8">
          {/* Concept detail — rendered inline, not as overlay */}
          {conceptData ? (
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              <ConceptDetailPanel
                concept={conceptData}
                onClose={() => {}}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 text-center text-gray-500">
              <p className="text-sm">No data found for concept &ldquo;{concept}&rdquo;.</p>
            </div>
          )}

          {/* Related interventions */}
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">Related Interventions</h2>
            <InterventionTimeline courseId={courseId} />
          </div>

          {/* Related insights */}
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">Related Insights</h2>
            <InsightCardList courseId={courseId} />
          </div>
        </div>
      )}
    </div>
  )
}
