'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'

type CriterionStatus = 'ready' | 'needs-attention' | 'not-ready'

type ReadinessCriterion = {
  name: string
  status: CriterionStatus
  details: string
}

type ReadinessResult = {
  readyForAudit: boolean
  score: number
  criteria: ReadinessCriterion[]
  recommendations: string[]
}

const STATUS_CONFIG: Record<CriterionStatus, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  ready: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Ready' },
  'needs-attention': { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Needs Attention' },
  'not-ready': { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Not Ready' },
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 border-green-400'
  if (score >= 50) return 'text-amber-600 border-amber-400'
  return 'text-red-600 border-red-400'
}

function scoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-50'
  if (score >= 50) return 'bg-amber-50'
  return 'bg-red-50'
}

function readinessBadge(result: ReadinessResult) {
  if (result.readyForAudit) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
        <CheckCircle className="size-4" />
        Ready for Audit
      </span>
    )
  }
  if (result.score >= 50) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
        <AlertTriangle className="size-4" />
        Needs Attention
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-semibold">
      <XCircle className="size-4" />
      Not Ready
    </span>
  )
}

export default function ComplianceReadinessPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<ReadinessResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      router.push('/')
      return
    }

    const headers = { 'x-demo-user-email': currentUser.email }

    fetch('/api/admin/compliance-readiness', { headers })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load readiness assessment')
        return r.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [currentUser, router])

  if (!currentUser || currentUser.role !== 'ADMIN') return null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Audit Readiness Assessment"
        subtitle="Pre-audit readiness check across 10 compliance criteria"
        action={
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0033A0] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Admin
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-[#0033A0]" />
            <span className="ml-3 text-gray-500">Evaluating readiness...</span>
          </div>
        )}

        {error && (
          <div className="border-2 border-red-200 rounded-2xl p-6 bg-red-50 text-red-700">
            <AlertTriangle className="size-5 inline mr-2" />
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Hero: Readiness Score Circle */}
            <div className="border-2 border-gray-200 rounded-2xl p-8 bg-white">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <div
                    className={`size-32 rounded-full border-4 flex items-center justify-center ${scoreColor(data.score)} ${scoreBgColor(data.score)}`}
                  >
                    <div className="text-center">
                      <div className="text-4xl font-extrabold">{data.score}</div>
                      <div className="text-xs font-medium opacity-70">of 100</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                    <ShieldCheck className="size-6 text-[#0033A0]" />
                    <h2 className="text-xl font-extrabold text-gray-900">Audit Readiness Score</h2>
                  </div>
                  <div className="mb-3">{readinessBadge(data)}</div>
                  <p className="text-sm text-gray-500">
                    {data.criteria.filter((c) => c.status === 'ready').length} of {data.criteria.length} criteria ready
                    {' — '}
                    {data.criteria.filter((c) => c.status === 'not-ready').length} not ready
                    {', '}
                    {data.criteria.filter((c) => c.status === 'needs-attention').length} needs attention
                  </p>
                </div>
              </div>
            </div>

            {/* Criteria Cards: 2x5 grid */}
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Readiness Criteria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.criteria.map((criterion) => {
                  const config = STATUS_CONFIG[criterion.status]
                  const Icon = config.icon
                  return (
                    <div
                      key={criterion.name}
                      className={`border-2 rounded-2xl p-5 ${config.bg}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`size-5 shrink-0 mt-0.5 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 text-sm">{criterion.name}</h3>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${config.color} bg-white/60`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{criterion.details}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="size-5 text-[#0033A0]" />
                  <h2 className="text-lg font-extrabold text-gray-900">Recommendations</h2>
                </div>
                <div className="space-y-3">
                  {data.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className="size-6 rounded-full bg-[#0033A0]/10 text-[#0033A0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
