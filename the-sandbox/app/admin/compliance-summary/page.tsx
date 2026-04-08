'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'

type RiskData = {
  overallScore: number
  riskLevel: string
  breakdown: Array<{ category: string; score: number; description: string }>
}

type AnalyticsData = {
  totalUsers: number
  scoreDistribution: Array<{ bucket: string; count: number }>
  ferpaFunnel: Array<{ stage: string; count: number }>
  incidentMetrics: Array<{ severity: string; total: number; open: number }>
}

type MatrixRegulation = {
  regulation: string
  requirements: Array<{ requirement: string; status: string }>
}

type Benchmark = {
  id: string
  name: string
  metric: string
  targetValue: number
  currentValue: number
  unit: string
}

type AuditChainEntry = {
  id: string
  sequenceNumber: number
  eventType: string
  actorEmail: string
  timestamp: string
}

type Communication = {
  id: string
  type: string
  subject: string
  sentAt: string
}

export default function ComplianceSummaryPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [matrixData, setMatrixData] = useState<MatrixRegulation[] | null>(null)
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [chainEntries, setChainEntries] = useState<AuditChainEntry[]>([])
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      router.push('/')
      return
    }

    const headers = { 'x-demo-user-email': currentUser.email }

    Promise.all([
      fetch('/api/admin/compliance-risk', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/compliance-analytics', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/compliance-matrix', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/compliance-benchmarks', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/compliance-audit-chain?limit=5', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/compliance-communications?days=30', { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([risk, analytics, matrix, bench, chain, comms]) => {
        if (risk) setRiskData(risk)
        if (analytics) setAnalyticsData(analytics)
        if (matrix?.regulations) setMatrixData(matrix.regulations)
        if (bench?.benchmarks) setBenchmarks(bench.benchmarks.slice(0, 4))
        if (chain?.entries) setChainEntries(chain.entries)
        if (comms?.communications) setCommunications(comms.communications.slice(0, 3))
      })
      .finally(() => setLoading(false))
  }, [currentUser, router])

  if (!currentUser || currentUser.role !== 'ADMIN') return null

  // Compute KPIs from fetched data
  const avgComplianceScore = riskData?.overallScore ?? 0
  const ferpaTrainingRate = analyticsData?.ferpaFunnel
    ? (() => {
        const total = analyticsData.ferpaFunnel.find((f) => f.stage === 'Total Educators')?.count ?? 0
        const passed = analyticsData.ferpaFunnel.find((f) => f.stage === 'Passed Training')?.count ?? 0
        return total > 0 ? Math.round((passed / total) * 100) : 0
      })()
    : 0
  const consentCoverage = riskData?.breakdown?.find((b) => b.category.toLowerCase().includes('consent'))?.score ?? 0
  const activeIncidents = analyticsData?.incidentMetrics?.reduce((sum, m) => sum + m.open, 0) ?? 0

  // Compute matrix summary for stacked bars
  const matrixSummary = (matrixData ?? []).map((reg) => {
    const met = reg.requirements.filter((r) => r.status === 'met').length
    const partial = reg.requirements.filter((r) => r.status === 'partial').length
    const unmet = reg.requirements.filter((r) => r.status === 'unmet' || r.status === 'not-implemented').length
    return { regulation: reg.regulation, met, partial, unmet, total: met + partial + unmet }
  })

  const handleExportReport = async () => {
    try {
      const res = await fetch('/api/admin/compliance-report/export', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'compliance-executive-report.html'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Compliance Summary"
        subtitle="Executive overview of institutional compliance posture"
        action={
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="size-4" />
            Back to Admin
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Row 1: Institutional Risk */}
            {riskData && (
              <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <h2 className="text-base font-extrabold text-gray-900 mb-4">Institutional Risk</h2>
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`relative flex items-center justify-center rounded-full border-4 ${
                        riskData.overallScore >= 80
                          ? 'border-emerald-400'
                          : riskData.overallScore >= 50
                            ? 'border-amber-400'
                            : 'border-red-400'
                      }`}
                      style={{ width: 96, height: 96 }}
                    >
                      <span
                        className={`text-3xl font-extrabold ${
                          riskData.overallScore >= 80
                            ? 'text-emerald-600'
                            : riskData.overallScore >= 50
                              ? 'text-amber-600'
                              : 'text-red-600'
                        }`}
                      >
                        {riskData.overallScore}
                      </span>
                    </div>
                    <span
                      className={`mt-2 rounded-full px-3 py-0.5 text-xs font-semibold uppercase ${
                        riskData.riskLevel === 'low'
                          ? 'bg-emerald-100 text-emerald-700'
                          : riskData.riskLevel === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : riskData.riskLevel === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {riskData.riskLevel} risk
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1">
                    {riskData.breakdown.slice(0, 3).map((item) => (
                      <div key={item.category} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-500">{item.category}</span>
                          <span
                            className={`text-sm font-bold ${
                              item.score >= 80
                                ? 'text-emerald-600'
                                : item.score >= 50
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {item.score}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 mb-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              item.score >= 80
                                ? 'bg-emerald-400'
                                : item.score >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                            }`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 leading-tight">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Row 2: 4 KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: 'Avg Compliance Score',
                  value: `${avgComplianceScore}`,
                  icon: Shield,
                  color: avgComplianceScore >= 80 ? 'text-emerald-600' : avgComplianceScore >= 50 ? 'text-amber-600' : 'text-red-600',
                },
                {
                  label: 'FERPA Training Rate',
                  value: `${ferpaTrainingRate}%`,
                  icon: Users,
                  color: ferpaTrainingRate >= 80 ? 'text-emerald-600' : ferpaTrainingRate >= 50 ? 'text-amber-600' : 'text-red-600',
                },
                {
                  label: 'Consent Coverage',
                  value: `${consentCoverage}%`,
                  icon: CheckCircle,
                  color: consentCoverage >= 80 ? 'text-emerald-600' : consentCoverage >= 50 ? 'text-amber-600' : 'text-red-600',
                },
                {
                  label: 'Active Incidents',
                  value: `${activeIncidents}`,
                  icon: AlertTriangle,
                  color: activeIncidents === 0 ? 'text-emerald-600' : activeIncidents <= 3 ? 'text-amber-600' : 'text-red-600',
                },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border-2 border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className="size-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpi.label}</span>
                  </div>
                  <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Row 3: Regulatory Compliance Matrix Summary */}
            {matrixSummary.length > 0 && (
              <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <h2 className="text-base font-extrabold text-gray-900 mb-4">Regulatory Compliance Matrix</h2>
                <div className="space-y-3">
                  {matrixSummary.map((reg) => (
                    <div key={reg.regulation}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">{reg.regulation}</span>
                        <span className="text-xs text-gray-400">
                          {reg.met} met / {reg.partial} partial / {reg.unmet} unmet
                        </span>
                      </div>
                      <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                        {reg.total > 0 && (
                          <>
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${(reg.met / reg.total) * 100}%` }}
                            />
                            <div
                              className="bg-amber-400 transition-all"
                              style={{ width: `${(reg.partial / reg.total) * 100}%` }}
                            />
                            <div
                              className="bg-red-400 transition-all"
                              style={{ width: `${(reg.unmet / reg.total) * 100}%` }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-emerald-500" /> Met
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-amber-400" /> Partial
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-red-400" /> Unmet
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Row 4: Benchmark Status */}
            {benchmarks.length > 0 && (
              <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <h2 className="text-base font-extrabold text-gray-900 mb-4">Key Benchmarks</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {benchmarks.map((b) => {
                    const pct = b.targetValue > 0 ? Math.round((b.currentValue / b.targetValue) * 100) : 0
                    const atTarget = b.currentValue >= b.targetValue
                    return (
                      <div key={b.id} className="rounded-xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">{b.name}</span>
                          {atTarget ? (
                            <CheckCircle className="size-4 text-emerald-500" />
                          ) : (
                            <TrendingUp className="size-4 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className={`text-2xl font-bold ${atTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {b.currentValue}
                            {b.unit === '%' ? '%' : ''}
                          </span>
                          <span className="text-xs text-gray-400">
                            / {b.targetValue}
                            {b.unit === '%' ? '%' : ''} target
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100">
                          <div
                            className={`h-1.5 rounded-full transition-all ${atTarget ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Row 5: Recent Activity */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Audit Chain Entries */}
              <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <h2 className="text-base font-extrabold text-gray-900 mb-4">Recent Audit Chain</h2>
                {chainEntries.length === 0 ? (
                  <p className="text-sm text-gray-500">No audit chain entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {chainEntries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <div>
                          <span className="text-xs font-semibold text-[#0033A0]">#{e.sequenceNumber}</span>
                          <span className="ml-2 text-xs text-gray-700">{e.eventType}</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {e.actorEmail} &middot; {format(new Date(e.timestamp), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Communications */}
              <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <h2 className="text-base font-extrabold text-gray-900 mb-4">Recent Communications</h2>
                {communications.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent compliance communications.</p>
                ) : (
                  <div className="space-y-2">
                    {communications.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <div>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                            {c.type}
                          </span>
                          <span className="ml-2 text-xs text-gray-700">{c.subject}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{format(new Date(c.sentAt), 'MMM d')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                style={{ color: '#0033A0' }}
              >
                <Shield className="size-4" />
                View Full Compliance Tab
              </Link>
              <button
                type="button"
                onClick={() => void handleExportReport()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002880]"
              >
                <Download className="size-4" />
                Export Executive Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
