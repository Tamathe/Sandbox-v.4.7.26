'use client'

import { ArrowRight, RotateCcw } from 'lucide-react'
import type { AIStance } from '../../generated/prisma'
import { STANCE_DETAILS, STANCE_PRACTICE } from '../../lib/stance-constants'
import StanceSpectrum from './StanceSpectrum'

interface StanceResultProps {
  stance: AIStance
  score: number
  breakdown: Record<string, number>
  onRetake: () => void
  onContinue: () => void // navigate to course impact or hub
}

const SCORE_LABELS: Record<string, string> = {
  q1_discipline_values: 'Discipline Values',
  q2_assessment_philosophy: 'Assessment Philosophy',
  q3_learning_loss: 'Learning Loss Concern',
  q4_industry_context: 'Industry Context',
  q5_current_reality: 'Current Reality',
  q6_enforcement: 'Enforcement Comfort',
  q7_institutional_climate: 'Institutional Climate',
  q8_assignment_resilience: 'Assignment Resilience',
  q9_pedagogical_identity: 'Pedagogical Identity',
  q10_what_you_need: 'What You Need',
}

export default function StanceResult({ stance, score, breakdown, onRetake, onContinue }: StanceResultProps) {
  const detail = STANCE_DETAILS[stance]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Main result */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-extrabold text-gray-900">Your AI Teaching Stance</h2>
        <p className="text-sm text-gray-500">Based on your responses (average score: {score.toFixed(1)} / 5.0)</p>

        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border rounded-2xl shadow-sm">
          <PolicyStanceBadge stance={stance} size="lg" />
          <div className="text-left">
            <p className="font-bold text-gray-900">{detail.label} Use</p>
            <p className="text-sm text-gray-600 max-w-sm">{detail.philosophy.split('.')[0]}.</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
        <p className="text-sm text-gray-600">
          This reflects your responses today. You can adjust your stance at any time.
          There are no right or wrong positions — only what works for your discipline and students.
        </p>
      </div>

      {/* What this means in practice */}
      <div className="border rounded-2xl shadow-sm p-6 bg-white">
        <details className="group">
          <summary className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-[#0033A0] list-none">
            What {detail.label} means in practice
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">Students can</p>
              <ul className="space-y-1.5">
                {STANCE_PRACTICE[stance].canDo.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">Students can&apos;t</p>
              <ul className="space-y-1.5">
                {STANCE_PRACTICE[stance].cantDo.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Sample syllabus language</p>
              <p className="text-sm text-gray-700 italic">{STANCE_PRACTICE[stance].syllabus}</p>
            </div>
          </div>
        </details>

        <details className="mt-4 pt-4 border-t border-gray-100 group">
          <summary className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-[#0033A0] list-none">
            See all five stances
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Stance</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Philosophy</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Students Can</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Students Can&apos;t</th>
                </tr>
              </thead>
              <tbody>
                {(['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE'] as const).map(s => (
                  <tr key={s} className={s === stance ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2 font-medium border-b whitespace-nowrap">{STANCE_DETAILS[s].label}</td>
                    <td className="px-3 py-2 text-gray-600 border-b">{STANCE_DETAILS[s].philosophy.split('.')[0]}.</td>
                    <td className="px-3 py-2 text-gray-600 border-b">{STANCE_PRACTICE[s].canDo[0]}</td>
                    <td className="px-3 py-2 text-gray-600 border-b">{STANCE_PRACTICE[s].cantDo[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="mt-4 text-xs text-muted-foreground italic">
          Curious how other stances work? Explore the comparison table above, or retake the assessment anytime.
        </p>
      </div>

      {/* Spectrum visualization */}
      <div className="border rounded-2xl shadow-sm p-6 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">The Stance Spectrum</h3>
        <StanceSpectrum currentStance={stance} />
        <p className="mt-3 text-xs text-gray-500 text-center">Click any position to explore what it looks like in practice</p>
      </div>

      {/* Score breakdown */}
      <div className="border rounded-2xl shadow-sm p-6 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Response Pattern</h3>
        <div className="space-y-3">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-36 shrink-0 truncate">{SCORE_LABELS[key] ?? key}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0033A0] rounded-full transition-all"
                  style={{ width: `${(value / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-6 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onRetake}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="size-4" />
          Retake Assessment
        </button>
        <button
          onClick={onContinue}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] transition-colors"
        >
          See What This Means for My Courses
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ── Inline Stance Badge ──────────────────────────────────────────────────────

function PolicyStanceBadge({ stance, size = 'sm' }: { stance: AIStance; size?: 'sm' | 'lg' }) {
  const colors: Record<AIStance, string> = {
    PROHIBIT: 'bg-red-100 text-red-700',
    CAUTIOUS: 'bg-amber-100 text-amber-700',
    GUIDED: 'bg-blue-100 text-blue-700',
    INTEGRATE: 'bg-green-100 text-green-700',
    REQUIRE: 'bg-purple-100 text-purple-700',
  }
  const labels: Record<AIStance, string> = {
    PROHIBIT: 'Prohibit', CAUTIOUS: 'Cautious', GUIDED: 'Guided', INTEGRATE: 'Integrate', REQUIRE: 'Require',
  }
  const sizeClass = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${colors[stance]} ${sizeClass}`}>
      {labels[stance]}
    </span>
  )
}

export { PolicyStanceBadge }
