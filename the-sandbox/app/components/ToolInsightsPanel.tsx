'use client'

import { useState, useEffect } from 'react'
import { Loader2, HelpCircle, AlertTriangle, Users, MessageSquare, RefreshCw, Timer, CheckCircle2, XCircle, Tag } from 'lucide-react'
import type { ToolInsight } from '../lib/insight-service'

type SessionQuality = {
  avgDurationMinutes: number | null
  avgHintCount: number | null
  completionRate: number | null
  abandonRate: number | null
  topConcepts: string[]
}

type InsightWithQuality = ToolInsight & { sessionQuality?: SessionQuality }

interface Props {
  toolId:    string
  userEmail: string
  courseId?: string | null
}

type LoadState = 'idle' | 'loading' | 'done' | 'error'

export function ToolInsightsPanel({ toolId, userEmail, courseId }: Props) {
  const [insight, setInsight]   = useState<InsightWithQuality | null>(null)
  const [state, setState]       = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const load = async () => {
    setState('loading')
    setErrorMsg('')
    try {
      const params = new URLSearchParams()
      if (courseId) params.set('courseId', courseId)
      const res  = await fetch(`/api/tools/${toolId}/insights?${params}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Failed to load insights')
      }
      const data = await res.json() as InsightWithQuality
      setInsight(data)
      setState('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setState('error')
    }
  }

  useEffect(() => { load() }, [toolId, courseId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === 'idle' || state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Analysing student sessions…</p>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <p className="text-sm text-red-500">{errorMsg}</p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-[#0033A0] hover:underline"
        >
          <RefreshCw className="size-3" /> Try again
        </button>
      </div>
    )
  }

  if (!insight) return null

  const { topQuestions, misconceptions, avgMessageCount, completionRate, totalSessions, sessionQuality } = insight as InsightWithQuality

  const completionPct = Math.round(completionRate * 100)

  const frequencyColor: Record<string, string> = {
    high:   'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low:    'bg-yellow-50 border-yellow-200 text-yellow-600',
  }

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 text-center">
          <Users className="size-4 text-gray-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total sessions</p>
        </div>
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 text-center">
          <MessageSquare className="size-4 text-gray-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{avgMessageCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Avg messages / session</p>
        </div>
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-2">Completion rate</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#0033A0] h-2 rounded-full transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1">{completionPct}%</p>
        </div>
      </div>

      {/* Session Quality strip */}
      {sessionQuality && (sessionQuality.avgDurationMinutes != null || sessionQuality.avgHintCount != null || sessionQuality.completionRate != null || sessionQuality.topConcepts.length > 0) && (
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Session Quality</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {sessionQuality.avgDurationMinutes != null && (
              <span className="flex items-center gap-1 text-xs text-gray-700">
                <Timer className="size-3 text-gray-400" />
                Avg {sessionQuality.avgDurationMinutes} min
              </span>
            )}
            {sessionQuality.avgHintCount != null && sessionQuality.avgHintCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-700">
                <HelpCircle className="size-3 text-gray-400" />
                {sessionQuality.avgHintCount} hints/session
              </span>
            )}
            {sessionQuality.completionRate != null && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="size-3 text-green-500" />
                {sessionQuality.completionRate}% completed
              </span>
            )}
            {sessionQuality.abandonRate != null && sessionQuality.abandonRate > 15 && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <XCircle className="size-3 text-red-400" />
                {sessionQuality.abandonRate}% abandoned
              </span>
            )}
          </div>
          {sessionQuality.topConcepts.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Tag className="size-3 text-gray-400 flex-shrink-0" />
              {sessionQuality.topConcepts.map(c => (
                <span key={c} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-1.5 py-0.5">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top questions */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <HelpCircle className="size-4 text-[#0033A0]" />
          Top questions from students
        </h3>
        {topQuestions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Not enough data yet.</p>
        ) : (
          <ol className="space-y-2">
            {topQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
                <span className="flex-shrink-0 size-5 rounded-full bg-[#0033A0]/10 text-[#0033A0] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700">{q.question}</span>
                <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                  ~{q.count} student{q.count !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Misconceptions */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <AlertTriangle className="size-4 text-amber-500" />
          Common misconceptions
        </h3>
        {misconceptions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No misconceptions detected.</p>
        ) : (
          <div className="space-y-2">
            {misconceptions.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg border px-4 py-3 text-sm font-medium ${frequencyColor[m.frequency] ?? frequencyColor.low}`}
              >
                <span className="capitalize text-xs font-semibold mr-2 opacity-70">{m.frequency}</span>
                {m.topic}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span>
          Generated {new Date(insight.generatedAt).toLocaleString()} · last 90 days
        </span>
        <button onClick={load} className="flex items-center gap-1 hover:text-[#0033A0] transition-colors">
          <RefreshCw className="size-3" /> Refresh
        </button>
      </div>
    </div>
  )
}
