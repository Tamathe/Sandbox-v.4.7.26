'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CourseMaterial, LinkedTool, ToolSuggestion } from '../components/courses/course-types'
import { courseHeaders, readJson } from '../components/courses/course-utils'

export function useCourseDetail({
  selectedCourseId,
  userEmail,
  isAdmin,
  currentUserEmail,
}: {
  selectedCourseId: string | null
  userEmail: string
  isAdmin: boolean
  currentUserEmail: string
}) {
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [linkedTools, setLinkedTools] = useState<LinkedTool[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [suggestionsByModule, setSuggestionsByModule] = useState<Record<string, ToolSuggestion[] | null | undefined>>({})
  const [viewerMaterialId, setViewerMaterialId] = useState<string | null>(null)

  const linkedToolIds = useMemo(() => new Set(linkedTools.map((t) => t.id)), [linkedTools])

  const materialsById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  )

  const viewerMaterial = viewerMaterialId ? materialsById.get(viewerMaterialId) ?? null : null

  const existingBotToolId = useMemo(
    () => linkedTools.find((t) => t.toolType === 'CHATBOT')?.id ?? null,
    [linkedTools]
  )

  const hasMaterials = materials.length > 0
  const hasLinkedTools = linkedTools.length > 0

  // Load course detail
  useEffect(() => {
    if (!selectedCourseId) {
      setMaterials([])
      setLinkedTools([])
      setViewerMaterialId(null)
      return
    }

    let cancelled = false

    async function loadDetails() {
      setDetailLoading(true)
      setDetailsError(null)
      try {
        const [materialsData, toolsData] = await Promise.all([
          readJson<CourseMaterial[]>(`/api/courses/${selectedCourseId}/materials`, {
            headers: courseHeaders(userEmail),
          }),
          readJson<LinkedTool[]>(`/api/courses/${selectedCourseId}/tools`, {
            headers: courseHeaders(userEmail),
          }),
        ])
        if (cancelled) return
        setMaterials(materialsData)
        setLinkedTools(toolsData)
      } catch (err) {
        if (cancelled) return
        setMaterials([])
        setLinkedTools([])
        setDetailsError(err instanceof Error ? err.message : 'Failed to load course data')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void loadDetails()
    return () => { cancelled = true }
  }, [userEmail, selectedCourseId])

  // Reset state on course switch
  useEffect(() => {
    setSuggestionsByModule({})
    setViewerMaterialId(null)
  }, [selectedCourseId])

  // Listen for open-material events (from study panel)
  useEffect(() => {
    const handler = (e: Event) => {
      const materialId = (e as CustomEvent<{ materialId: string }>).detail?.materialId
      if (materialId) setViewerMaterialId(materialId)
    }
    window.addEventListener('open-material', handler)
    return () => window.removeEventListener('open-material', handler)
  }, [])

  async function refreshSelectedCourse() {
    if (!selectedCourseId) return
    const [materialsData, toolsData] = await Promise.all([
      readJson<CourseMaterial[]>(`/api/courses/${selectedCourseId}/materials`, {
        headers: courseHeaders(userEmail),
      }),
      readJson<LinkedTool[]>(`/api/courses/${selectedCourseId}/tools`, {
        headers: courseHeaders(userEmail),
      }),
    ])
    setMaterials(materialsData)
    setLinkedTools(toolsData)
  }

  function canManageCourse(course: { instructor?: { email: string } } | null): boolean {
    if (!course) return false
    return isAdmin || course.instructor?.email === currentUserEmail
  }

  return {
    materials,
    setMaterials,
    linkedTools,
    detailLoading,
    detailsError,
    suggestionsByModule,
    setSuggestionsByModule,
    viewerMaterialId,
    setViewerMaterialId,
    viewerMaterial,
    linkedToolIds,
    existingBotToolId,
    hasMaterials,
    hasLinkedTools,
    refreshSelectedCourse,
    canManageCourse,
  }
}
