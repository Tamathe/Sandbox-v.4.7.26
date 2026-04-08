'use client'

import { ChevronRight } from 'lucide-react'
import PolicyNumberBadge from './PolicyNumberBadge'

export interface PolicyListItemData {
  id: string
  policyNumber: string
  title: string
  category: string
  effectiveDate: string
  responsibleOffice: string
}

interface PolicyListItemProps {
  policy: PolicyListItemData
  onClick: (policy: PolicyListItemData) => void
}

export default function PolicyListItem({ policy, onClick }: PolicyListItemProps) {
  return (
    <button
      onClick={() => onClick(policy)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
    >
      <PolicyNumberBadge policyNumber={policy.policyNumber} category={policy.category} />
      <span className="flex-1 text-sm font-medium text-gray-900 truncate">{policy.title}</span>
      <span className="text-xs text-gray-400 shrink-0">
        {new Date(policy.effectiveDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
      </span>
      <ChevronRight className="size-4 text-gray-300 group-hover:text-[#0033A0] transition-colors shrink-0" />
    </button>
  )
}
