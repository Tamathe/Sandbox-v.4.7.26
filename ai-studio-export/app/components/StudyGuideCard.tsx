'use client'

import { useMemo, useState } from 'react'
import { FileText, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

interface StudyGuideCardProps {
  courseId?: string
  title?: string
  materials?: Array<{
    id: string
    title: string
    materialType: string
    moduleNumber: number | null
  }>
  onOpenMaterial?: (materialId: string) => void
}

type StudyGuideCitation = {
  materialId: string
  note: string
}

type StudyGuideItem = {
  text: string
  citations: StudyGuideCitation[]
}

type StructuredStudyGuide = {
  strengths: StudyGuideItem[]
  areasForReview: StudyGuideItem[]
  nextSteps: StudyGuideItem[]
}

export default function StudyGuideCard({
  courseId,
  title = 'AI Study Guide',
  materials = [],
  onOpenMaterial,
}: StudyGuideCardProps) {
  const { currentUser } = useAuth()
  const [guide, setGuide] = useState<StructuredStudyGuide | null>(null)
  const [loading, setLoading] = useState(false)
  const materialLookup = useMemo(
    () =>
      new Map(
        materials.map((material) => [
          material.id,
          `${material.moduleNumber ? `Module ${material.moduleNumber}: ` : ''}${material.title}`,
        ])
      ),
    [materials]
  )

  const handleGenerate = async () => {
    setLoading(true)
    setGuide(null)

    try {
      const response = await fetch('/api/study/guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ ...(courseId ? { courseId } : {}) }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate study guide')
      }

      const payload = (await response.json()) as StructuredStudyGuide
      setGuide(payload)
    } catch {
      setGuide({
        strengths: [{ text: 'Your study guide could not be generated right now.', citations: [] }],
        areasForReview: [{ text: 'Try again in a moment.', citations: [] }],
        nextSteps: [{ text: 'Keep using your course tools and library to build a stronger data trail.', citations: [] }],
      })
    } finally {
      setLoading(false)
    }
  }

  const sections: Array<{ title: string; items: StudyGuideItem[] }> = guide
    ? [
        { title: 'Strengths', items: guide.strengths },
        { title: 'Areas for Review', items: guide.areasForReview },
        { title: 'Suggested Next Steps', items: guide.nextSteps },
      ].filter((section) => section.items.length > 0)
    : []

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Sparkles className="h-4 w-4 text-[#0033A0]" />
        <span className="text-sm font-bold text-gray-900">{title}</span>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Generating...' : 'Generate Study Guide'}
        </button>

        {guide ? (
          <div className="mt-4 space-y-4">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                <ul className="mt-3 space-y-3">
                  {section.items.map((item, index) => (
                    <li key={`${section.title}-${index}`} className="text-sm text-gray-700">
                      <div className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0033A0]" />
                        <div className="min-w-0">
                          <p className="leading-relaxed">{item.text}</p>
                          {item.citations.length > 0 && onOpenMaterial ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.citations.map((citation) => {
                                const label = materialLookup.get(citation.materialId)
                                if (!label) return null

                                return (
                                  <button
                                    key={`${citation.materialId}-${citation.note}`}
                                    type="button"
                                    onClick={() => onOpenMaterial(citation.materialId)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-[#0033A0] transition-colors hover:border-[#0033A0] hover:bg-blue-50"
                                    title={citation.note}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    {label}
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Get a quick AI summary of your strengths, review areas, and next best tool moves.
          </p>
        )}

        <div className="mt-4 text-[11px] font-medium text-gray-400">
          Powered by Claude AI
        </div>
      </div>
    </div>
  )
}
