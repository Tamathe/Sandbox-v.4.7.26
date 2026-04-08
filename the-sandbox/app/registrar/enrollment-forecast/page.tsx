'use client'

import PageHeader from '../../components/PageHeader'
import ForecastDashboard from '../../components/enrollment-forecast/ForecastDashboard'

export default function EnrollmentForecastPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Enrollment Forecast"
        subtitle="Predict next-semester demand, identify bottlenecks, and optimize room assignments"
      />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ForecastDashboard />
      </main>
    </div>
  )
}
