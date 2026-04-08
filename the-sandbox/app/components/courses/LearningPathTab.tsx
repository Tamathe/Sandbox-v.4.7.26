'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, Loader2, Route } from 'lucide-react'
import type { LinkedTool } from './course-types'

const TOOL_TYPE_LABELS: Record<string, string> = {
  CHATBOT: 'Chatbot',
  SIMULATION: 'Simulation',
  QUIZ: 'Quiz',
  AI_INTERVIEW: 'Interview',
  DEBATE: 'Debate',
  STUDY_BUDDY: 'Study Buddy',
  EXTERNAL: 'External',
}

interface LearningPathTabProps {
  linkedTools: LinkedTool[]
  userEmail: string
  isStudent: boolean
}

export default function LearningPathTab({ linkedTools, userEmail, isStudent }: LearningPathTabProps) {
  const [visitedToolIds, setVisitedToolIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(isStudent)

  useEffect(() => {
    if (!isStudent) { setLoading(false); return }
    fetch('/api/library', { headers: { 'x-demo-user-email': userEmail } })
      .then(r => r.json())
      .then((data: { library?: { toolId: string }[]; history?: { toolId: string }[] }) => {
        const ids = new Set<string>()
        data.library?.forEach(e => ids.add(e.toolId))
        data.history?.forEach(e => ids.add(e.toolId))
        setVisitedToolIds(ids)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isStudent, userEmail])

  const groups = linkedTools.reduce<Record<string, LinkedTool[]>>((acc, tool) => {
    const key = tool.weekLabel ?? 'Unscheduled'
    if (!acc[key]) acc[key] = []
    acc[key].push(tool)
    return acc
  }, {})

  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (a === 'Unscheduled') return 1
    if (b === 'Unscheduled') return -1
    return a.localeCompare(b, undefined, { numeric: true })
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (linkedTools.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 py-16 text-center">
        <Route className="mx-auto mb-3 size-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No tools added yet</p>
        <p className="mt-1 text-xs text-gray-400">
          {isStudent
            ? "Your instructor hasn't linked any tools to this course yet."
            : 'Link tools to this course and assign them to weeks to build a learning path.'}
        </p>
      </div>
    )
  }

  const totalVisited = isStudent ? linkedTools.filter(t => visitedToolIds.has(t.id)).length : 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Learning Path</h3>
        <p className="text-sm text-gray-500">
          {linkedTools.length} tool{linkedTools.length !== 1 ? 's' : ''} across {sortedGroups.length} group{sortedGroups.length !== 1 ? 's' : ''}
          {isStudent && (
            <> · {totalVisited} of {linkedTools.length} completed</>
          )}
        </p>
      </div>

      {sortedGroups.map(([weekLabel, tools]) => {
        const doneCount = isStudent ? tools.filter(t => visitedToolIds.has(t.id)).length : 0
        return (
          <div key={weekLabel} className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="size-7 rounded-full bg-[#0033A0]/10 flex items-center justify-center flex-shrink-0">
                <Route className="size-3.5 text-[#0033A0]" />
              </div>
              <h4 className="font-semibold text-gray-900">{weekLabel}</h4>
              {isStudent && (
                <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                  {doneCount}/{tools.length} done
                </span>
              )}
            </div>
            <div className="space-y-3">
              {tools.map((tool, idx) => {
                const visited = isStudent && visitedToolIds.has(tool.id)
                return (
                  <div key={tool.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                    {isStudent ? (
                      visited
                        ? <CheckCircle2 className="size-5 text-emerald-500 flex-shrink-0" />
                        : <Circle className="size-5 text-gray-300 flex-shrink-0" />
                    ) : (
                      <span className="size-5 flex-shrink-0 flex items-center justify-center rounded-full bg-[#0033A0]/10 text-[10px] font-bold text-[#0033A0]">
                        {idx + 1}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tools/${tool.id}`}
                        className="text-sm font-medium text-gray-800 hover:text-[#0033A0] transition-colors"
                      >
                        {tool.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#0033A0]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                          {TOOL_TYPE_LABELS[tool.toolType] ?? tool.toolType}
                        </span>
                        {tool.estimatedMinutes && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock className="size-3" />
                            {tool.estimatedMinutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/tools/${tool.id}`}
                      className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                        visited
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-[#0033A0] text-white hover:bg-[#002580]'
                      }`}
                    >
                      {visited ? 'Review' : 'Start'}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
