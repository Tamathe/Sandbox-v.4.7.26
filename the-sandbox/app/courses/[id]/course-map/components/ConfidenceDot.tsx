'use client'

export default function ConfidenceDot({ confidence }: { confidence: number | null }) {
  if (confidence == null) return null
  const color =
    confidence >= 0.95
      ? 'bg-green-500'
      : confidence >= 0.8
        ? 'bg-amber-500'
        : 'bg-red-500'
  const label =
    confidence >= 0.95 ? 'High' : confidence >= 0.8 ? 'Medium' : 'Low'
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <span className={`size-2 rounded-full ${color}`} />
      {label} ({Math.round(confidence * 100)}%)
    </span>
  )
}
