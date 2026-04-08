'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import PolicyListItem, { type PolicyListItemData } from './PolicyListItem'

interface PolicyCategoryGroupProps {
  category: string
  count: number
  policies: PolicyListItemData[]
  defaultOpen?: boolean
  onSelectPolicy: (policy: PolicyListItemData) => void
}

export default function PolicyCategoryGroup({
  category,
  count,
  policies,
  defaultOpen = false,
  onSelectPolicy,
}: PolicyCategoryGroupProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="size-4 text-gray-400" />
          ) : (
            <ChevronRight className="size-4 text-gray-400" />
          )}
          <h3 className="text-sm font-extrabold text-gray-900">{category}</h3>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
            {count}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className="mt-1 space-y-0.5">
            {policies.map((p) => (
              <PolicyListItem key={p.id} policy={p} onClick={onSelectPolicy} />
            ))}
            {policies.length === 0 && (
              <p className="text-xs text-gray-400 py-3 text-center">No policies in this category.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
