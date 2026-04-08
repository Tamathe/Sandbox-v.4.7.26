'use client'

import { Brain, Zap } from 'lucide-react'
import { format } from 'date-fns'

export type CognitiveSignal = {
  sessionId: string
  toolName: string
  startedAt: string
  avgCognitiveLoad: number | null
  avgFrustration: number | null
  isProductiveStruggle: boolean | null
  bloomLevel: number | null
  score: number | null
}

const BLOOM_COLORS: Record<number, string> = {
  1: '#94A3B8',
  2: '#60A5FA',
  3: '#34D399',
  4: '#FBBF24',
  5: '#F97316',
  6: '#A78BFA',
}

function BloomCell({ level }: { level: number | null }) {
  if (level == null) return <span className="text-gray-300">—</span>
  const color = BLOOM_COLORS[level] ?? '#94A3B8'
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block size-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="font-medium" style={{ color }}>L{level}</span>
    </span>
  )
}

function CogLoadCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-400">
        —
      </span>
    )
  }
  const pct = Math.round(value * 100)
  if (value < 0.4) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 font-medium">
        Low {pct}%
      </span>
    )
  }
  if (value <= 0.7) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 font-medium">
        Moderate {pct}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 font-medium">
      High {pct}%
    </span>
  )
}

function FrustrationCell({
  value,
  isProductiveStruggle,
}: {
  value: number | null
  isProductiveStruggle: boolean | null
}) {
  const pill =
    value == null ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-400">
        —
      </span>
    ) : value < 0.4 ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 font-medium">
        Low {Math.round(value * 100)}%
      </span>
    ) : value <= 0.7 ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-700 font-medium">
        Moderate {Math.round(value * 100)}%
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 font-medium">
        High {Math.round(value * 100)}%
      </span>
    )

  return (
    <div className="flex flex-col gap-1">
      {pill}
      {isProductiveStruggle && (
        <span className="inline-flex items-center gap-0.5 text-xs text-green-700 font-medium">
          <Zap className="size-3" />
          Productive
        </span>
      )}
    </div>
  )
}

type Props = {
  data: CognitiveSignal[]
}

export default function CognitiveHeatmap({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="size-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Brain className="size-4 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Cognitive Signals</h3>
          <p className="text-xs text-gray-400 mt-0.5">Observer readings from your last sessions</p>
        </div>
      </div>

      {/* Empty state */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Brain className="size-10 text-gray-200" />
          <div>
            <p className="font-semibold text-gray-500">No observer data yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              The Learning Observer activates after your 3rd message in any tool session.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2 rounded-l-lg">Tool</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Bloom</th>
                <th className="text-left px-3 py-2">Cognitive Load</th>
                <th className="text-left px-3 py-2">Frustration</th>
                <th className="text-right px-3 py-2 rounded-r-lg">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.sessionId}
                  className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}
                >
                  <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[160px]">
                    <span className="truncate block" title={row.toolName}>
                      {row.toolName.length > 24
                        ? row.toolName.slice(0, 24) + '…'
                        : row.toolName}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {format(new Date(row.startedAt), 'MMM d')}
                  </td>
                  <td className="px-3 py-2.5">
                    <BloomCell level={row.bloomLevel} />
                  </td>
                  <td className="px-3 py-2.5">
                    <CogLoadCell value={row.avgCognitiveLoad} />
                  </td>
                  <td className="px-3 py-2.5">
                    <FrustrationCell
                      value={row.avgFrustration}
                      isProductiveStruggle={row.isProductiveStruggle}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                    {row.score != null ? row.score : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
