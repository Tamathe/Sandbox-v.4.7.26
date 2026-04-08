'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Search,
  Users,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Gift,
  Filter,
  Building2,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

// ── Types ────────────────────────────────────────────────────────────────────

interface CampusOrg {
  id: string
  externalId: string
  name: string
  shortName: string | null
  websiteKey: string
  summary: string
  profilePicture: string | null
  categoryNames: string[]
  imageUrl: string | null
  engageUrl: string
}

interface CampusEvent {
  id: string
  externalId: string
  name: string
  description: string
  location: string | null
  startsOn: string
  endsOn: string
  imagePath: string | null
  theme: string | null
  categoryNames: string[]
  benefitNames: string[]
  organizationName: string
  orgExternalId: string | null
  imageUrl: string | null
  engageUrl: string
}

interface Stats {
  totalOrgs: number
  totalEvents: number
  eventsToday: number
  eventsThisWeek: number
  categoryCount: number
}

// ── Constants ────────────────────────────────────────────────────────────────

const ORG_CATEGORIES = [
  'Academic-Honorary',
  'Academic-Interest',
  'Cultural',
  'Fine Arts',
  'Hobbies/Interests',
  'Political',
  'Professional',
  'Recreational',
  'Religious/Spiritual',
  'Service/Volunteer',
  'Greek',
  'Graduate/Professional',
  'Other',
]

const EVENT_THEMES = [
  'Arts',
  'Athletics',
  'CommunityService',
  'Cultural',
  'Fundraising',
  'GroupBusiness',
  'Social',
  'Spirituality',
  'ThoughtfulLearning',
]

const EVENT_BENEFITS = ['Free Food', 'Credit', 'Free Stuff']

// ── Component ────────────────────────────────────────────────────────────────

export default function CampusLifePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') === 'events' ? 'events' : 'orgs'
  const initialQ = searchParams.get('q') ?? ''

  const [tab, setTab] = useState<'orgs' | 'events'>(initialTab)
  const [query, setQuery] = useState(initialQ)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ)
  const [category, setCategory] = useState('')
  const [theme, setTheme] = useState('')
  const [benefit, setBenefit] = useState('')
  const [page, setPage] = useState(1)

  const [orgs, setOrgs] = useState<CampusOrg[]>([])
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [debouncedQuery, category, theme, benefit, tab])

  // Fetch stats once
  useEffect(() => {
    fetch('/api/campus/stats')
      .then((r: Response) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => {})
  }, [fetch])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'orgs') {
        const params = new URLSearchParams({ page: String(page), limit: '24' })
        if (debouncedQuery) params.set('q', debouncedQuery)
        if (category) params.set('category', category)
        const res = await fetch(`/api/campus/orgs?${params}`)
        const data = await res.json()
        setOrgs(data.orgs ?? [])
        setTotal(data.total ?? 0)
        setPageCount(data.pageCount ?? 0)
      } else {
        const params = new URLSearchParams({ page: String(page), limit: '24' })
        if (debouncedQuery) params.set('q', debouncedQuery)
        if (theme) params.set('theme', theme)
        if (benefit) params.set('benefit', benefit)
        const res = await fetch(`/api/campus/events?${params}`)
        const data = await res.json()
        setEvents(data.events ?? [])
        setTotal(data.total ?? 0)
        setPageCount(data.pageCount ?? 0)
      }
    } catch (err) {
      console.error('Failed to load campus events:', err)
    } finally {
      setLoading(false)
    }
  }, [tab, page, debouncedQuery, category, theme, benefit, fetch])

  useEffect(() => { fetchData() }, [fetchData])

  // Update URL
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (debouncedQuery) params.set('q', debouncedQuery)
    router.replace(`/campus-life?${params}`, { scroll: false })
  }, [tab, debouncedQuery, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Campus Life"
        subtitle="Explore 880+ student organizations and upcoming events from BBNvolved"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Building2} label="Organizations" value={stats.totalOrgs} />
            <StatCard icon={Calendar} label="Upcoming Events" value={stats.totalEvents} />
            <StatCard icon={Sparkles} label="Happening Today" value={stats.eventsToday} />
            <StatCard icon={Clock} label="This Week" value={stats.eventsThisWeek} />
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('orgs')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === 'orgs'
                ? 'bg-[#0033A0] text-white'
                : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#0033A0]/30'
            }`}
          >
            <Users className="size-4 inline mr-1.5 -mt-0.5" />
            Organizations
          </button>
          <button
            onClick={() => setTab('events')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === 'events'
                ? 'bg-[#0033A0] text-white'
                : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#0033A0]/30'
            }`}
          >
            <Calendar className="size-4 inline mr-1.5 -mt-0.5" />
            Events
          </button>
          <div className="ml-auto text-sm text-gray-400">
            {total.toLocaleString()} {tab === 'orgs' ? 'organizations' : 'events'}
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder={tab === 'orgs' ? 'Search organizations…' : 'Search events…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-[#0033A0] focus:outline-none transition-colors"
            />
          </div>

          {tab === 'orgs' ? (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="pl-10 pr-8 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-[#0033A0] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {ORG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-[#0033A0] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Themes</option>
                {EVENT_THEMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                className="px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:border-[#0033A0] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Benefits</option>
                {EVENT_BENEFITS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Results grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border-2 border-gray-100 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tab === 'orgs' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgs.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
            {orgs.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                No organizations found. Try a different search.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
            {events.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                No events found. Try a different search.
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border-2 border-gray-200 bg-white disabled:opacity-30 hover:border-[#0033A0]/30 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="p-2 rounded-lg border-2 border-gray-200 bg-white disabled:opacity-30 hover:border-[#0033A0]/30 transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {/* Data source attribution */}
        <p className="text-xs text-gray-400 text-center pt-4">
          Data synced from{' '}
          <a
            href="https://uky.campuslabs.com/engage/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            BBNvolved (CampusLabs Engage)
          </a>
          . Organizations and events are updated daily.
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: number }) {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl bg-[#0033A0]/5 flex items-center justify-center flex-shrink-0">
        <Icon className="size-5 text-[#0033A0]" />
      </div>
      <div>
        <p className="text-xl font-extrabold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function OrgCard({ org }: { org: CampusOrg }) {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-[#0033A0]/20 hover:shadow-md transition-all group">
      <div className="flex items-start gap-3">
        {org.imageUrl ? (
          <img
            src={org.imageUrl}
            alt={`${org.name} logo`}
            className="size-10 rounded-xl object-cover flex-shrink-0 bg-gray-100"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="size-10 rounded-xl bg-[#0033A0]/5 flex items-center justify-center flex-shrink-0">
            <Users className="size-5 text-[#0033A0]/40" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-gray-900 leading-tight group-hover:text-[#0033A0] transition-colors line-clamp-2">
            {org.name}
          </h3>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {org.categoryNames.slice(0, 2).map((c) => (
              <span
                key={c}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600"
              >
                {c}
              </span>
            ))}
            {org.categoryNames.length > 2 && (
              <span className="text-[10px] text-gray-400">+{org.categoryNames.length - 2}</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-3">
        {org.summary || 'No description available.'}
      </p>

      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
        <Link
          href={`/campus-life?tab=events&q=${encodeURIComponent(org.name)}`}
          className="text-xs font-semibold text-[#0033A0] hover:text-blue-700 transition-colors"
        >
          View events
        </Link>
        <a
          href={org.engageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          BBNvolved <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  )
}

function EventCard({ event }: { event: CampusEvent }) {
  const start = new Date(event.startsOn)
  const end = new Date(event.endsOn)
  const isToday = start.toDateString() === new Date().toDateString()
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-[#0033A0]/20 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-extrabold text-gray-900 leading-tight group-hover:text-[#0033A0] transition-colors line-clamp-2 flex-1">
          {event.name}
        </h3>
        {isToday && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
            TODAY
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1 font-medium">{event.organizationName}</p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="size-3.5 text-gray-400 flex-shrink-0" />
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="size-3.5 text-gray-400 flex-shrink-0" />
          <span>{timeStr}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="size-3.5 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}
      </div>

      {/* Benefit badges */}
      {event.benefitNames.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {event.benefitNames.map((b) => (
            <span
              key={b}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1"
            >
              <Gift className="size-2.5" />
              {b}
            </span>
          ))}
        </div>
      )}

      {event.theme && (
        <span className="inline-block mt-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">
          {event.theme}
        </span>
      )}

      <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2">
        {event.description || 'No description available.'}
      </p>

      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-end">
        <a
          href={event.engageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          View on BBNvolved <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  )
}
