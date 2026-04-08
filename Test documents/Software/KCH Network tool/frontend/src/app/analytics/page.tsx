'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'
import {
  Search, FileText, Users, TrendingUp,
  AlertTriangle, BarChart3
} from 'lucide-react'
import type { QueryAnalytics, DocumentAnalytics, UsageAnalytics } from '@/lib/types'

function StatCard({ icon: Icon, label, value, subtext }: {
  icon: typeof Search
  label: string
  value: string | number
  subtext?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-kch-blue/10 rounded-lg flex items-center justify-center">
          <Icon size={20} className="text-kch-blue" />
        </div>
        <div>
          <p className="text-2xl font-bold text-kch-gray-900">{value}</p>
          <p className="text-sm text-kch-gray-500">{label}</p>
          {subtext && <p className="text-xs text-kch-gray-400">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [queryData, setQueryData] = useState<QueryAnalytics | null>(null)
  const [docData, setDocData] = useState<DocumentAnalytics | null>(null)
  const [usageData, setUsageData] = useState<UsageAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) loadAnalytics()
  }, [authLoading, user, router])

  async function loadAnalytics() {
    try {
      const [q, d, u] = await Promise.all([
        api.getQueryAnalytics(),
        api.getDocumentAnalytics(),
        api.getUsageAnalytics(),
      ])
      setQueryData(q)
      setDocData(d)
      setUsageData(u)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-kch-gray-900 mb-6">Analytics</h2>

        {loading ? (
          <div className="text-center py-12 text-kch-gray-400">Loading analytics...</div>
        ) : (
          <div className="space-y-8">
            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Search}
                label="Total Queries"
                value={queryData?.total_queries ?? 0}
                subtext={`${queryData?.queries_today ?? 0} today`}
              />
              <StatCard
                icon={FileText}
                label="Documents"
                value={docData?.total_documents ?? 0}
              />
              <StatCard
                icon={Users}
                label="Total Users"
                value={usageData?.total_users ?? 0}
                subtext={`${usageData?.active_users_today ?? 0} active today`}
              />
              <StatCard
                icon={TrendingUp}
                label="Avg Confidence"
                value={queryData?.avg_confidence != null ? `${Math.round(queryData.avg_confidence * 100)}%` : '-'}
              />
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top queries */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-kch-gray-700 mb-3 flex items-center gap-2">
                  <BarChart3 size={16} />
                  Top Queries
                </h3>
                {queryData?.top_queries.length ? (
                  <div className="space-y-2">
                    {queryData.top_queries.map((q, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-kch-gray-100 last:border-0">
                        <span className="text-sm text-kch-gray-700 truncate mr-2">{q.query}</span>
                        <span className="text-xs bg-kch-gray-100 px-2 py-0.5 rounded-full text-kch-gray-600 flex-shrink-0">
                          {q.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-kch-gray-400">No queries yet</p>
                )}
              </div>

              {/* Low confidence (documentation gaps) */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-kch-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  Documentation Gaps (Low Confidence Queries)
                </h3>
                {queryData?.low_confidence_queries.length ? (
                  <div className="space-y-2">
                    {queryData.low_confidence_queries.map((q, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-kch-gray-100 last:border-0">
                        <span className="text-sm text-kch-gray-700 truncate mr-2">{q.query}</span>
                        <span className="text-xs bg-orange-100 px-2 py-0.5 rounded-full text-orange-700 flex-shrink-0">
                          {Math.round(q.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-kch-gray-400">No low-confidence queries</p>
                )}
              </div>

              {/* Most cited documents */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-kch-gray-700 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Most Cited Documents
                </h3>
                {docData?.most_cited.length ? (
                  <div className="space-y-2">
                    {docData.most_cited.map((d, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-kch-gray-100 last:border-0">
                        <span className="text-sm text-kch-gray-700 truncate mr-2">{d.title}</span>
                        <span className="text-xs bg-kch-blue/10 px-2 py-0.5 rounded-full text-kch-blue flex-shrink-0">
                          {d.citation_count} citations
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-kch-gray-400">No citations yet</p>
                )}
              </div>

              {/* Documents by type */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-kch-gray-700 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Documents by Type
                </h3>
                {docData && Object.keys(docData.documents_by_type).length ? (
                  <div className="space-y-2">
                    {Object.entries(docData.documents_by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between py-1.5 border-b border-kch-gray-100 last:border-0">
                        <span className="text-sm text-kch-gray-700 capitalize">{type}</span>
                        <span className="text-xs bg-kch-gray-100 px-2 py-0.5 rounded-full text-kch-gray-600">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-kch-gray-400">No documents indexed</p>
                )}
              </div>
            </div>

            {/* Usage by site */}
            {usageData && Object.keys(usageData.queries_by_site).length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-kch-gray-700 mb-3 flex items-center gap-2">
                  <Users size={16} />
                  Queries by Hospital Site
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(usageData.queries_by_site).map(([site, count]) => (
                    <div key={site} className="bg-kch-gray-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-kch-gray-900">{count}</p>
                      <p className="text-xs text-kch-gray-500 capitalize">{site}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
