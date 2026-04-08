'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import PageHeader from '../../components/PageHeader'
import PeerReviewPrepPanel from '../../components/accreditation/PeerReviewPrepPanel'
import type { PeerReviewQuestion } from '../../lib/accreditation/types'

export default function PeerReviewPrepPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [questions, setQuestions] = useState<PeerReviewQuestion[]>([])
  const [loading, setLoading] = useState(false)

  if (!currentUser || currentUser.role !== 'ADMIN') {
    if (typeof window !== 'undefined') router.push('/')
    return null
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ questions: PeerReviewQuestion[] }>(currentUser.email, '/api/accreditation/peer-review-prep', { method: 'POST' })
      setQuestions(data.questions ?? [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Peer Review Preparation"
        subtitle="AI-simulated peer reviewer questions based on your current compliance state"
        action={
          <div className="flex items-center gap-3">
            <Link href="/accreditation" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#002880] disabled:opacity-50"
            >
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
              {loading ? 'Generating...' : 'Generate Questions'}
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PeerReviewPrepPanel questions={questions} loading={loading} />
      </div>
    </div>
  )
}
