'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Loader2, Sparkles, Target } from 'lucide-react'
import PageHeader from '../../../components/PageHeader'
import MasteryGateDesigner from '../../../components/assessment/MasteryGateDesigner'
import MasteryGatePanel from '../../../components/assessment/MasteryGatePanel'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { MasteryGateProgressPayload } from '../../../lib/assessment/types'

export default function CourseMasteryPage() {
  const { currentUser } = useAuth()
  const params = useParams<{ courseId: string }>()
  const courseId = params?.courseId
  const [data, setData] = useState<MasteryGateProgressPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!courseId) return
    setLoading(true)
    setError(null)
    try {
      const payload = await apiFetch<MasteryGateProgressPayload>(
        currentUser.email,
        `/api/assessment/mastery-gate/course/${courseId}`
      )
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mastery gates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser.email])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={data ? `${data.course.courseCode} mastery` : 'Mastery Gates'}
        subtitle={
          data
            ? `Progress through adaptive gates for ${data.course.title}.`
            : 'Loading mastery progression.'
        }
      >
        <div className="mt-4">
          <Link
            href="/assessment/mastery"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#0033A0]"
          >
            <ChevronLeft className="size-4" />
            Back to mastery courses
          </Link>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
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

        {!loading && !error && data?.permissions.canDesign && (
          <MasteryGateDesigner
            userEmail={currentUser.email}
            courseId={courseId}
            onSaved={load}
          />
        )}

        {!loading && !error && data && data.gates.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
              {data.permissions.canDesign ? (
                <Sparkles className="size-6 text-slate-500" />
              ) : (
                <Target className="size-6 text-slate-500" />
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {data.permissions.canDesign ? 'No mastery gates yet' : 'No published gates yet'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {data.permissions.canDesign
                ? 'Use the designer above to create the first adaptive gate for this course.'
                : 'Your instructor has not published any mastery gates for this course yet.'}
            </p>
          </div>
        )}

        {!loading && !error && data && data.gates.length > 0 && (
          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {data.permissions.canDesign ? 'Student preview and live progression' : 'Your mastery path'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Gates appear in sequence. Passing one unlocks the next.
              </p>
            </div>

            <div className="space-y-4">
              {data.gates.map((gate) => (
                <MasteryGatePanel
                  key={gate.id}
                  userEmail={currentUser.email}
                  gate={gate}
                  canAttempt={data.permissions.canAttempt}
                  onRefresh={load}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
