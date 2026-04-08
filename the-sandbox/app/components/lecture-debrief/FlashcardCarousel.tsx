'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'

interface Flashcard {
  front: string
  back: string
  conceptSlug: string
  bloomLevel: number
}

const BLOOM_LABELS = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

export default function FlashcardCarousel({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (flashcards.length === 0) {
    return <p className="text-sm text-gray-500">No flashcards generated.</p>
  }

  const card = flashcards[currentIndex]

  function next() {
    setFlipped(false)
    setCurrentIndex((i) => (i + 1) % flashcards.length)
  }

  function prev() {
    setFlipped(false)
    setCurrentIndex((i) => (i - 1 + flashcards.length) % flashcards.length)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">
          Card {currentIndex + 1} of {flashcards.length}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#0033A0] font-medium">
          {BLOOM_LABELS[card.bloomLevel] || `Bloom ${card.bloomLevel}`}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        className="w-full min-h-[160px] p-6 rounded-2xl border-2 border-gray-200 hover:border-[#0033A0] bg-white cursor-pointer transition-all duration-200 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {flipped ? 'Answer' : 'Question'}
            </span>
            <p className="mt-2 text-base text-gray-900 leading-relaxed">
              {flipped ? card.back : card.front}
            </p>
          </div>
          <RotateCw className="size-4 text-gray-300 shrink-0 mt-1" />
        </div>
      </button>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={prev}
          className="p-2 rounded-xl border-2 border-gray-200 hover:border-[#0033A0] hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4 text-gray-600" />
        </button>
        <div className="flex gap-1">
          {flashcards.map((_, i) => (
            <div
              key={i}
              className={`size-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-[#0033A0]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="p-2 rounded-xl border-2 border-gray-200 hover:border-[#0033A0] hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <ChevronRight className="size-4 text-gray-600" />
        </button>
      </div>
    </div>
  )
}
