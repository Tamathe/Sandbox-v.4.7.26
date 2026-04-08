'use client'

import { ChevronRight } from 'lucide-react'
import type { ProgramCompliance } from '../../lib/accreditation/types'

interface ProgramRollupTableProps {
  programs: ProgramCompliance[]
}

const qualityColors: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  WEAK: 'bg-orange-100 text-orange-800',
  MISSING: 'bg-red-100 text-red-800',
}

function getQualityLabel(score: number): string {
  if (score >= 0.8) return 'EXCELLENT'
  if (score >= 0.6) return 'GOOD'
  if (score >= 0.4) return 'FAIR'
  if (score >= 0.2) return 'WEAK'
  return 'MISSING'
}

export default function ProgramRollupTable({ programs }: ProgramRollupTableProps) {
  if (programs.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No program-level evidence data available yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-2 font-semibold text-gray-700">Program</th>
            <th className="pb-2 font-semibold text-gray-700 text-center">Evidence</th>
            <th className="pb-2 font-semibold text-gray-700 text-center">Quality</th>
            <th className="pb-2 font-semibold text-gray-700 text-center">Gaps</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {programs.map(p => {
            const ql = getQualityLabel(p.qualityScore)
            return (
              <tr key={p.programCode} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3">
                  <span className="font-medium text-gray-900">{p.programCode}</span>
                  <span className="ml-2 text-gray-500">{p.programName}</span>
                </td>
                <td className="py-3 text-center text-gray-600">{p.evidenceCount}</td>
                <td className="py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${qualityColors[ql] ?? ''}`}>
                    {ql}
                  </span>
                </td>
                <td className="py-3 text-center">
                  {p.gaps.length > 0 ? (
                    <span className="text-red-600 font-medium">{p.gaps.length}</span>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <ChevronRight className="size-4 text-gray-400" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
