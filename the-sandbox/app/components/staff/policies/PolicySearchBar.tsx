'use client'

import { useState, useCallback } from 'react'
import { Search, X, MessageSquare } from 'lucide-react'

const EXAMPLE_QUERIES = [
  'Faculty tenure process',
  'Intellectual property rights',
  'Campus alcohol policy',
  'Data security requirements',
  'Employee due process',
]

interface PolicySearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  onSearch: (query: string) => void
  onAskQuestion?: (question: string) => void
  activeCategory: string
  onCategoryChange: (category: string) => void
  categories?: { category: string; count: number }[]
  mode?: 'search' | 'ask'
  onModeChange?: (mode: 'search' | 'ask') => void
}

export default function PolicySearchBar({
  query,
  onQueryChange,
  onSearch,
  onAskQuestion,
  activeCategory,
  onCategoryChange,
  categories,
  mode = 'search',
  onModeChange,
}: PolicySearchBarProps) {
  const [focused, setFocused] = useState(false)

  const isAsk = mode === 'ask'

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!query.trim()) return
      if (isAsk && onAskQuestion) {
        onAskQuestion(query.trim())
      } else {
        onSearch(query.trim())
      }
    },
    [query, onSearch, onAskQuestion, isAsk],
  )

  const handleExampleClick = useCallback(
    (example: string) => {
      onQueryChange(example)
      if (isAsk && onAskQuestion) {
        onAskQuestion(example)
      } else {
        onSearch(example)
      }
    },
    [onQueryChange, onSearch, onAskQuestion, isAsk],
  )

  // Build category list: always start with "All", then dynamic or fallback
  const categoryList = categories && categories.length > 0
    ? ['All', ...categories.map((c) => c.category)]
    : ['All']

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      {onModeChange && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => onModeChange('search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              !isAsk ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="size-3.5" />
            Search
          </button>
          <button
            onClick={() => onModeChange('ask')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isAsk ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="size-3.5" />
            Ask a Question
          </button>
        </div>
      )}

      {/* Search / Ask input */}
      <form onSubmit={handleSubmit} className="relative">
        {isAsk ? (
          <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#0033A0] pointer-events-none" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400 pointer-events-none" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={isAsk
            ? 'Ask a question... e.g. "What is the process for faculty tenure review?"'
            : 'Search policies... e.g. "tobacco policy" or "data security"'
          }
          className={`w-full pl-12 pr-20 py-3.5 rounded-2xl border-2 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none transition-colors ${
            focused
              ? isAsk ? 'border-[#0033A0] ring-2 ring-[#0033A0]/10' : 'border-[#0033A0] ring-2 ring-[#0033A0]/10'
              : 'border-gray-200'
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => { onQueryChange(''); onSearch('') }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
          {query.trim() && (
            <button
              type="submit"
              className="px-3 py-1 bg-[#0033A0] text-white text-xs font-semibold rounded-lg hover:bg-[#002580] transition-colors"
            >
              {isAsk ? 'Ask' : 'Search'}
            </button>
          )}
        </div>
      </form>

      {/* Example queries (visible when no query) */}
      {!query && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">{isAsk ? 'Try asking:' : 'Try:'}</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="text-xs font-medium text-[#0033A0] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {categoryList.map((cat) => {
          const isActive = activeCategory === cat
          const countObj = categories?.find((c) => c.category === cat)
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                isActive
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}{countObj ? ` (${countObj.count})` : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
