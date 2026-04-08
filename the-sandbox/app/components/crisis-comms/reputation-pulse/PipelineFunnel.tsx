'use client'

import { ArrowRight } from 'lucide-react'
import type { PipelineFunnel as PipelineFunnelData } from '../../../lib/crisis-comms/reputation-pulse/types'

interface Props {
  funnel: PipelineFunnelData
}

export default function PipelineFunnel({ funnel }: Props) {
  const stages = [
    { label: 'Total Posts', count: funnel.totalPosts, color: 'bg-[#0033A0]', textColor: 'text-[#0033A0]', bgLight: 'bg-[#0033A0]/10' },
    { label: 'Negative', count: funnel.negativePosts, color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
    { label: 'Likely AI', count: funnel.aiFlaggedPosts, color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  ]

  // Width proportions based on funnel narrowing
  const maxCount = Math.max(funnel.totalPosts, 1)
  const widths = stages.map((s) => Math.max(25, Math.round((s.count / maxCount) * 100)))

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="font-bold text-gray-900 text-sm mb-4">Analysis Pipeline</h3>
      <div className="flex items-center gap-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2" style={{ flex: widths[i] }}>
            <div className={`${stage.bgLight} rounded-xl p-3 flex-1 text-center`}>
              <div className={`text-2xl font-extrabold ${stage.textColor}`}>{stage.count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stage.label}</div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${stage.color}`}
                  style={{ width: `${Math.round((stage.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className="size-4 text-gray-300 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
