'use client'

import { useCallback } from 'react'
import type { LetterSectionId } from '../../lib/cover-letter-service'

interface LetterSectionProps {
  id: LetterSectionId
  content: string
  isUpdating: boolean
  isClickable: boolean
  onClick: (id: LetterSectionId) => void
}

const SECTION_LABELS: Record<LetterSectionId, string> = {
  opening: 'Opening',
  body1: 'Body',
  body2: 'Body',
  closing: 'Closing',
}

export default function LetterSection({ id, content, isUpdating, isClickable, onClick }: LetterSectionProps) {
  const handleClick = useCallback(() => {
    if (isClickable) onClick(id)
  }, [id, isClickable, onClick])

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick() } : undefined}
      className={`relative px-1 py-0.5 rounded-lg transition-all ${
        isClickable
          ? 'cursor-pointer hover:bg-[#0033A0]/5 hover:outline hover:outline-1 hover:outline-[#0033A0]/20'
          : ''
      } ${isUpdating ? 'animate-pulse bg-[#0033A0]/5' : ''}`}
    >
      {isUpdating && (
        <span className="absolute -left-2 top-1 text-[10px] text-[#0033A0]/60 font-medium">
          updating...
        </span>
      )}
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}
