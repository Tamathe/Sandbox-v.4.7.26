'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutTemplate,
  ChevronDown,
  Check,
  Loader2,
  ArrowLeft,
  GitFork,
  Layers,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import { COURSE_MAP_PRESETS, type PresetCategory } from '../lib/syllabus-architect/course-map-templates'

// ── Category filter ─────────────────────────────────────────────────────────

const CATEGORIES: Array<{ label: string; value: PresetCategory | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Lecture', value: 'Lecture' },
  { label: 'Lab', value: 'Lab' },
  { label: 'Seminar', value: 'Seminar' },
  { label: 'Project', value: 'Project' },
  { label: 'Clinical', value: 'Clinical' },
  { label: 'Workshop', value: 'Workshop' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CourseMapTemplatesPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [category, setCategory] = useState<PresetCategory | 'All'>('All')
  const [courses, setCourses] = useState<Array<{ id: string; courseCode: string; title: string }>>([])
  const [applyingPresetId, setApplyingPresetId] = useState<string | null>(null)
  const [courseDropdownId, setCourseDropdownId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isEditorRole = currentUser?.role === 'EDUCATOR' || currentUser?.role === 'ADMIN'

  // Load courses for the course selector dropdown
  useEffect(() => {
    if (!currentUser?.email) return
    fetch('/api/courses', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = (data.courses || data || []) as Array<{ id: string; courseCode: string; title: string }>
        setCourses(list)
      })
      .catch(() => {})
  }, [currentUser?.email])

  const filtered = category === 'All'
    ? COURSE_MAP_PRESETS
    : COURSE_MAP_PRESETS.filter((p) => p.category === category)

  const handleApply = useCallback(async (presetId: string, courseId: string) => {
    if (!currentUser?.email) return
    setApplying(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/from-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ templateId: presetId, preset: true }),
      })
      if (res.ok) {
        setSuccessMsg('Template applied! Redirecting to course map...')
        setCourseDropdownId(null)
        setApplyingPresetId(null)
        setTimeout(() => router.push(`/courses/${courseId}/course-map`), 1200)
      } else {
        const err = await res.json()
        setErrorMsg(err.error || 'Failed to apply template')
      }
    } catch {
      setErrorMsg('Network error — please try again')
    } finally {
      setApplying(false)
    }
  }, [currentUser?.email, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <PageHeader
          title="Course Map Templates"
          subtitle="Start with a proven structure — apply to any course in one click."
        />

        {/* Success / error banners */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center gap-2 mb-4">
            <Check className="size-4" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 mb-4">
            {errorMsg}
          </div>
        )}

        {/* Category filter pills */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                category === cat.value
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((preset) => (
            <div
              key={preset.id}
              className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Color banner */}
              <div
                className="h-3"
                style={{ backgroundColor: preset.thumbnailColor }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-extrabold text-gray-900">{preset.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 shrink-0">
                    {preset.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{preset.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Layers className="size-3" /> {preset.nodeCount} nodes
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="size-3" /> {preset.edgeCount} edges
                  </span>
                </div>

                {/* Apply button / course selector */}
                {isEditorRole && (
                  <div className="relative">
                    {applyingPresetId === preset.id && courseDropdownId === preset.id ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Apply to which course?</p>
                        {courses.length === 0 ? (
                          <p className="text-xs text-gray-400">No courses found</p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {courses.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleApply(preset.id, c.id)}
                                disabled={applying}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#0033A0]/5 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                {applying ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <LayoutTemplate className="size-3 text-gray-400" />
                                )}
                                <span className="font-semibold text-gray-800">{c.courseCode}</span>
                                <span className="text-gray-500 truncate">{c.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setApplyingPresetId(null)
                            setCourseDropdownId(null)
                          }}
                          className="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setApplyingPresetId(preset.id)
                          setCourseDropdownId(preset.id)
                          setErrorMsg(null)
                          setSuccessMsg(null)
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-xs font-semibold rounded-lg hover:bg-[#002880] transition-colors"
                      >
                        <LayoutTemplate className="size-3.5" />
                        Apply to Course
                        <ChevronDown className="size-3" />
                      </button>
                    )}
                  </div>
                )}

                {!isEditorRole && (
                  <div className="text-xs text-gray-400 italic">
                    Educators can apply templates to their courses.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <LayoutTemplate className="size-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-semibold">No templates in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}
