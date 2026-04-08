'use client'

import { useEffect } from 'react'

type CourseContextPayload = {
  courseId: string
  courseCode: string
  title: string
  description: string | null
  materialsCount: number
}

export function useCourseContext(
  selectedCourse: { id: string; courseCode: string; title: string; description: string | null } | null,
  materialsCount: number
) {
  useEffect(() => {
    try {
      if (!selectedCourse) {
        localStorage.removeItem('uky-course-context')
        window.dispatchEvent(new CustomEvent('uky-course-context-changed', { detail: null }))
        return
      }
      const payload: CourseContextPayload = {
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        title: selectedCourse.title,
        description: selectedCourse.description,
        materialsCount,
      }
      localStorage.setItem('uky-course-context', JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('uky-course-context-changed', { detail: payload }))
    } catch { /* ignore */ }
  }, [materialsCount, selectedCourse])
}
