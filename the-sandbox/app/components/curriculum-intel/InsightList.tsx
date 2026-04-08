'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Copy,
  ArrowRightLeft,
  BarChart3,
  Layers,
  Wrench,
  Check,
  Eye,
  X,
} from 'lucide-react'
import type { InsightType, InsightSeverity, InsightStatus } from '../../lib/curriculum-intel/types'

const UK_BLUE = '#0033A0'

// ── Icon + color maps ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<InsightType, { icon: typeof AlertTriangle; label: string; color: string }> = {
  gap: { icon: AlertTriangle, label: 'Gap', color: '#ef4444' },
  redundancy: { icon: Copy, label: 'Redundancy', color: '#f97316' },
  'pathway-optimization': { icon: ArrowRightLeft, label: 'Pathway', color: '#22c55e' },
  'bloom-imbalance': { icon: Layers, label: 'Bloom', color: '#eab308' },
  'tool-effectiveness': { icon: Wrench, label: 'Tool', color: '#3b82f6' },
}

const SEVERITY_BADGE: Record<InsightSeverity, { bg: string; text: string }> = {
  significant: { bg: 'bg-red-100', text: 'text-red-700' },
  moderate: { bg: 'bg-amber-100', text: 'text-amber-700' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700' },
}

// ── Types ───────────────────────────────────────────────────────────────────

interface Insight {
  id: string
  type: string
  severity: string
  title: string
  description: string
  recommendation: string | null
  status: string
  discoveredAt: string
}

interface InsightListProps {
  insights: Insight[]
  onAction?: (id: string, status: InsightStatus) => void
}

// ── Component ───────────────────────────────────────────────────────────────

export default function InsightList({ insights, onAction }: InsightListProps) {
  const [filterType, setFilterType] = useState<InsightType | 'all'>('all')

  const filtered = filterType === 'all'
    ? insights
    : insights.filter(i => i.type === filterType)

  const typeCounts = insights.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="border rounded-2xl shadow-sm bg-white">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">
            Insights ({insights.length})
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                filterType === 'all'
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {(Object.keys(TYPE_CONFIG) as InsightType[]).map(type => {
              const count = typeCounts[type] ?? 0
              if (count === 0) return null
              const config = TYPE_CONFIG[type]
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    filterType === type
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {config.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="divide-y max-h-[500px] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-400">No insights found.</div>
        )}
        {filtered.map(insight => {
          const config = TYPE_CONFIG[insight.type as InsightType] ?? TYPE_CONFIG.gap
          const Icon = config.icon
          const severity = SEVERITY_BADGE[insight.severity as InsightSeverity] ?? SEVERITY_BADGE.info

          return (
            <div key={insight.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex-shrink-0 rounded-lg p-1.5"
                  style={{ backgroundColor: config.color + '15' }}
                >
                  <Icon className="size-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${severity.bg} ${severity.text}`}>
                      {insight.severity}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-medium">
                      {config.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{insight.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{insight.description}</p>
                  {insight.recommendation && (
                    <p className="text-xs text-[#0033A0] mt-1 font-medium">
                      Recommendation: {insight.recommendation}
                    </p>
                  )}
                  {onAction && insight.status === 'new' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onAction(insight.id, 'reviewed')}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <Eye className="size-3" /> Mark Reviewed
                      </button>
                      <button
                        onClick={() => onAction(insight.id, 'acted')}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002a80]"
                      >
                        <Check className="size-3" /> Acted On
                      </button>
                      <button
                        onClick={() => onAction(insight.id, 'dismissed')}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-600"
                      >
                        <X className="size-3" /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
