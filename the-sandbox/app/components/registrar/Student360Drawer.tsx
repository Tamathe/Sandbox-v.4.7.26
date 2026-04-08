'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { X, GraduationCap, FileText, Lock, BookOpen, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { PETITION_TYPE_LABELS, PETITION_STATUS_LABELS } from '../../lib/registrar/types'
import type { Student360Data, Student360Audit, Student360Petition, SimulatedHold } from '../../lib/registrar/student-360'
import type { CompletedCourse, EnrolledCourse } from '../../lib/sis'
import type { RequirementAuditResult } from '../../lib/registrar/types'

// ── Props ────────────────────────────────────────────────────────────────────

interface Student360DrawerProps {
  studentId: string | null // null = closed
  onClose: () => void
}

// ── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-2 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 transition-colors"
      >
        {open ? <ChevronDown className="size-4 text-gray-400 shrink-0" /> : <ChevronRight className="size-4 text-gray-400 shrink-0" />}
        <span className="size-5 shrink-0">{icon}</span>
        <span className="font-extrabold text-sm flex-1">{title}</span>
        {badge}
      </button>
      {open && <div className="px-3 pb-3 border-t border-gray-100">{children}</div>}
    </div>
  )
}

// ── Capped list (show 4, expand to all) ──────────────────────────────────

function CappedList<T>({
  items,
  cap = 4,
  className = 'space-y-2 pt-2',
  renderItem,
}: {
  items: T[]
  cap?: number
  className?: string
  renderItem: (item: T, index: number) => React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const display = expanded ? items : items.slice(0, cap)

  return (
    <div className={className}>
      {display.map((item, i) => renderItem(item, i))}
      {items.length > cap && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-1.5 text-xs font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </div>
  )
}

// ── Status color helpers ─────────────────────────────────────────────────────

function requirementStatusColor(status: RequirementAuditResult['status']): string {
  switch (status) {
    case 'SATISFIED': return 'bg-green-100 text-green-800'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
    case 'NOT_STARTED': return 'bg-gray-100 text-gray-600'
    case 'DEFICIENT': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function petitionStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800'
    case 'DENIED': return 'bg-red-100 text-red-800'
    case 'WITHDRAWN': return 'bg-gray-100 text-gray-500'
    case 'SUBMITTED':
    case 'ELIGIBILITY_CHECKING':
    case 'PENDING_STUDENT_INFO':
    case 'IN_REVIEW':
    default: return 'bg-yellow-100 text-yellow-800'
  }
}

function daysOpen(submittedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)))
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Main component ───────────────────────────────────────────────────────────

export function Student360Drawer({ studentId, onClose }: Student360DrawerProps) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<Student360Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/registrar/student-360/${id}`, {
        headers: { 'x-demo-user-email': currentUser?.email ?? '' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to load student data (${res.status})`)
      }
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email])

  useEffect(() => {
    if (studentId) {
      fetchData(studentId)
    } else {
      setData(null)
      setError(null)
    }
  }, [studentId, fetchData])

  const isOpen = studentId !== null

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-extrabold text-lg text-gray-900">Student 360</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-3 border-[#0033A0] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* ── Header ── */}
              <div className="flex items-start gap-3 pb-2">
                <div className="size-12 rounded-full bg-[#0033A0] text-white flex items-center justify-center font-extrabold text-lg shrink-0">
                  {getInitials(data.profile.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-base text-gray-900 truncate">{data.profile.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{data.profile.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{data.profile.program ?? 'Undeclared'} &middot; {data.profile.college ?? 'N/A'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    <span>GPA: <span className="font-bold text-gray-900">{typeof data.profile.gpa === 'number' ? data.profile.gpa.toFixed(2) : 'N/A'}</span></span>
                    <span>Credits: <span className="font-bold text-gray-900">{data.profile.totalCreditsEarned ?? 0}/{data.profile.totalCreditsAttempted ?? 0}</span></span>
                    <span>Grad: <span className="font-bold text-gray-900">{data.profile.expectedGraduationTerm}</span></span>
                  </div>
                </div>
              </div>

              {/* ── Degree Progress ── */}
              {data.audit && (
                <Section
                  title="Degree Progress"
                  icon={<GraduationCap className="size-5 text-[#0033A0]" />}
                  badge={
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      data.audit.overallStatus === 'ON_TRACK' ? 'bg-green-100 text-green-800' :
                      data.audit.overallStatus === 'ACTION_NEEDED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {data.audit.overallStatus.replace(/_/g, ' ')}
                    </span>
                  }
                >
                  <div className="space-y-3 pt-2">
                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{data.audit.totalCreditsCompleted} / {data.audit.totalCreditsRequired} credits</span>
                        <span className="font-bold">{Math.round(data.audit.percentComplete)}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0033A0] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, data.audit.percentComplete)}%` }}
                        />
                      </div>
                    </div>
                    {data.audit.program && (
                      <p className="text-xs text-gray-500">Program: {data.audit.program.name} ({data.audit.program.code})</p>
                    )}
                    {/* Category chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {data.audit.requirementResults.map((req: RequirementAuditResult) => (
                        <span
                          key={req.requirementId}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${requirementStatusColor(req.status)}`}
                          title={`${req.requirementName}: ${req.creditsCompleted}/${req.creditsRequired} credits`}
                        >
                          {req.category}
                        </span>
                      ))}
                    </div>
                    {/* Missing items */}
                    {(() => {
                      const missing = data.audit.requirementResults
                        .filter((r: RequirementAuditResult) => r.status === 'DEFICIENT' || r.status === 'NOT_STARTED')
                        .flatMap((r: RequirementAuditResult) => r.missingSuggestions)
                      if (missing.length === 0) return null
                      return (
                        <div className="text-xs text-gray-600">
                          <p className="font-bold text-gray-700 mb-1">Missing / Needed:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {missing.slice(0, 6).map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                            {missing.length > 6 && <li className="text-gray-400">+{missing.length - 6} more</li>}
                          </ul>
                        </div>
                      )
                    })()}
                  </div>
                </Section>
              )}

              {/* ── Active Petitions ── */}
              {data.petitions.length > 0 && (
                <Section
                  title="Active Petitions"
                  icon={<FileText className="size-5 text-[#0033A0]" />}
                  badge={
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {data.petitions.length}
                    </span>
                  }
                >
                  <CappedList items={data.petitions} cap={4} renderItem={(p: Student360Petition) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {PETITION_TYPE_LABELS[p.type] ?? p.type}
                          </p>
                          <p className="text-gray-400">{daysOpen(p.submittedAt)} days open</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${petitionStatusColor(p.status)}`}>
                          {PETITION_STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </div>
                  )} />
                </Section>
              )}

              {/* ── Holds ── */}
              {data.holds.length > 0 && (
                <Section
                  title="Holds"
                  icon={<Lock className="size-5 text-red-500" />}
                  badge={
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {data.holds.length}
                    </span>
                  }
                >
                  <CappedList items={data.holds} cap={4} renderItem={(h: SimulatedHold, i: number) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2">
                        <Lock className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{h.description}</p>
                      </div>
                  )} />
                </Section>
              )}

              {/* ── Current Enrollment ── */}
              {data.currentEnrollment.length > 0 && (
                <Section
                  title="Current Enrollment"
                  icon={<BookOpen className="size-5 text-[#0033A0]" />}
                  badge={
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {data.currentEnrollment.filter((e: EnrolledCourse) => e.status === 'ENROLLED').length} courses
                    </span>
                  }
                >
                  <CappedList items={data.currentEnrollment} cap={4} className="space-y-1.5 pt-2" renderItem={(c: EnrolledCourse) => (
                      <div key={c.courseCode} className="flex items-center justify-between text-xs">
                        <span className="text-gray-800">
                          <span className="font-medium">{c.courseCode}</span> — {c.courseName}
                        </span>
                        <span className="text-gray-500 shrink-0 ml-2">{c.credits} cr</span>
                      </div>
                  )} />
                </Section>
              )}

              {/* ── Recent Transcript ── */}
              {data.courseHistory.length > 0 && (
                <Section
                  title="Recent Transcript"
                  icon={<GraduationCap className="size-5 text-gray-500" />}
                  defaultOpen={false}
                >
                  <div className="space-y-3 pt-2">
                    {(() => {
                      // Group by term
                      const byTerm: Record<string, CompletedCourse[]> = {}
                      for (const c of data.courseHistory) {
                        if (!byTerm[c.term]) byTerm[c.term] = []
                        byTerm[c.term].push(c)
                      }
                      const terms = Object.keys(byTerm)
                      // Show most recent 4 terms
                      return terms.slice(0, 4).map(term => (
                        <div key={term}>
                          <p className="text-xs font-bold text-gray-700 mb-1">{term}</p>
                          <div className="space-y-1">
                            {byTerm[term].map((c: CompletedCourse) => (
                              <div key={c.courseCode} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700 truncate flex-1">
                                  {c.courseCode} — {c.courseName}
                                </span>
                                <span className={`font-medium shrink-0 ml-2 ${
                                  ['A', 'A-', 'B+', 'B'].includes(c.grade) ? 'text-green-700' :
                                  ['B-', 'C+', 'C'].includes(c.grade) ? 'text-yellow-700' :
                                  ['D', 'D+', 'D-', 'F', 'W', 'I'].includes(c.grade) ? 'text-red-600' :
                                  'text-gray-600'
                                }`}>
                                  {c.grade}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </Section>
              )}

              {/* ── Sandy's Take ── */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3">
                <div className="flex items-start gap-2">
                  <div className="size-7 rounded-full bg-[#0033A0] flex items-center justify-center shrink-0">
                    <Bot className="size-4 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-[#0033A0] mb-1">Sandy&apos;s Take</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{data.sandySummary}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
