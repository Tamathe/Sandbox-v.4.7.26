'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  MessageCircle,
  Notebook,
  TrendingDown,
  TrendingUp,
  Minus,
  Wrench,
} from 'lucide-react'
import type { StudentBriefing } from '../../lib/faculty/homepage-types'
import { useAuth } from '../../lib/auth-context'
import { fetchBriefing, getCachedBriefing, invalidateBriefing, prefetchBriefing } from '../../lib/faculty/student-briefing-cache'
import VisitNoteForm from './VisitNoteForm'

interface StudentBriefingCardProps {
  studentId: string
  studentName: string
  onSendNudge?: (studentName: string) => void
}

const trendConfig = {
  improving: { icon: TrendingUp, label: 'Improving', className: 'text-green-600' },
  stable: { icon: Minus, label: 'Stable', className: 'text-gray-500' },
  declining: { icon: TrendingDown, label: 'Declining', className: 'text-red-600' },
}

export default function StudentBriefingCard({
  studentId,
  studentName,
  onSendNudge,
}: StudentBriefingCardProps) {
  const { currentUser } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [briefing, setBriefing] = useState<StudentBriefing | null>(() =>
    getCachedBriefing(studentId, studentName),
  )
  const [loading, setLoading] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)

  useEffect(() => {
    if (!expanded || briefing) return

    setLoading(true)
    fetchBriefing(studentId, studentName, currentUser.email)
      .then((data) => { if (data) setBriefing(data) })
      .finally(() => setLoading(false))
  }, [expanded, briefing, studentId, studentName, currentUser.email])

  const handleNoteAdded = () => {
    invalidateBriefing(studentId, studentName)
    setBriefing(null)
    setShowNoteForm(false)
    setLoading(true)
    fetchBriefing(studentId, studentName, currentUser.email)
      .then((data) => { if (data) setBriefing(data) })
      .finally(() => setLoading(false))
  }

  const handleHover = () => {
    if (!briefing) prefetchBriefing(studentId, studentName, currentUser.email)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={handleHover}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-[#0033A0]" />
          <span className="text-sm font-semibold text-gray-900">Student Briefing: {studentName}</span>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-gray-400" />
        ) : (
          <ChevronDown className="size-4 text-gray-400" />
        )}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-gray-200 px-4 py-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-20 rounded bg-gray-100" />
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              {/* Courses */}
              {briefing.courses.map((course) => {
                const trend = trendConfig[course.gradeTrend]
                const TrendIcon = trend.icon
                return (
                  <div key={course.courseId} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4 text-[#0033A0]" />
                        <span className="text-sm font-bold text-gray-900">{course.courseCode}</span>
                        <span className="text-sm text-gray-700">
                          {course.currentGrade} ({course.gradePercentage}%)
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${trend.className}`}>
                        <TrendIcon className="size-3" />
                        {trend.label}
                      </div>
                    </div>

                    {/* Recent assignments */}
                    {course.recentAssignments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Recent</p>
                        {course.recentAssignments.map((a, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                            <span>{a.name}</span>
                            <span className={`font-semibold ${a.score / a.maxScore < 0.7 ? 'text-red-600' : 'text-gray-900'}`}>
                              {a.score}/{a.maxScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      {course.lastActiveAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Last active: {formatRelativeDate(course.lastActiveAt)}
                        </span>
                      )}
                      <span>
                        Submissions: {course.attendancePresent}/{course.attendanceTotal}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Tool Engagement */}
              {briefing.toolEngagement.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="size-3.5 text-gray-400" />
                    <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Tool Engagement (your tools)
                    </h5>
                  </div>
                  <div className="space-y-1">
                    {briefing.toolEngagement.map((tool, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                        <span>{tool.toolName}</span>
                        <span className="font-medium text-gray-900">
                          {tool.sessionCount} sessions, avg {tool.averageScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous Visit Notes */}
              {briefing.previousVisitNotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Notebook className="size-3.5 text-gray-400" />
                    <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Previous Visit Notes (yours)
                    </h5>
                  </div>
                  <div className="space-y-2">
                    {briefing.previousVisitNotes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                      >
                        <p className="text-xs text-gray-400 mb-0.5">
                          {new Date(note.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                          {note.courseCode && ` · ${note.courseCode}`}
                        </p>
                        <p className="text-sm text-gray-700 italic">&ldquo;{note.content}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {onSendNudge && (
                  <button
                    type="button"
                    onClick={() => onSendNudge(studentName)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0033A0]/20 bg-[#0033A0]/5 px-3 py-1.5 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-[#0033A0] hover:text-white"
                  >
                    <MessageCircle className="size-3" />
                    Send nudge
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#0033A0] hover:text-[#0033A0]"
                >
                  <Notebook className="size-3" />
                  Add note
                </button>
              </div>

              {/* Visit Note Form */}
              {showNoteForm && (
                <VisitNoteForm
                  studentId={studentId}
                  studentName={studentName}
                  courses={briefing.courses.map((c) => ({
                    id: c.courseId,
                    courseCode: c.courseCode,
                  }))}
                  onSaved={handleNoteAdded}
                  onCancel={() => setShowNoteForm(false)}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to load student briefing.</p>
          )}
        </div>
      )}
    </div>
  )
}

function formatRelativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
