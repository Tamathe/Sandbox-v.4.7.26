'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import {
  BookOpen,
  ChevronRight,
  Calendar,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  BarChart3,
  ArrowLeft,
} from 'lucide-react'

interface DebriefSummary {
  id: string
  title: string | null
  lectureDate: string
  status: string
  publishedAt: string | null
  conceptCount: number
  createdAt: string
}

interface CoverageStats {
  debriefCount: number
  objectiveCount: number
  coveredObjectiveCount: number
  uncoveredObjectives: { id: string; title: string }[]
  conceptsIntroduced: number
}

export default function LectureDebriefPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  // Course selection
  const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  // Create form
  const [rawInput, setRawInput] = useState('')
  const [lectureDate, setLectureDate] = useState(new Date().toISOString().slice(0, 10))
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // List
  const [debriefs, setDebriefs] = useState<DebriefSummary[]>([])
  const [loading, setLoading] = useState(false)

  // Coverage stats
  const [stats, setStats] = useState<CoverageStats | null>(null)

  // Fetch courses
  useEffect(() => {
    if (!currentUser) return
    fetch('/api/courses', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = data.courses || data || []
        setCourses(list)
        if (list.length > 0 && !selectedCourseId) {
          setSelectedCourseId(list[0].id)
        }
      })
      .catch(() => {})
  }, [currentUser])

  // Fetch debriefs + coverage when course changes
  const fetchDebriefs = useCallback(() => {
    if (!selectedCourseId || !currentUser) return
    setLoading(true)
    fetch(`/api/lecture-debrief?courseId=${selectedCourseId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => setDebriefs(data.debriefs || []))
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch(`/api/lecture-debrief/coverage?courseId=${selectedCourseId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data)
      })
      .catch(() => {})
  }, [selectedCourseId, currentUser])

  useEffect(() => {
    fetchDebriefs()
  }, [fetchDebriefs])

  async function handleCreate() {
    if (!currentUser || !selectedCourseId || rawInput.trim().length < 50) return
    setCreating(true)
    setCreateError('')

    try {
      const res = await fetch('/api/lecture-debrief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          rawInput: rawInput.trim(),
          lectureDate,
          title: title.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create debrief')
      }

      const debrief = await res.json()
      setRawInput('')
      setTitle('')
      router.push(`/lecture-debrief/${debrief.id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handlePublishToggle(debriefId: string, isPublished: boolean) {
    if (!currentUser) return
    await fetch(`/api/lecture-debrief/${debriefId}/publish`, {
      method: isPublished ? 'DELETE' : 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    fetchDebriefs()
  }

  async function handleDelete(debriefId: string) {
    if (!currentUser) return
    await fetch(`/api/lecture-debrief/${debriefId}`, {
      method: 'DELETE',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    fetchDebriefs()
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — Pattern A */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={() => router.push('/hub')}
            className="flex items-center gap-1 text-gray-400 hover:text-[#0033A0] text-sm mb-3 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            Back to Hub
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900">Lecture Debrief</h1>
          <p className="text-sm text-gray-500 mt-1">
            Paste your lecture notes — get study guides, flashcards, and coverage analysis
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Course Selector */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-1">Course</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#0033A0] bg-white"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} — {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Create + Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Form */}
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <h2 className="text-lg font-extrabold text-gray-900 mb-4">New Debrief</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Title (optional)
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Week 5: Neural Networks"
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#0033A0]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Lecture Date
                      </label>
                      <input
                        type="date"
                        value={lectureDate}
                        onChange={(e) => setLectureDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#0033A0]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Lecture Notes
                    </label>
                    <textarea
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder="Paste your lecture notes, outline, talking points, or transcript here. The more detail you provide, the better the study guide will be..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none focus:outline-none focus:border-[#0033A0] min-h-[200px]"
                      rows={10}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {rawInput.length} characters (minimum 50)
                    </p>
                  </div>

                  {createError && (
                    <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{createError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || rawInput.trim().length < 50}
                    className="px-6 py-3 rounded-xl bg-[#0033A0] text-white font-bold text-sm hover:bg-[#002680] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating (4-pass analysis)...
                      </>
                    ) : (
                      <>
                        <BookOpen className="size-4" />
                        Generate Debrief
                      </>
                    )}
                  </button>
                </div>
              </div>

            {/* Coverage Stats */}
            {stats && stats.objectiveCount > 0 && (
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="size-5 text-[#0033A0]" />
                  <h2 className="text-lg font-extrabold text-gray-900">Syllabus Coverage</h2>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-xl bg-blue-50">
                    <p className="text-2xl font-extrabold text-[#0033A0]">{stats.debriefCount}</p>
                    <p className="text-xs text-gray-600 font-medium">Debriefs</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-50">
                    <p className="text-2xl font-extrabold text-emerald-700">
                      {stats.coveredObjectiveCount}/{stats.objectiveCount}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">Objectives Covered</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-violet-50">
                    <p className="text-2xl font-extrabold text-violet-700">{stats.conceptsIntroduced}</p>
                    <p className="text-xs text-gray-600 font-medium">Concepts Introduced</p>
                  </div>
                </div>

                {/* Coverage bar */}
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0033A0] transition-all duration-500"
                    style={{
                      width: `${stats.objectiveCount > 0 ? (stats.coveredObjectiveCount / stats.objectiveCount) * 100 : 0}%`,
                    }}
                  />
                </div>

                {stats.uncoveredObjectives.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Not yet covered
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {stats.uncoveredObjectives.slice(0, 5).map((o) => (
                        <span
                          key={o.id}
                          className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                        >
                          {o.title.length > 40 ? o.title.slice(0, 40) + '...' : o.title}
                        </span>
                      ))}
                      {stats.uncoveredObjectives.length > 5 && (
                        <span className="text-xs text-gray-400">
                          +{stats.uncoveredObjectives.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Debrief list */}
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-3">
              Your Debriefs
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-gray-400" />
              </div>
            ) : debriefs.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                <FileText className="size-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No debriefs yet. Create your first one!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {debriefs.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-2xl border-2 border-gray-200 bg-white p-4 hover:border-[#0033A0] transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/lecture-debrief/${d.id}`)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0]">
                            {d.title || 'Untitled Debrief'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="size-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(d.lectureDate).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">
                              {d.conceptCount} concept{d.conceptCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {d.status === 'processing' && (
                            <Loader2 className="size-4 text-amber-500 animate-spin" />
                          )}
                          {d.publishedAt && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                              Published
                            </span>
                          )}
                          <ChevronRight className="size-4 text-gray-300 group-hover:text-[#0033A0]" />
                        </div>
                      </div>
                    </button>

                    {d.status === 'complete' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => handlePublishToggle(d.id, !!d.publishedAt)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0033A0] cursor-pointer"
                        >
                          {d.publishedAt ? (
                            <>
                              <EyeOff className="size-3" /> Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="size-3" /> Publish
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 cursor-pointer ml-auto"
                        >
                          <Trash2 className="size-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
