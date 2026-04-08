'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '../DynamicChart'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeiScore {
  meiScore: number
  durationTrend: number
  scoreTrend: number
  hintIndependence: number
  reformulationDecline: number
  bloomCeiling: number
  sessionsAnalyzed: number
  computedAt: string
}

interface TrajectoryPoint {
  id: string
  startedAt: string
  score: number | null
  durationSeconds: number | null
  hintCount: number | null
}

interface StudentMeiData {
  assignmentId: string
  meiScore: MeiScore | null
  trajectory: TrajectoryPoint[]
  minimumAttempts: number
  sessionsCompleted: number
}

interface StudentMeiViewProps {
  assignmentId: string
  authHeaders: Record<string, string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function meiColorClass(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function meiBgClass(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentMeiView({ assignmentId, authHeaders }: StudentMeiViewProps) {
  const [data, setData] = useState<StudentMeiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/assignments/${assignmentId}/mei`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [assignmentId, authHeaders])

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (!data) return null

  const { meiScore, trajectory, minimumAttempts, sessionsCompleted } = data
  const remaining = Math.max(0, minimumAttempts - sessionsCompleted)

  // ── Radar data ──────────────────────────────────────────────────────────
  const radarData = meiScore
    ? [
        { axis: 'Duration Efficiency', value: meiScore.durationTrend },
        { axis: 'Score Trend', value: meiScore.scoreTrend },
        { axis: 'Hint Independence', value: meiScore.hintIndependence },
        { axis: 'Reformulation', value: meiScore.reformulationDecline },
        { axis: 'Bloom Ceiling', value: meiScore.bloomCeiling },
      ]
    : []

  // ── Trajectory chart data ──────────────────────────────────────────────
  const trajectoryData = trajectory.map((t, i) => ({
    session: i + 1,
    score: t.score != null ? Number(t.score.toFixed(3)) : null,
    duration: t.durationSeconds,
  }))

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-5 text-[#0033A0]" />
        <h3 className="font-extrabold text-gray-900">Mastery Efficiency Index</h3>
      </div>

      {/* ── Scored state ──────────────────────────────────────────────────── */}
      {meiScore ? (
        <>
          {/* Score + metadata */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold ${meiColorClass(meiScore.meiScore)}`}>
                {meiScore.meiScore.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">/ 100</span>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${meiBgClass(meiScore.meiScore)}`}>
              {meiScore.meiScore >= 70 ? 'Strong' : meiScore.meiScore >= 40 ? 'Developing' : 'Needs Improvement'}
            </span>
            <div className="text-xs text-gray-400 ml-auto">
              {meiScore.sessionsAnalyzed} sessions analyzed · Updated{' '}
              {format(new Date(meiScore.computedAt), 'MMM d, h:mm a')}
            </div>
          </div>

          {/* Radar + Trajectory side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar chart */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Dimension Profile
              </p>
              <div className="w-full max-w-[400px] mx-auto">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fontSize: 11, fill: '#374151' }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="#0033A0"
                      fill="#0033A0"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#0033A0' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trajectory line chart */}
            {trajectoryData.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Session Trajectory
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trajectoryData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="session"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Session', position: 'insideBottomRight', offset: -4, fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="score"
                      domain={[0, 1]}
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Score', angle: -90, position: 'insideLeft', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="duration"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Duration (s)', angle: 90, position: 'insideRight', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      yAxisId="score"
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="#0033A0"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#0033A0' }}
                      connectNulls
                    />
                    <Line
                      yAxisId="duration"
                      type="monotone"
                      dataKey="duration"
                      name="Duration (s)"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 3, fill: '#10b981' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* ── Not yet scored — progress bar ─────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Complete <span className="font-semibold text-gray-900">{remaining} more</span>{' '}
              {remaining === 1 ? 'session' : 'sessions'} to receive your MEI score
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0033A0] transition-all"
                  style={{ width: `${Math.min(100, Math.round((sessionsCompleted / minimumAttempts) * 100))}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 shrink-0">
                {sessionsCompleted} / {minimumAttempts}
              </span>
            </div>
          </div>

          {/* Show partial trajectory if any sessions exist */}
          {trajectoryData.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Session Progress So Far
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trajectoryData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="session" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="score"
                    domain={[0, 1]}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="duration"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="score"
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="#0033A0"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#0033A0' }}
                    connectNulls
                  />
                  <Line
                    yAxisId="duration"
                    type="monotone"
                    dataKey="duration"
                    name="Duration (s)"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3, fill: '#10b981' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
