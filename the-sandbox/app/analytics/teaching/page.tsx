'use client'

import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import AnalyticsSubNav from '../../components/AnalyticsSubNav'
import TeachingIntelligenceDashboard from '../../components/classroom-intelligence/TeachingIntelligenceDashboard'

export default function TeachingIntelligencePage() {
  const { currentUser } = useAuth()
  const role = currentUser?.role ?? 'STUDENT'

  return (
    <>
      <PageHeader
        title="Teaching Intelligence"
        subtitle="Concept difficulty, insights, and intervention tracking"
      />
      <AnalyticsSubNav role={role} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeachingIntelligenceDashboard />
      </div>
    </>
  )
}
