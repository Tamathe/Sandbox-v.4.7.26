'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'

interface PackSummaryCardProps {
  id: string
  name: string
  courseName: string
  status: string
  itemCount: number
  completedCount: number
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  READY: 'bg-blue-100 text-blue-700',
  ADOPTED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

export default function PackSummaryCard({
  id,
  name,
  courseName,
  status,
  itemCount,
  completedCount,
}: PackSummaryCardProps) {
  const showProgress = ['ADOPTED', 'IN_PROGRESS', 'COMPLETED'].includes(status)
  const progressPct = itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0

  return (
    <Link href={`/ai-literacy/starter-packs/${id}`}>
      <div className="border rounded-2xl shadow-sm bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Package className="size-5 text-[#0033A0]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
                {status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{courseName}</p>

            {showProgress && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{completedCount} / {itemCount} items</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0033A0] rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {!showProgress && (
              <p className="text-xs text-gray-400 mt-1">{itemCount} items</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
