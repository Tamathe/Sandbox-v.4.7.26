'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PlusCircle, Trophy } from 'lucide-react'

import { useAuth } from '../../lib/auth-context'
import { LeagueCreateModal } from './LeagueCreateModal'
import { LeagueCycleCard } from './LeagueCycleCard'
import { LeagueFeed } from './LeagueFeed'
import { LeagueHeader } from './LeagueHeader'
import { LeagueJoinCard } from './LeagueJoinCard'
import { LeagueLeaderboard } from './LeagueLeaderboard'
import type { LeagueDetail, LeaguePageMeta, LeagueSummary } from './types'

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed')
  }

  return data as T
}

export function LeagueShell({ meta }: { meta: LeaguePageMeta }) {
  const { currentUser } = useAuth()
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-demo-user-email': currentUser.email,
    }),
    [currentUser.email]
  )

  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [leagueDetail, setLeagueDetail] = useState<LeagueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [digestBusy, setDigestBusy] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCycleModal, setShowCycleModal] = useState(false)

  const fetchLeagueList = useCallback(async () => {
    const response = await fetch(`/api/leagues?kind=${meta.kind}`, { headers })
    const data = await parseResponse<{ leagues: LeagueSummary[] }>(response)
    setLeagues(data.leagues)
    if (!selectedLeagueId && data.leagues[0]) {
      setSelectedLeagueId(data.leagues[0].id)
    }
    if (selectedLeagueId && !data.leagues.some((league) => league.id === selectedLeagueId)) {
      setSelectedLeagueId(data.leagues[0]?.id ?? null)
    }
  }, [headers, meta.kind, selectedLeagueId])

  const fetchLeagueDetail = useCallback(
    async (leagueId: string) => {
      const response = await fetch(`/api/leagues/${leagueId}`, { headers })
      const data = await parseResponse<LeagueDetail>(response)
      setLeagueDetail(data)
    },
    [headers]
  )

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/leagues?kind=${meta.kind}`, { headers })
        const data = await parseResponse<{ leagues: LeagueSummary[] }>(response)
        if (!active) return
        setLeagues(data.leagues)

        const firstLeagueId = selectedLeagueId ?? data.leagues[0]?.id ?? null
        setSelectedLeagueId(firstLeagueId)

        if (firstLeagueId) {
          const detailResponse = await fetch(`/api/leagues/${firstLeagueId}`, { headers })
          const detail = await parseResponse<LeagueDetail>(detailResponse)
          if (!active) return
          setLeagueDetail(detail)
        } else {
          setLeagueDetail(null)
        }
      } catch (caughtError) {
        if (!active) return
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load leagues')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [headers, meta.kind, selectedLeagueId])

  useEffect(() => {
    if (!selectedLeagueId) return
    if (leagueDetail?.id === selectedLeagueId) return

    void fetchLeagueDetail(selectedLeagueId).catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load league')
    })
  }, [fetchLeagueDetail, leagueDetail?.id, selectedLeagueId])

  const activeCycle = useMemo(
    () =>
      leagueDetail?.cycles.find((cycle) => cycle.status === 'OPEN' || cycle.status === 'LOCKED') ??
      leagueDetail?.cycles[0] ??
      null,
    [leagueDetail]
  )

  const isAdmin = leagueDetail?.myMembership?.role === 'OWNER' || leagueDetail?.myMembership?.role === 'ADMIN'

  async function refreshCurrentLeague(leagueId: string) {
    await fetchLeagueList()
    await fetchLeagueDetail(leagueId)
  }

  async function handleCreateLeague(payload: Record<string, unknown>) {
    setBusy(true)
    try {
      const response = await fetch('/api/leagues', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          kind: meta.kind,
          ...payload,
        }),
      })
      const data = await parseResponse<LeagueDetail>(response)
      setSelectedLeagueId(data.id)
      setLeagueDetail(data)
      await fetchLeagueList()
    } finally {
      setBusy(false)
    }
  }

  async function handleJoinLeague(payload: { joinCode: string; emailForDigest?: string }) {
    setBusy(true)
    try {
      const response = await fetch('/api/leagues/join', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await parseResponse<LeagueDetail>(response)
      setSelectedLeagueId(data.id)
      setLeagueDetail(data)
      await fetchLeagueList()
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateCycle(payload: Record<string, unknown>) {
    if (!leagueDetail) return
    setBusy(true)
    try {
      const response = await fetch(`/api/leagues/${leagueDetail.id}/cycles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await parseResponse<LeagueDetail>(response)
      setLeagueDetail(data)
      await fetchLeagueList()
    } finally {
      setBusy(false)
    }
  }

  async function handleStatusAction(action: 'pause' | 'activate' | 'archive') {
    if (!leagueDetail) return
    setBusy(true)
    try {
      const response = await fetch(`/api/leagues/${leagueDetail.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action }),
      })
      const data = await parseResponse<LeagueDetail>(response)
      setLeagueDetail(data)
      await fetchLeagueList()
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleDigest(nextValue: boolean) {
    if (!leagueDetail) return
    setDigestBusy(true)
    try {
      const response = await fetch(`/api/leagues/${leagueDetail.id}/subscribe`, {
        method: nextValue ? 'POST' : 'DELETE',
        headers,
        body: nextValue ? JSON.stringify({ email: currentUser.email }) : undefined,
      })
      await parseResponse(response)
      await refreshCurrentLeague(leagueDetail.id)
    } finally {
      setDigestBusy(false)
    }
  }

  async function handleCycleSubmit(payload: Record<string, unknown>) {
    if (!leagueDetail || !activeCycle) return
    setBusy(true)
    try {
      const response = await fetch(
        `/api/leagues/${leagueDetail.id}/cycles/${activeCycle.id}/submit`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      )
      const data = await parseResponse<LeagueDetail>(response)
      setLeagueDetail(data)
      await fetchLeagueList()
    } finally {
      setBusy(false)
    }
  }

  async function handleCycleResolve(payload: Record<string, unknown>) {
    if (!leagueDetail || !activeCycle) return
    setBusy(true)
    try {
      const response = await fetch(
        `/api/leagues/${leagueDetail.id}/cycles/${activeCycle.id}/resolve`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      )
      const data = await parseResponse<LeagueDetail>(response)
      setLeagueDetail(data)
      await fetchLeagueList()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${meta.accentClass} border-b`}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/tools?section=live" className="text-sm font-medium text-blue-100 hover:text-white">
            ← Back to Tools
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-white">{meta.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100">{meta.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0033A0] shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Create League
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4">
          <LeagueJoinCard onJoin={handleJoinLeague} busy={busy} />

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-bold text-gray-900">My Leagues</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-5 py-8 text-sm text-gray-500">Loading...</div>
              ) : leagues.length === 0 ? (
                <div className="px-5 py-8 text-sm text-gray-500">
                  No leagues yet. Create one or join with a code.
                </div>
              ) : (
                leagues.map((league) => (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => setSelectedLeagueId(league.id)}
                    className={`w-full px-5 py-4 text-left transition ${
                      selectedLeagueId === league.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{league.name}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {league.memberCount} member{league.memberCount === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {league.myStanding?.rank ? `#${league.myStanding.rank}` : 'New'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!leagueDetail ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <Trophy className="mx-auto h-10 w-10 text-gray-300" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">Start the loop</h2>
              <p className="mt-2 text-sm text-gray-500">
                Create a league, share a join code, score a cycle, watch the leaderboard move, then let Monday email do the rest.
              </p>
            </div>
          ) : (
            <>
              <LeagueHeader
                league={leagueDetail}
                isAdmin={Boolean(isAdmin)}
                digestBusy={digestBusy}
                onToggleDigest={handleToggleDigest}
                onCopyJoinCode={() => {
                  if (leagueDetail.joinCode) {
                    navigator.clipboard.writeText(leagueDetail.joinCode)
                  }
                }}
                onCreateCycle={() => setShowCycleModal(true)}
                onStatusAction={handleStatusAction}
              />

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                  {activeCycle ? (
                    <LeagueCycleCard
                      league={leagueDetail}
                      cycle={activeCycle}
                      actionBusy={busy}
                      onSubmit={handleCycleSubmit}
                      onResolve={handleCycleResolve}
                    />
                  ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-8 text-sm text-gray-500 shadow-sm">
                      No cycle is open yet. {isAdmin ? 'Use "Open Next Cycle" to start one.' : 'Check back when the host opens one.'}
                    </div>
                  )}

                  <LeagueFeed events={leagueDetail.events} />
                </div>

                <LeagueLeaderboard standings={leagueDetail.standings} />
              </div>
            </>
          )}
        </main>
      </div>

      {showCreateModal ? (
        <LeagueCreateModal
          kind={meta.kind}
          mode="league"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateLeague}
          busy={busy}
        />
      ) : null}

      {showCycleModal && leagueDetail ? (
        <LeagueCreateModal
          kind={meta.kind}
          mode="cycle"
          onClose={() => setShowCycleModal(false)}
          onSubmit={handleCreateCycle}
          busy={busy}
        />
      ) : null}
    </div>
  )
}
