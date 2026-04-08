'use client'

import { useState, useEffect } from 'react'
import {
  Package, TrendingUp, Star, CheckCircle, ShieldAlert,
  ArrowRight, ChevronUp, ChevronDown,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from '../../../../components/DynamicChart'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import LoadingSpinner from '../../../../components/LoadingSpinner'
import ErrorBanner from '../../../../components/ErrorBanner'

// --- Types ---

interface AnalyticsData {
  totalPacks: number
  byDiscipline: Record<string, number>
  byStatus: Record<string, number>
  byTier: Record<string, number>
  implementationRate: number
  avgRating: number | null
  completionRate: number
  topTemplates: Array<{
    id: string
    title: string
    disciplineFamily: string
    aiTier: string
    adoptions: number
    avgRating: number | null
  }>
}

type SortKey = 'title' | 'disciplineFamily' | 'aiTier' | 'adoptions' | 'avgRating'

// --- Constants ---

const DISCIPLINE_COLORS: Record<string, string> = {
  STEM: '#2563eb',
  Humanities: '#7c3aed',
  'Social Sciences': '#16a34a',
  Arts: '#ea580c',
  Professional: '#0d9488',
  'Health Sciences': '#dc2626',
}

const STATUS_ORDER = ['DRAFT', 'READY', 'ADOPTED', 'IN_PROGRESS', 'COMPLETED']
const TIER_ORDER = ['FOUNDATION', 'AWARENESS', 'PARTNERSHIP', 'FLUENCY']

const TIER_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation',
  AWARENESS: 'Awareness',
  PARTNERSHIP: 'Partnership',
  FLUENCY: 'Fluency',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  ADOPTED: 'Adopted',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
}

// --- Skeleton Components ---

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border rounded-2xl shadow-sm p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded mb-2" />
      ))}
    </div>
  )
}

// --- KPI Card ---

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

// --- Discipline Pie Chart ---

function DisciplineChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  if (chartData.length === 0) {
    return <EmptyCard title="Discipline Distribution" message="No discipline data yet." />
  }

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Discipline Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={DISCIPLINE_COLORS[entry.name] || '#94a3b8'}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// --- Horizontal Bar Chart ---

function HorizontalBarChart({
  title,
  data,
  labels,
  order,
  color,
}: {
  title: string
  data: Record<string, number>
  labels: Record<string, string>
  order: string[]
  color: string
}) {
  const chartData = order.map((key) => ({
    name: labels[key] || key,
    count: data[key] || 0,
  }))

  const hasData = chartData.some((d) => d.count > 0)
  if (!hasData) {
    return <EmptyCard title={title} message="No data available yet." />
  }

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={order.length * 56 + 40}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 13 }} />
          <Tooltip />
          <Bar dataKey="count" fill={color} radius={[0, 6, 6, 0]} barSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// --- Top Templates Table ---

function TopTemplatesTable({
  templates,
}: {
  templates: AnalyticsData['topTemplates']
}) {
  const [sortKey, setSortKey] = useState<SortKey>('adoptions')
  const [sortAsc, setSortAsc] = useState(false)

  if (templates.length === 0) {
    return <EmptyCard title="Top Templates" message="No templates have been adopted yet." />
  }

  const sorted = [...templates].sort((a, b) => {
    const aVal = a[sortKey] ?? 0
    const bVal = b[sortKey] ?? 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null
    return sortAsc ? (
      <ChevronUp className="size-3.5 inline ml-0.5" />
    ) : (
      <ChevronDown className="size-3.5 inline ml-0.5" />
    )
  }

  const columns: { key: SortKey; label: string; align?: string }[] = [
    { key: 'title', label: 'Title' },
    { key: 'disciplineFamily', label: 'Discipline' },
    { key: 'aiTier', label: 'Tier' },
    { key: 'adoptions', label: 'Adoptions', align: 'text-right' },
    { key: 'avgRating', label: 'Avg Rating', align: 'text-right' },
  ]

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Top Templates</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`py-2 px-3 font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none ${col.align || 'text-left'}`}
                >
                  {col.label}
                  <SortIcon column={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-2.5 px-3 font-medium text-gray-900">{t.title}</td>
                <td className="py-2.5 px-3 text-gray-600">{t.disciplineFamily}</td>
                <td className="py-2.5 px-3">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {TIER_LABELS[t.aiTier] || t.aiTier}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{t.adoptions}</td>
                <td className="py-2.5 px-3 text-right text-gray-600">
                  {t.avgRating !== null ? (
                    <span className="flex items-center justify-end gap-1">
                      <Star className="size-3.5 text-amber-400 fill-amber-400" />
                      {t.avgRating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Implementation Funnel ---

function ImplementationFunnel({ data }: { data: AnalyticsData }) {
  const stages = [
    { label: 'Adopted', count: data.byStatus['ADOPTED'] || 0, color: 'bg-blue-100 text-blue-800' },
    { label: 'Started', count: data.byStatus['IN_PROGRESS'] || 0, color: 'bg-amber-100 text-amber-800' },
    { label: 'Completed', count: data.byStatus['COMPLETED'] || 0, color: 'bg-green-100 text-green-800' },
    {
      label: 'Reflected',
      count: Math.round(
        (data.byStatus['COMPLETED'] || 0) * (data.completionRate / 100)
      ),
      color: 'bg-purple-100 text-purple-800',
    },
  ]

  const hasData = stages.some((s) => s.count > 0)
  if (!hasData) {
    return <EmptyCard title="Implementation Funnel" message="No implementation data yet." />
  }

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-6">Implementation Funnel</h3>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2">
            <div className={`rounded-xl px-5 py-4 text-center ${stage.color}`}>
              <p className="text-2xl font-bold">{stage.count}</p>
              <p className="text-xs font-medium mt-0.5">{stage.label}</p>
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className="size-5 text-gray-300 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Empty Card ---

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <p className="text-sm text-gray-400 text-center py-8">{message}</p>
    </div>
  )
}

// --- Main Page ---

export default function StarterPackAnalyticsPage() {
  const { currentUser: user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'ADMIN') {
      setLoading(false)
      return
    }

    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/ai-literacy/starter-packs/analytics', {
          headers: { 'x-user-id': user!.id },
        })
        if (!res.ok) throw new Error('Failed to load analytics')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user])

  // Not logged in yet
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Access denied for non-admins
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Access Denied" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <ShieldAlert className="size-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin Only</h2>
          <p className="text-sm text-gray-500">
            This page is restricted to platform administrators.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Starter Pack Analytics"
        subtitle="Adoption and implementation insights across the platform"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error State */}
        {error && <ErrorBanner message={error} />}

        {/* KPI Strip */}
        {loading ? (
          <KpiSkeleton />
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<Package className="size-4 text-blue-700" />}
              label="Total Packs Built"
              value={String(data.totalPacks)}
              color="bg-blue-100"
            />
            <KpiCard
              icon={<TrendingUp className="size-4 text-emerald-700" />}
              label="Implementation Rate"
              value={`${data.implementationRate.toFixed(0)}%`}
              color="bg-emerald-100"
            />
            <KpiCard
              icon={<Star className="size-4 text-amber-600" />}
              label="Average Rating"
              value={data.avgRating !== null ? data.avgRating.toFixed(1) : '--'}
              color="bg-amber-100"
            />
            <KpiCard
              icon={<CheckCircle className="size-4 text-purple-700" />}
              label="Completion Rate"
              value={`${data.completionRate.toFixed(0)}%`}
              color="bg-purple-100"
            />
          </div>
        ) : null}

        {/* Charts Row: Discipline + Status */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DisciplineChart data={data.byDiscipline} />
            <HorizontalBarChart
              title="Status Distribution"
              data={data.byStatus}
              labels={STATUS_LABELS}
              order={STATUS_ORDER}
              color="#0033A0"
            />
          </div>
        ) : null}

        {/* Tier Distribution */}
        {loading ? (
          <ChartSkeleton />
        ) : data ? (
          <HorizontalBarChart
            title="Tier Distribution"
            data={data.byTier}
            labels={TIER_LABELS}
            order={TIER_ORDER}
            color="#0033A0"
          />
        ) : null}

        {/* Top Templates Table */}
        {loading ? (
          <TableSkeleton />
        ) : data ? (
          <TopTemplatesTable templates={data.topTemplates} />
        ) : null}

        {/* Implementation Funnel */}
        {loading ? (
          <ChartSkeleton />
        ) : data ? (
          <ImplementationFunnel data={data} />
        ) : null}
      </div>
    </div>
  )
}
