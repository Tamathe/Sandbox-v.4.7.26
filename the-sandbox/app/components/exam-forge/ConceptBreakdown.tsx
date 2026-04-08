'use client'

import dynamic from 'next/dynamic'

const ConceptBreakdownChart = dynamic(
  () => import('./ConceptBreakdownChart').then(m => m.ConceptBreakdownChart),
  { ssr: false, loading: () => <div className="h-[120px] animate-pulse rounded-xl bg-gray-100" /> }
)

interface ConceptBreakdownProps {
  questionResults: {
    questionId: string
    correct: boolean
    score: number
  }[]
  questions: {
    id: string
    concept: string
  }[]
}

export default function ConceptBreakdown({ questionResults, questions }: ConceptBreakdownProps) {
  // Aggregate scores per concept
  const conceptScores = new Map<string, { total: number; count: number }>()
  for (const q of questions) {
    const result = questionResults.find((r) => r.questionId === q.id)
    if (result) {
      const existing = conceptScores.get(q.concept) ?? { total: 0, count: 0 }
      existing.total += result.score
      existing.count += 1
      conceptScores.set(q.concept, existing)
    }
  }

  const data = [...conceptScores.entries()]
    .map(([concept, scores]) => ({
      concept: concept.replace(/-/g, ' '),
      score: Math.round((scores.total / scores.count) * 100),
    }))
    .sort((a, b) => a.score - b.score)

  if (data.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-900">Concept Breakdown</h3>
      <ConceptBreakdownChart data={data} />
    </div>
  )
}
