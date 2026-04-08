'use client'

import Link from 'next/link'
import { BookOpen, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  ToolDeploymentResponse,
  ToolDeploymentSummary,
} from '../lib/tool-deployment'
import ToolDeploymentBadges from './ToolDeploymentBadges'
import { courseHeaders, readJson } from './courses/course-utils'

interface ToolDeploymentPanelProps {
  toolId: string
  userEmail: string
  userRole: string
  initialDeployment?: ToolDeploymentSummary | null
}

export default function ToolDeploymentPanel({
  toolId,
  userEmail,
  userRole,
  initialDeployment,
}: ToolDeploymentPanelProps) {
  const [data, setData] = useState<ToolDeploymentResponse | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDeployment() {
      setLoading(true)
      setError(null)

      try {
        const response = await readJson<ToolDeploymentResponse>(
          `/api/tools/${toolId}/deployments`,
          {
            headers: courseHeaders(userEmail),
          },
        )

        if (cancelled) return

        setData(response)
        setSelectedCourseId((current) => current || response.availableCourses[0]?.id || '')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load deployment details')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDeployment()

    return () => {
      cancelled = true
    }
  }, [toolId, userEmail])

  async function handleAssign() {
    if (!selectedCourseId) return

    setAssigning(true)
    setError(null)
    setNotice(null)

    try {
      const response = await readJson<ToolDeploymentResponse>(
        `/api/tools/${toolId}/deployments`,
        {
          method: 'POST',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ courseId: selectedCourseId }),
        },
      )

      setData(response)
      setSelectedCourseId(response.availableCourses[0]?.id || '')
      setNotice('Tool assigned to course.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tool to course')
    } finally {
      setAssigning(false)
    }
  }

  const deployment = data?.deployment ?? initialDeployment ?? null
  const availableCourses = data?.availableCourses ?? []
  const visibleAssignedCourses = data?.visibleAssignedCourses ?? []
  const canAssign =
    userRole === 'ADMIN' || userRole === 'EDUCATOR'
      ? (data?.canAssign ?? false)
      : false

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="font-bold text-gray-700 text-sm">Deployment</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          See how this tool is staged in the marketplace and install it into a course.
        </p>
      </div>

      {deployment && <ToolDeploymentBadges deployment={deployment} />}

      {deployment && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            Current status
          </div>
          <p className="mt-1 text-sm text-gray-700">{deployment.description}</p>
          <div className="mt-2 space-y-1 text-xs font-medium text-gray-500">
            <p>
              {deployment.courseCount} course deployment{deployment.courseCount === 1 ? '' : 's'}
            </p>
            {deployment.departmentCount > 0 && (
              <p>
                {deployment.storefrontCount} storefront placement{deployment.storefrontCount === 1 ? '' : 's'} across {deployment.departmentCount} department storefront{deployment.departmentCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading deployment details...
        </div>
      ) : (
        <>
          {visibleAssignedCourses.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Your visible course installs
              </div>
              <div className="space-y-2">
                {visibleAssignedCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses?course=${encodeURIComponent(course.id)}&tab=tools`}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-[#0033A0]">
                      <BookOpen className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {course.courseCode}
                      </div>
                      <div className="text-sm text-gray-600">{course.title}</div>
                      <div className="text-xs text-gray-400">
                        Instructor: {course.instructorName}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {canAssign && (
            <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                  Assign to course
                </div>
                <p className="mt-1 text-sm text-blue-800">
                  {deployment?.state === 'draft'
                    ? 'Install this draft to make it available only from course context.'
                    : deployment?.state === 'private'
                      ? 'Install this private tool into a course without listing it in the marketplace.'
                    : 'Install this tool into one of your course tool trays.'}
                </p>
              </div>

              {availableCourses.length === 0 ? (
                <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800">
                  This tool is already assigned everywhere you can manage it.
                </div>
              ) : (
                <>
                  <select
                    value={selectedCourseId}
                    onChange={(event) => setSelectedCourseId(event.target.value)}
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                  >
                    {availableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.courseCode} - {course.title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleAssign()}
                    disabled={assigning || !selectedCourseId}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                  >
                    {assigning ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Assign to course
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
