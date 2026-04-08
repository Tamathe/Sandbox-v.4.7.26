'use client'

import { useAuth } from '../../lib/auth-context'
import { useApiFetch } from '../../hooks/useApiFetch'
import PageHeader from '../../components/PageHeader'
import FacultyRiskDashboard from '../../components/success/FacultyRiskDashboard'

interface Course {
  id: string
  title: string
  courseCode: string
}

type CoursesResponse = Course[] | { courses: Course[] }

export default function SuccessDashboardPage() {
  const { currentUser } = useAuth()
  const { data: raw, isLoading: loading } = useApiFetch<CoursesResponse>('/api/courses/mine')
  const courses = raw ? (Array.isArray(raw) ? raw : raw.courses ?? []) : []

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Student Success"
        subtitle="Early warning system — identify at-risk students before it's too late"
      />
      {courses.length === 0 ? (
        <div className="border rounded-2xl shadow-sm p-12 text-center">
          <p className="text-gray-500">No courses found. Create a course to start tracking student success.</p>
        </div>
      ) : (
        <FacultyRiskDashboard courses={courses} />
      )}
    </div>
  )
}
