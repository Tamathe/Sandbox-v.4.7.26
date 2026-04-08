'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setColdStartStep } from '../lib/cold-start'
import type { Course } from '../components/courses/course-types'
import { courseHeaders, readJson } from '../components/courses/course-utils'

type NewCourseForm = {
  courseCode: string
  title: string
  description: string
  isPublic: boolean
}

export function useCourses({
  userEmail,
  isEducator,
  evaluatorMode,
  courseParam,
}: {
  userEmail: string
  isEducator: boolean
  evaluatorMode: boolean
  courseParam: string | null
}) {
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)

  const [showNewCourseForm, setShowNewCourseForm] = useState(false)
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [newCourseForm, setNewCourseForm] = useState<NewCourseForm>({
    courseCode: '',
    title: '',
    description: '',
    isPublic: true,
  })
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [showCanvasImport, setShowCanvasImport] = useState(false)

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  )

  // Load courses
  useEffect(() => {
    let cancelled = false

    async function loadCourses() {
      setLoading(true)
      setCoursesError(null)
      try {
        const data = await readJson<Course[]>('/api/courses', {
          headers: courseHeaders(userEmail),
        })
        if (cancelled) return
        setCourses(data)
        setSelectedCourseId((prev) => {
          if (prev && data.some((c) => c.id === prev)) return prev
          if (courseParam) {
            const matched = data.find(
              (c) => c.id === courseParam || c.courseCode.toLowerCase() === courseParam.toLowerCase()
            )
            if (matched) return matched.id
          }
          // No courseParam → stay on triage grid (null = no course selected)
          return null
        })
      } catch (err) {
        if (cancelled) return
        setCourses([])
        setSelectedCourseId(null)
        setCoursesError(err instanceof Error ? err.message : 'Failed to load courses')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCourses()
    return () => { cancelled = true }
  }, [courseParam, userEmail])

  async function handleCreateCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newCourseForm.courseCode.trim() || !newCourseForm.title.trim()) return

    setCreatingCourse(true)
    try {
      const course = await readJson<Course>('/api/courses', {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({
          courseCode: newCourseForm.courseCode.trim(),
          title: newCourseForm.title.trim(),
          description: newCourseForm.description.trim() || null,
          isPublic: newCourseForm.isPublic,
        }),
      })
      setCourses((prev) => [course, ...prev])
      setSelectedCourseId(course.id)
      setShowNewCourseForm(false)
      setNewCourseForm({ courseCode: '', title: '', description: '', isPublic: true })
      if (isEducator) {
        setColdStartStep(userEmail, 'courseCreated')
        if (evaluatorMode) {
          router.push(`/courses/${course.id}/syllabus`)
        } else {
          setShowSetupWizard(true)
        }
      }
    } catch (err) {
      setCoursesError(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setCreatingCourse(false)
    }
  }

  return {
    courses,
    setCourses,
    selectedCourseId,
    setSelectedCourseId,
    selectedCourse,
    loading,
    coursesError,
    showNewCourseForm,
    setShowNewCourseForm,
    creatingCourse,
    newCourseForm,
    setNewCourseForm,
    handleCreateCourse,
    showSetupWizard,
    setShowSetupWizard,
    showCanvasImport,
    setShowCanvasImport,
  }
}
