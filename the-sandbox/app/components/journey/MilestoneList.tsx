'use client'

import { Target, TrendingUp, TrendingDown, Users, Zap, Heart } from 'lucide-react'
import type { JourneyMilestone } from '../../generated/prisma'

interface MilestoneListProps {
  milestones: JourneyMilestone[]
}

const milestoneIcons: Record<string, { icon: typeof Target; color: string }> = {
  breakthrough: { icon: Target, color: 'text-green-600 bg-green-50' },
  'engagement-shift': { icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
  'struggle-start': { icon: TrendingDown, color: 'text-amber-600 bg-amber-50' },
  recovery: { icon: TrendingUp, color: 'text-cyan-600 bg-cyan-50' },
  'social-expansion': { icon: Users, color: 'text-purple-600 bg-purple-50' },
  'milestone-reached': { icon: Zap, color: 'text-yellow-600 bg-yellow-50' },
  'intervention-success': { icon: Heart, color: 'text-pink-600 bg-pink-50' },
}

function getWeekLabel(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MilestoneList({ milestones }: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <div className="border rounded-2xl shadow-sm bg-white p-6">
        <h2 className="text-lg font-extrabold text-gray-900 mb-2">Milestones</h2>
        <p className="text-sm text-gray-500">No milestones detected yet. Keep learning!</p>
      </div>
    )
  }

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-6">
      <h2 className="text-lg font-extrabold text-gray-900 mb-4">Milestones</h2>
      <div className="space-y-3">
        {milestones.map(m => {
          const config = milestoneIcons[m.type] ?? milestoneIcons.breakthrough
          const Icon = config.icon
          return (
            <div key={m.id} className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg ${config.color}`}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">{getWeekLabel(m.occurredAt)}</span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-400 capitalize">{m.layer}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                <p className="text-xs text-gray-500">{m.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
