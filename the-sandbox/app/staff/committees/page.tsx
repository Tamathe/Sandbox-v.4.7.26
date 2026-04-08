'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, RefreshCw, Info, ListChecks, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import CommitteeCard, { type CommitteeOverview } from '../../components/staff/committees/CommitteeCard'
import CommitteeActionItemsList, { type CommitteeActionItem } from '../../components/staff/committees/CommitteeActionItemsList'

type PageTab = 'committees' | 'my-actions'

interface MyActionsGroup {
  id: string
  name: string
  items: CommitteeActionItem[]
}

export default function CommitteesPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<PageTab>('committees')
  const [committees, setCommittees] = useState<CommitteeOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [myActions, setMyActions] = useState<MyActionsGroup[]>([])
  const [myActionsCount, setMyActionsCount] = useState(0)
  const [loadingActions, setLoadingActions] = useState(false)

  const fetchCommittees = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/staff/committees', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error('Failed to load committees')
      const data = await res.json() as { committees: CommitteeOverview[] }
      setCommittees(data.committees ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load committees')
    }
    setLoading(false)
  }, [currentUser?.email])

  const fetchMyActions = useCallback(async () => {
    setLoadingActions(true)
    try {
      const res = await fetch('/api/staff/committees/my-actions', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { committees: MyActionsGroup[]; totalCount: number }
        setMyActions(data.committees ?? [])
        setMyActionsCount(data.totalCount ?? 0)
      }
    } catch { /* ignore */ }
    setLoadingActions(false)
  }, [currentUser.email])

  useEffect(() => { void fetchCommittees() }, [fetchCommittees])

  // Fetch action count on mount for the badge
  useEffect(() => { void fetchMyActions() }, [fetchMyActions])

  // Refetch when switching to my-actions tab
  useEffect(() => {
    if (activeTab === 'my-actions') void fetchMyActions()
  }, [activeTab, fetchMyActions])

  const handleView = (id: string) => {
    router.push(`/staff/committees/${id}`)
  }

  const handleGenerateMinutes = (id: string) => {
    router.push(`/staff/committees/${id}?tab=generate`)
  }

  const handleStartMeeting = (id: string) => {
    router.push(`/staff/committees/${id}?tab=live-meeting`)
  }

  const tabs: { key: PageTab; label: string; count?: number }[] = [
    { key: 'committees', label: 'Committees' },
    { key: 'my-actions', label: 'My Actions', count: myActionsCount },
  ]

  if (currentUser.role !== 'STAFF' && currentUser.role !== 'ADMIN') {
    router.replace('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Committees & Minutes"
        subtitle="Manage your committees, generate AI-powered meeting minutes, and track action items."
        action={
          <button
            onClick={() => {
              if (activeTab === 'committees') void fetchCommittees()
              else void fetchMyActions()
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simulated data banner */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <Info className="size-4 shrink-0" />
          <span><strong>Simulated data</strong> — Committees and past meeting minutes are seeded demo data.</span>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-[#0033A0] text-[#0033A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[#0033A0] text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Committees tab */}
        {activeTab === 'committees' && (
          <>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse border-2 border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-5 bg-gray-200 rounded" />
                      <div className="h-5 bg-gray-200 rounded w-2/3" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 rounded-lg w-16" />
                      <div className="h-8 bg-gray-200 rounded-lg w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-sm text-red-600 font-medium">{error}</p>
                <button
                  onClick={() => void fetchCommittees()}
                  className="mt-2 text-xs text-[#0033A0] font-medium hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : committees.length === 0 ? (
              <div className="text-center py-16">
                <Users className="size-12 text-gray-300 mx-auto mb-3" />
                <h2 className="text-lg font-extrabold text-gray-700">No committees yet</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Committees will appear here once seeded or created.
                </p>
                <button
                  onClick={() => {
                    void fetch('/api/staff/committees/seed', {
                      method: 'POST',
                      headers: { 'x-demo-user-email': currentUser.email },
                    }).then(() => fetchCommittees())
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#0033A0] text-white hover:bg-[#002580] transition-colors"
                >
                  Seed Demo Data
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {committees.map((c) => (
                  <CommitteeCard
                    key={c.id}
                    committee={c}
                    onView={handleView}
                    onGenerateMinutes={handleGenerateMinutes}
                    onStartMeeting={handleStartMeeting}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* My Actions tab */}
        {activeTab === 'my-actions' && (
          <>
            {loadingActions ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse border rounded-2xl shadow-sm p-5">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : myActions.length === 0 ? (
              <div className="text-center py-16">
                <ListChecks className="size-12 text-gray-300 mx-auto mb-3" />
                <h2 className="text-lg font-extrabold text-gray-700">No open action items</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Action items assigned to you will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {myActions.map((group) => (
                  <div key={group.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <Link
                        href={`/staff/committees/${group.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#0033A0] hover:underline"
                      >
                        <LinkIcon className="size-3.5" />
                        {group.name}
                        <span className="text-xs font-normal text-gray-400">
                          ({group.items.length} item{group.items.length !== 1 ? 's' : ''})
                        </span>
                      </Link>
                    </div>
                    <div className="p-4">
                      <CommitteeActionItemsList
                        items={group.items}
                        onToggleComplete={() => {}}
                        onUpdateNotes={() => {}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
