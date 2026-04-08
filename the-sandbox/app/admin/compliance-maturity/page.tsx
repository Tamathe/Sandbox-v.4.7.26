'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Shield,
  BookOpen,
  Server,
  Bell,
  BarChart3,
  Lightbulb,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'

type MaturityDimension = {
  name: string
  level: 1 | 2 | 3 | 4 | 5
  score: number
  findings: string[]
}

type MaturityAssessment = {
  overallLevel: 1 | 2 | 3 | 4 | 5
  overallScore: number
  dimensions: MaturityDimension[]
  recommendations: string[]
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Initial',
  2: 'Developing',
  3: 'Defined',
  4: 'Managed',
  5: 'Optimizing',
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-800 border-red-200',
  2: 'bg-amber-100 text-amber-800 border-amber-200',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  4: 'bg-blue-100 text-blue-800 border-blue-200',
  5: 'bg-green-100 text-green-800 border-green-200',
}

const LEVEL_BAR_COLORS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-green-500',
}

const DIMENSION_ICONS: Record<string, typeof Shield> = {
  'Policy & Governance': Shield,
  'Training & Awareness': BookOpen,
  'Technical Controls': Server,
  'Incident Management': Bell,
  'Monitoring & Improvement': BarChart3,
}

export default function ComplianceMaturityPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<MaturityAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      router.push('/')
      return
    }

    const headers = { 'x-demo-user-email': currentUser.email }

    fetch('/api/admin/compliance-maturity', { headers })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load maturity assessment')
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
        title="Compliance Maturity Assessment"
        subtitle="Institutional compliance maturity across 5 dimensions"
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
            <span className="ml-3 text-gray-500">Assessing compliance maturity...</span>
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
            {/* Hero: Overall Maturity Score */}
            <div className="border-2 border-gray-200 rounded-2xl p-8 bg-white">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="size-28 rounded-full border-4 border-[#0033A0] flex items-center justify-center bg-[#0033A0]/5">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-[#0033A0]">{data.overallLevel}</div>
                      <div className="text-xs text-[#0033A0]/70 font-medium">of 5</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-extrabold text-gray-900">
                    Overall Maturity: Level {data.overallLevel} — {LEVEL_LABELS[data.overallLevel]}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Average score: {data.overallScore}/100 across all dimensions
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${LEVEL_BAR_COLORS[data.overallLevel]}`}
                        style={{ width: `${data.overallScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-600">{data.overallScore}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dimension Bars (visual maturity chart) */}
            <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Maturity by Dimension</h2>
              <div className="space-y-4">
                {data.dimensions.map((dim) => {
                  const Icon = DIMENSION_ICONS[dim.name] || Shield
                  return (
                    <div key={dim.name} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <Icon className="size-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-700 truncate">{dim.name}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${LEVEL_BAR_COLORS[dim.level]}`}
                            style={{ width: `${dim.score}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                            {dim.score}%
                          </span>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${LEVEL_COLORS[dim.level]}`}
                        >
                          L{dim.level} {LEVEL_LABELS[dim.level]}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dimension Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.dimensions.map((dim) => {
                const Icon = DIMENSION_ICONS[dim.name] || Shield
                return (
                  <div key={dim.name} className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="size-5 text-[#0033A0]" />
                        <h3 className="font-bold text-gray-900">{dim.name}</h3>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${LEVEL_COLORS[dim.level]}`}
                      >
                        Level {dim.level}
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Score</span>
                        <span className="font-medium">{dim.score}/100</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${LEVEL_BAR_COLORS[dim.level]}`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Findings</p>
                      {dim.findings.map((finding, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          {dim.level >= 4 ? (
                            <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <span>{finding}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recommendations */}
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

            {/* Level Legend */}
            <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
              <h3 className="font-bold text-gray-900 mb-3">Maturity Level Reference</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {([1, 2, 3, 4, 5] as const).map((level) => (
                  <div
                    key={level}
                    className={`rounded-xl p-3 text-center border ${level === data.overallLevel ? 'ring-2 ring-[#0033A0] ring-offset-1' : ''} ${LEVEL_COLORS[level]}`}
                  >
                    <div className="font-extrabold text-lg">{level}</div>
                    <div className="text-xs font-medium">{LEVEL_LABELS[level]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
