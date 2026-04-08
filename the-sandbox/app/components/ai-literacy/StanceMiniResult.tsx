'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'
import type { AIStance } from '../../generated/prisma'
import { STANCE_PRACTICE, STANCE_DETAILS } from '../../lib/stance-constants'

interface StanceMiniResultProps {
  stance: AIStance
  score?: number
  onShowStarterPacks?: () => void
}

const STANCE_ORDER: AIStance[] = ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE']

const STANCE_LABELS: Record<AIStance, string> = {
  PROHIBIT: 'Prohibit',
  CAUTIOUS: 'Cautious',
  GUIDED: 'Guided',
  INTEGRATE: 'Integrate',
  REQUIRE: 'Require',
}

const STANCE_COLORS: Record<AIStance, { bg: string; text: string; activeBg: string }> = {
  PROHIBIT: { bg: 'bg-red-100', text: 'text-red-700', activeBg: 'bg-red-500' },
  CAUTIOUS: { bg: 'bg-amber-100', text: 'text-amber-700', activeBg: 'bg-amber-500' },
  GUIDED: { bg: 'bg-blue-100', text: 'text-blue-700', activeBg: 'bg-blue-500' },
  INTEGRATE: { bg: 'bg-indigo-100', text: 'text-indigo-700', activeBg: 'bg-indigo-500' },
  REQUIRE: { bg: 'bg-green-100', text: 'text-green-700', activeBg: 'bg-green-500' },
}

const STANCE_DEFINITIONS: Record<AIStance, string> = {
  PROHIBIT: 'You believe AI use undermines core learning objectives in your discipline.',
  CAUTIOUS: 'You see risks in AI use but recognize it may have a limited role with strict guardrails.',
  GUIDED: 'You believe AI can be a learning tool when used with clear boundaries and transparency.',
  INTEGRATE: 'You see AI as a valuable tool students should learn to use skillfully and critically.',
  REQUIRE: 'You believe AI fluency is essential and students should be expected to use it.',
}

export default function StanceMiniResult({ stance, score, onShowStarterPacks }: StanceMiniResultProps) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 max-w-2xl mx-auto">
      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Your AI Teaching Stance</h3>

      {/* 5-segment horizontal bar */}
      <div className="flex gap-1 mb-3">
        {STANCE_ORDER.map(s => (
          <div key={s} className={`flex-1 h-2 rounded-full ${s === stance ? STANCE_COLORS[s].activeBg : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Labels below bar */}
      <div className="flex justify-between mb-4">
        {STANCE_ORDER.map(s => (
          <span key={s} className={`text-[10px] font-medium ${s === stance ? STANCE_COLORS[s].text : 'text-gray-300'}`}>
            {STANCE_LABELS[s]}
          </span>
        ))}
      </div>

      {/* Stance name + definition */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${STANCE_COLORS[stance].bg} mb-2`}>
        <span className={`text-sm font-semibold ${STANCE_COLORS[stance].text}`}>
          {STANCE_LABELS[stance]}
        </span>
      </div>
      <p className="text-sm text-gray-600">{STANCE_DEFINITIONS[stance]}</p>

      {/* Deep dive link */}
      <Link href="/ai-literacy/stance" className="inline-block mt-3 text-xs text-[#0033A0] hover:underline">
        Explore your full results →
      </Link>

      {/* What this means in practice */}
      <details className="mt-4 group">
        <summary className="text-xs font-medium text-[#0033A0] cursor-pointer hover:underline list-none">
          What {STANCE_LABELS[stance]} means in practice
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 mb-1">Students can</p>
            <ul className="space-y-1">
              {STANCE_PRACTICE[stance].canDo.map((item, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">•</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700 mb-1">Students can&apos;t</p>
            <ul className="space-y-1">
              {STANCE_PRACTICE[stance].cantDo.map((item, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5">•</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Sample syllabus language</p>
            <p className="text-xs text-gray-700 italic">{STANCE_PRACTICE[stance].syllabus}</p>
          </div>
        </div>
      </details>

      {/* See all five stances */}
      <details className="mt-3 group">
        <summary className="text-xs font-medium text-[#0033A0] cursor-pointer hover:underline list-none">
          See all five stances
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-b">Stance</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-b">Philosophy</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-b">Students Can</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-700 border-b">Students Can&apos;t</th>
              </tr>
            </thead>
            <tbody>
              {STANCE_ORDER.map(s => (
                <tr key={s} className={s === stance ? 'bg-blue-50' : ''}>
                  <td className={`px-2 py-1.5 font-medium border-b ${STANCE_COLORS[s].text}`}>{STANCE_LABELS[s]}</td>
                  <td className="px-2 py-1.5 text-gray-600 border-b">{STANCE_DETAILS[s].philosophy.split('.')[0]}.</td>
                  <td className="px-2 py-1.5 text-gray-600 border-b">{STANCE_PRACTICE[s].canDo[0]}</td>
                  <td className="px-2 py-1.5 text-gray-600 border-b">{STANCE_PRACTICE[s].cantDo[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Starter Pack shortcut (only in QuickStart context) */}
      {onShowStarterPacks && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <p className="text-xs text-gray-500 mb-2">Want to skip ahead?</p>
          <button
            onClick={onShowStarterPacks}
            className="flex items-center gap-2 text-sm text-[#0033A0] hover:text-[#002880] font-medium transition-colors"
          >
            <Package className="size-4" />
            Adopt a Starter Pack based on your {STANCE_LABELS[stance]} stance
          </button>
        </div>
      )}
    </div>
  )
}
