'use client'

import React from 'react'
import { ArrowDown, ArrowUp, Minus, X } from 'lucide-react'
import type { ConceptDifficulty, DifficultyLevel } from '../../lib/classroom-intelligence/types'

const DIFFICULTY_BADGE: Record<DifficultyLevel, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  VERY_DIFFICULT: 'bg-orange-100 text-orange-700',
  DIFFICULT: 'bg-amber-100 text-amber-700',
  MODERATE: 'bg-blue-100 text-blue-700',
  EASY: 'bg-green-100 text-green-700',
}

interface ConceptDetailPanelProps {
  concept: ConceptDifficulty | null
  onClose: () => void
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${Math.min(Math.round(value * 100), 100)}%` }}
      />
    </div>
  )
}

export default function ConceptDetailPanel({ concept, onClose }: ConceptDetailPanelProps) {
  if (!concept) return null

  const badge = DIFFICULTY_BADGE[concept.difficulty]

  return (
    <div className="fixed inset-y-0 right-0 w-96 md:w-[480px] bg-white border-l shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-extrabold text-lg text-gray-900 truncate">
            {concept.conceptLabel}
          </h2>
          <span className={`shrink-0 text-xs font-bold uppercase px-2 py-0.5 rounded-full ${badge}`}>
            {concept.difficulty.replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="Close panel"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Mastery Rate */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Mastery Rate</p>
          <Bar value={concept.masteryRate} color="bg-[#0033A0]" />
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(concept.masteryRate * 100)}%
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Avg Mastery</p>
            <p className="font-extrabold text-lg text-gray-900">
              {Math.round(concept.avgMastery * 100)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Success Rate</p>
            <p className="font-extrabold text-lg text-gray-900">
              {Math.round(concept.successRate * 100)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Encounters</p>
            <p className="font-extrabold text-lg text-gray-900">
              {concept.encounterCount}
            </p>
          </div>
        </div>

        {/* Sandy Questions */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Sandy Questions ({concept.sandyQuestionCount})
          </p>
          <Bar value={concept.sandyConfusionScore} color="bg-amber-500" />
          <p className="text-xs text-gray-500 mt-1">
            Confusion Score: {Math.round(concept.sandyConfusionScore * 100)}%
          </p>
        </div>

        {/* Flashcard Fail Rate */}
        {concept.flashcardFailRate !== null && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Flashcard Fail Rate</p>
            <Bar value={concept.flashcardFailRate} color="bg-red-500" />
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(concept.flashcardFailRate * 100)}%
            </p>
          </div>
        )}

        {/* Misconceptions */}
        {concept.misconceptions.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Misconceptions</p>
            <ul className="space-y-2">
              {concept.misconceptions.map((m, i) => (
                <li key={i} className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-red-800">{m.description}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {m.type} &middot; {m.count} occurrence{m.count !== 1 ? 's' : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 7-Day Trend */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-semibold text-gray-700">7-Day Trend</p>
          <span className={`flex items-center gap-1 text-sm font-bold ${
            concept.delta7d > 0 ? 'text-green-600' : concept.delta7d < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {concept.delta7d > 0 ? (
              <ArrowUp className="size-4" />
            ) : concept.delta7d < 0 ? (
              <ArrowDown className="size-4" />
            ) : (
              <Minus className="size-4" />
            )}
            {Math.abs(Math.round(concept.delta7d * 100))}%
          </span>
        </div>
      </div>
    </div>
  )
}
