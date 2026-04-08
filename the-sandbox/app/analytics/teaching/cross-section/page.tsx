'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import PageHeader from '../../../components/PageHeader'
import AnalyticsSubNav from '../../../components/AnalyticsSubNav'
import CrossSectionTable from '../../../components/classroom-intelligence/CrossSectionTable'
import CrossSectionDetail from '../../../components/classroom-intelligence/CrossSectionDetail'
import type { CrossSectionInsight } from '../../../lib/classroom-intelligence/types'

interface Course {
  id: string
  title: string
  courseCode: string
}

export default function CrossSectionPage() {
  const { currentUser } = useAuth()
  const email = currentUser?.email ?? ''
  const role = currentUser?.role ?? 'STUDENT'

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | undefined>()
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [expandedInsight, setExpandedInsight] = useState<CrossSectionInsight | null>(null)

  useEffect(() => {
    if (!email) return
    setCoursesLoading(true)
    apiFetch<Course[] | { courses: Course[] }>(email, '/api/courses')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.courses ?? []
        setCourses(list)
        if (list.length === 1) setSelectedCourseCode(list[0].courseCode)
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false))
  }, [email])

  // Unique course codes for multi-section comparison
  const uniqueCodes = Array.from(new Set(courses.map((c) => c.courseCode)))

  return (
    <>
      <PageHeader
        title="Cross-Section Insights"
        subtitle="Compare concept mastery across sections of the same course"
      />
      <AnalyticsSubNav role={role} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course code selector */}
        <div className="mb-6">
          {coursesLoading ? (
            <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />
          ) : (
            <div className="relative inline-block">
              <select
                value={selectedCourseCode ?? ''}
                onChange={(e) => {
                  setSelectedCourseCode(e.target.value || undefined)
                  setExpandedInsight(null)
                }}
                className="appearance-none pl-3 pr-8 py-2 text-sm font-medium rounded-lg border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#0033A0] transition-colors"
              >
                <option value="">Select a course code</option>
                {uniqueCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            </div>
          )}
        </div>

        {!selectedCourseCode ? (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">Select a course code above to compare sections.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <CrossSectionTable courseCode={selectedCourseCode} />

            {expandedInsight && (
              <CrossSectionDetail insight={expandedInsight} />
            )}
          </div>
        )}
      </div>
    </>
  )
}
