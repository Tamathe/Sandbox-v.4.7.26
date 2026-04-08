'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'
import { RegistrarLayout } from '../components/registrar/RegistrarLayout'
import { GraduationPipeline } from '../components/registrar/GraduationPipeline'
import SandyTriageCard from '../components/registrar/SandyTriageCard'
import EnrollmentPulse from '../components/registrar/EnrollmentPulse'
import ComplianceWidget from '../components/registrar/ComplianceWidget'
import { GraduationCap, FileText, ArrowLeftRight, AlertTriangle, BarChart3, BookOpen, Info } from 'lucide-react'
import Link from 'next/link'
import type { GraduationPipelineData } from '../lib/registrar/graduation-pipeline'
import type { TriageInsight } from '../lib/registrar/triage-intelligence'
import type { EnrollmentPulseData } from '../lib/registrar/enrollment-pulse'
import type { ComplianceCalendarData } from '../lib/registrar/compliance-calendar'

interface Analytics {
  enrollment: { usersByRole: { role: string; count: number }[] }
  petitions: {
    byStatus: { status: string; count: number }[]
    byType: { type: string; count: number }[]
  }
  articulation: { byStatus: { status: string; count: number }[] }
  degreeAudit: { total: number; needingReview: number }
}

export default function RegistrarDashboard() {
  const { currentUser } = useAuth()

  // ── Analytics (compact stat strip) ─────────────────────────────────────────
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // ── Graduation pipeline ────────────────────────────────────────────────────
  const [pipeline, setPipeline] = useState<GraduationPipelineData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  // ── Triage insights ────────────────────────────────────────────────────────
  const [insights, setInsights] = useState<TriageInsight[] | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  // ── Enrollment pulse ───────────────────────────────────────────────────────
  const [enrollment, setEnrollment] = useState<EnrollmentPulseData | null>(null)
  const [enrollmentLoading, setEnrollmentLoading] = useState(true)

  // ── Compliance calendar ────────────────────────────────────────────────────
  const [compliance, setCompliance] = useState<ComplianceCalendarData | null>(null)
  const [complianceLoading, setComplianceLoading] = useState(true)

  const headers = { 'x-demo-user-email': currentUser.email }

  // Fetch all data on mount
  useEffect(() => {
    const fetchAll = async () => {
      const [analyticsRes, pipelineRes, triageRes, enrollmentRes, complianceRes] = await Promise.allSettled([
        fetch('/api/registrar/analytics', { headers }),
        fetch('/api/registrar/graduation-pipeline', { headers }),
        fetch('/api/registrar/triage', { headers }),
        fetch('/api/registrar/enrollment-pulse', { headers }),
        fetch('/api/registrar/compliance-calendar', { headers }),
      ])

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        const data = await analyticsRes.value.json()
        setAnalytics(data)
        // Dispatch Sandy proactive with stale petition count
        const staleCount = (data.petitions?.byStatus ?? [])
          .filter((s: { status: string; count: number }) => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW')
          .reduce((sum: number, s: { status: string; count: number }) => sum + s.count, 0)
        window.dispatchEvent(new CustomEvent('sandy-proactive-registrar', { detail: { staleCount } }))
      }
      setAnalyticsLoading(false)

      if (pipelineRes.status === 'fulfilled' && pipelineRes.value.ok) {
        setPipeline(await pipelineRes.value.json())
      }
      setPipelineLoading(false)

      if (triageRes.status === 'fulfilled' && triageRes.value.ok) {
        const data = await triageRes.value.json()
        setInsights(data.insights)
      }
      setInsightsLoading(false)

      if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value.ok) {
        setEnrollment(await enrollmentRes.value.json())
      }
      setEnrollmentLoading(false)

      if (complianceRes.status === 'fulfilled' && complianceRes.value.ok) {
        setCompliance(await complianceRes.value.json())
      }
      setComplianceLoading(false)
    }

    void fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.email])

  const refreshTriage = useCallback(async () => {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/registrar/triage', { headers })
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights)
      }
    } catch {}
    setInsightsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.email])

  // ── Derived stat strip values ──────────────────────────────────────────────
  const pendingPetitions = analytics?.petitions.byStatus.find((s) => s.status === 'IN_REVIEW')?.count ?? 0
  const pendingArticulations = analytics?.articulation.byStatus.find((s) => s.status === 'PENDING')?.count ?? 0
  const auditReviewNeeded = analytics?.degreeAudit.needingReview ?? 0
  const totalAudits = analytics?.degreeAudit.total ?? 0

  const statCards = [
    { label: 'Petitions Pending', value: analyticsLoading ? '…' : String(pendingPetitions), icon: FileText, href: '/registrar/petitions', color: 'bg-orange-50 border-orange-200 text-orange-700' },
    { label: 'Transfer Requests', value: analyticsLoading ? '…' : String(pendingArticulations), icon: ArrowLeftRight, href: '/registrar/articulation', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Audits Need Review', value: analyticsLoading ? '…' : String(auditReviewNeeded), icon: AlertTriangle, href: '/registrar/degree-audit', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Total Audits', value: analyticsLoading ? '…' : String(totalAudits), icon: GraduationCap, href: '/registrar/degree-audit', color: 'bg-green-50 border-green-200 text-green-700' },
  ]

  const quickActions = [
    { href: '/registrar/degree-audit', label: 'Review Degree Audits', icon: GraduationCap, desc: 'Staff review queue for flagged audits' },
    { href: '/registrar/petitions', label: 'Process Petitions', icon: FileText, desc: 'Student petition inbox and decision workflow' },
    { href: '/registrar/articulation', label: 'Transfer Credit Review', icon: ArrowLeftRight, desc: 'Evaluate AI articulation recommendations' },
    { href: '/registrar/programs', label: 'Manage Programs', icon: BookOpen, desc: 'Degree requirements catalog' },
    { href: '/registrar/analytics', label: 'View Analytics', icon: BarChart3, desc: 'Enrollment and workflow metrics' },
    { href: '/registrar/reports', label: 'Generate Reports', icon: BarChart3, desc: 'Compliance and IPEDS-style exports' },
  ]

  return (
    <RegistrarLayout title="Registrar Command Center" subtitle="University of Kentucky — Office of the Registrar">
      {/* Simulated data banner */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <Info className="size-4 shrink-0" />
        <span><strong>Simulated data</strong> — All registrar metrics, student records, and pipeline data are demo data for evaluation purposes.</span>
      </div>

      {/* ── Compact Stat Strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href + card.label}
              href={card.href}
              className={`border-2 rounded-2xl p-3 flex items-center gap-3 hover:shadow-md transition-shadow ${card.color}`}
            >
              <Icon className="size-5 opacity-70 shrink-0" />
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{card.value}</p>
                <p className="text-xs font-medium leading-tight mt-0.5">{card.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Graduation Clearance Pipeline ─────────────────────────────── */}
      <div className="mb-6">
        <GraduationPipeline data={pipeline} loading={pipelineLoading} />
      </div>

      {/* ── Sandy's Registrar Briefing ────────────────────────────────── */}
      <div className="mb-6">
        <SandyTriageCard insights={insights} loading={insightsLoading} onRefresh={refreshTriage} />
      </div>

      {/* ── Compliance Calendar ─────────────────────────────────────────── */}
      <div className="mb-6">
        <ComplianceWidget data={compliance} loading={complianceLoading} />
      </div>

      {/* ── Enrollment Pulse ──────────────────────────────────────────── */}
      <div className="mb-6">
        <EnrollmentPulse data={enrollment} loading={enrollmentLoading} />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <h2 className="text-base font-extrabold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-[#0033A0] hover:shadow-md hover:-translate-y-0.5 transition-all flex gap-3 items-start"
            >
              <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="size-5 text-[#0033A0]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{action.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Trust note ────────────────────────────────────────────────── */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl text-xs text-blue-700">
        <strong>Registrar Intelligence System</strong> — All AI-generated outputs are advisory only.
        Staff review is required before sharing results with students. Every action is logged for audit.
      </div>
    </RegistrarLayout>
  )
}
