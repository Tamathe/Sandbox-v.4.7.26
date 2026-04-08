'use client'

import { Table } from 'lucide-react'

interface EvidenceTableProps {
  evidence: Array<{
    claim: string
    source: string
    sourceType: string
    confidence: string
  }>
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-red-100 text-red-800',
}

const SOURCE_TYPE_STYLES: Record<string, string> = {
  vault: 'bg-blue-100 text-blue-800',
  uknow: 'bg-purple-100 text-purple-800',
}

export default function EvidenceTable({ evidence }: EvidenceTableProps) {
  if (evidence.length === 0) {
    return (
      <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Table className="size-5 text-[#0033A0]" />
          <h3 className="text-base font-extrabold text-gray-900">Evidence Citations</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">
          No evidence citations yet.
        </p>
      </div>
    )
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Table className="size-5 text-[#0033A0]" />
          <h3 className="text-base font-extrabold text-gray-900">Evidence Citations</h3>
          <span className="text-xs text-gray-400 ml-auto">
            {evidence.length} citation{evidence.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Claim
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {evidence.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-800 max-w-xs">
                  <span className="line-clamp-2">{row.claim}</span>
                </td>
                <td className="px-5 py-3 text-gray-600 max-w-[200px]">
                  <span className="line-clamp-1">{row.source}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${SOURCE_TYPE_STYLES[row.sourceType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {row.sourceType}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[row.confidence] ?? 'bg-gray-100 text-gray-700'}`}>
                    {row.confidence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
