'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import PageHeader from '../../../components/PageHeader'
import EvidenceTable from '../../../components/accreditation/EvidenceTable'
import GapList from '../../../components/accreditation/GapList'
import NarrativeEditor from '../../../components/accreditation/NarrativeEditor'

export default function StandardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUser } = useAuth()
  const router = useRouter()
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'evidence' | 'gaps' | 'narrative'>('evidence')

  useEffect(() => {
    if (!currentUser) return
    apiFetch<Record<string, unknown>>(currentUser.email, `/api/accreditation/standards/${id}`)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [id, currentUser])

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF')) {
    if (typeof window !== 'undefined') router.push('/')
    return null
  }

  const d = detail as { standardNumber: string; standardTitle: string } | null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={d ? `Standard ${d.standardNumber}` : 'Standard Detail'}
        subtitle={d?.standardTitle ?? 'Loading...'}
        action={
          <Link href="/accreditation" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="animate-pulse h-48 bg-gray-100 rounded-2xl" />
        ) : (
          <div className="space-y-6">
            {/* Tab nav */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['evidence', 'gaps', 'narrative'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'evidence' && <EvidenceTable standardId={id} />}
            {activeTab === 'gaps' && <GapList standardId={id} />}
            {activeTab === 'narrative' && d && (
              <NarrativeEditor
                standardId={id}
                standardNumber={d.standardNumber}
                standardTitle={d.standardTitle}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
