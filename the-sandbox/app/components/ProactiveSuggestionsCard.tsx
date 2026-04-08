'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronDown, ChevronUp, AlertTriangle, Clock, Newspaper, Wrench, Activity, ExternalLink } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

interface Suggestion {
  id: string
  category: 'course-health' | 'student-risk' | 'campus-news' | 'tool-usage' | 'deadline'
  priority: 'high' | 'medium' | 'low'
  title: string
  body: string
  actionLabel?: string
  actionUrl?: string
}

const DISMISSED_KEY = 'sandy-dismissed-suggestions'

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-400',
}

const CATEGORY_ICON: Record<string, typeof AlertTriangle> = {
  'student-risk': AlertTriangle,
  'course-health': Activity,
  deadline: Clock,
  'campus-news': Newspaper,
  'tool-usage': Wrench,
}

function getDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveDismissed(ids: Set<string>) {
  try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids])) } catch { /* ignore */ }
}

export default function ProactiveSuggestionsCard() {
  const { currentUser } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const isEligible = !!currentUser

  const fetchSuggestions = useCallback(async () => {
    if (!isEligible) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch('/api/sandy/proactive-suggestions', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { suggestions: Suggestion[] }
        setSuggestions(data.suggestions)
      }
    } catch { /* ignore */ }
    setDismissed(getDismissed())
    setLoading(false)
  }, [currentUser?.email, isEligible])

  // Fetch on mount
  useEffect(() => { void fetchSuggestions() }, [fetchSuggestions])

  // Listen for panel open to re-fetch
  useEffect(() => {
    const handler = () => { void fetchSuggestions() }
    window.addEventListener('sandy-panel-opened', handler)
    return () => window.removeEventListener('sandy-panel-opened', handler)
  }, [fetchSuggestions])

  const handleDismiss = useCallback((id: string) => {
    setRemoving(id)
    setTimeout(() => {
      setDismissed(prev => {
        const next = new Set(prev)
        next.add(id)
        saveDismissed(next)
        return next
      })
      setRemoving(null)
    }, 250)
  }, [])

  if (!isEligible) return null

  const visible = suggestions.filter(s => !dismissed.has(s.id))
  if (!loading && visible.length === 0) return null

  return (
    <div className="mx-1 mb-2">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-1.5 w-full text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 px-1 py-1 hover:text-gray-600 transition-colors"
      >
        {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        Sandy&apos;s Insights
        {visible.length > 0 && (
          <span className="bg-[#0033A0] text-white text-[9px] rounded-full px-1.5 leading-4 min-w-[16px] text-center font-bold">
            {visible.length}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="space-y-1.5 mt-1">
          {loading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-2.5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-2.5 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </>
          ) : (
            visible.map(s => {
              const Icon = CATEGORY_ICON[s.category] ?? Activity
              const isRemoving = removing === s.id
              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-xl border border-gray-100 border-l-[3px] ${PRIORITY_BORDER[s.priority]} p-2.5 shadow-sm transition-all duration-250 ${
                    isRemoving ? 'opacity-0 max-h-0 overflow-hidden py-0 my-0 border-0' : 'opacity-100 max-h-40'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="size-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-800 leading-snug">{s.title}</p>
                        <button
                          onClick={() => handleDismiss(s.id)}
                          className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                          aria-label="Dismiss"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{s.body}</p>
                      {s.actionLabel && s.actionUrl && (
                        <a
                          href={s.actionUrl}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0033A0] hover:underline mt-1"
                        >
                          {s.actionLabel}
                          <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
