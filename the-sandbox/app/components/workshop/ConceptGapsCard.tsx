'use client'

import { BrainCircuit } from 'lucide-react'

interface ConceptGap {
  concept: string
  studentCount: number
  avgMastery: number
}

interface Props {
  concepts: ConceptGap[]
  loading: boolean
}

function getMasteryColor(mastery: number) {
  const pct = mastery * 100
  if (pct < 25) return 'text-red-600 bg-red-50'
  if (pct < 40) return 'text-amber-600 bg-amber-50'
  return 'text-yellow-600 bg-yellow-50'
}

export default function ConceptGapsCard({ concepts, loading }: Props) {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit className="size-5 text-indigo-600" />
        <h2 className="font-extrabold text-gray-900 text-sm">Concept Gaps</h2>
        <span className="text-[10px] text-gray-400 ml-auto">Top 5</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-12 h-4 bg-gray-200 rounded" />
              <div className="w-14 h-5 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : concepts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <BrainCircuit className="size-8 mb-2 opacity-50" />
          <p className="text-sm">No concept gaps detected — great work!</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-400">
              <th className="text-left pb-2 font-medium">Concept</th>
              <th className="text-right pb-2 font-medium">Students</th>
              <th className="text-right pb-2 font-medium">Avg Mastery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {concepts.map(c => {
              const pct = Math.round(c.avgMastery * 100)
              return (
                <tr key={c.concept}>
                  <td className="py-2 text-gray-800 font-medium truncate max-w-[140px]">
                    {c.concept}
                  </td>
                  <td className="py-2 text-right text-gray-500">{c.studentCount}</td>
                  <td className="py-2 text-right">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${getMasteryColor(c.avgMastery)}`}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
