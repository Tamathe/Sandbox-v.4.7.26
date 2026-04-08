'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Tag } from 'lucide-react'

interface Suggestion {
  tag: string
  category: string
}

interface InterestTagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  /** Tags already selected elsewhere — excluded from suggestions and deduplication */
  exclude?: string[]
  /** If provided, PATCH /api/user/interests/[tag] on removal (post-onboarding usage) */
  userEmail?: string
  placeholder?: string
}

export function InterestTagInput({
  tags,
  onChange,
  exclude = [],
  userEmail,
  placeholder = 'Add an interest…',
}: InterestTagInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allExcluded = new Set([...tags, ...exclude])

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/interests/suggest?q=${encodeURIComponent(query)}`)
        if (!res.ok) return
        const data = await res.json() as { suggestions: Suggestion[] }
        setSuggestions((data.suggestions ?? []).filter((s) => !allExcluded.has(s.tag)))
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || allExcluded.has(trimmed)) return
    onChange([...tags, trimmed])
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
    if (userEmail) {
      fetch(`/api/user/interests/${encodeURIComponent(tag)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ accepted: false }),
      }).catch(() => {})
    }
  }

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0033A0] text-white text-xs font-medium rounded-full border border-[#0033A0]"
            >
              <Tag className="size-3" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-red-300 transition ml-0.5"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20 transition placeholder:text-gray-400"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (suggestions[0]) addTag(suggestions[0].tag)
              else if (query.trim()) addTag(query.trim())
            }
            if (e.key === 'Escape') {
              setSuggestions([])
              setQuery('')
            }
          }}
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <li key={s.tag}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#0033A0]/5 hover:text-[#0033A0] transition"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addTag(s.tag)
                  }}
                >
                  <span>{s.tag}</span>
                  {s.category && (
                    <span className="ml-2 text-xs text-gray-400">{s.category}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
