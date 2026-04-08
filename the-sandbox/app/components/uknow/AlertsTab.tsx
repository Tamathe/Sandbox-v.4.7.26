'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, BellOff, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, CheckCircle, ChevronDown, ChevronUp, Sparkles, Pause, Play, Search } from 'lucide-react'
import Link from 'next/link'
import { formatDate, similarityBadge } from './uknow-helpers'
import type { AlertItem, AlertSuggestion } from './uknow-helpers'
import type { UknowArticleSummary } from '../../lib/uknow-service'

// ─── Digest Toggle ─────────────────────────────────────────────────

function DigestToggle({ userEmail }: { userEmail: string }) {
  const [frequency, setFrequency] = useState<string>('OFF')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/uknow/digest', { headers: { 'x-demo-user-email': userEmail } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.frequency) setFrequency(data.frequency) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userEmail])

  const update = async (newFreq: string) => {
    setFrequency(newFreq)
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/uknow/digest', {
        method: 'PUT',
        headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: newFreq }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const options = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'OFF', label: 'Off' },
  ]

  if (loading) return <div className="h-10 w-48 bg-gray-200 rounded-full animate-pulse" />

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-gray-700">Email Digest:</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => void update(opt.value)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
              frequency === opt.value
                ? 'bg-[#0033A0] text-white border-[#0033A0]'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {saved && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <CheckCircle className="size-3" /> Saved
        </span>
      )}
    </div>
  )
}

// ─── Live Preview ──────────────────────────────────────────────────

function LivePreview({ query, userEmail }: { query: string; userEmail: string }) {
  const [results, setResults] = useState<Array<{ title: string; slug: string }>>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 3) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`/api/uknow/alerts/preview?q=${encodeURIComponent(query.trim())}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.articles) setResults(data.articles) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, userEmail])

  if (!query.trim() || query.trim().length < 3) return null

  return (
    <div className="border-2 border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/30">
      <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
        <Search className="size-3" />
        Preview: articles matching this query
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="size-3 animate-spin" /> Searching…
        </div>
      ) : results.length === 0 ? (
        <p className="text-xs text-gray-400">No matching articles found yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {results.slice(0, 3).map((r) => (
            <Link key={r.slug} href={`/uknow/${r.slug}`} className="text-xs font-medium text-[#0033A0] hover:underline truncate">
              {r.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Starter Alerts ────────────────────────────────────────────────

function StarterAlerts({ suggestions, onActivate, activating }: {
  suggestions: AlertSuggestion[]
  onActivate: (s: AlertSuggestion) => void
  activating: string | null
}) {
  if (suggestions.length === 0) return null

  return (
    <div className="border-2 border-blue-200 rounded-2xl bg-blue-50/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-[#0033A0]" />
        <h2 className="text-sm font-extrabold text-gray-900">Quick Start — Tap to activate</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">We picked these based on your profile. One tap and you&apos;re getting alerts.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {suggestions.slice(0, 3).map((s) => (
          <button
            key={s.query}
            onClick={() => onActivate(s)}
            disabled={activating === s.query}
            className="text-left border-2 border-blue-200 rounded-xl bg-white p-4 hover:border-[#0033A0] hover:shadow transition-all disabled:opacity-50 group"
          >
            <p className="font-bold text-sm text-gray-900 group-hover:text-[#0033A0] mb-1">{s.label}</p>
            <p className="text-xs text-gray-500 line-clamp-2">{s.query}</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0033A0]">
              {activating === s.query ? (
                <><Loader2 className="size-3 animate-spin" /> Activating…</>
              ) : (
                <><Plus className="size-3" /> Activate</>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Alerts Tab ───────────────────────────────────────────────

export function AlertsTab({ userEmail }: { userEmail: string }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AlertSuggestion[]>([])
  const [activating, setActivating] = useState<string | null>(null)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/uknow/alerts', { headers: { 'x-demo-user-email': userEmail } })
      if (res.ok) {
        const data = await res.json()
        const fetchedAlerts = data.alerts ?? []
        setAlerts(fetchedAlerts)
        setIsFirstVisit(fetchedAlerts.length === 0)
      }
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/uknow/alerts/suggestions', { headers: { 'x-demo-user-email': userEmail } })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      }
    } catch { /* non-fatal */ }
  }, [userEmail])

  useEffect(() => { void fetchAlerts(); void fetchSuggestions() }, [fetchAlerts, fetchSuggestions])

  const handleCreate = async () => {
    if (!label.trim() || !query.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/uknow/alerts', {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), query: query.trim() }),
      })
      if (res.ok) {
        setLabel('')
        setQuery('')
        void fetchAlerts()
        void fetchSuggestions()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleActivateSuggestion = async (s: AlertSuggestion) => {
    setActivating(s.query)
    try {
      const res = await fetch('/api/uknow/alerts', {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: s.label, query: s.query }),
      })
      if (res.ok) {
        setSuggestions((prev) => prev.filter((x) => x.query !== s.query))
        void fetchAlerts()
      }
    } finally {
      setActivating(null)
    }
  }

  const handleToggle = async (alertId: string, currentActive: boolean) => {
    setTogglingId(alertId)
    try {
      await fetch(`/api/uknow/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, active: !currentActive } : a))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (alertId: string) => {
    setDeletingId(alertId)
    try {
      await fetch(`/api/uknow/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    } finally {
      setDeletingId(null)
    }
  }

  // Bulk actions
  const handleBulkPause = async () => {
    const activeAlerts = alerts.filter((a) => a.active)
    for (const alert of activeAlerts) {
      await fetch(`/api/uknow/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      })
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, active: false })))
  }

  const handleBulkResume = async () => {
    const inactiveAlerts = alerts.filter((a) => !a.active)
    for (const alert of inactiveAlerts) {
      await fetch(`/api/uknow/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, active: true })))
  }

  const handleBulkDeleteInactive = async () => {
    const inactiveAlerts = alerts.filter((a) => !a.active)
    for (const alert of inactiveAlerts) {
      await fetch(`/api/uknow/alerts/${alert.id}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
    }
    setAlerts((prev) => prev.filter((a) => a.active))
  }

  const activeCount = alerts.filter((a) => a.active).length
  const inactiveCount = alerts.filter((a) => !a.active).length

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* Digest preference */}
      <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
        <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
          <Bell className="size-4 text-[#0033A0]" />
          Notification Preferences
        </h2>
        <DigestToggle userEmail={userEmail} />
      </div>

      {/* Starter alerts on first visit */}
      {isFirstVisit && suggestions.length > 0 && (
        <StarterAlerts suggestions={suggestions} onActivate={handleActivateSuggestion} activating={activating} />
      )}

      {/* Create Alert form with live preview */}
      <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
        <h2 className="text-base font-extrabold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="size-4 text-[#0033A0]" />
          Create Alert
        </h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Alert label (e.g. &quot;AI Research&quot;)"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query (e.g. &quot;artificial intelligence machine learning&quot;)"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0]"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
          />
          {/* Live match preview */}
          <LivePreview query={query} userEmail={userEmail} />
          <button
            onClick={() => void handleCreate()}
            disabled={creating || !label.trim() || !query.trim()}
            className="self-end flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-[#002580] transition-colors"
          >
            {creating && <Loader2 className="size-4 animate-spin" />}
            Create Alert
          </button>
        </div>
      </div>

      {/* Suggested Alerts (when not first visit) */}
      {!isFirstVisit && suggestions.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-[#0033A0]" />
            Suggested Alerts
          </h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.query}
                onClick={() => void handleActivateSuggestion(s)}
                disabled={activating === s.query}
                className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50 text-sm hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50"
              >
                {activating === s.query ? (
                  <Loader2 className="size-3.5 animate-spin text-[#0033A0]" />
                ) : (
                  <Plus className="size-3.5 text-[#0033A0]" />
                )}
                <span className="font-medium text-gray-900">{s.label}</span>
                <span className="text-xs text-gray-500">{s.query}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alert list with bulk actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Your Alerts</h2>
          {alerts.length > 1 && (
            <div className="flex gap-2">
              {activeCount > 0 && (
                <button
                  onClick={() => void handleBulkPause()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0033A0] transition-colors"
                >
                  <Pause className="size-3" /> Pause all
                </button>
              )}
              {inactiveCount > 0 && (
                <button
                  onClick={() => void handleBulkResume()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0033A0] transition-colors"
                >
                  <Play className="size-3" /> Resume all
                </button>
              )}
              {inactiveCount > 0 && (
                <button
                  onClick={() => void handleBulkDeleteInactive()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="size-3" /> Delete inactive
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-2 border-gray-200 rounded-2xl p-5 animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-gray-200 rounded w-40" />
                <div className="h-3 bg-gray-200 rounded w-64" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 && !isFirstVisit ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <BellOff className="size-10" />
            <p className="font-medium">No alerts yet</p>
            <p className="text-sm">Create an alert above to get notified when matching articles are published.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-2 rounded-2xl bg-white transition-colors ${
                  alert.active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{alert.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Query: {alert.query}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">
                        {alert._count.matches} match{alert._count.matches !== 1 ? 'es' : ''}
                      </p>
                      {alert.topMatches && alert.topMatches.length > 0 && (
                        <button
                          onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                          className="inline-flex items-center gap-0.5 text-xs text-[#0033A0] font-medium hover:underline"
                        >
                          Recent Matches
                          {expandedId === alert.id ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleToggle(alert.id, alert.active)}
                      disabled={togglingId === alert.id}
                      title={alert.active ? 'Pause alert' : 'Resume alert'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                    >
                      {alert.active ? <ToggleRight className="size-5 text-[#0033A0]" /> : <ToggleLeft className="size-5" />}
                    </button>
                    <button
                      onClick={() => void handleDelete(alert.id)}
                      disabled={deletingId === alert.id}
                      title="Delete alert"
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
                    >
                      {deletingId === alert.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded recent matches */}
                {expandedId === alert.id && alert.topMatches && alert.topMatches.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-3 flex flex-col gap-2">
                    {alert.topMatches.map((m) => {
                      const badge = similarityBadge(m.similarity)
                      return (
                        <div key={m.slug} className="flex items-center gap-3">
                          <Link
                            href={`/uknow/${m.slug}`}
                            className="flex-1 min-w-0 text-sm font-medium text-[#0033A0] hover:underline truncate"
                          >
                            {m.title}
                          </Link>
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="shrink-0 text-xs text-gray-400">{formatDate(m.publishedAt)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
