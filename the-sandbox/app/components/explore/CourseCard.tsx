'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PrerequisiteTree, { type PrerequisiteNode } from './PrerequisiteTree'

export interface CatalogCourseData {
  coid: string
  courseCode: string
  prefix: string
  number: string
  title: string
  description: string | null
  creditHoursMin: number
  creditHoursMax: number
  prerequisitesRaw: string | null
}

interface CourseCardProps {
  course: CatalogCourseData
}

interface ProgramMapping {
  programCode: string
  programName: string
  category: string
}

export default function CourseCard({ course }: CourseCardProps) {
  const { currentUser } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [programs, setPrograms] = useState<ProgramMapping[] | null>(null)
  const [prereqTree, setPrereqTree] = useState<PrerequisiteNode | null>(null)
  const [loading, setLoading] = useState(false)

  const credits = course.creditHoursMin === course.creditHoursMax
    ? `${course.creditHoursMin}`
    : `${course.creditHoursMin}-${course.creditHoursMax}`

  const loadDetails = useCallback(async () => {
    if (programs !== null) return // Already loaded
    setLoading(true)
    try {
      const encoded = encodeURIComponent(course.courseCode)
      const headers: Record<string, string> = {}
      if (currentUser?.email) headers['x-demo-user-email'] = currentUser.email

      const [programsRes, prereqRes] = await Promise.all([
        fetch(`/api/catalog/courses/${encoded}/programs`, { headers }),
        fetch(`/api/catalog/courses/${encoded}/prerequisites`, { headers }),
      ])

      if (programsRes.ok) {
        const data = await programsRes.json()
        setPrograms(data.programs ?? [])
      }
      if (prereqRes.ok) {
        const data = await prereqRes.json()
        setPrereqTree(data.chain ?? null)
      }
    } catch {
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [course.courseCode, currentUser?.email, programs])

  const handleToggle = () => {
    if (!expanded) loadDetails()
    setExpanded(!expanded)
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden transition-all">
      <button
        onClick={handleToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left
                   hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="size-4 text-[#0033A0] shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">{course.courseCode}</span>
              <span className="text-gray-400 text-sm">&mdash;</span>
              <span className="text-sm text-gray-700 truncate">{course.title}</span>
            </div>
            {course.prerequisitesRaw && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                Prereqs: {course.prerequisitesRaw}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
            {credits} cr
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-gray-400" />
          ) : (
            <ChevronDown className="size-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {course.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="size-4 animate-spin" />
              Loading details...
            </div>
          )}

          {programs && programs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Used in Programs
              </h4>
              <div className="flex flex-wrap gap-2">
                {programs.map((p, i) => (
                  <span
                    key={`${p.programCode}-${p.category}-${i}`}
                    className="text-xs bg-[#0033A0]/5 text-[#0033A0] rounded-full px-2.5 py-1
                             border border-[#0033A0]/10"
                  >
                    {p.programCode} ({p.category})
                  </span>
                ))}
              </div>
            </div>
          )}

          {prereqTree && prereqTree.prerequisites.length > 0 && (
            <PrerequisiteTree node={prereqTree} />
          )}
        </div>
      )}
    </div>
  )
}
