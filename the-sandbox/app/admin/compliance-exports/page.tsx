'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Shield,
  Database,
  BarChart3,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import { showToast } from '../../components/sandy/Toast'

type Template = {
  id: string
  name: string
  description: string
}

type ComparisonDelta = {
  metric: string
  period1Value: number
  period2Value: number
  change: number
  direction: 'improved' | 'declined' | 'stable'
}

type ComparisonResult = {
  period1: { start: string; end: string }
  period2: { start: string; end: string }
  deltas: ComparisonDelta[]
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default function ComplianceExportsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // Export loading states
  const [exportingItem, setExportingItem] = useState<string | null>(null)

  // Comparison
  const [start1, setStart1] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    return formatDateForInput(d)
  })
  const [end1, setEnd1] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return formatDateForInput(d)
  })
  const [start2, setStart2] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return formatDateForInput(d)
  })
  const [end2, setEnd2] = useState(formatDateForInput(new Date()))
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [comparingLoading, setComparingLoading] = useState(false)
  const [comparisonError, setComparisonError] = useState<string | null>(null)

  const headers: Record<string, string> = currentUser ? { 'x-demo-user-email': currentUser.email } : {}

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      router.push('/')
      return
    }

    fetch('/api/admin/compliance-templates', { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, router])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleExport = useCallback(
    async (key: string, url: string, method: string, filename: string, body?: unknown) => {
      if (exportingItem) return
      setExportingItem(key)
      try {
        const opts: RequestInit = { method, headers: { ...headers, 'Content-Type': 'application/json' } }
        if (body) opts.body = JSON.stringify(body)
        const res = await fetch(url, opts)
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Export failed (${res.status})`)
        }

        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          // JSON response — could be a report generation returning documentId
          const data = await res.json()
          if (data.documentId) {
            alert(`Report generated. Document ID: ${data.documentId}`)
          } else {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            downloadBlob(blob, filename)
          }
        } else {
          const blob = await res.blob()
          downloadBlob(blob, filename)
        }
      } catch (err) {
        showToast(err instanceof Error ? `Export failed: ${err.message}` : 'Export failed')
      } finally {
        setExportingItem(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exportingItem, headers, downloadBlob],
  )

  const handleCompare = async () => {
    setComparingLoading(true)
    setComparisonError(null)
    setComparison(null)
    try {
      const params = new URLSearchParams({ start1, end1, start2, end2 })
      const res = await fetch(`/api/admin/compliance-comparison?${params}`, { headers })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Comparison failed')
      }
      setComparison(await res.json())
    } catch (e) {
      setComparisonError(e instanceof Error ? e.message : 'Comparison failed')
    } finally {
      setComparingLoading(false)
    }
  }

  if (!currentUser || currentUser.role !== 'ADMIN') return null

  const isExporting = (key: string) => exportingItem === key

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Compliance Exports"
        subtitle="Download compliance data, generate reports, and compare time periods"
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Section 1: Data Exports */}
        <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Database className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-900">Data Exports</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Export compliance data in various formats for external systems and auditors.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ExportButton
              label="SIEM / CEF Export"
              description="Security event feed"
              icon={Shield}
              loading={isExporting('siem')}
              onClick={() => handleExport('siem', '/api/admin/compliance-export/siem', 'POST', 'compliance-siem-export.cef')}
            />
            <ExportButton
              label="User CSV Export"
              description="User compliance data"
              icon={Download}
              loading={isExporting('csv')}
              onClick={() => handleExport('csv', '/api/admin/compliance-export/csv', 'POST', 'compliance-users.csv')}
            />
            <ExportButton
              label="Audit Chain (JSON)"
              description="Tamper-evident log"
              icon={FileText}
              loading={isExporting('chain-json')}
              onClick={() => handleExport('chain-json', '/api/admin/compliance-audit-chain/export?format=json', 'GET', 'audit-chain.json')}
            />
            <ExportButton
              label="Audit Chain (CSV)"
              description="Spreadsheet format"
              icon={FileText}
              loading={isExporting('chain-csv')}
              onClick={() => handleExport('chain-csv', '/api/admin/compliance-audit-chain/export?format=csv', 'GET', 'audit-chain.csv')}
            />
          </div>
        </div>

        {/* Section 2: Reports */}
        <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-900">Reports</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Generate compliance reports from pre-defined templates.
          </p>
          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No report templates available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="border-2 border-gray-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{t.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      handleExport(
                        `report-${t.id}`,
                        '/api/admin/compliance-reports/generate-from-template',
                        'POST',
                        `${t.name.toLowerCase().replace(/\s+/g, '-')}.html`,
                        { templateId: t.id },
                      )
                    }
                    disabled={!!exportingItem}
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#0033A0] hover:bg-[#002480] disabled:opacity-50 rounded-lg px-3 py-2 transition-colors"
                  >
                    {isExporting(`report-${t.id}`) ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileText className="size-3.5" />
                    )}
                    Generate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Metrics */}
        <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-900">Metrics</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Export metric snapshots or capture a new one.
          </p>
          <div className="flex flex-wrap gap-3">
            <ExportButton
              label="Export Metrics CSV"
              description="All snapshot history"
              icon={Download}
              loading={isExporting('metrics-csv')}
              onClick={() => handleExport('metrics-csv', '/api/admin/compliance-metrics/export', 'GET', 'compliance-metrics.csv')}
            />
            <ExportButton
              label="Capture Snapshot"
              description="Record current values"
              icon={BarChart3}
              loading={isExporting('capture')}
              onClick={() => handleExport('capture', '/api/admin/compliance-metrics/capture', 'POST', 'snapshot.json')}
            />
          </div>
        </div>

        {/* Section 4: Compliance Comparison */}
        <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-900">Compliance Comparison</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Compare compliance metrics across two time periods to track improvement or regression.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Period 1 (Baseline)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Start</label>
                  <input
                    type="date"
                    value={start1}
                    onChange={(e) => setStart1(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">End</label>
                  <input
                    type="date"
                    value={end1}
                    onChange={(e) => setEnd1(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/50"
                  />
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Period 2 (Current)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Start</label>
                  <input
                    type="date"
                    value={start2}
                    onChange={(e) => setStart2(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">End</label>
                  <input
                    type="date"
                    value={end2}
                    onChange={(e) => setEnd2(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/50"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={comparingLoading}
            className="flex items-center gap-2 text-sm font-semibold text-white bg-[#0033A0] hover:bg-[#002480] disabled:opacity-50 rounded-lg px-5 py-2.5 transition-colors"
          >
            {comparingLoading ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
            Compare Periods
          </button>

          {comparisonError && (
            <div className="mt-4 border border-red-200 rounded-xl p-4 bg-red-50 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              {comparisonError}
            </div>
          )}

          {comparison && (
            <div className="mt-6">
              <h3 className="font-bold text-sm text-gray-700 mb-3">Results</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {comparison.deltas.map((delta) => (
                  <DeltaCard key={delta.metric} delta={delta} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ExportButton({
  label,
  description,
  icon: Icon,
  loading,
  onClick,
}: {
  label: string
  description: string
  icon: typeof Download
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl p-4 hover:border-[#0033A0]/30 hover:shadow-md hover:-translate-y-0.5 transition-all text-left disabled:opacity-50"
    >
      <div className="size-10 rounded-lg bg-[#0033A0]/5 flex items-center justify-center shrink-0">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-[#0033A0]" />
        ) : (
          <Icon className="size-5 text-[#0033A0]" />
        )}
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </button>
  )
}

function DeltaCard({ delta }: { delta: ComparisonDelta }) {
  const colorMap = {
    improved: 'border-green-200 bg-green-50',
    declined: 'border-red-200 bg-red-50',
    stable: 'border-gray-200 bg-gray-50',
  }

  const iconMap = {
    improved: TrendingUp,
    declined: TrendingDown,
    stable: Minus,
  }

  const textColorMap = {
    improved: 'text-green-700',
    declined: 'text-red-700',
    stable: 'text-gray-600',
  }

  const badgeMap = {
    improved: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    stable: 'bg-gray-100 text-gray-600',
  }

  const Icon = iconMap[delta.direction]

  return (
    <div className={`border rounded-xl p-4 ${colorMap[delta.direction]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 truncate pr-2">{delta.metric}</span>
        <Icon className={`size-4 shrink-0 ${textColorMap[delta.direction]}`} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-gray-400">P1: {delta.period1Value}</div>
          <div className="text-xs text-gray-400">P2: {delta.period2Value}</div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeMap[delta.direction]}`}>
          {delta.change > 0 ? '+' : ''}{delta.change}
        </span>
      </div>
    </div>
  )
}
