'use client'

import { FileText, Search } from 'lucide-react'
import PolicyNumberBadge from './PolicyNumberBadge'

export interface PolicyResult {
  document: {
    id: string
    policyNumber: string
    title: string
    category: string
    responsibleOffice: string
    effectiveDate: string
    summary: string | null
  }
  matchedChunks: {
    sectionTitle: string
    content: string
    similarity: number
  }[]
  highlightedExcerpt: string
}

interface PolicyResultCardProps {
  result: PolicyResult
  query?: string
  onView: (policyNumber: string) => void
  onAskSandy: (policyNumber: string) => void
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightTerms(text: string, query?: string): string {
  if (!query) return text
  const terms = query.split(/\s+/).filter(t => t.length > 2)
  let highlighted = text
  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi')
    highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
  }
  return highlighted
}

export default function PolicyResultCard({ result, query, onView, onAskSandy }: PolicyResultCardProps) {
  const { document: doc, highlightedExcerpt } = result
  const excerpt = highlightedExcerpt || result.matchedChunks[0]?.content?.slice(0, 300) || ''

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <PolicyNumberBadge policyNumber={doc.policyNumber} category={doc.category} />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm">{doc.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{doc.category}</span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-500">Effective: {new Date(doc.effectiveDate).toLocaleDateString()}</span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-500">{doc.responsibleOffice}</span>
          </div>
        </div>
      </div>

      {/* Matched excerpt with highlights */}
      <div
        className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-4"
        dangerouslySetInnerHTML={{ __html: highlightTerms(excerpt, query) }}
      />

      {/* Matched sections */}
      {result.matchedChunks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {result.matchedChunks.slice(0, 3).map((chunk, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {chunk.sectionTitle}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onView(doc.policyNumber)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0033A0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <FileText className="size-3.5" />
          View Full Policy
        </button>
        <button
          onClick={() => onAskSandy(doc.policyNumber)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Search className="size-3.5" />
          Ask Sandy
        </button>
      </div>
    </div>
  )
}
