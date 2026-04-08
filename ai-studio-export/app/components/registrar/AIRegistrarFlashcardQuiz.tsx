'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import {
  AI_REGISTRAR_CATEGORY_COLORS,
  AI_REGISTRAR_CATEGORY_ORDER,
  cloneAIRegistrarFlashcards,
  type AIRegistrarFlashcard,
} from '../../lib/ai-registrar-flashcards'

const INITIAL_CARDS = cloneAIRegistrarFlashcards()

function shuffleCards(cards: AIRegistrarFlashcard[]) {
  const copy = [...cards]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
  }

  return copy
}

function getOrderedCategories(cards: AIRegistrarFlashcard[]) {
  const seen = new Set(cards.map((card) => card.category))
  const ordered = AI_REGISTRAR_CATEGORY_ORDER.filter((category) => seen.has(category))
  const extras = [...seen]
    .filter((category) => !AI_REGISTRAR_CATEGORY_ORDER.some((existing) => existing === category))
    .sort()
  return [...ordered, ...extras]
}

function categoryColor(category: string) {
  return AI_REGISTRAR_CATEGORY_COLORS[category] ?? { bg: '#0033A0', light: '#e8eef8' }
}

function encodeCardsForEditor(cards: AIRegistrarFlashcard[]) {
  return cards.map((card) => `${card.category}|${card.question}|${card.answer}`).join('\n')
}

function parseCardsFromEditor(text: string) {
  const parsed: AIRegistrarFlashcard[] = []
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)

  for (const line of lines) {
    const parts = line.split('|')
    if (parts.length < 3) {
      throw new Error(`Bad line: "${line.slice(0, 70)}"`)
    }

    parsed.push({
      category: parts[0].trim(),
      question: parts[1].trim(),
      answer: parts.slice(2).join('|').trim(),
    })
  }

  if (parsed.length === 0) {
    throw new Error('Add at least one card.')
  }

  return parsed
}

function EditModal({
  cards,
  onSave,
  onClose,
}: {
  cards: AIRegistrarFlashcard[]
  onSave: (cards: AIRegistrarFlashcard[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(() => encodeCardsForEditor(cards))
  const [error, setError] = useState('')

  function handleSave() {
    try {
      onSave(parseCardsFromEditor(draft))
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `${saveError.message} - use Category|Question|Answer format.`
          : 'Unable to save cards.'
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Flashcards</h2>
            <p className="mt-1 text-sm text-slate-500">One card per line using `Category|Question|Answer`.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="border-b border-blue-100 bg-blue-50 px-6 py-3 text-sm text-[#0033A0]">
          Editing updates the live deck immediately after save, so this doubles as a quick authoring surface.
        </div>

        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setError('')
          }}
          className="min-h-[360px] flex-1 resize-none border-0 px-6 py-5 font-mono text-sm leading-6 text-slate-800 outline-none"
        />

        {error ? (
          <div className="border-t border-red-100 bg-red-50 px-6 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-2xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00287e]"
          >
            Save Cards
          </button>
        </div>
      </div>
    </div>
  )
}

function Flashcard({
  card,
  flipped,
  onFlip,
}: {
  card: AIRegistrarFlashcard
  flipped: boolean
  onFlip: () => void
}) {
  const color = categoryColor(card.category)

  return (
    <button
      type="button"
      onClick={onFlip}
      className="w-full text-left"
      style={{ perspective: '1200px' }}
    >
      <div
        className="relative h-[360px] w-full rounded-[28px] transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border-2 bg-white px-8 text-center shadow-xl"
          style={{
            backfaceVisibility: 'hidden',
            borderColor: `${color.bg}33`,
          }}
        >
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ backgroundColor: color.light, color: color.bg }}
          >
            {card.category}
          </span>
          <div className="mt-5 h-1 w-14 rounded-full" style={{ backgroundColor: `${color.bg}55` }} />
          <p className="mt-6 text-xl font-semibold leading-8 text-slate-800">{card.question}</p>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Click to reveal answer</p>
        </div>

        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] px-8 text-center shadow-xl"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: color.bg,
          }}
        >
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/85">
            Answer
          </span>
          <div className="mt-5 h-1 w-14 rounded-full bg-white/30" />
          <p className="mt-6 text-lg font-medium leading-8 text-white">{card.answer}</p>
        </div>
      </div>
    </button>
  )
}

export default function AIRegistrarFlashcardQuiz() {
  const [allCards, setAllCards] = useState<AIRegistrarFlashcard[]>(INITIAL_CARDS)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [deck, setDeck] = useState<AIRegistrarFlashcard[]>(() => shuffleCards(INITIAL_CARDS))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [knownCards, setKnownCards] = useState<AIRegistrarFlashcard[]>([])
  const [missedCards, setMissedCards] = useState<AIRegistrarFlashcard[]>([])
  const [finished, setFinished] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const categories = useMemo(() => ['All', ...getOrderedCategories(allCards)], [allCards])
  const currentCard = deck[index]
  const progress = deck.length > 0 ? ((knownCards.length + missedCards.length) / deck.length) * 100 : 0
  const score = deck.length > 0 ? Math.round((knownCards.length / deck.length) * 100) : 0

  function buildDeck(cards: AIRegistrarFlashcard[], filter: string) {
    const filteredCards = filter === 'All' ? cards : cards.filter((card) => card.category === filter)
    return shuffleCards(filteredCards)
  }

  function startFresh(cards: AIRegistrarFlashcard[], filter: string) {
    setDeck(buildDeck(cards, filter))
    setIndex(0)
    setFlipped(false)
    setKnownCards([])
    setMissedCards([])
    setFinished(false)
  }

  function handleCategoryChange(nextCategory: string) {
    setCategoryFilter(nextCategory)
    startFresh(allCards, nextCategory)
  }

  function handleMark(known: boolean) {
    if (!flipped || !currentCard) return

    if (known) {
      setKnownCards((current) => [...current, currentCard])
    } else {
      setMissedCards((current) => [...current, currentCard])
    }

    if (index + 1 >= deck.length) {
      setFinished(true)
    } else {
      setIndex((current) => current + 1)
      setFlipped(false)
    }
  }

  function handleSaveCards(cards: AIRegistrarFlashcard[]) {
    const nextCategories = getOrderedCategories(cards)
    const nextFilter =
      categoryFilter === 'All' || nextCategories.includes(categoryFilter) ? categoryFilter : 'All'

    setAllCards(cards)
    setCategoryFilter(nextFilter)
    setShowEditModal(false)
    startFresh(cards, nextFilter)
  }

  function reviewMissedCards() {
    if (missedCards.length === 0) return

    setDeck(shuffleCards(missedCards))
    setIndex(0)
    setFlipped(false)
    setKnownCards([])
    setMissedCards([])
    setFinished(false)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef4ff,_#f8fafc_45%,_#eef2ff_100%)] pb-16">
      <div className="border-b border-white/20 bg-[#0033A0] text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
              <BookOpen className="h-3.5 w-3.5" />
              Registrar Study Deck
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">AI Registrar System Flashcard Quiz</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Study the autonomous registrar architecture through 30 flashcards drawn directly from the system design document.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="hidden rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0033A0] transition hover:bg-blue-50 sm:inline-flex sm:items-center sm:gap-2"
          >
            <PencilLine className="h-4 w-4" />
            Edit Cards
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {allCards.length} cards across {getOrderedCategories(allCards).length} topic areas
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Filter down to one domain, reshuffle the deck, and keep a separate pass for missed material.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:hidden"
            >
              <PencilLine className="h-4 w-4" />
              Edit
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => {
              const color = category === 'All' ? { bg: '#1f2937', light: '#f3f4f6' } : categoryColor(category)
              const count =
                category === 'All'
                  ? allCards.length
                  : allCards.filter((card) => card.category === category).length
              const active = categoryFilter === category

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className="rounded-full border px-3 py-1.5 text-xs font-bold transition"
                  style={{
                    backgroundColor: active ? color.bg : 'white',
                    color: active ? 'white' : color.bg,
                    borderColor: color.bg,
                  }}
                >
                  {category} ({count})
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
          {deck.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <CircleHelp className="h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">No cards in this category</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Choose another topic or add cards in the editor to build out this part of the deck.
              </p>
            </div>
          ) : !finished ? (
            <>
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>
                    Card {index + 1} of {deck.length}
                  </span>
                  <span>{knownCards.length} known</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-[#0033A0] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {currentCard ? (
                <Flashcard
                  card={currentCard}
                  flipped={flipped}
                  onFlip={() => setFlipped((current) => !current)}
                />
              ) : null}

              {!flipped ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#00287e]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Flip Card
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleMark(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Still Learning
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMark(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Got It
                  </button>
                </div>
              )}

              <p className="mt-4 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Click the card or use the button to flip
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[28px] bg-slate-50 px-6 py-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Trophy className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-3xl font-black text-slate-900">Round Complete</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {categoryFilter === 'All' ? 'All topics' : categoryFilter}
                </p>

                <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl bg-white px-4 py-5 shadow-sm">
                    <p className="text-4xl font-black text-emerald-500">{knownCards.length}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Got It</p>
                  </div>
                  <div className="rounded-3xl bg-white px-4 py-5 shadow-sm">
                    <p className="text-4xl font-black text-red-400">{missedCards.length}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Still Learning</p>
                  </div>
                  <div className="rounded-3xl bg-white px-4 py-5 shadow-sm">
                    <p className="text-4xl font-black text-[#0033A0]">{score}%</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Score</p>
                  </div>
                </div>

                {score === 100 ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    Perfect round. You cleared the whole deck.
                  </div>
                ) : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {missedCards.length > 0 ? (
                    <button
                      type="button"
                      onClick={reviewMissedCards}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Review {missedCards.length} Missed Card{missedCards.length === 1 ? '' : 's'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startFresh(allCards, categoryFilter)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0033A0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00287e]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Shuffle & Restart
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 text-left shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Category Breakdown</h3>
                <div className="mt-5 space-y-4">
                  {getOrderedCategories(deck).map((category) => {
                    const total = deck.filter((card) => card.category === category).length
                    const correct = knownCards.filter((card) => card.category === category).length
                    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
                    const color = categoryColor(category)

                    return (
                      <div key={category}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-slate-700">{category}</span>
                          <span className="font-semibold" style={{ color: color.bg }}>
                            {correct}/{total} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: color.bg }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEditModal ? (
        <EditModal
          cards={allCards}
          onSave={handleSaveCards}
          onClose={() => setShowEditModal(false)}
        />
      ) : null}
    </div>
  )
}
