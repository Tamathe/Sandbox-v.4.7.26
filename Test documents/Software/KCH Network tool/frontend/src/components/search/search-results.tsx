'use client'

import ReactMarkdown from 'react-markdown'
import { Shield, ShieldAlert, ShieldCheck, Clock } from 'lucide-react'
import type { SearchResponse } from '@/lib/types'
import SourceCard from './source-card'

interface SearchResultsProps {
  result: SearchResponse
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  switch (confidence) {
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <ShieldCheck size={14} />
          High Confidence
        </span>
      )
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Shield size={14} />
          Medium Confidence
        </span>
      )
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          <ShieldAlert size={14} />
          Low Confidence
        </span>
      )
    default:
      return null
  }
}

export default function SearchResults({ result }: SearchResultsProps) {
  return (
    <div className="space-y-4">
      {/* Answer card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <ConfidenceBadge confidence={result.confidence} />
          <span className="flex items-center gap-1 text-xs text-kch-gray-400">
            <Clock size={12} />
            {(result.response_time_ms / 1000).toFixed(1)}s
          </span>
        </div>

        <div className="prose-answer text-kch-gray-800">
          <ReactMarkdown>{result.answer}</ReactMarkdown>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 pt-4 border-t border-kch-gray-100">
          <p className="text-xs text-kch-gray-400 italic">
            This information is retrieved from KCH network documents and is provided for reference only.
            Always verify with current protocols and use clinical judgment.
          </p>
        </div>
      </div>

      {/* Sources */}
      {result.sources.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-kch-gray-700 mb-2">
            Sources ({result.sources.length})
          </h3>
          <div className="space-y-2">
            {result.sources.map((source, i) => (
              <SourceCard key={source.document_id} source={source} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
