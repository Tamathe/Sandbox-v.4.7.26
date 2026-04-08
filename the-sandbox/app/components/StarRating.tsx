'use client'

import { useState } from 'react'

interface StarRatingProps {
  avg: number
  count: number
  userRating: number | null
  onRate?: (rating: number) => void
  size?: 'sm' | 'md'
  readOnly?: boolean
}

export function StarRating({
  avg,
  count,
  userRating,
  onRate,
  size = 'md',
  readOnly = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const display = hovered ?? userRating ?? avg

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            className={readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}
          >
            <svg
              className={`${starSize} ${star <= display ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {count > 0 && (
        <span className="text-sm text-gray-500">
          {avg.toFixed(1)} <span className="text-gray-400">({count})</span>
        </span>
      )}
      {count === 0 && !readOnly && (
        <span className="text-sm text-gray-400">Rate this tool</span>
      )}
    </div>
  )
}
