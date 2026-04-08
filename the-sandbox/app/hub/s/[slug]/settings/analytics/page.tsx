'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Loader2, Settings, FolderOpen, BarChart3,
  Users, Wrench, Activity,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const TopToolsChart = dynamic(
  () => import('./AnalyticsCharts').then(m => m.TopToolsChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> }
)
import { useAuth } from '../../../../../lib/auth-context'
import PageHeader from '../../../../../components/PageHeader'
import TabNav from '../../../../../components/TabNav'

interface Analytics {
  totalSessions: number
  topTools: Array<{ toolId: string; name: string; sessions: number }>
  toolCountByCollection: Array<{ collectionId: string; name: string; toolCount: number }>
  followerCount: number
  totalTools: number
}

const SETTINGS_TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'collections', label: 'Collections', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const

export default function DepartmentAnalyticsPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { currentUser } = useAuth()

  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [departmentShortName, setDepartmentShortName] = useState('')

  const load = useCallback(async () => {
    try {
      const [deptRes, analyticsRes] = await Promise.all([
        fetch(`/api/departments/${slug}`, { headers: { 'x-demo-user-email': currentUser.email } }),
        fetch(`/api/departments/${slug}/analytics`, { headers: { 'x-demo-user-email': currentUser.email } }),
      ])
      if (deptRes.ok) {
        const dept = await deptRes.json()
        setDepartmentShortName(dept.shortName)
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json())
      }
    } catch {
      // ignore
    }
  }, [slug, currentUser.email])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Loading..." />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center">
          <Loader2 className="size-8 animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Unable to load analytics" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-sm text-gray-500">You may not have access to this page.</p>
          <Link href={`/hub/s/${slug}`} className="text-sm font-semibold text-[#0033A0] hover:underline mt-2 inline-block">
            Back to Storefront
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`${departmentShortName} Analytics`}
        subtitle="Usage data across your department tools"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/hub" className="hover:text-[#0033A0] transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Hub
          </Link>
          <ChevronRight className="size-3" />
          <Link href={`/hub/s/${slug}`} className="hover:text-[#0033A0] transition-colors">
            {departmentShortName}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-gray-700 font-medium">Analytics</span>
        </div>

        {/* Tab Nav */}
        <TabNav
          tabs={SETTINGS_TABS as unknown as Array<{ id: string; label: string; icon?: typeof Settings }>}
          activeTab="analytics"
          onTabChange={(id) => {
            if (id === 'settings') router.push(`/hub/s/${slug}/settings`)
            else if (id === 'collections') router.push(`/hub/s/${slug}/settings/collections`)
          }}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Activity className="size-4" />
              <span className="text-xs font-medium">Total Sessions</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{analytics.totalSessions.toLocaleString()}</p>
          </div>
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Wrench className="size-4" />
              <span className="text-xs font-medium">Total Tools</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{analytics.totalTools}</p>
          </div>
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <FolderOpen className="size-4" />
              <span className="text-xs font-medium">Collections</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{analytics.toolCountByCollection.length}</p>
          </div>
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="size-4" />
              <span className="text-xs font-medium">Followers</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{analytics.followerCount}</p>
          </div>
        </div>

        {/* Top Tools Bar Chart */}
        {analytics.topTools.length > 0 && (
          <div className="border rounded-2xl shadow-sm bg-white p-6">
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">Top Tools by Sessions</h2>
            <div className="h-64">
              <TopToolsChart data={analytics.topTools} />
            </div>
          </div>
        )}

        {/* Tools by Collection */}
        {analytics.toolCountByCollection.length > 0 && (
          <div className="border rounded-2xl shadow-sm bg-white p-6">
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">Tools by Collection</h2>
            <div className="space-y-3">
              {analytics.toolCountByCollection.map(c => (
                <div key={c.collectionId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{c.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0033A0] rounded-full"
                        style={{
                          width: `${Math.min(100, (c.toolCount / Math.max(1, analytics.totalTools)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{c.toolCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analytics.totalSessions === 0 && analytics.topTools.length === 0 && (
          <div className="border rounded-2xl shadow-sm bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No session data yet. Analytics will populate as tools are used.</p>
          </div>
        )}
      </div>
    </div>
  )
}
