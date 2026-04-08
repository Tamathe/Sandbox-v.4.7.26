'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Moon, BookOpen, Layers, GraduationCap, Bed, ArrowRight, Check } from 'lucide-react'
import type { WindDownData } from '../../lib/student-home-data'

const MOODS = [
  { emoji: '\u{1F60A}', label: 'Great' },
  { emoji: '\u{1F610}', label: 'Okay' },
  { emoji: '\u{1F614}', label: 'Meh' },
  { emoji: '\u{1F629}', label: 'Rough' },
  { emoji: '\u{1F929}', label: 'Amazing' },
]

interface WindDownCardProps {
  data: WindDownData
}

export default function WindDownCard({ data }: WindDownCardProps) {
  const { daySummary, sleepSuggestion } = data
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [moodSaved, setMoodSaved] = useState(false)

  function handleMood(index: number) {
    setSelectedMood(index)
    setMoodSaved(true)
    // In production: POST to telemetry/mood endpoint
    setTimeout(() => setMoodSaved(false), 2000)
  }

  return (
    <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Moon className="size-4 text-indigo-400" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Day</h3>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Day summary stats */}
        <div className="space-y-1.5">
          {daySummary.studySessions > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <BookOpen className="size-3.5 text-indigo-400" />
              <span>{daySummary.studySessions} study session{daySummary.studySessions !== 1 ? 's' : ''} · {daySummary.studyMinutes} min total</span>
            </div>
          )}
          {daySummary.flashcardsReviewed > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Layers className="size-3.5 text-indigo-400" />
              <span>{daySummary.flashcardsReviewed} flashcard{daySummary.flashcardsReviewed !== 1 ? 's' : ''} reviewed</span>
            </div>
          )}
          {daySummary.classesAttended > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <GraduationCap className="size-3.5 text-indigo-400" />
              <span>Attended {daySummary.classesAttended} class{daySummary.classesAttended !== 1 ? 'es' : ''}</span>
            </div>
          )}
        </div>

        {/* Mood check-in */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">How are you feeling?</p>
          <div className="flex items-center gap-2">
            {MOODS.map((mood, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleMood(i)}
                className={`size-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                  selectedMood === i
                    ? 'bg-indigo-100 ring-2 ring-indigo-300 scale-110'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                aria-label={mood.label}
                title={mood.label}
              >
                {mood.emoji}
              </button>
            ))}
            {moodSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium ml-1">
                <Check className="size-3" /> Noted
              </span>
            )}
          </div>
        </div>

        {/* Sleep suggestion */}
        {sleepSuggestion && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-indigo-50/70">
            <Bed className="size-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p>First class tomorrow: <span className="font-semibold">{sleepSuggestion.firstClassTomorrow}</span></p>
              <p className="text-gray-500">Aim for lights out by <span className="font-medium text-gray-700">{sleepSuggestion.suggestedBedtime}</span> ({sleepSuggestion.targetHours} hrs)</p>
            </div>
          </div>
        )}

        {/* Breathing exercise link */}
        <Link
          href="/wellness-hub/mindfulness?mode=breathing&duration=5"
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          5-min breathing exercise
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}
