'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from '../DynamicChart'
import {
  Users, Clock, Activity, Target, AlertTriangle, BookOpen,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface CourseFingerprint {
  courseId: string
  studentCount: number
  chronotypeDistribution: Record<string, number>
  cadenceDistribution: Record<string, number>
  socialDistribution: Record<string, number>
  avgSessionMinutes: number
  avgConsistencyScore: number
  avgNudgeResponseRate: number
  avgToolDiversity: number
  topStudyModes: string[]
  riskSignals: string[]
  dominantChronotype: string
  dominantCadence: string
  engagementTrend: string
}

const CHRONO_COLORS: Record<string, string> = {
  'early-bird': '#f59e0b',
  'night-owl': '#6366f1',
  'steady': '#10b981',
  'weekend-warrior': '#ec4899',
}

const CADENCE_COLORS: Record<string, string> = {
  'daily-grinder': '#10b981',
  'binge-learner': '#f59e0b',
  'sprint-rester': '#3b82f6',
  'crammer': '#ef4444',
  'minimal': '#9ca3af',
}

const SOCIAL_COLORS: Record<string, string> = {
  'solo': '#6366f1',
  'small-group': '#3b82f6',
  'community-active': '#10b981',
}

function toChartData(dist: Record<string, number>, colorMap: Record<string, string>) {
  return Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: Math.round(value * 100),
      fill: colorMap[key] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value)
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="border rounded-xl p-4 bg-white text-center">
      <Icon className="size-5 text-gray-400 mx-auto mb-1" />
      <p className="text-lg font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function DistributionChart({ data, title }: { data: { name: string; value: number; fill: string }[]; title: string }) {
  if (data.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={10} />
            <YAxis type="category" dataKey="name" width={100} fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ClassFingerprintPanel({ courseId }: { courseId: string | null }) {
  const { currentUser } = useAuth()
  const [fingerprint, setFingerprint] = useState<CourseFingerprint | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!courseId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/fingerprint/course/${courseId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then(data => setFingerprint(data.fingerprint ?? null))
      .catch(() => setFingerprint(null))
      .finally(() => setLoading(false))
  }, [courseId, currentUser.email])

  if (loading) {
    return (
      <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!fingerprint) {
    return (
      <div className="border rounded-2xl shadow-sm p-6 bg-white text-center">
        <Users className="size-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Not enough student data to build a class profile.</p>
        <p className="text-xs text-gray-400 mt-1">Profiles are generated once students have sufficient activity.</p>
      </div>
    )
  }

  const chronoData = useMemo(() => toChartData(fingerprint.chronotypeDistribution, CHRONO_COLORS), [fingerprint.chronotypeDistribution])
  const cadenceData = useMemo(() => toChartData(fingerprint.cadenceDistribution, CADENCE_COLORS), [fingerprint.cadenceDistribution])
  const socialData = useMemo(() => toChartData(fingerprint.socialDistribution, SOCIAL_COLORS), [fingerprint.socialDistribution])

  return (
    <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-gray-900">Class Profile</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Aggregated learning patterns — no individual student data exposed.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0033A0] text-xs font-semibold px-3 py-1 rounded-full">
          <Users className="size-3.5" />
          {fingerprint.studentCount} students
        </span>
      </div>

      {/* Risk Signals */}
      {fingerprint.riskSignals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fingerprint.riskSignals.map((signal, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200">
              <AlertTriangle className="size-3.5" />
              {signal}
            </span>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          label="Avg Session"
          value={`${fingerprint.avgSessionMinutes.toFixed(0)} min`}
        />
        <StatCard
          icon={Activity}
          label="Consistency"
          value={`${(fingerprint.avgConsistencyScore * 100).toFixed(0)}%`}
        />
        <StatCard
          icon={Target}
          label="Nudge Response"
          value={`${(fingerprint.avgNudgeResponseRate * 100).toFixed(0)}%`}
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DistributionChart data={chronoData} title="Chronotype Distribution" />
        <DistributionChart data={cadenceData} title="Study Cadence Distribution" />
      </div>

      {/* Social Orientation */}
      {socialData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Social Orientation</p>
          <div className="flex gap-3">
            {socialData.map(item => (
              <div key={item.name} className="flex-1 rounded-xl border p-3 text-center" style={{ borderColor: item.fill + '40' }}>
                <p className="text-lg font-extrabold" style={{ color: item.fill }}>{item.value}%</p>
                <p className="text-xs text-gray-600">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Study Modes */}
      {fingerprint.topStudyModes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Study Modes</p>
          <div className="flex flex-wrap gap-2">
            {fingerprint.topStudyModes.map(mode => (
              <span key={mode} className="inline-flex items-center gap-1 bg-blue-50 text-[#0033A0] text-xs font-semibold px-3 py-1.5 rounded-full">
                <BookOpen className="size-3" />
                {mode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Trend */}
      <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-4">
        <Activity className="size-3.5" />
        Engagement trend: <span className={`font-semibold ${
          fingerprint.engagementTrend === 'rising' ? 'text-green-600' :
          fingerprint.engagementTrend === 'declining' ? 'text-red-600' : 'text-gray-600'
        }`}>{fingerprint.engagementTrend}</span>
      </div>
    </div>
  )
}

export default React.memo(ClassFingerprintPanel)
