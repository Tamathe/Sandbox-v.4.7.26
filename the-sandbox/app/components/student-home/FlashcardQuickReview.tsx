'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Check, RotateCcw, BookOpen } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface QuickReviewCard {
  id: string
  conceptName: string
  courseCode: string
  front: string
  back: string
  interval: number
  easeFactor: number
  lapses: number
}

type ReviewQuality = 'again' | 'hard' | 'good' | 'easy'

interface ReviewStats {
  reviewed: number
  again: number
  good: number
}

interface FlashcardQuickReviewProps {
  onClose: () => void
  onComplete: (stats: ReviewStats) => void
}

const QUALITY_BUTTONS: { quality: ReviewQuality; label: string; color: string; key: string }[] = [
  { quality: 'again', label: 'Again', color: 'bg-red-500 hover:bg-red-600', key: '1' },
  { quality: 'hard', label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600', key: '2' },
  { quality: 'good', label: 'Good', color: 'bg-emerald-500 hover:bg-emerald-600', key: '3' },
  { quality: 'easy', label: 'Easy', color: 'bg-[#0033A0] hover:bg-blue-800', key: '4' },
]

export default function FlashcardQuickReview({ onClose, onComplete }: FlashcardQuickReviewProps) {
  const { currentUser } = useAuth()
  const email = currentUser?.email || ''

  const [state, setState] = useState<'loading' | 'reviewing' | 'complete'>('loading')
  const [cards, setCards] = useState<QuickReviewCard[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [stats, setStats] = useState<ReviewStats>({ reviewed: 0, again: 0, good: 0 })
  const [nextReviewLabel, setNextReviewLabel] = useState('tomorrow')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const flipTimeRef = useRef<number>(0)

  // Fetch due cards on mount
  useEffect(() => {
    if (!email) return
    fetch('/api/flashcards/due?limit=20', {
      headers: { 'x-demo-user-email': email },
    })
      .then(r => r.ok ? r.json() : { cards: [] })
      .then(data => {
        if (data.cards.length === 0) {
          setState('complete')
        } else {
          setCards(data.cards)
          setState('reviewing')
        }
      })
      .catch(() => setState('complete'))
  }, [email])

  // Keyboard support
  useEffect(() => {
    if (state !== 'reviewing') return

    function handleKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!isFlipped) {
          setIsFlipped(true)
          flipTimeRef.current = Date.now()
        }
      } else if (isFlipped && !isSubmitting) {
        const btn = QUALITY_BUTTONS.find(b => b.key === e.key)
        if (btn) {
          e.preventDefault()
          handleRate(btn.quality)
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state, isFlipped, isSubmitting, currentIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      setIsFlipped(true)
      flipTimeRef.current = Date.now()
    }
  }, [isFlipped])

  const handleRate = useCallback(async (quality: ReviewQuality) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const card = cards[currentIdx]

    // Fire-and-forget API call
    fetch('/api/flashcards/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': email,
      },
      body: JSON.stringify({
        flashcardId: card.id,
        quality,
      }),
    }).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.nextReviewAt) {
        const next = new Date(data.nextReviewAt)
        const diffHours = (next.getTime() - Date.now()) / (1000 * 60 * 60)
        if (diffHours < 24) setNextReviewLabel('later today')
        else if (diffHours < 48) setNextReviewLabel('tomorrow')
        else setNextReviewLabel(`in ${Math.round(diffHours / 24)} days`)
      }
    }).catch(() => {})

    // Update stats
    const newStats = {
      reviewed: stats.reviewed + 1,
      again: stats.again + (quality === 'again' ? 1 : 0),
      good: stats.good + (quality === 'good' || quality === 'easy' ? 1 : 0),
    }
    setStats(newStats)

    // Auto-advance after brief pause
    setTimeout(() => {
      if (currentIdx + 1 >= cards.length) {
        setState('complete')
        onComplete(newStats)
      } else {
        setCurrentIdx(prev => prev + 1)
        setIsFlipped(false)
        setIsSubmitting(false)
      }
    }, 300)
  }, [isSubmitting, cards, currentIdx, email, stats, onComplete])

  const estimatedMinutes = Math.max(1, Math.ceil(cards.length * 0.5))
  const card = cards[currentIdx]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-[#0033A0] flex items-center justify-center">
              <RotateCcw className="size-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Quick Review</h2>
          </div>
          <div className="flex items-center gap-3">
            {state === 'reviewing' && (
              <span className="text-xs text-gray-400">
                {cards.length} card{cards.length !== 1 ? 's' : ''} &middot; ~{estimatedMinutes} min
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="size-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="size-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="px-5 py-16 flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-[#0033A0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading flashcards...</p>
          </div>
        )}

        {/* Reviewing */}
        {state === 'reviewing' && card && (
          <div className="px-5 py-5">
            {/* Flip card */}
            <div
              className="relative cursor-pointer perspective-1000"
              onClick={handleFlip}
              role="button"
              tabIndex={0}
              aria-label={isFlipped ? 'Showing answer' : 'Tap to flip and show answer'}
            >
              <div
                className={`relative min-h-[200px] transition-transform duration-500 preserve-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 0.5s',
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 backface-hidden bg-gray-50 rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-lg font-semibold text-gray-900 leading-relaxed">{card.front}</p>
                  <p className="text-xs text-gray-400 mt-4">Tap to flip</p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 backface-hidden bg-[#0033A0]/5 rounded-xl border border-[#0033A0]/20 p-6 flex flex-col items-center justify-center text-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <p className="text-base text-gray-800 leading-relaxed">{card.back}</p>
                </div>
              </div>
            </div>

            {/* Card info */}
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs text-gray-400">
                Card {currentIdx + 1} of {cards.length}
              </span>
              <span className="text-xs text-gray-400">
                {card.courseCode} &middot; {card.conceptName}
              </span>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {cards.map((_, i) => (
                <div
                  key={i}
                  className={`size-2 rounded-full transition-colors ${
                    i < currentIdx ? 'bg-emerald-400' :
                    i === currentIdx ? 'bg-[#0033A0]' :
                    'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Quality buttons (only shown after flip) */}
            {isFlipped && (
              <div className="mt-5">
                <p className="text-xs text-center text-gray-500 mb-3">How well did you know this?</p>
                <div className="grid grid-cols-4 gap-2">
                  {QUALITY_BUTTONS.map(({ quality, label, color, key }) => (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => handleRate(quality)}
                      disabled={isSubmitting}
                      className={`${color} text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50`}
                    >
                      {label}
                      <span className="block text-[10px] font-normal opacity-70">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete */}
        {state === 'complete' && (
          <div className="px-5 py-8 text-center">
            <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="size-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900">
              {stats.reviewed === 0 ? 'No cards due' : 'All caught up!'}
            </h3>
            {stats.reviewed > 0 && (
              <>
                <p className="text-sm text-gray-500 mt-1.5">
                  {stats.reviewed} card{stats.reviewed !== 1 ? 's' : ''} reviewed
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {stats.again > 0 && `${stats.again} need${stats.again !== 1 ? '' : 's'} more practice`}
                  {stats.again > 0 && stats.good > 0 && ' · '}
                  {stats.good > 0 && `${stats.good} solid`}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Next review: {nextReviewLabel}
                </p>
              </>
            )}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('sandy-prefill', {
                    detail: { message: 'Help me study my weakest flashcard concepts with a deeper review session.', autoSend: true },
                  }))
                  onClose()
                }}
                className="px-5 py-2 text-sm font-semibold text-[#0033A0] bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="size-3.5" />
                Study more with Sandy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
