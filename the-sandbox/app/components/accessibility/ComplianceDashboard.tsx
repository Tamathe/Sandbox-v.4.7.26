'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  FileText,
  Loader2,
  Shield,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '../DynamicChart'
import type { ComplianceSummary } from '../../lib/accessibility/compliance-aggregator'
import { apiFetch } from '../../lib/api-client'
import { useAuth } from '../../lib/auth-context'

// ── Grade bar colors ─────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-amber-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
}

const GRADE_TEXT: Record<string, string> = {
  A: 'text-green-700',
  B: 'text-blue-700',
  C: 'text-amber-700',
  D: 'text-orange-700',
  F: 'text-red-700',
}

// ── Grade distribution bar ───────────────────────────────────────────────────

function GradeBar({ grades }: { grades: Record<string, number> }) {
  const total = Object.values(grades).reduce((s, n) => s + n, 0)
  if (total === 0) return <div className="h-6 rounded-full bg-gray-100" />

  return (
    <div className="flex h-6 overflow-hidden rounded-full">
      {(['A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
        const count = grades[grade] ?? 0
        if (count === 0) return null
        const pct = (count / total) * 100
        return (
          <div
            key={grade}
            className={`${GRADE_COLORS[grade]} flex items-center justify-center text-[10px] font-bold text-white transition-all`}
            style={{ width: `${pct}%` }}
            title={`${grade}: ${count} (${Math.round(pct)}%)`}
          >
            {pct > 8 ? `${grade} ${Math.round(pct)}%` : ''}
          </div>
        )
      })}
    </div>
  )
}

// ── Compliance rate ring ─────────────────────────────────────────────────────

function ComplianceRing({ rate, label }: { rate: number; label: string }) {
  const color = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'
  const ringColor = rate >= 80 ? 'stroke-green-500' : rate >= 60 ? 'stroke-amber-500' : 'stroke-red-500'
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (rate / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-28">
        <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            className={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-extrabold ${color}`}>{rate}%</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-500">{label}</span>
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, subtitle }: {
  icon: typeof Shield
  label: string
  value: string | number
  subtitle?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-gray-900">{value}</div>
      {subtitle && <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>}
    </div>
  )
}

// ── Content type row ─────────────────────────────────────────────────────────

function ContentTypeRow({ item }: { item: ComplianceSummary['byType'][number] }) {
  const pct = Math.round(item.avgScore * 100)
  const label = item.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="flex items-center gap-3">
      <span className="w-40 truncate text-sm font-medium text-gray-700">{label}</span>
      <div className="h-3 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-bold text-gray-900">{pct}%</span>
    </div>
  )
}

// ── Department card ──────────────────────────────────────────────────────────

function DepartmentCard({ dept }: { dept: ComplianceSummary['byDepartment'][number] }) {
  const color = dept.compliance >= 80 ? 'border-green-200 bg-green-50' : dept.compliance >= 60 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
  const textColor = dept.compliance >= 80 ? 'text-green-700' : dept.compliance >= 60 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">{dept.department}</span>
        <span className={`text-lg font-extrabold ${textColor}`}>{dept.compliance}%</span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        {dept.totalMaterials} materials · Top issue: {dept.topIssue}
      </div>
    </div>
  )
}

// ── Queue item ───────────────────────────────────────────────────────────────

function QueueItem({ item, rank }: { item: ComplianceSummary['highImpactQueue'][number]; rank: number }) {
  const gradeColor = GRADE_TEXT[item.grade] ?? 'text-gray-700'

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{item.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gradeColor}`}>
            {item.grade}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          {item.courseName} · {item.enrollment} enrolled
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.topIssues.map((issue) => (
            <span key={issue} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              {issue}
            </span>
          ))}
          {item.autoFixableCount > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              {item.autoFixableCount} auto-fixable
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function ComplianceDashboard() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<ComplianceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser?.email) return
    const controller = new AbortController()

    apiFetch(currentUser.email, '/api/accessibility/compliance?scope=university', { signal: controller.signal })
      .then((d) => setData(d as ComplianceSummary))
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message ?? 'Failed to load compliance data')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [currentUser?.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-gray-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={Shield} label="Compliance Rate" value={`${data.complianceRate}%`} subtitle="B or above" />
        <KPICard icon={FileText} label="Items Scanned" value={data.scannedItems} subtitle={`of ${data.totalContentItems} total`} />
        <KPICard
          icon={AlertTriangle}
          label="Needs Attention"
          value={(data.gradeDistribution.D ?? 0) + (data.gradeDistribution.F ?? 0)}
          subtitle="D or F grade"
        />
        <KPICard
          icon={Wrench}
          label="Auto-Fixable"
          value={data.highImpactQueue.reduce((s, q) => s + q.autoFixableCount, 0)}
          subtitle="issues across all items"
        />
      </div>

      {/* Compliance ring + grade bar */}
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <div className="flex justify-center">
          <ComplianceRing rate={data.complianceRate} label="University Compliance" />
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-gray-700">Grade Distribution</h3>
          <GradeBar grades={data.gradeDistribution} />
          <div className="flex flex-wrap gap-3">
            {(['A', 'B', 'C', 'D', 'F'] as const).map((g) => (
              <div key={g} className="flex items-center gap-1.5">
                <div className={`size-3 rounded-full ${GRADE_COLORS[g]}`} />
                <span className="text-xs text-gray-600">{g}: {data.gradeDistribution[g] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By content type */}
      {data.byType.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-700">
            <BarChart3 className="size-4" />
            By Content Type
          </h3>
          <div className="space-y-3">
            {data.byType.map((item) => (
              <ContentTypeRow key={item.type} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Departments */}
      {data.byDepartment.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-700">
            <Building2 className="size-4" />
            By Department
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.byDepartment.slice(0, 9).map((dept) => (
              <DepartmentCard key={dept.department} dept={dept} />
            ))}
          </div>
        </div>
      )}

      {/* Weekly trend */}
      {data.weeklyTrend.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-700">
            <TrendingUp className="size-4" />
            Weekly Compliance Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickLine={false} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
              <Tooltip
                formatter={(value) => `${Math.round(Number(value) * 100)}%`}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="#0033A0"
                fill="#0033A0"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* High-impact remediation queue */}
      {data.highImpactQueue.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-700">
            <AlertTriangle className="size-4 text-orange-500" />
            High-Impact Remediation Queue
          </h3>
          <p className="mb-3 text-xs text-gray-500">
            Sorted by enrollment × severity. Fix these first for maximum student impact.
          </p>
          <div className="space-y-2">
            {data.highImpactQueue.slice(0, 10).map((item, i) => (
              <QueueItem key={item.targetId} item={item} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
