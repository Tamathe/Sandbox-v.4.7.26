'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../lib/auth-context'
import { PetitionStatusTracker } from '../components/registrar/PetitionStatusTracker'
import { PETITION_TYPE_LABELS } from '../lib/registrar/types'
import { HumanEscalationFooter } from '../components/registrar/HumanEscalationFooter'
import { Plus, FileText } from 'lucide-react'
import PageHeader from '../components/PageHeader'

interface Petition {
  id: string
  type: string
  status: string
  submittedAt: string
  decision: string | null
  decisionReason: string | null
}

export default function PetitionsPage() {
  const { currentUser } = useAuth()
  const [petitions, setPetitions] = useState<Petition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/petitions', { headers: { 'x-demo-user-email': currentUser.email } })
        if (res.ok) setPetitions((await res.json()).petitions)
      } catch {}
      setLoading(false)
    }
    void fetch_()
  }, [currentUser.email])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="My Petitions"
        subtitle="Track and manage your academic petitions"
        action={
          <Link
            href="/petitions/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002580]"
          >
            <Plus className="size-4" />
            New Petition
          </Link>
        }
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading your petitions…</div>
        ) : petitions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200">
            <FileText className="size-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No petitions submitted yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Submit a petition to request a change to your academic record
            </p>
            <Link
              href="/petitions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002580]"
            >
              <Plus className="size-4" />
              Submit Your First Petition
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {petitions.map((petition) => (
              <div key={petition.id} className="bg-white rounded-2xl border-2 border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {PETITION_TYPE_LABELS[petition.type] ?? petition.type}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(petition.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {petition.status === 'WITHDRAWN' && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Withdrawn</span>
                  )}
                </div>

                <PetitionStatusTracker status={petition.status as never} />

                {petition.decision && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${
                    petition.decision === 'APPROVED' || petition.decision === 'APPROVED_WITH_CONDITIONS'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : petition.decision === 'DENIED'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    <strong>{petition.decision.replace(/_/g, ' ')}</strong>
                    {petition.decisionReason && <p className="mt-1">{petition.decisionReason}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <HumanEscalationFooter
            message="Questions about your petition status? Contact the Registrar's Office directly."
            ctaText="Registrar's Office Contact"
          />
        </div>
      </div>
    </div>
  )
}
