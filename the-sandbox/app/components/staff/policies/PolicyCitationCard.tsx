'use client'

import PolicyNumberBadge from './PolicyNumberBadge'

interface PolicyCitationCardProps {
  policyNumber: string
  policyTitle: string
  section: string
  excerpt: string
  effectiveDate: string
  responsibleOffice: string
  category?: string
  onView?: (policyNumber: string) => void
}

export default function PolicyCitationCard({
  policyNumber,
  policyTitle,
  section,
  excerpt,
  effectiveDate,
  responsibleOffice,
  category,
  onView,
}: PolicyCitationCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 my-2">
      <div className="flex items-center gap-2 mb-2">
        <PolicyNumberBadge policyNumber={policyNumber} category={category || ''} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-800">{policyTitle}</span>
          <span className="text-xs text-gray-400 ml-2">— {section}</span>
        </div>
      </div>

      <blockquote className="border-l-2 border-[#0033A0] pl-3 text-xs text-gray-600 italic leading-relaxed">
        {excerpt}
      </blockquote>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">
          Effective: {new Date(effectiveDate).toLocaleDateString()} · {responsibleOffice}
        </span>
        {onView && (
          <button
            onClick={() => onView(policyNumber)}
            className="text-[10px] text-[#0033A0] hover:underline font-medium"
          >
            View Full Policy
          </button>
        )}
      </div>
    </div>
  )
}
