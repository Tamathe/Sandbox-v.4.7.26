'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, FileText, BarChart3 } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import StanceDriftChart from '../../../components/ai-literacy/StanceDriftChart'
import LoadingSpinner from '../../../components/LoadingSpinner'

interface PulseData {
  totalCourses: number
  coursesWithPolicy: number
  policyCoverage: number
  stanceDistribution: Record<string, number>
  totalProfilesWithStance: number
  trendVsLastMonth: { policyCoverageChange: number; newStances: number }
  departmentBreakdown: { department: string; totalCourses: number; withPolicy: number; coverage: number }[]
}

interface DriftData {
  monthly: { month: string; stances: Record<string, number> }[]
  movements: { from: string; to: string; count: number }[]
  netDirection: number
  narrative: string
  totalChanges: number
}

const STANCE_LABELS: Record<string, string> = {
  PROHIBIT: 'Prohibit',
  CAUTIOUS: 'Cautious',
  GUIDED: 'Guided',
  INTEGRATE: 'Integrate',
  REQUIRE: 'Require',
}

const STANCE_COLORS: Record<string, string> = {
  PROHIBIT: 'bg-red-500',
  CAUTIOUS: 'bg-amber-500',
  GUIDED: 'bg-blue-500',
  INTEGRATE: 'bg-indigo-500',
  REQUIRE: 'bg-green-500',
}

export default function CampusPulsePage() {
  const { currentUser } = useAuth()
  const [pulse, setPulse] = useState<PulseData | null>(null)
  const [drift, setDrift] = useState<DriftData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/pulse', {
          headers: { 'x-demo-user-email': currentUser.email },
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setPulse(data.pulse)
          setDrift(data.drift)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
      setLoading(false)
    }
    void load()
    return () => controller.abort()
  }, [currentUser.email])

  if (loading) {
    return (
      <>
        <PageHeader title="Campus AI Pulse" subtitle="Institution-wide AI literacy readiness" />
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  if (!pulse) return null

  const totalStances = Object.values(pulse.stanceDistribution).reduce((s, n) => s + n, 0)

  return (
    <>
      <PageHeader title="Campus AI Pulse" subtitle="Institution-wide AI literacy readiness" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<FileText className="size-5 text-[#0033A0]" />}
            label="Policy Coverage"
            value={`${pulse.policyCoverage}%`}
            subtext={`${pulse.coursesWithPolicy} of ${pulse.totalCourses} courses`}
            trend={pulse.trendVsLastMonth.policyCoverageChange}
          />
          <KPICard
            icon={<Users className="size-5 text-[#0033A0]" />}
            label="Faculty with Stances"
            value={String(pulse.totalProfilesWithStance)}
            subtext={`${pulse.trendVsLastMonth.newStances} new this month`}
          />
          <KPICard
            icon={<BarChart3 className="size-5 text-[#0033A0]" />}
            label="Total Courses"
            value={String(pulse.totalCourses)}
            subtext="across all departments"
          />
          <KPICard
            icon={<TrendingUp className="size-5 text-[#0033A0]" />}
            label="Coverage Trend"
            value={`${pulse.trendVsLastMonth.policyCoverageChange >= 0 ? '+' : ''}${pulse.trendVsLastMonth.policyCoverageChange}%`}
            subtext="vs last month"
            trend={pulse.trendVsLastMonth.policyCoverageChange}
          />
        </div>

        {/* Stance Distribution + Drift */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribution */}
          <div className="border rounded-2xl shadow-sm p-5 bg-white">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Stance Distribution</h3>
            {totalStances > 0 ? (
              <div className="space-y-2">
                {Object.entries(pulse.stanceDistribution).map(([stance, count]) => {
                  const pct = Math.round((count / totalStances) * 100)
                  return (
                    <div key={stance} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-20">{STANCE_LABELS[stance]}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STANCE_COLORS[stance]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{count} ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No stance data yet.</p>
            )}
          </div>

          {/* Drift */}
          <div className="border rounded-2xl shadow-sm p-5 bg-white">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Stance Drift</h3>
            {drift ? (
              <StanceDriftChart {...drift} />
            ) : (
              <p className="text-sm text-gray-500">No drift data yet.</p>
            )}
          </div>
        </div>

        {/* Department Breakdown */}
        {pulse.departmentBreakdown.length > 0 && (
          <div className="border rounded-2xl shadow-sm p-5 bg-white">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Department Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium text-right">Courses</th>
                    <th className="pb-2 font-medium text-right">With Policy</th>
                    <th className="pb-2 font-medium text-right">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {pulse.departmentBreakdown.map(d => (
                    <tr key={d.department} className="border-b border-gray-50">
                      <td className="py-2 text-gray-900">{d.department}</td>
                      <td className="py-2 text-right text-gray-600">{d.totalCourses}</td>
                      <td className="py-2 text-right text-gray-600">{d.withPolicy}</td>
                      <td className="py-2 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          d.coverage >= 80 ? 'bg-green-100 text-green-700' :
                          d.coverage >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {d.coverage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function KPICard({ icon, label, value, subtext, trend }: {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
  trend?: number
}) {
  return (
    <div className="border rounded-2xl shadow-sm p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {subtext}
        {trend !== undefined && trend !== 0 && (
          <span className={`ml-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↑' : '↓'}
          </span>
        )}
      </p>
    </div>
  )
}
