'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bot, Loader2, Plus, Search } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import AgentProfileCard from '../../components/agent/AgentProfileCard'
import { SkeletonCard } from '../../components/ui/SkeletonCard'
import { useAgentProfiles, type AgentProfileSummary } from '../../hooks/useAgentProfiles'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import { AGENT_CATEGORIES } from '../../lib/agent/agent-profile-constants'

interface ProfilesResponse {
  profiles: AgentProfileSummary[]
  total: number
}

function buildProfilesPath(
  visibility: 'institutional' | 'shared',
  search: string,
  category: string,
): string {
  const params = new URLSearchParams({ visibility, limit: '24' })
  if (search.trim()) params.set('search', search.trim())
  if (category !== 'ALL') params.set('category', category)
  return `/api/agent/profiles?${params.toString()}`
}

function Section({
  title,
  subtitle,
  loading,
  profiles,
  emptyMessage,
  renderCard,
}: {
  title: string
  subtitle: string
  loading: boolean
  profiles: AgentProfileSummary[]
  emptyMessage: string
  renderCard: (profile: AgentProfileSummary) => ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} className="h-[228px]" />
          ))}
        </div>
      ) : profiles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => renderCard(profile))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      )}
    </section>
  )
}

export default function AgentBrowsePage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const {
    activeProfileId,
    favorites,
    myProfiles,
    loading: hookLoading,
    setActiveProfileId,
    toggleFavorite,
    forkProfile,
  } = useAgentProfiles()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string>('ALL')
  const [institutionalProfiles, setInstitutionalProfiles] = useState<AgentProfileSummary[]>([])
  const [popularProfiles, setPopularProfiles] = useState<AgentProfileSummary[]>([])
  const [marketLoading, setMarketLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()

    async function loadMarketplace() {
      setMarketLoading(true)

      try {
        const [institutionalResult, sharedResult] = await Promise.all([
          apiFetch<ProfilesResponse>(
            currentUser.email,
            buildProfilesPath('institutional', debouncedSearch, category),
            { signal: controller.signal },
          ),
          apiFetch<ProfilesResponse>(
            currentUser.email,
            buildProfilesPath('shared', debouncedSearch, category),
            { signal: controller.signal },
          ),
        ])

        if (controller.signal.aborted) return

        setInstitutionalProfiles(institutionalResult.profiles ?? [])
        setPopularProfiles(
          [...(sharedResult.profiles ?? [])].sort((a, b) => {
            if (b.useCount !== a.useCount) return b.useCount - a.useCount
            return b.forkCount - a.forkCount
          }),
        )
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setInstitutionalProfiles([])
          setPopularProfiles([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setMarketLoading(false)
        }
      }
    }

    void loadMarketplace()
    return () => controller.abort()
  }, [category, currentUser.email, debouncedSearch, reloadToken])

  const favoriteIds = useMemo(() => new Set(favorites.map((profile) => profile.id)), [favorites])

  const filteredMyProfiles = useMemo(() => {
    return myProfiles.filter((profile) => {
      if (profile.visibility === 'INSTITUTIONAL') return false
      const matchesCategory = category === 'ALL' || profile.category === category
      const matchesSearch = !debouncedSearch.trim() || `${profile.name} ${profile.description}`.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [category, debouncedSearch, myProfiles])

  const handleFork = useCallback(async (profileId: string) => {
    await forkProfile(profileId)
    setReloadToken((value) => value + 1)
  }, [forkProfile])

  const renderCard = useCallback((profile: AgentProfileSummary) => (
    <AgentProfileCard
      key={profile.id}
      profile={profile}
      isOwner={profile.creatorId === currentUser.id}
      isFavorited={favoriteIds.has(profile.id)}
      isActive={profile.id === activeProfileId}
      onActivate={setActiveProfileId}
      onFork={(id) => void handleFork(id)}
      onEdit={(id) => router.push(`/agents/build?profileId=${id}`)}
      onToggleFavorite={(id) => void toggleFavorite(id)}
    />
  ), [activeProfileId, currentUser.id, favoriteIds, handleFork, router, setActiveProfileId, toggleFavorite])

  return (
    <>
      <PageHeader
        title="Agent Marketplace"
        subtitle="Browse institutional agents, activate a favorite, or fork one into your own private workspace."
        action={(
          <Link
            href="/agents/build"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00297f]"
          >
            <Plus className="size-4" />
            Build Agent
          </Link>
        )}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agents by name, purpose, or workflow..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === 'ALL' ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {AGENT_CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === value ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {value.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <Section
          title="Institutional Agents"
          subtitle="Official agent profiles deployed for the whole platform."
          loading={marketLoading}
          profiles={institutionalProfiles}
          emptyMessage="No institutional agents match your current filters."
          renderCard={renderCard}
        />

        <Section
          title="Popular"
          subtitle="Shared agent profiles other people are actively using and forking."
          loading={marketLoading}
          profiles={popularProfiles}
          emptyMessage="No shared agents match your current filters yet."
          renderCard={renderCard}
        />

        <Section
          title="My Agents"
          subtitle="Your private and shared agent profiles, ready to refine or reuse."
          loading={hookLoading}
          profiles={filteredMyProfiles}
          emptyMessage="No agents here yet. Build your first one and it will show up here."
          renderCard={renderCard}
        />

        {marketLoading && institutionalProfiles.length === 0 && popularProfiles.length === 0 && (
          <div className="flex items-center justify-center text-gray-500">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}

        {!marketLoading && institutionalProfiles.length === 0 && popularProfiles.length === 0 && filteredMyProfiles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0033A0]">
              <Bot className="size-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Nothing matched that search</h3>
            <p className="mt-2 text-sm text-gray-500">Try a broader keyword or jump straight into building an agent of your own.</p>
            <div className="mt-5">
              <Link
                href="/agents/build"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00297f]"
              >
                <Plus className="size-4" />
                Build Agent
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
