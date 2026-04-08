'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import dynamic from 'next/dynamic'

const PetitionsByTypeChart = dynamic(() => import('./RegistrarCharts').then(m => m.PetitionsByTypeChart), { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-xl bg-gray-100" /> })
const ArticulationChart = dynamic(() => import('./RegistrarCharts').then(m => m.ArticulationChart), { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-xl bg-gray-100" /> })
const AuditStatusChart = dynamic(() => import('./RegistrarCharts').then(m => m.AuditStatusChart), { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-xl bg-gray-100" /> })
const UsersByRoleChart = dynamic(() => import('./RegistrarCharts').then(m => m.UsersByRoleChart), { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-xl bg-gray-100" /> })

interface Analytics {
  enrollment: { usersByRole: { role: string; count: number }[]; toolsByType: { type: string; count: number }[]; recentSessions: number }
  petitions: { byStatus: { status: string; count: number }[]; byType: { type: string; count: number }[] }
  articulation: { byStatus: { status: string; count: number }[]; byRecommendation: { recommendation: string | null; count: number }[] }
  degreeAudit: { total: number; needingReview: number; byStatus: { status: string; count: number }[] }
}

export default function RegistrarAnalyticsPage() {
  const { currentUser } = useAuth()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/registrar/analytics', { headers: { 'x-demo-user-email': currentUser.email } })
        if (res.ok) setAnalytics(await res.json())
      } catch {}
      setLoading(false)
    }
    void fetch_()
  }, [currentUser.email])

  if (loading) {
    return (
      <RegistrarLayout title="Analytics" subtitle="Enrollment and workflow metrics">
        <div className="text-center py-12 text-gray-400 text-sm">Loading analytics…</div>
      </RegistrarLayout>
    )
  }

  const petitionByType = analytics?.petitions.byType.map((t) => ({
    name: t.type.replace(/_/g, ' '),
    count: t.count,
  })) ?? []

  const articulationByRec = analytics?.articulation.byRecommendation.map((r) => ({
    name: r.recommendation ?? 'None',
    count: r.count,
  })) ?? []

  const auditByStatus = analytics?.degreeAudit.byStatus ?? []

  const usersByRole = analytics?.enrollment.usersByRole ?? []

  return (
    <RegistrarLayout title="Analytics" subtitle="Enrollment and workflow metrics">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Petitions by Type */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Petitions by Type (last 30 days)</h3>
          {petitionByType.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No petition data yet.</p>
          ) : (
            <PetitionsByTypeChart data={petitionByType} />
          )}
        </div>

        {/* Articulation by Recommendation */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Transfer Credit by AI Recommendation</h3>
          {articulationByRec.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No articulation data yet.</p>
          ) : (
            <ArticulationChart data={articulationByRec} />
          )}
        </div>

        {/* Degree Audit Status */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Degree Audit Status Distribution</h3>
          {auditByStatus.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No audit data yet.</p>
          ) : (
            <AuditStatusChart data={auditByStatus} />
          )}
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Platform Users by Role</h3>
          {usersByRole.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No user data.</p>
          ) : (
            <UsersByRoleChart data={usersByRole} />
          )}
        </div>
      </div>

      {/* Key stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <p className="text-xs text-gray-500">Sessions (last 30 days)</p>
          <p className="text-2xl font-bold text-[#0033A0]">{analytics?.enrollment.recentSessions ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <p className="text-xs text-gray-500">Degree Audits Needing Review</p>
          <p className="text-2xl font-bold text-amber-600">{analytics?.degreeAudit.needingReview ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Degree Audits</p>
          <p className="text-2xl font-bold text-gray-800">{analytics?.degreeAudit.total ?? 0}</p>
        </div>
      </div>
    </RegistrarLayout>
  )
}
