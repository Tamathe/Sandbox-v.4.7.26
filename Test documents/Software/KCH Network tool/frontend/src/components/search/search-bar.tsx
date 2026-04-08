'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { SearchFilters } from '@/lib/types'

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void
  isLoading: boolean
}

const DOCUMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'policy', label: 'Policy' },
  { value: 'guideline', label: 'Guideline' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'admin', label: 'Administrative' },
  { value: 'epic', label: 'Epic Documentation' },
  { value: 'other', label: 'Other' },
]

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v)
    )
    onSearch(query.trim(), Object.keys(activeFilters).length ? activeFilters : undefined)
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-kch-gray-400" size={20} />
          <input
            type="text"
            className="w-full pl-12 pr-24 py-4 text-lg border border-kch-gray-300 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-kch-blue focus:border-transparent
                       shadow-sm placeholder:text-kch-gray-400"
            placeholder="Ask a question about KCH network documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-kch-blue text-white' : 'text-kch-gray-400 hover:text-kch-gray-600'
              }`}
              title="Toggle filters"
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn-primary px-4 py-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 p-4 bg-white border border-kch-gray-200 rounded-xl shadow-sm flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-kch-gray-600 mb-1">
                Document Type
              </label>
              <select
                className="input-field text-sm py-1.5"
                value={filters.document_type || ''}
                onChange={(e) => setFilters({ ...filters, document_type: e.target.value || undefined })}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-kch-gray-600 mb-1">
                Hospital Site
              </label>
              <input
                type="text"
                className="input-field text-sm py-1.5"
                placeholder="e.g., Kentucky Children's"
                value={filters.hospital_site || ''}
                onChange={(e) => setFilters({ ...filters, hospital_site: e.target.value || undefined })}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-kch-gray-600 mb-1">
                Department
              </label>
              <input
                type="text"
                className="input-field text-sm py-1.5"
                placeholder="e.g., Pediatric ICU"
                value={filters.department || ''}
                onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined })}
              />
            </div>
            {(filters.document_type || filters.hospital_site || filters.department) && (
              <button
                type="button"
                onClick={() => setFilters({})}
                className="self-end flex items-center gap-1 text-sm text-kch-gray-500 hover:text-kch-gray-700 pb-1.5"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
