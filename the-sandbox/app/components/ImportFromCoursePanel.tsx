'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'

interface CourseMaterial {
  id: string
  title: string
  content: string | null
  materialType: string
  objectives: string[]
}

interface CourseModule {
  weekId: string
  title: string
  weekNumber: number
  materialCount: number
  materials: CourseMaterial[]
}

interface CourseWithMaterials {
  courseId: string
  courseCode: string
  courseTitle: string
  modules: CourseModule[]
}

interface ImportFromCoursePanelProps {
  open: boolean
  onClose: () => void
  onImport: (imported: {
    materials: { title: string; content: string }[]
    objectives: string[]
    courseCode: string
    moduleTitle: string | null
  }) => void
  preselectedCourseId?: string | null
}

export default function ImportFromCoursePanel({
  open,
  onClose,
  onImport,
  preselectedCourseId,
}: ImportFromCoursePanelProps) {
  const { currentUser } = useAuth()
  const [courses, setCourses] = useState<CourseWithMaterials[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set())
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/faculty/course-materials', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const courseList = Array.isArray(data) ? data : []
        setCourses(courseList)
        // Auto-expand preselected course
        if (preselectedCourseId) {
          setExpandedCourses(new Set([preselectedCourseId]))
        }
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }, [open, currentUser.email, preselectedCourseId])

  if (!open) return null

  function toggleCourse(courseId: string) {
    setExpandedCourses(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  function toggleModule(moduleKey: string, materials: CourseMaterial[]) {
    setSelectedModules(prev => {
      const next = new Set(prev)
      const materialIds = materials.map(m => m.id)
      if (next.has(moduleKey)) {
        next.delete(moduleKey)
        setSelectedMaterials(prevMats => {
          const nextMats = new Set(prevMats)
          materialIds.forEach(id => nextMats.delete(id))
          return nextMats
        })
      } else {
        next.add(moduleKey)
        setSelectedMaterials(prevMats => {
          const nextMats = new Set(prevMats)
          materialIds.forEach(id => nextMats.add(id))
          return nextMats
        })
      }
      return next
    })
  }

  function toggleMaterial(id: string) {
    setSelectedMaterials(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleImport() {
    const materials: { title: string; content: string }[] = []
    const objectives: string[] = []
    let courseCode = ''
    let moduleTitle: string | null = null

    for (const course of courses) {
      for (const mod of course.modules) {
        for (const mat of mod.materials) {
          if (selectedMaterials.has(mat.id)) {
            if (mat.content) {
              materials.push({ title: mat.title, content: mat.content })
            }
            objectives.push(...mat.objectives)
            courseCode = course.courseCode
            moduleTitle = mod.title
          }
        }
      }
    }

    onImport({
      materials,
      objectives: [...new Set(objectives)],
      courseCode,
      moduleTitle,
    })
    onClose()
  }

  const totalSelected = selectedMaterials.size

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-[#0033A0]" />
          <h4 className="text-sm font-bold text-gray-900">Import from Course</h4>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="size-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading courses…
        </div>
      ) : courses.length === 0 ? (
        <p className="py-4 text-sm text-gray-500">No courses with materials found.</p>
      ) : (
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {courses.map(course => (
            <div key={course.courseId}>
              {/* Course header */}
              <button
                type="button"
                onClick={() => toggleCourse(course.courseId)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-gray-800 hover:bg-blue-100/50"
              >
                {expandedCourses.has(course.courseId) ? (
                  <ChevronDown className="size-3.5 text-gray-400" />
                ) : (
                  <ChevronRight className="size-3.5 text-gray-400" />
                )}
                <span>{course.courseCode} — {course.courseTitle}</span>
              </button>

              {/* Modules */}
              {expandedCourses.has(course.courseId) && (
                <div className="ml-5 space-y-0.5 border-l border-gray-200 pl-3">
                  {course.modules.map(mod => {
                    const moduleKey = `${course.courseId}-${mod.weekId}`
                    const isModuleSelected = selectedModules.has(moduleKey)
                    return (
                      <div key={mod.weekId}>
                        {/* Module toggle */}
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-blue-50">
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded border ${isModuleSelected ? 'border-[#0033A0] bg-[#0033A0]' : 'border-gray-300'}`}
                            onClick={(e) => { e.preventDefault(); toggleModule(moduleKey, mod.materials) }}
                          >
                            {isModuleSelected && <Check className="size-3 text-white" />}
                          </span>
                          <FileText className="size-3 text-gray-400" />
                          <span className="text-gray-700">{mod.title}</span>
                          <span className="ml-auto text-gray-400">({mod.materialCount} files)</span>
                        </label>

                        {/* Individual materials (show when module expanded) */}
                        {expandedCourses.has(course.courseId) && mod.materials.length > 0 && (
                          <div className="ml-6 space-y-0.5">
                            {mod.materials.map(mat => (
                              <label
                                key={mat.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-0.5 text-[11px] hover:bg-gray-50"
                              >
                                <span
                                  className={`flex size-3.5 shrink-0 items-center justify-center rounded border ${selectedMaterials.has(mat.id) ? 'border-[#0033A0] bg-[#0033A0]' : 'border-gray-300'}`}
                                  onClick={(e) => { e.preventDefault(); toggleMaterial(mat.id) }}
                                >
                                  {selectedMaterials.has(mat.id) && <Check className="size-2.5 text-white" />}
                                </span>
                                <span className="text-gray-600">{mat.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import button */}
      {totalSelected > 0 && (
        <button
          type="button"
          onClick={handleImport}
          className="mt-3 w-full rounded-lg bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002480]"
        >
          Import {totalSelected} selected
        </button>
      )}
    </div>
  )
}
