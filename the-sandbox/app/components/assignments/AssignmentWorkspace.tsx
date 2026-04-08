'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import AssignmentBrief from './AssignmentBrief'
import WorkspaceToolPanel from './WorkspaceToolPanel'
import type { WorkflowSuggestion } from '../../lib/assignment-workspace-service'

import type { RubricCriterion } from '../courses/course-types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkspaceData {
  assignment: {
    id: string
    title: string
    courseId: string
    courseCode: string
    courseName: string
    description: string | null
    type: string
    assessmentMode: string
    dueAt: string | null
    dueLabel: string
    urgency: 'critical' | 'warning' | 'info'
    pointsPossible: number
    acceptingLate: boolean
    rubric: { id: string; title: string; criteria: RubricCriterion[] } | null
  }
  submission: {
    status: 'not-started' | 'draft' | 'submitted' | 'graded'
    sessionId: string | null
    submittedAt: string | null
    grade: string | null
    feedback: string | null
  }
  relatedConcepts: string[]
  workflow: WorkflowSuggestion
  rubricText: string | null
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AssignmentWorkspace({ assignmentId }: { assignmentId: string }) {
  const router = useRouter()
  const { currentUser } = useAuth()

  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('sandy')
  const [briefCollapsed, setBriefCollapsed] = useState(false)

  // Fetch workspace data
  useEffect(() => {
    fetch(`/api/assignments/${assignmentId}/workspace`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to load workspace')
        }
        return res.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [assignmentId, currentUser.email])

  const handleStartDraft = useCallback(() => setActiveTab('draft'), [])

  const handleSubmitted = useCallback(() => {
    // Refresh workspace data after submission
    fetch(`/api/assignments/${assignmentId}/workspace`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
  }, [assignmentId, currentUser.email])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-extrabold text-gray-900">{error || 'Assignment not found'}</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-bold text-white"
        >
          <ArrowLeft className="size-4" />
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <h2 className="text-sm font-bold text-gray-800 truncate max-w-md">
          {data.assignment.title}
        </h2>
        <span className="text-xs text-gray-400">
          {data.assignment.courseCode}
        </span>
      </div>

      {/* Main content — split screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Assignment Brief (desktop) */}
        <div className="hidden lg:flex lg:w-5/12 lg:flex-col lg:border-r lg:border-gray-100">
          <AssignmentBrief
            assignment={data.assignment}
            submission={data.submission}
            onStartDraft={handleStartDraft}
          />
        </div>

        {/* Mobile: collapsible brief */}
        <div className="flex w-full flex-col lg:hidden">
          <button
            type="button"
            onClick={() => setBriefCollapsed(!briefCollapsed)}
            className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">{data.assignment.title}</span>
              <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                data.assignment.urgency === 'critical'
                  ? 'bg-red-100 text-red-700'
                  : data.assignment.urgency === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
              }`}>
                {data.assignment.dueLabel}
              </span>
            </div>
            {briefCollapsed ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronUp className="size-4 text-gray-400" />}
          </button>

          {!briefCollapsed && (
            <div className="max-h-64 overflow-y-auto border-b border-gray-100">
              <AssignmentBrief
                assignment={data.assignment}
                submission={data.submission}
                onStartDraft={handleStartDraft}
              />
            </div>
          )}

          {/* Right panel — Tool Panel (mobile, fills remaining space) */}
          <div className="flex-1 overflow-hidden">
            <WorkspaceToolPanel
              assignmentId={assignmentId}
              assignment={data.assignment}
              submission={data.submission}
              relatedConcepts={data.relatedConcepts}
              rubricText={data.rubricText}
              workflow={data.workflow}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSubmitted={handleSubmitted}
            />
          </div>
        </div>

        {/* Right panel — Tool Panel (desktop) */}
        <div className="hidden lg:flex lg:w-7/12 lg:flex-col">
          <WorkspaceToolPanel
            assignmentId={assignmentId}
            assignment={data.assignment}
            submission={data.submission}
            relatedConcepts={data.relatedConcepts}
            rubricText={data.rubricText}
            workflow={data.workflow}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSubmitted={handleSubmitted}
          />
        </div>
      </div>
    </div>
  )
}
