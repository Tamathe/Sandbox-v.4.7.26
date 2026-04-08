'use client'

import { Loader2, FileText } from 'lucide-react'
import LetterSection from './LetterSection'
import ExportBar from './ExportBar'
import type { ParsedSection, LetterSectionId } from '../../lib/cover-letter-service'

interface LetterPreviewProps {
  sections: ParsedSection[]
  isGenerating: boolean
  activeSection: LetterSectionId | null
  isRefinementMode: boolean
  rawLetter: string
  onSectionClick: (id: LetterSectionId) => void
}

export default function LetterPreview({
  sections,
  isGenerating,
  activeSection,
  isRefinementMode,
  rawLetter,
  onSectionClick,
}: LetterPreviewProps) {
  // Empty state
  if (!rawLetter && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
        <FileText className="size-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Your cover letter will appear here</p>
        <p className="text-xs text-gray-300 mt-1">Sandy is loading your profile...</p>
      </div>
    )
  }

  // Generating skeleton
  if (isGenerating && sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
        <Loader2 className="size-8 text-[#0033A0] animate-spin" />
        <p className="text-sm text-gray-400">Drafting your letter...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Draft badge */}
      {!isRefinementMode && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Draft — tell Sandy about the role to personalize
          </span>
        </div>
      )}

      {/* Letter body */}
      <div className="flex-1 space-y-4 font-serif">
        {sections.map((section) => (
          <LetterSection
            key={section.id}
            id={section.id}
            content={section.content}
            isUpdating={activeSection === section.id}
            isClickable={isRefinementMode}
            onClick={onSectionClick}
          />
        ))}

        {/* Streaming indicator at the bottom */}
        {isGenerating && sections.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
            <Loader2 className="size-3 animate-spin" />
            Writing...
          </div>
        )}
      </div>

      {/* Export bar — only in refinement mode */}
      {isRefinementMode && rawLetter && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <ExportBar letter={rawLetter} />
        </div>
      )}
    </div>
  )
}
