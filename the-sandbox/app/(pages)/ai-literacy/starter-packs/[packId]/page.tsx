'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import PackPreview from '../../../../components/ai-literacy/PackPreview'
import ImplementationTracker from '../../../../components/ai-literacy/ImplementationTracker'

type PackStatus = 'DRAFT' | 'READY' | 'ADOPTED' | 'IN_PROGRESS' | 'COMPLETED'

interface Pack {
  id: string
  name: string
  disciplineFamily: string
  policyLanguage: string | null
  timelinePlan: { week: number; action: string }[] | null
  status: PackStatus
  courseId: string
  course?: { id: string; courseCode: string; title: string }
  items: PackItem[]
  checkpoints: PackCheckpoint[]
  implementations: Implementation[]
}

interface PackItem {
  id: string
  templateId: string | null
  template: Template | null
  customTitle: string | null
  customDescription: string | null
  customAiLevel: string | null
  customSyllabusLanguage: string | null
  customRubricRows: RubricRow[] | null
  sortOrder: number
  implementation?: Implementation | null
}

interface Template {
  id: string
  title: string
  description: string
  aiTier: string
  aiLevel: string
  syllabusLanguage: string
  rubricRows: RubricRow[]
  implementationNotes: string
  disciplineFamily: string
  assignmentType: string
  tags: string[]
}

interface RubricRow {
  criterion: string
  excellent: string
  proficient: string
  developing: string
  insufficient: string
}

interface PackCheckpoint {
  id: string
  checkpointId: string | null
  checkpoint: { id: string; name: string; description: string; gradingWeight: string } | null
  customName: string | null
  customDescription: string | null
  customWeight: string | null
  sortOrder: number
}

interface Implementation {
  id: string
  itemId: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REFLECTED'
  startedAt: string | null
  completedAt: string | null
  rating: number | null
  reflection: string | null
  wouldRepeat: boolean | null
}

const STATUS_BADGES: Record<PackStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  READY: { label: 'Ready', className: 'bg-blue-100 text-blue-700' },
  ADOPTED: { label: 'Adopted', className: 'bg-indigo-100 text-indigo-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
}

export default function PackDetailPage() {
  const { packId } = useParams<{ packId: string }>()
  const router = useRouter()
  const { currentUser } = useAuth()
  const [pack, setPack] = useState<Pack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPack = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-literacy/starter-packs/${packId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error('Failed to load pack')
      const data = await res.json()
      setPack(data.pack)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [packId, currentUser.email])

  useEffect(() => {
    fetchPack()
  }, [fetchPack])

  const handleAdopt = async () => {
    if (!pack) return
    const res = await fetch(`/api/ai-literacy/starter-packs/${pack.id}/adopt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) {
      await fetchPack()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error || !pack) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error ?? 'Pack not found'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#0033A0] hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const isPreview = pack.status === 'DRAFT' || pack.status === 'READY'
  const badge = STATUS_BADGES[pack.status]
  const courseLabel = pack.course ? `${pack.course.courseCode} — ${pack.course.title}` : ''

  return (
    <div>
      <PageHeader
        title={pack.name}
        subtitle={courseLabel}
        action={
          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${badge.className}`}>
              {badge.label}
            </span>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isPreview ? (
          <PackPreview pack={pack} onAdopt={handleAdopt} onRefresh={fetchPack} />
        ) : (
          <ImplementationTracker pack={pack} onRefresh={fetchPack} />
        )}
      </div>
    </div>
  )
}
