'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import PageHeader from '../../../components/PageHeader'
import AnalyticsSubNav from '../../../components/AnalyticsSubNav'
import EffectivenessChart from '../../../components/classroom-intelligence/EffectivenessChart'
import InterventionTimeline from '../../../components/classroom-intelligence/InterventionTimeline'
import InterventionForm from '../../../components/classroom-intelligence/InterventionForm'

interface Course {
  id: string
  title: string
  courseCode: string
}

export default function InterventionLabPage() {
  const { currentUser } = useAuth()
  const email = currentUser?.email ?? ''
  const role = currentUser?.role ?? 'STUDENT'

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>()
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!email) return
    setCoursesLoading(true)
    apiFetch<Course[] | { courses: Course[] }>(email, '/api/courses')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.courses ?? []
        setCourses(list)
        if (list.length === 1) setSelectedCourseId(list[0].id)
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false))
  }, [email])

  function handleInterventionCreated() {
    setShowForm(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <>
      <PageHeader
        title="Intervention Lab"
        subtitle="Track, create, and measure teaching interventions"
      />
      <AnalyticsSubNav role={role} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course selector */}
        <div className="mb-6">
          {coursesLoading ? (
            <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />
          ) : (
            <div className="relative inline-block">
              <select
                value={selectedCourseId ?? ''}
                onChange={(e) => setSelectedCourseId(e.target.value || undefined)}
                className="appearance-none pl-3 pr-8 py-2 text-sm font-medium rounded-lg border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#0033A0] transition-colors"
              >
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} — {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            </div>
          )}
        </div>

        {!selectedCourseId ? (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">Select a course above to view intervention data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: chart + timeline */}
            <div className="lg:col-span-2 space-y-6">
              <EffectivenessChart key={`eff-${refreshKey}`} courseId={selectedCourseId} />
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                <h2 className="text-base font-extrabold text-gray-900 mb-4">All Interventions</h2>
                <InterventionTimeline key={`tl-${refreshKey}`} courseId={selectedCourseId} />
              </div>
            </div>

            {/* Right column: new intervention form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="w-full flex items-center justify-between text-base font-extrabold text-gray-900"
                >
                  New Intervention
                  <ChevronDown
                    className={`size-5 text-gray-400 transition-transform ${showForm ? 'rotate-180' : ''}`}
                  />
                </button>
                {showForm && (
                  <div className="mt-4">
                    <InterventionForm
                      courseId={selectedCourseId}
                      onSubmit={handleInterventionCreated}
                      onCancel={() => setShowForm(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
