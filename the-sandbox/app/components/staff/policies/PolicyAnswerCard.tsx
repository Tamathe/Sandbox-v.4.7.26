'use client'

import PolicyCitationCard from './PolicyCitationCard'

interface Citation {
  policyNumber: string
  policyTitle: string
  section: string
  excerpt: string
  effectiveDate: string
  responsibleOffice: string
}

interface PolicyAnswerCardProps {
  answer: string
  citations: Citation[]
  followUpSuggestions: string[]
  onFollowUp?: (question: string) => void
  onViewPolicy?: (policyNumber: string) => void
}

export default function PolicyAnswerCard({
  answer,
  citations,
  followUpSuggestions,
  onFollowUp,
  onViewPolicy,
}: PolicyAnswerCardProps) {
  return (
    <div className="space-y-3">
      {/* Answer text */}
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {answer}
      </div>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sources</h4>
          {citations.map((c, i) => (
            <PolicyCitationCard
              key={i}
              policyNumber={c.policyNumber}
              policyTitle={c.policyTitle}
              section={c.section}
              excerpt={c.excerpt}
              effectiveDate={c.effectiveDate}
              responsibleOffice={c.responsibleOffice}
              onView={onViewPolicy}
            />
          ))}
        </div>
      )}

      {/* Follow-up suggestions */}
      {followUpSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {followUpSuggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUp?.(q)}
              className="text-xs px-3 py-1.5 bg-blue-50 text-[#0033A0] rounded-full hover:bg-blue-100 transition-colors font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
