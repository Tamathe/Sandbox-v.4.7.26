'use client'

const MASTERY_COLORS = [
  { color: '#22c55e', label: 'Mastered' },
  { color: '#f59e0b', label: 'Partial' },
  { color: '#ef4444', label: 'Weak' },
  { color: '#d1d5db', label: 'Not Started' },
]

function HexagonIcon({ size = 12 }: { size?: number }) {
  const r = size / 2
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${r + r * Math.cos(angle)},${r + r * Math.sin(angle)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={points} fill="#6b7280" />
    </svg>
  )
}

function DiamondIcon({ size = 12 }: { size?: number }) {
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={`${r},0 ${size},${r} ${r},${size} 0,${r}`} fill="#6b7280" />
    </svg>
  )
}

export default function ConstellationLegend() {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Legend</h3>

      {/* Mastery Colors */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Mastery</p>
        <div className="flex flex-wrap gap-3">
          {MASTERY_COLORS.map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <svg width={12} height={12}>
                <circle cx={6} cy={6} r={5} fill={m.color} />
              </svg>
              <span className="text-xs text-gray-600">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node Types */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Node Types</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <svg width={12} height={12}>
              <circle cx={6} cy={6} r={5} fill="#6b7280" />
            </svg>
            <span className="text-xs text-gray-600">Objective</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DiamondIcon size={12} />
            <span className="text-xs text-gray-600">Assignment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HexagonIcon size={12} />
            <span className="text-xs text-gray-600">Concept</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width={12} height={12}>
              <rect x={1} y={1} width={10} height={10} rx={2} fill="#6b7280" />
            </svg>
            <span className="text-xs text-gray-600">Tool</span>
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Indicators</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <svg width={14} height={14}>
              <circle
                cx={7}
                cy={7}
                r={5}
                fill="none"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            </svg>
            <span className="text-xs text-gray-600">SR Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width={14} height={14} className="animate-pulse">
              <circle cx={7} cy={7} r={5} fill="#f59e0b" />
            </svg>
            <span className="text-xs text-gray-600">Stale Knowledge</span>
          </div>
        </div>
      </div>
    </div>
  )
}
