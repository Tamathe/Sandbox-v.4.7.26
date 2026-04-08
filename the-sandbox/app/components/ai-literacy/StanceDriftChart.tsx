'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StanceMovement {
  from: string
  to: string
  count: number
}

interface StanceDriftChartProps {
  movements: StanceMovement[]
  narrative: string
  netDirection: number
  totalChanges: number
  monthly: { month: string; stances: Record<string, number> }[]
}

const STANCE_COLORS: Record<string, string> = {
  PROHIBIT: 'bg-red-500',
  CAUTIOUS: 'bg-amber-500',
  GUIDED: 'bg-blue-500',
  INTEGRATE: 'bg-indigo-500',
  REQUIRE: 'bg-green-500',
}

const STANCE_LABELS: Record<string, string> = {
  PROHIBIT: 'Prohibit',
  CAUTIOUS: 'Cautious',
  GUIDED: 'Guided',
  INTEGRATE: 'Integrate',
  REQUIRE: 'Require',
}

export default function StanceDriftChart({
  movements,
  narrative,
  netDirection,
  totalChanges,
  monthly,
}: StanceDriftChartProps) {
  if (totalChanges === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-2xl text-center">
        <p className="text-sm text-gray-500">{narrative}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Direction indicator */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl ${
        netDirection > 0 ? 'bg-indigo-50' : netDirection < 0 ? 'bg-amber-50' : 'bg-gray-50'
      }`}>
        <div className={`size-10 rounded-full flex items-center justify-center ${
          netDirection > 0 ? 'bg-indigo-100' : netDirection < 0 ? 'bg-amber-100' : 'bg-gray-100'
        }`}>
          {netDirection > 0 ? <TrendingUp className="size-5 text-indigo-600" /> :
           netDirection < 0 ? <TrendingDown className="size-5 text-amber-600" /> :
           <Minus className="size-5 text-gray-500" />}
        </div>
        <p className="text-sm text-gray-700">{narrative}</p>
      </div>

      {/* Top movements */}
      {movements.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Top Movements
          </h4>
          <div className="space-y-1.5">
            {movements.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`size-2.5 rounded-full ${STANCE_COLORS[m.from] ?? 'bg-gray-400'}`} />
                <span className="text-gray-700">{STANCE_LABELS[m.from] ?? m.from}</span>
                <span className="text-gray-400">→</span>
                <span className={`size-2.5 rounded-full ${STANCE_COLORS[m.to] ?? 'bg-gray-400'}`} />
                <span className="text-gray-700">{STANCE_LABELS[m.to] ?? m.to}</span>
                <span className="text-xs text-gray-400 ml-auto">{m.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly stacked bars */}
      {monthly.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Monthly New Stances
          </h4>
          <div className="flex items-end gap-1 h-24">
            {monthly.map((m, i) => {
              const total = Object.values(m.stances).reduce((s, n) => s + n, 0)
              if (total === 0) return null
              return (
                <div key={i} className="flex-1 flex flex-col justify-end" title={`${m.month}: ${total} new stances`}>
                  {Object.entries(m.stances).filter(([, n]) => n > 0).map(([stance, count]) => (
                    <div
                      key={stance}
                      className={`${STANCE_COLORS[stance] ?? 'bg-gray-300'} first:rounded-t`}
                      style={{ height: `${(count / total) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
                    />
                  ))}
                  <span className="text-[10px] text-gray-400 text-center mt-1">
                    {m.month.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-2">
            {Object.entries(STANCE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className={`size-2 rounded-full ${STANCE_COLORS[key]}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
