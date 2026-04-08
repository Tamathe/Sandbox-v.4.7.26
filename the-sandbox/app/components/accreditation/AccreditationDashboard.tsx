'use client'

import { useState } from 'react'
import { Shield, FileText, AlertTriangle, TrendingUp } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { useApiFetch } from '../../hooks/useApiFetch'
import ReadinessGauge from './ReadinessGauge'
import StandardsGrid from './StandardsGrid'
import StandardDetailPanel from './StandardDetailPanel'
import ComplianceTrendChart from './ComplianceTrendChart'
import CycleTimeline from './CycleTimeline'
import HarvestStatusBanner from './HarvestStatusBanner'
import { useAccreditationStandards } from '../../hooks/useAccreditationStandards'
import type { ComplianceDashboard as DashboardData } from '../../lib/accreditation/types'

export default function AccreditationDashboard() {
  const { currentUser } = useAuth()
  const { data: dashboard } = useApiFetch<DashboardData>(currentUser ? '/api/accreditation/dashboard' : null)
  const { standards, loading: standardsLoading } = useAccreditationStandards()
  const [selectedStandardId, setSelectedStandardId] = useState<string | null>(null)

  const loading = standardsLoading || !dashboard

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="text-center py-16">
        <Shield className="size-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-extrabold text-gray-900">No Active Accreditation Cycle</h2>
        <p className="text-sm text-gray-500 mt-2">
          Run the seed script to create SACSCOC standards and an initial cycle.
        </p>
        <code className="mt-3 inline-block text-xs bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600">
          npx tsx scripts/seed-accreditation-standards.ts
        </code>
      </div>
    )
  }

  const d = dashboard

  // Build standards grid data
  const gridStandards = standards.map((s: Record<string, unknown>) => {
    const evidence = (s.evidence as { quality: string; qualityScore: number }[]) ?? []
    const gaps = (s.gaps as { severity: string }[]) ?? []
    const narratives = (s.narratives as { status: string }[]) ?? []
    const avgQ = evidence.length > 0
      ? evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / evidence.length
      : 0
    const ql = avgQ >= 0.8 ? 'EXCELLENT' : avgQ >= 0.6 ? 'GOOD' : avgQ >= 0.4 ? 'FAIR' : avgQ >= 0.2 ? 'WEAK' : 'MISSING'

    return {
      id: s.id as string,
      standardNumber: s.standardNumber as string,
      standardTitle: s.standardTitle as string,
      evidenceCount: evidence.length,
      quality: evidence.length > 0 ? ql : 'MISSING',
      gapCount: gaps.length,
      narrativeStatus: narratives[0]?.status ?? 'NOT_STARTED',
      isAutoHarvestable: s.autoHarvestable as boolean,
    }
  })

  // Last harvest date
  const lastHarvest = d.recentActivity.length > 0 ? d.recentActivity[0].date : null

  return (
    <div className="space-y-8">
      {/* Cycle Timeline */}
      <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
        <CycleTimeline
          phase={d.phase}
          cycleStartDate="2024-01-01"
          cycleEndDate="2034-12-31"
          siteVisitDate={d.siteVisitDate ? new Date(d.siteVisitDate).toISOString() : null}
          selfStudyDue={null}
        />
      </div>

      {/* Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readiness Gauge */}
        <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white flex items-center justify-center">
          <ReadinessGauge
            readiness={d.overallReadiness}
            phase={d.phase}
            daysUntilSiteVisit={d.daysUntilSiteVisit}
          />
        </div>

        {/* Summary Cards */}
        <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <FileText className="size-4" /> Standards
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-extrabold text-green-600">{d.standardsSummary.met}</div>
              <div className="text-xs text-gray-500">Met</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-500">{d.standardsSummary.partial}</div>
              <div className="text-xs text-gray-500">Partial</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-red-500">{d.standardsSummary.gapped}</div>
              <div className="text-xs text-gray-500">Gapped</div>
            </div>
          </div>
        </div>

        <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="size-4" /> Gaps
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {d.gapSummary.critical > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-center">
                <div className="text-xl font-extrabold text-red-600">{d.gapSummary.critical}</div>
                <div className="text-xs text-red-500">Critical</div>
              </div>
            )}
            {d.gapSummary.major > 0 && (
              <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-center">
                <div className="text-xl font-extrabold text-orange-600">{d.gapSummary.major}</div>
                <div className="text-xs text-orange-500">Major</div>
              </div>
            )}
            {d.gapSummary.minor > 0 && (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-center">
                <div className="text-xl font-extrabold text-amber-600">{d.gapSummary.minor}</div>
                <div className="text-xs text-amber-500">Minor</div>
              </div>
            )}
            {d.gapSummary.critical + d.gapSummary.major + d.gapSummary.minor === 0 && (
              <div className="col-span-2 text-center text-sm text-green-600 font-medium py-2">
                No open gaps
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Harvest Status */}
      <HarvestStatusBanner
        lastHarvestDate={lastHarvest ? new Date(lastHarvest).toISOString() : null}
        evidenceCount={gridStandards.reduce((sum, s) => sum + s.evidenceCount, 0)}
      />

      {/* Trend Chart */}
      {d.trendData.length > 0 && (
        <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="size-4" /> Readiness Trend
          </h3>
          <ComplianceTrendChart data={d.trendData} />
        </div>
      )}

      {/* Standards Grid */}
      <div>
        <h3 className="text-lg font-extrabold text-gray-900 mb-4">Standards Compliance</h3>
        <StandardsGrid standards={gridStandards} onSelect={setSelectedStandardId} />
      </div>

      {/* Detail Panel */}
      {selectedStandardId && (
        <StandardDetailPanel
          standardId={selectedStandardId}
          onClose={() => setSelectedStandardId(null)}
        />
      )}
    </div>
  )
}
