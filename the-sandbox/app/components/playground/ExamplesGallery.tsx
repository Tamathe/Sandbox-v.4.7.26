'use client'

import { ArrowRight } from 'lucide-react'

interface ExampleCard {
  title: string
  description: string
  category: string
  prompt: string
}

interface ExamplesGalleryProps {
  onSelect: (prompt: string) => void
}

const EXAMPLES: ExampleCard[] = [
  {
    title: 'Flashcard Quiz',
    description: 'Flip cards with score tracking',
    category: 'Learning',
    prompt:
      'Build a flashcard quiz app where I can add terms and definitions, flip cards to test myself, and track my score',
  },
  {
    title: 'Multiple Choice Quiz',
    description: 'Timed quiz with results screen',
    category: 'Learning',
    prompt:
      'Build a 10-question multiple choice quiz with a countdown timer and a results screen showing correct/incorrect answers',
  },
  {
    title: 'Tournament Bracket',
    description: 'Single-elimination for 8-16 teams',
    category: 'Games',
    prompt:
      'Build a tournament bracket app for 8 teams. I should be able to enter team names and click to advance winners through each round',
  },
  {
    title: 'Word Scramble',
    description: 'Jumbled word game with hints',
    category: 'Games',
    prompt:
      'Build a word scramble game that jumbles a word, lets me guess the original, gives hints, and tracks my score across rounds',
  },
  {
    title: 'Budget Calculator',
    description: 'Monthly budget with category breakdown',
    category: 'Tools',
    prompt:
      'Build a monthly budget calculator where I can enter income and expenses by category and see a visual breakdown',
  },
  {
    title: 'Interactive Timeline',
    description: 'Clickable events with detail panels',
    category: 'Learning',
    prompt:
      'Build an interactive historical timeline where I can add events with dates and descriptions, and click each event to expand details',
  },
  {
    title: 'Countdown Timer',
    description: 'Pomodoro-style study timer',
    category: 'Tools',
    prompt:
      'Build a study timer with 25-minute work sessions and 5-minute breaks, with sound alerts and session count tracking',
  },
  {
    title: 'Kanban Board',
    description: 'Drag-free task board with columns',
    category: 'Productivity',
    prompt:
      'Build a kanban board with To Do, In Progress, and Done columns. I should be able to add tasks and move them between columns',
  },
  {
    title: 'Poll / Voting',
    description: 'Live results with bar chart',
    category: 'Learning',
    prompt:
      'Build a polling app where I can add a question and up to 5 options. Users click to vote and see live results as a bar chart',
  },
  {
    title: 'Reflex Game',
    description: 'Click-the-target speed game',
    category: 'Games',
    prompt:
      'Build a reflex game where a target appears at random positions and the user has to click it as fast as possible. Track reaction times and show a high score',
  },
]

export default function ExamplesGallery({ onSelect }: ExamplesGalleryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            Examples Gallery
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Start from a proven idea, then remix it into your own app.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {EXAMPLES.map((example) => (
          <div
            key={example.title}
            className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-[#0033A0]/40 hover:bg-blue-50/40"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                {example.category}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">{example.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{example.description}</p>

            <button
              type="button"
              onClick={() => onSelect(example.prompt)}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#002580]"
            >
              Build this
              <ArrowRight className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
