'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import NarrativeEditor from '../../components/accreditation/NarrativeEditor'
import { useAccreditationStandards } from '../../hooks/useAccreditationStandards'

interface Standard {
  id: string
  standardNumber: string
  standardTitle: string
  narratives: { status: string }[]
}

export default function NarrativesWorkbenchPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const { standards: rawStandards, loading } = useAccreditationStandards()
  const standards = rawStandards as unknown as Standard[]

  if (!currentUser || currentUser.role !== 'ADMIN') {
    if (typeof window !== 'undefined') router.push('/')
    return null
  }

  const statusOrder = ['NOT_STARTED', 'AI_DRAFT', 'IN_REVIEW', 'REVISION_NEEDED', 'APPROVED', 'FINAL']

  const sorted = [...standards].sort((a, b) => {
    const aStatus = a.narratives?.[0]?.status ?? 'NOT_STARTED'
    const bStatus = b.narratives?.[0]?.status ?? 'NOT_STARTED'
    return statusOrder.indexOf(aStatus) - statusOrder.indexOf(bStatus)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Narrative Workbench"
        subtitle="AI-drafted compliance narratives — generate, review, approve, finalize"
        action={
          <Link href="/accreditation" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-32 bg-gray-100 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status summary */}
            <div className="flex flex-wrap gap-3">
              {statusOrder.map(status => {
                const count = sorted.filter(s => (s.narratives?.[0]?.status ?? 'NOT_STARTED') === status).length
                if (count === 0) return null
                return (
                  <span key={status} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {status.replace(/_/g, ' ')}: {count}
                  </span>
                )
              })}
            </div>

            {/* Narrative editors */}
            {sorted.map(s => (
              <NarrativeEditor
                key={s.id}
                standardId={s.id}
                standardNumber={s.standardNumber}
                standardTitle={s.standardTitle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
