'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface TransferEntry {
  courseCode: string
  courseName: string
  credits: number
  grade: string
  currentCategory: string
  targetCategory: string | null
  transfers: boolean
}

interface CreditTransferMapProps {
  entries: TransferEntry[]
  creditsTransfer: number
  creditsLost: number
}

export default function CreditTransferMap({
  entries,
  creditsTransfer,
  creditsLost,
}: CreditTransferMapProps) {
  const [showAll, setShowAll] = useState(false)

  const transferring = entries.filter((e) => e.transfers)
  const notTransferring = entries.filter((e) => !e.transfers)

  const INITIAL_SHOW = 5
  const visibleTransfer = showAll ? transferring : transferring.slice(0, INITIAL_SHOW)
  const visibleNotTransfer = showAll ? notTransferring : notTransferring.slice(0, INITIAL_SHOW)

  const hasMore = transferring.length > INITIAL_SHOW || notTransferring.length > INITIAL_SHOW

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <h3 className="text-base font-extrabold text-gray-900 mb-4">Credit Transfer Map</h3>

      {/* Transferring */}
      {transferring.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              Transfers ({creditsTransfer} credits)
            </span>
          </div>
          <div className="space-y-1.5">
            {visibleTransfer.map((e) => (
              <div
                key={e.courseCode}
                className="flex items-center justify-between text-sm py-1.5 px-3
                           bg-emerald-50/50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-gray-900">{e.courseCode}</span>
                  {e.grade && (
                    <span className="text-xs text-gray-400">({e.grade})</span>
                  )}
                </div>
                <span className="text-xs text-emerald-600 shrink-0">
                  &rarr; {e.targetCategory}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not transferring */}
      {notTransferring.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="size-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600">
              Does Not Transfer ({creditsLost} credits)
            </span>
          </div>
          <div className="space-y-1.5">
            {visibleNotTransfer.map((e) => (
              <div
                key={e.courseCode}
                className="flex items-center justify-between text-sm py-1.5 px-3
                           bg-red-50/30 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-gray-900">{e.courseCode}</span>
                  {e.grade && (
                    <span className="text-xs text-gray-400">({e.grade})</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  was {e.currentCategory}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-[#0033A0] font-semibold flex items-center gap-1
                     hover:underline"
        >
          {showAll ? (
            <>Show less <ChevronUp className="size-4" /></>
          ) : (
            <>Show all courses <ChevronDown className="size-4" /></>
          )}
        </button>
      )}

      {entries.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          No completed courses to analyze yet.
        </p>
      )}
    </div>
  )
}
