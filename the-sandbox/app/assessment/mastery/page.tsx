'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, GraduationCap, Loader2, Target } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

interface CourseOption {
  id: string
  courseCode: string
  title: string
  instructor?: {
    name: string
  }
}

export default function MasteryGateIndexPage() {
  const { currentUser } = useAuth()
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const payload = await apiFetch<CourseOption[]>(currentUser.email, '/api/courses')
        if (!cancelled) {
          setCourses(payload)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load courses')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser.email])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Mastery Gates"
        subtitle="Adaptive checkpoints that unlock progress when students are genuinely ready."
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {loading && (
          <div className="flex items-center justify-center rounded-3xl border-2 border-gray-200 bg-white p-12">
            <Loader2 className="size-5 animate-spin text-[#0033A0]" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
              <Target className="size-6 text-slate-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No courses available</h2>
            <p className="mt-2 text-sm text-slate-500">
              Once a course is available to you, its mastery progression will show up here.
            </p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/assessment/mastery/${course.id}`}
                className="rounded-3xl border-2 border-gray-200 bg-white p-5 transition hover:border-[#0033A0]/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#0033A0]/10">
                      <GraduationCap className="size-5 text-[#0033A0]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{course.courseCode}</p>
                      <p className="mt-1 text-sm text-slate-600">{course.title}</p>
                      {course.instructor?.name && (
                        <p className="mt-2 text-xs text-slate-500">Instructor: {course.instructor.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-slate-300" />
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
