'use client'

import { Loader2, Check } from 'lucide-react'

interface VariantData {
  id: string
  label: string
  text: string
  isStreaming: boolean
}

interface VariantCarouselProps {
  variants: VariantData[]
  activeId: string
  onTabChange: (id: string) => void
  onSelect: (id: string) => void
}

export default function VariantCarousel({
  variants,
  activeId,
  onTabChange,
  onSelect,
}: VariantCarouselProps) {
  const activeVariant = variants.find((v) => v.id === activeId) ?? variants[0]
  if (!activeVariant) return null

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onTabChange(v.id)}
            className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors relative ${
              v.id === activeId
                ? 'text-[#0033A0]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {v.label}
              {v.isStreaming && <Loader2 className="size-3 animate-spin" />}
            </span>
            {v.id === activeId && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0033A0]" />
            )}
          </button>
        ))}
      </div>

      {/* Active variant content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeVariant.text ? (
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {activeVariant.text}
          </div>
        ) : activeVariant.isStreaming ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="size-6 text-[#0033A0] animate-spin" />
            <p className="text-xs text-gray-400">Generating {activeVariant.label.toLowerCase()} version...</p>
          </div>
        ) : null}
      </div>

      {/* Select button */}
      {activeVariant.text && !activeVariant.isStreaming && (
        <div className="border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={() => onSelect(activeVariant.id)}
            className="w-full py-2.5 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check className="size-4" />
            Use this version
          </button>
        </div>
      )}
    </div>
  )
}
