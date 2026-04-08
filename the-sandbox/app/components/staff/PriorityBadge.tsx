'use client'

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-red-100 text-red-700 border border-red-200',
  P1: 'bg-amber-100 text-amber-700 border border-amber-200',
  P2: 'bg-blue-100 text-blue-700 border border-blue-200',
  P3: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
}

export default function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.P3
  const label = PRIORITY_LABELS[priority] ?? priority
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style}`}>
      {label}
    </span>
  )
}
