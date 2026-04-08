'use client'

import { useState, useEffect } from 'react'
import {
  Sun, Moon, Sunrise, Calendar,
  TrendingUp, TrendingDown, Minus,
  User, Users, Globe,
  Zap, Clock, Flame, Coffee, AlertCircle,
  Brain,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import type { ComputedFingerprint } from '../../lib/fingerprint/types'

const CHRONOTYPE_CONFIG: Record<string, { icon: typeof Sun; label: string; color: string }> = {
  'early-bird': { icon: Sunrise, label: 'Early Bird', color: 'text-amber-600 bg-amber-50' },
  'night-owl': { icon: Moon, label: 'Night Owl', color: 'text-indigo-600 bg-indigo-50' },
  'steady': { icon: Sun, label: 'Steady', color: 'text-blue-600 bg-blue-50' },
  'weekend-warrior': { icon: Calendar, label: 'Weekend Warrior', color: 'text-emerald-600 bg-emerald-50' },
}

const CADENCE_CONFIG: Record<string, { icon: typeof Zap; label: string }> = {
  'daily-grinder': { icon: Flame, label: 'Daily Grinder' },
  'binge-learner': { icon: Zap, label: 'Binge Learner' },
  'sprint-rester': { icon: Clock, label: 'Sprint & Rest' },
  'crammer': { icon: AlertCircle, label: 'Crammer' },
  'minimal': { icon: Coffee, label: 'Just Getting Started' },
}

const VELOCITY_CONFIG: Record<string, { icon: typeof TrendingUp; label: string; color: string }> = {
  'accelerating': { icon: TrendingUp, label: 'Accelerating', color: 'text-emerald-600' },
  'steady': { icon: Minus, label: 'Steady Pace', color: 'text-blue-600' },
  'decelerating': { icon: TrendingDown, label: 'Slowing Down', color: 'text-amber-600' },
  'plateaued': { icon: Minus, label: 'Plateaued', color: 'text-gray-500' },
}

const SOCIAL_CONFIG: Record<string, { icon: typeof User; label: string }> = {
  'solo': { icon: User, label: 'Solo Learner' },
  'small-group': { icon: Users, label: 'Small Group' },
  'community-active': { icon: Globe, label: 'Community Active' },
}

const DEADLINE_CONFIG: Record<string, { label: string; color: string }> = {
  'planner': { label: 'Planner', color: 'text-emerald-600' },
  'steady': { label: 'Steady', color: 'text-blue-600' },
  'crammer': { label: 'Last Minute', color: 'text-amber-600' },
  'late': { label: 'Runs Late', color: 'text-red-600' },
}

export default function LearningProfileCard() {
  const { currentUser } = useAuth()
  const [fingerprint, setFingerprint] = useState<ComputedFingerprint | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.email) return
    fetch('/api/fingerprint/me', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.fingerprint) setFingerprint(data.fingerprint)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser?.email])

  if (loading) {
    return (
      <div className="border rounded-2xl shadow-sm p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!fingerprint) {
    return (
      <div className="border rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="size-5 text-[#0033A0]" />
          <h3 className="text-sm font-extrabold text-gray-900">My Learning Profile</h3>
        </div>
        <p className="text-sm text-gray-500">Keep using the platform to build your profile. We&apos;ll show your learning patterns here once we have enough data.</p>
      </div>
    )
  }

  const chrono = CHRONOTYPE_CONFIG[fingerprint.temporal.chronotype] || CHRONOTYPE_CONFIG.steady
  const cadence = CADENCE_CONFIG[fingerprint.temporal.sessionCadence] || CADENCE_CONFIG.minimal
  const velocity = VELOCITY_CONFIG[fingerprint.learning.learningVelocity] || VELOCITY_CONFIG.steady
  const social = SOCIAL_CONFIG[fingerprint.social.socialOrientation] || SOCIAL_CONFIG.solo
  const deadline = DEADLINE_CONFIG[fingerprint.engagement.deadlineProximity] || DEADLINE_CONFIG.steady
  const confidencePct = Math.round(fingerprint.meta.confidence * 100)

  const ChronoIcon = chrono.icon
  const CadenceIcon = cadence.icon
  const VelocityIcon = velocity.icon
  const SocialIcon = social.icon

  return (
    <div className="border rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-[#0033A0]" />
          <h3 className="text-sm font-extrabold text-gray-900">My Learning Profile</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0033A0] rounded-full transition-all"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <span>{confidencePct}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Chronotype */}
        <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${chrono.color}`}>
          <ChronoIcon className="size-4 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Rhythm</p>
            <p className="text-xs font-bold truncate">{chrono.label}</p>
          </div>
        </div>

        {/* Cadence */}
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-700">
          <CadenceIcon className="size-4 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Cadence</p>
            <p className="text-xs font-bold truncate">{cadence.label}</p>
          </div>
        </div>

        {/* Learning Velocity */}
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-700">
          <VelocityIcon className={`size-4 flex-shrink-0 ${velocity.color}`} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Velocity</p>
            <p className="text-xs font-bold truncate">{velocity.label}</p>
          </div>
        </div>

        {/* Social Style */}
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-700">
          <SocialIcon className="size-4 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Style</p>
            <p className="text-xs font-bold truncate">{social.label}</p>
          </div>
        </div>

        {/* Deadline Behavior */}
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-700">
          <Calendar className={`size-4 flex-shrink-0 ${deadline.color}`} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Deadlines</p>
            <p className={`text-xs font-bold truncate ${deadline.color}`}>{deadline.label}</p>
          </div>
        </div>

        {/* Study Modes */}
        {fingerprint.learning.preferredStudyModes.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-700">
            <Zap className="size-4 flex-shrink-0 text-[#0033A0]" />
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Top Modes</p>
              <p className="text-xs font-bold truncate capitalize">
                {fingerprint.learning.preferredStudyModes.slice(0, 2).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
