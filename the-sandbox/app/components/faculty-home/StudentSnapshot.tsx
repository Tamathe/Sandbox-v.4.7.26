'use client'

import { useState, useEffect } from 'react'
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Notebook,
  Sparkles,
} from 'lucide-react'
import type { StudentBriefing } from '../../lib/faculty/homepage-types'
import { useAuth } from '../../lib/auth-context'
import { fetchBriefing, getCachedBriefing, prefetchBriefing } from '../../lib/faculty/student-briefing-cache'

interface StudentSnapshotProps {
  studentName: string
  studentId: string
  purpose: string
  targetOrg: string
}

export default function StudentSnapshot({
  studentName,
  studentId,
  purpose,
  targetOrg,
}: StudentSnapshotProps) {
  const { currentUser } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [briefing, setBriefing] = useState<StudentBriefing | null>(() =>
    getCachedBriefing(studentId, studentName),
  )
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!expanded || briefing) return

    setLoading(true)
    fetchBriefing(studentId, studentName, currentUser.email)
      .then((data) => { if (data) setBriefing(data) })
      .finally(() => setLoading(false))
  }, [expanded, briefing, studentId, studentName, currentUser.email])

  const handleDraftInSandy = () => {
    const message = `Draft a recommendation letter for ${studentName} applying to ${targetOrg} for ${purpose}. Here's what I know about them from my courses: ${
      briefing?.courses
        .map((c) => `${c.courseCode}: ${c.currentGrade} (${c.gradePercentage}%)`)
        .join(', ') ?? 'loading data...'
    }`

    window.dispatchEvent(
      new CustomEvent('sandy-prefill', {
        detail: { message, autoSend: true },
      }),
    )
  }

  const handleCopySnapshot = () => {
    if (!briefing) return

    const lines = [
      `Student Snapshot: ${briefing.studentName}`,
      `Purpose: ${purpose} — ${targetOrg}`,
      '',
      'Courses:',
      ...briefing.courses.map(
        (c) => `  ${c.courseCode}: ${c.currentGrade} (${c.gradePercentage}%)`,
      ),
      '',
      'Highlights:',
      ...briefing.highlights.map((h) => `  • ${h.label}`),
    ]

    if (briefing.previousVisitNotes.length > 0) {
      lines.push('', 'Previous Notes:')
      for (const note of briefing.previousVisitNotes) {
        lines.push(
          `  ${new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: "${note.content}"`,
        )
      }
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => { if (!briefing) prefetchBriefing(studentId, studentName, currentUser.email) }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] transition-colors hover:underline"
      >
        {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        Student Snapshot
      </button>

      {expanded && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-16 rounded bg-gray-100" />
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              {/* Courses */}
              <div>
                <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                  <BookOpen className="size-3" />
                  Courses with you
                </h5>
                <div className="space-y-1">
                  {briefing.courses.map((course) => (
                    <div key={course.courseId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        <span className="font-semibold">{course.courseCode}</span>
                      </span>
                      <span className="font-medium text-gray-900">
                        {course.currentGrade} ({course.gradePercentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlights */}
              {briefing.highlights.length > 0 && (
                <div>
                  <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                    <Award className="size-3" />
                    Highlights
                  </h5>
                  <div className="space-y-1">
                    {briefing.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <ClipboardCheck className="mt-0.5 size-3 shrink-0 text-green-500" />
                        <span>{h.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous Notes */}
              {briefing.previousVisitNotes.length > 0 && (
                <div>
                  <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                    <Notebook className="size-3" />
                    Your Previous Notes
                  </h5>
                  <div className="space-y-1.5">
                    {briefing.previousVisitNotes.map((note) => (
                      <p key={note.id} className="text-sm italic text-gray-600">
                        &ldquo;{note.content}&rdquo;
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDraftInSandy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#0033A0]/20 bg-[#0033A0]/5 px-3 py-1.5 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-[#0033A0] hover:text-white"
                >
                  <Sparkles className="size-3" />
                  Draft in Sandy
                </button>
                <button
                  type="button"
                  onClick={handleCopySnapshot}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#0033A0] hover:text-[#0033A0]"
                >
                  <Copy className="size-3" />
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to load student snapshot.</p>
          )}
        </div>
      )}
    </div>
  )
}
