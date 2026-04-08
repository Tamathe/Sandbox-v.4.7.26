'use client'

import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { SourceReference } from '@/lib/types'

interface SourceCardProps {
  source: SourceReference
  index: number
}

export default function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false)

  const relevanceColor =
    source.relevance >= 0.7
      ? 'bg-green-100 text-green-700'
      : source.relevance >= 0.5
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-orange-100 text-orange-700'

  return (
    <div className="border border-kch-gray-200 rounded-lg overflow-hidden hover:border-kch-gray-300 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-kch-gray-50 transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 bg-kch-blue/10 rounded-lg flex items-center justify-center">
          <span className="text-kch-blue text-xs font-bold">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-kch-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-kch-gray-900 truncate">
              {source.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {source.section && (
              <span className="text-xs text-kch-gray-500 truncate">
                {source.section}
              </span>
            )}
            {source.page && (
              <span className="text-xs text-kch-gray-400">
                p. {source.page}
              </span>
            )}
          </div>
        </div>

        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${relevanceColor}`}>
          {Math.round(source.relevance * 100)}%
        </span>

        {expanded ? (
          <ChevronUp size={16} className="text-kch-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-kch-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-kch-gray-100">
          <p className="text-sm text-kch-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">
            {source.snippet}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const url = api.getDocumentDownloadUrl(source.document_id)
              const token = api.getToken()
              window.open(`${url}?token=${encodeURIComponent(token || '')}`, '_blank')
            }}
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-kch-blue hover:text-kch-blue-dark transition-colors"
          >
            <ExternalLink size={12} />
            Open Document
          </button>
        </div>
      )}
    </div>
  )
}
