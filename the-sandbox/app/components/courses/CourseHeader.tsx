'use client'

import Link from 'next/link'
import {
  Calendar,
  ChevronDown,
  ClipboardCheck,
  MoreVertical,
  Plus,
  Radio,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { CourseMagicButton } from '../CourseMagicButton'
import type { Course, CourseMaterial, LinkedTool, TabId } from './course-types'
import type { CourseSummaryItem } from '../../lib/course-summary-service'
import type { LucideIcon } from 'lucide-react'

const SHORT_LABELS: Record<string, string> = {
  overview: 'Over',
  assignments: 'Assign',
  grades: 'Grade',
  content: 'Cont',
  'course-map': 'Map',
  discussion: 'Disc',
  settings: 'Set',
}

type TabDef = {
  id: TabId
  label: string
  visible: boolean
  icon?: LucideIcon
  unread?: boolean
}

interface CourseHeaderProps {
  course: Course
  isStudent: boolean
  isEducator: boolean
  evaluatorMode: boolean
  existingBotToolId: string | null
  materialsCount: number
  canManage: boolean
  enrolledCourseIds: Set<string>
  enrolling: boolean
  onToggleEnrollment: () => void
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  visibleTabs: TabDef[]
  courseSummary?: CourseSummaryItem | null
}

export default function CourseHeader({
  course,
  isStudent,
  isEducator,
  evaluatorMode,
  existingBotToolId,
  materialsCount,
  canManage,
  enrolledCourseIds,
  enrolling,
  onToggleEnrollment,
  activeTab,
  onTabChange,
  visibleTabs,
  courseSummary,
}: CourseHeaderProps) {
  const [descExpanded, setDescExpanded] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [mobileOverflow, setMobileOverflow] = useState(false)

  return (
    <div className="border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {course.courseCode}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">{course.title}</h2>
          {isStudent ? (
            <>
              <p className={`mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 ${!descExpanded ? 'line-clamp-2' : ''}`}>
                {course.description || 'No course description yet.'}
              </p>
              {course.description && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-1 text-xs text-[#0033A0] hover:underline cursor-pointer"
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
              {course.instructor?.name && (
                <p className="mt-1 text-xs text-gray-400">
                  Taught by {course.instructor.name}
                </p>
              )}
            </>
          ) : courseSummary ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" />
                {courseSummary.enrollmentCount} enrolled
              </span>
              <button
                type="button"
                onClick={() => onTabChange('grades')}
                className="inline-flex items-center gap-1 hover:text-[#0033A0] transition-colors"
              >
                <ClipboardCheck className="size-3.5" />
                {courseSummary.ungradedCount} ungraded
              </button>
              {courseSummary.upcomingDeadlines.length > 0 && (
                <button
                  type="button"
                  onClick={() => onTabChange('assignments')}
                  className="inline-flex items-center gap-1 hover:text-[#0033A0] transition-colors"
                >
                  <Calendar className="size-3.5" />
                  Next due: {new Date(courseSummary.upcomingDeadlines[0].dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </button>
              )}
              {courseSummary.averageGrade != null && (
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="size-3.5" />
                  Avg: {Math.round(courseSummary.averageGrade)}%
                </span>
              )}
            </div>
          ) : (
            <p className={`mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 ${!descExpanded ? 'line-clamp-2' : ''}`}>
              {course.description || 'No course description yet. Add one in Settings to help students orient quickly.'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEducator && (
            <>
              {/* Primary: Ask Sandy */}
              {existingBotToolId ? (
                <Link
                  href={`/tools/${existingBotToolId}?courseId=${encodeURIComponent(course.id)}&launch=true`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Sparkles className="size-4" />
                  Ask Sandy
                </Link>
              ) : (
                <CourseMagicButton
                  courseId={course.id}
                  disabled={materialsCount === 0}
                  disabledReason="Upload course materials first"
                />
              )}

              {/* Secondary: Add dropdown (hidden on mobile) */}
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setActionsOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Plus className="size-4" />
                  Add
                  <ChevronDown className={`size-3.5 transition-transform ${actionsOpen ? 'rotate-180' : ''}`} />
                </button>
                {actionsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                      <Link
                        href={`/builder?course=${encodeURIComponent(course.courseCode)}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setActionsOpen(false)}
                      >
                        <Sparkles className="size-4 text-[#0033A0]" />
                        Build with AI
                      </Link>
                      <Link
                        href={`/publish?course=${encodeURIComponent(course.courseCode)}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setActionsOpen(false)}
                      >
                        <Plus className="size-4 text-gray-400" />
                        Create manually
                      </Link>
                      <Link
                        href={`/courses/${course.id}/syllabus`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setActionsOpen(false)}
                      >
                        <Upload className="size-4 text-gray-400" />
                        Import Syllabus
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Tertiary: Start Live Session + Upload Syllabus (hidden on mobile) */}
              <Link
                href={`/sandcastle/new?courseId=${encodeURIComponent(course.id)}&courseCode=${encodeURIComponent(course.courseCode)}`}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              >
                <Radio className="size-4" />
                Start Live Session
              </Link>
              {evaluatorMode && (
                <Link
                  href={`/courses/${course.id}/syllabus`}
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <Upload className="size-4" />
                  Upload Syllabus
                </Link>
              )}

              {/* Mobile overflow menu */}
              <div className="relative sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileOverflow((v) => !v)}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 p-2.5 text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <MoreVertical className="size-4" />
                </button>
                {mobileOverflow && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMobileOverflow(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                      <Link
                        href={`/sandcastle/new?courseId=${encodeURIComponent(course.id)}&courseCode=${encodeURIComponent(course.courseCode)}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMobileOverflow(false)}
                      >
                        <Radio className="size-4 text-gray-400" />
                        Start Live Session
                      </Link>
                      <Link
                        href={`/builder?course=${encodeURIComponent(course.courseCode)}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMobileOverflow(false)}
                      >
                        <Sparkles className="size-4 text-[#0033A0]" />
                        Build with AI
                      </Link>
                      <Link
                        href={`/publish?course=${encodeURIComponent(course.courseCode)}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMobileOverflow(false)}
                      >
                        <Plus className="size-4 text-gray-400" />
                        Create manually
                      </Link>
                      {evaluatorMode && (
                        <Link
                          href={`/courses/${course.id}/syllabus`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setMobileOverflow(false)}
                        >
                          <Upload className="size-4 text-gray-400" />
                          Upload Syllabus
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          {isStudent && (
            <button
              type="button"
              onClick={onToggleEnrollment}
              disabled={enrolling}
              className="text-xs font-semibold text-[#0033A0] hover:underline"
            >
              {enrolling ? '…' : enrolledCourseIds.has(course.id) ? 'Leave' : 'Join'}
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-4 flex justify-around sm:justify-start sm:gap-1" role="tablist">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          // Badge counts from summary data
          let badgeCount = 0
          if (courseSummary) {
            if (tab.id === 'assignments') badgeCount = courseSummary.upcomingDeadlines.length
            else if (tab.id === 'grades') badgeCount = courseSummary.ungradedCount
            else if (tab.id === 'discussion') badgeCount = courseSummary.unansweredDiscussions
          }

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`course-tab-${tab.id}`}
              aria-controls={`course-panel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center sm:flex-row sm:gap-1.5 border-b-2 px-1.5 sm:px-2 pb-2 sm:pb-3 transition-colors ${
                isActive
                  ? 'border-blue-600 font-semibold text-[#0033A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {Icon && <Icon className="size-5 sm:size-4" />}
              {/* Mobile: short label below icon */}
              <span className="sm:hidden text-[10px] leading-tight mt-0.5">{SHORT_LABELS[tab.id] ?? tab.label}</span>
              {/* Desktop: full label inline */}
              <span className="hidden sm:inline text-xs whitespace-nowrap">{tab.label}</span>
              {/* Desktop badge: number pill */}
              {badgeCount > 0 && (
                <span className="hidden sm:inline rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5">
                  {badgeCount}
                </span>
              )}
              {/* Mobile badge: dot only */}
              {badgeCount > 0 && (
                <span className="sm:hidden absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
              )}
              {'unread' in tab && tab.unread && (
                <span className="absolute -top-0.5 right-0 size-2 rounded-full bg-red-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
