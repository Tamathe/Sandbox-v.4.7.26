'use client'

/**
 * TopicOverlap — Venn-style visual showing complementary strengths between
 * the current user and their match partners.
 * FERPA-safe: shows concept labels only, never numeric scores.
 */

interface TopicOverlapProps {
  yourStrengths: string[]   // concepts you can teach
  theirStrengths: string[]  // concepts they can teach you
  shared: string[]          // concepts both are strong in
}

export default function TopicOverlap({ yourStrengths, theirStrengths, shared }: TopicOverlapProps) {
  if (yourStrengths.length === 0 && theirStrengths.length === 0 && shared.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 text-xs">
      {/* Your strengths */}
      {yourStrengths.length > 0 && (
        <div className="flex-1 rounded-xl bg-blue-50 border border-blue-200 p-3">
          <p className="font-semibold text-blue-700 mb-1">You can teach</p>
          <div className="flex flex-wrap gap-1">
            {yourStrengths.map((c) => (
              <span key={c} className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Shared strengths */}
      {shared.length > 0 && (
        <div className="flex-1 rounded-xl bg-green-50 border border-green-200 p-3">
          <p className="font-semibold text-green-700 mb-1">Both strong in</p>
          <div className="flex flex-wrap gap-1">
            {shared.map((c) => (
              <span key={c} className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Their strengths */}
      {theirStrengths.length > 0 && (
        <div className="flex-1 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="font-semibold text-amber-700 mb-1">They can teach you</p>
          <div className="flex flex-wrap gap-1">
            {theirStrengths.map((c) => (
              <span key={c} className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
