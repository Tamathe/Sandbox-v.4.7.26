'use client'

import { useRouter } from 'next/navigation'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  BookOpen,
  Award,
  BarChart2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { useApiFetch } from '../../hooks/useApiFetch'
import PageHeader from '../../components/PageHeader'
import AnalyticsSubNav from '../../components/AnalyticsSubNav'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from '../../components/DynamicChart'

// ─── Types ────────────────────────────────────────────────────────────────────

type CohortSession = {
  sessionCount: number
  avgSessionsPerStudent: number
  avgSessionScore: number | null
  completionRate: number | null
  avgDurationSeconds: number | null
}

type CohortGradebook = {
  count: number
  avgAiScore: number | null
  avgFacultyScore: number | null
}

type CohortMastery = {
  total: number
  masteredPct: number | null
  strugglingPct: number | null
}

type ABData = {
  cohortSizes: {
    control: number
    treatment: number
    assigned: number
    total: number
  }
  sessions: { control: CohortSession; treatment: CohortSession }
  gradebook: { control: CohortGradebook; treatment: CohortGradebook }
  mastery: { control: CohortMastery; treatment: CohortMastery }
  weeklyTrend: Array<{ week: string; controlAvg: number | null; treatmentAvg: number | null }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(v: number | null, decimals = 1): string {
  if (v === null) return '—'
  return (v * 100).toFixed(decimals) + '%'
}

function fmtScore(v: number | null): string {
  if (v === null) return '—'
  return (v * 100).toFixed(1) + '%'
}

function fmtDuration(secs: number | null): string {
  if (secs === null) return '—'
  const m = Math.floor(secs / 60)
  return m < 1 ? '<1 min' : `${m} min`
}

function deltaLabel(control: number | null, treatment: number | null) {
  if (control === null || treatment === null) return null
  const diff = treatment - control
  const absDiff = Math.abs(diff)
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const pctStr = (absDiff * 100).toFixed(1)
  return { sign, pctStr, positive: diff > 0, neutral: diff === 0 }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: ReturnType<typeof deltaLabel> }) {
  if (!delta) return <span className="text-gray-400 text-xs">no data</span>
  if (delta.neutral) return <span className="text-gray-500 text-xs flex items-center gap-1"><Minus size={12} />no change</span>
  return (
    <span className={`text-xs font-semibold flex items-center gap-1 ${delta.positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {delta.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {delta.sign}{delta.pctStr}pp treatment lift
    </span>
  )
}

function CohortCompareRow({
  label,
  controlVal,
  treatmentVal,
  delta,
}: {
  label: string
  controlVal: string
  treatmentVal: string
  delta: ReturnType<typeof deltaLabel>
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] items-center py-3 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-800">{controlVal}</span>
      <span className="text-sm font-medium text-blue-700">{treatmentVal}</span>
      <DeltaBadge delta={delta} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ABOutcomesPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const isAdmin = currentUser.role === 'ADMIN'
  const { data, error: swrError, isLoading: loading } = useApiFetch<ABData>(isAdmin ? '/api/analytics/ab-outcomes' : null)
  const error = !!swrError

  if (!isAdmin) {
    if (typeof window !== 'undefined') router.replace('/')
    return null
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="border-2 border-red-200 rounded-2xl p-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>Failed to load A/B outcome data. Please try again.</span>
        </div>
      </div>
    )
  }

  const { cohortSizes, sessions, gradebook, mastery, weeklyTrend } = data
  const sc = sessions.control
  const st = sessions.treatment
  const gc = gradebook.control
  const gt = gradebook.treatment
  const mc = mastery.control
  const mt = mastery.treatment

  // Recharts trend — filter weeks with at least one value
  const trendData = weeklyTrend.map(w => ({
    week: w.week,
    Control: w.controlAvg !== null ? +(w.controlAvg * 100).toFixed(1) : undefined,
    Treatment: w.treatmentAvg !== null ? +(w.treatmentAvg * 100).toFixed(1) : undefined,
  }))

  // Mastery bar chart data
  const masteryBarData = [
    {
      name: 'Mastered',
      Control: mc.masteredPct !== null ? +(mc.masteredPct * 100).toFixed(1) : 0,
      Treatment: mt.masteredPct !== null ? +(mt.masteredPct * 100).toFixed(1) : 0,
    },
    {
      name: 'Struggling',
      Control: mc.strugglingPct !== null ? +(mc.strugglingPct * 100).toFixed(1) : 0,
      Treatment: mt.strugglingPct !== null ? +(mt.strugglingPct * 100).toFixed(1) : 0,
    },
  ]

  const assignedPct = cohortSizes.total > 0
    ? ((cohortSizes.assigned / cohortSizes.total) * 100).toFixed(0)
    : '0'

  return (
    <div>
      <AnalyticsSubNav role={currentUser.role} />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <PageHeader
        title="A/B Outcome Dashboard"
        subtitle="Sandy personalization (treatment) vs. baseline (control) — session scores, completion, and objective mastery"
      />

      {/* ── Cohort size KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border-2 border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Control cohort</p>
          <p className="text-3xl font-extrabold text-gray-800">{cohortSizes.control}</p>
          <p className="text-xs text-gray-400 mt-1">baseline users</p>
        </div>
        <div className="border-2 border-blue-200 rounded-2xl p-4 bg-blue-50">
          <p className="text-xs text-blue-600 mb-1">Treatment cohort</p>
          <p className="text-3xl font-extrabold text-[#0033A0]">{cohortSizes.treatment}</p>
          <p className="text-xs text-blue-400 mt-1">personalized Sandy</p>
        </div>
        <div className="border-2 border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total assigned</p>
          <p className="text-3xl font-extrabold text-gray-800">{cohortSizes.assigned}</p>
          <p className="text-xs text-gray-400 mt-1">{assignedPct}% of platform</p>
        </div>
        <div className="border-2 border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Platform users</p>
          <p className="text-3xl font-extrabold text-gray-800">{cohortSizes.total}</p>
          <p className="text-xs text-gray-400 mt-1">all roles</p>
        </div>
      </div>

      {/* ── Weekly score trend ──────────────────────────────────────────── */}
      <div className="border-2 border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-800">Session Score Trend (8 weeks)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Average AI-assessed session score per cohort. Higher = better learning quality.</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(v) => [`${v}%`]} />
            <Legend />
            <Line
              type="monotone"
              dataKey="Control"
              stroke="#9CA3AF"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="Treatment"
              stroke="#0033A0"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Two-column comparison ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Session engagement */}
        <div className="border-2 border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-[#0033A0]" />
            <h2 className="text-base font-extrabold text-gray-800">Session Engagement</h2>
          </div>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-4 mb-1">
            <span className="text-xs text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">Control</span>
            <span className="text-xs font-semibold text-[#0033A0]">Treatment</span>
            <span className="text-xs text-gray-400">Delta</span>
          </div>
          <CohortCompareRow
            label="Total sessions"
            controlVal={sc.sessionCount.toLocaleString()}
            treatmentVal={st.sessionCount.toLocaleString()}
            delta={null}
          />
          <CohortCompareRow
            label="Sessions / student"
            controlVal={sc.avgSessionsPerStudent.toFixed(1)}
            treatmentVal={st.avgSessionsPerStudent.toFixed(1)}
            delta={deltaLabel(
              sc.avgSessionsPerStudent > 0 ? sc.avgSessionsPerStudent / 20 : null,
              st.avgSessionsPerStudent > 0 ? st.avgSessionsPerStudent / 20 : null
            )}
          />
          <CohortCompareRow
            label="Avg session score"
            controlVal={fmtScore(sc.avgSessionScore)}
            treatmentVal={fmtScore(st.avgSessionScore)}
            delta={deltaLabel(sc.avgSessionScore, st.avgSessionScore)}
          />
          <CohortCompareRow
            label="Completion rate"
            controlVal={pct(sc.completionRate)}
            treatmentVal={pct(st.completionRate)}
            delta={deltaLabel(sc.completionRate, st.completionRate)}
          />
          <CohortCompareRow
            label="Avg duration"
            controlVal={fmtDuration(sc.avgDurationSeconds)}
            treatmentVal={fmtDuration(st.avgDurationSeconds)}
            delta={null}
          />
        </div>

        {/* Gradebook outcomes */}
        <div className="border-2 border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-[#0033A0]" />
            <h2 className="text-base font-extrabold text-gray-800">Gradebook Outcomes</h2>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-4 mb-1">
            <span className="text-xs text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">Control</span>
            <span className="text-xs font-semibold text-[#0033A0]">Treatment</span>
            <span className="text-xs text-gray-400">Delta</span>
          </div>
          <CohortCompareRow
            label="Submissions graded"
            controlVal={gc.count.toLocaleString()}
            treatmentVal={gt.count.toLocaleString()}
            delta={null}
          />
          <CohortCompareRow
            label="Avg AI score"
            controlVal={fmtScore(gc.avgAiScore)}
            treatmentVal={fmtScore(gt.avgAiScore)}
            delta={deltaLabel(gc.avgAiScore, gt.avgAiScore)}
          />
          <CohortCompareRow
            label="Avg faculty score"
            controlVal={fmtScore(gc.avgFacultyScore)}
            treatmentVal={fmtScore(gt.avgFacultyScore)}
            delta={deltaLabel(gc.avgFacultyScore, gt.avgFacultyScore)}
          />
        </div>
      </div>

      {/* ── Mastery comparison ──────────────────────────────────────────── */}
      <div className="border-2 border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-[#0033A0]" />
          <h2 className="text-base font-extrabold text-gray-800">Objective Mastery</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-4 mb-1">
              <span className="text-xs text-gray-400" />
              <span className="text-xs font-semibold text-gray-500">Control</span>
              <span className="text-xs font-semibold text-[#0033A0]">Treatment</span>
              <span className="text-xs text-gray-400">Delta</span>
            </div>
            <CohortCompareRow
              label="Objective attempts"
              controlVal={mc.total.toLocaleString()}
              treatmentVal={mt.total.toLocaleString()}
              delta={null}
            />
            <CohortCompareRow
              label="Mastery rate"
              controlVal={pct(mc.masteredPct)}
              treatmentVal={pct(mt.masteredPct)}
              delta={deltaLabel(mc.masteredPct, mt.masteredPct)}
            />
            <CohortCompareRow
              label="Struggling rate"
              controlVal={pct(mc.strugglingPct)}
              treatmentVal={pct(mt.strugglingPct)}
              delta={deltaLabel(mc.strugglingPct, mt.strugglingPct)}
            />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={masteryBarData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={36} />
              <Tooltip formatter={(v) => [`${v}%`]} />
              <Legend />
              <Bar dataKey="Control" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Treatment" fill="#0033A0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Methodology note ─────────────────────────────────────────────── */}
      <div className="border-2 border-amber-200 rounded-2xl p-4 bg-amber-50">
        <div className="flex items-start gap-3">
          <FlaskConical size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-semibold">Experiment methodology</p>
            <p>New accounts are randomly assigned 50/50 at sign-up via <code className="bg-amber-100 px-1 rounded text-xs">/api/onboarding/create-account</code>. Treatment users receive Sandy personalization (student profile context injection + scaffold guardrails). Control users receive baseline Sandy. Scores are AI-assessed via <code className="bg-amber-100 px-1 rounded text-xs">session-analytics-service</code> post-session.</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
