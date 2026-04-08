'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth-context'
import { BrowseTab } from '../components/uknow/BrowseTab'
import { AskAITab } from '../components/uknow/AskAITab'
import { AlertsTab } from '../components/uknow/AlertsTab'
import { CourseAlertsTab } from '../components/uknow/CourseAlertsTab'
import { InsightsTab } from '../components/uknow/InsightsTab'
import type { UknowArticleSummary } from '../lib/uknow-service'

// ─── Prefetch hook ──────────────────────────────────────────────────

function usePrefetch(userEmail: string) {
  const [articles, setArticles] = useState<UknowArticleSummary[] | undefined>()
  const [total, setTotal] = useState<number | undefined>()

  useEffect(() => {
    fetch('/api/uknow/articles?pageSize=20&page=1', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.articles) {
          setArticles(data.articles)
          setTotal(data.total ?? 0)
        }
      })
      .catch(() => {})
  }, [userEmail])

  return { articles, total }
}

function formatSubtitle(total: number | undefined): string {
  if (total === undefined) return 'Loading articles…'
  return `${total.toLocaleString()} article${total !== 1 ? 's' : ''} — search, ask AI, get insights, or build alerts`
}

// ─── Page ───────────────────────────────────────────────────────────

export default function UKNowPage() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'
  const isAdmin = currentUser.role === 'ADMIN'
  type TabId = 'browse' | 'ask' | 'insights' | 'alerts' | 'course-alerts'
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'browse', label: 'Browse' },
    { id: 'ask', label: 'Ask AI' },
    { id: 'insights', label: 'Insights' },
    { id: 'alerts', label: 'Alerts' },
    ...(isEducator ? [{ id: 'course-alerts' as const, label: 'Course Alerts' }] : []),
  ]

  // Support ?tab=X deep links (e.g., from AlertConversionCard success)
  const tabParam = searchParams.get('tab') as TabId | null
  const initialTab = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : 'browse'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Prefetch first page of articles so Browse tab loads instantly
  const prefetched = usePrefetch(currentUser.email)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="UKNow Live"
        subtitle={formatSubtitle(prefetched.total)}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab strip */}
        <div className="flex gap-1 border-b border-gray-200 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#0033A0] text-[#0033A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'browse' ? (
          <BrowseTab
            userEmail={currentUser.email}
            prefetchedArticles={prefetched.articles}
            prefetchedTotal={prefetched.total}
          />
        ) : activeTab === 'ask' ? (
          <AskAITab userEmail={currentUser.email} />
        ) : activeTab === 'insights' ? (
          <InsightsTab userEmail={currentUser.email} isAdmin={isAdmin} />
        ) : activeTab === 'course-alerts' ? (
          <CourseAlertsTab userEmail={currentUser.email} />
        ) : (
          <AlertsTab userEmail={currentUser.email} />
        )}
      </div>
    </div>
  )
}
