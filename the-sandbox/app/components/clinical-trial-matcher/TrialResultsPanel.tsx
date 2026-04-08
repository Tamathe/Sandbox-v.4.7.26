'use client'

import { useState } from 'react'
import {
  Search, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle, XCircle, HelpCircle, AlertTriangle,
  FlaskConical, MapPin, Calendar, Users,
} from 'lucide-react'
import type { TrialMatch, PatientProfile } from '../../lib/clinical-trial-matcher/types'

interface Props {
  matches: TrialMatch[]
  patient: Partial<PatientProfile>
  isSearching: boolean
  isMatching: boolean
  onSelectTrial: (nctId: string) => void
}

export default function TrialResultsPanel({ matches, patient, isSearching, isMatching, onSelectTrial }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'STRONG' | 'POSSIBLE' | 'UNLIKELY'>('all')

  const filtered = filter === 'all' ? matches : matches.filter(m => m.recommendation === filter)
  const strong = matches.filter(m => m.recommendation === 'STRONG').length
  const possible = matches.filter(m => m.recommendation === 'POSSIBLE').length

  if (isSearching || isMatching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="size-8 border-2 border-[#0033A0] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">
          {isSearching ? 'Searching ClinicalTrials.gov...' : 'Scoring eligibility with AI...'}
        </p>
        {patient.condition && (
          <p className="text-xs text-gray-400 mt-1">Condition: {patient.condition}</p>
        )}
      </div>
    )
  }

  if (!matches.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Search className="size-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No results yet</p>
        <p className="text-xs mt-1">Tell Sandy about the patient to begin searching</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex items-center gap-3 text-xs">
        <span className="font-semibold text-gray-900">{matches.length} trials found</span>
        <span className="flex items-center gap-1 text-green-700">
          <CheckCircle className="size-3" /> {strong} strong
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="size-3" /> {possible} possible
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(['all', 'STRONG', 'POSSIBLE', 'UNLIKELY'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? `All (${matches.length})` : `${f.charAt(0) + f.slice(1).toLowerCase()} (${matches.filter(m => m.recommendation === f).length})`}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <strong>Research tool only.</strong> These results are not medical advice. Discuss trials of interest with the patient&apos;s care team.
      </div>

      {/* Trial cards */}
      <div className="space-y-3">
        {filtered.map(match => {
          const t = match.trial
          const isExpanded = expandedId === t.nctId

          return (
            <div
              key={t.nctId}
              className="border rounded-2xl shadow-sm bg-white overflow-hidden"
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : t.nctId)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ScoreBadge score={match.overallScore} recommendation={match.recommendation} />
                      <span className="text-xs text-gray-400 font-mono">{t.nctId}</span>
                      {t.phases.length > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {t.phases.join(', ')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{t.briefTitle}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{match.reasoning}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="size-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="size-4 text-gray-400 shrink-0 mt-1" />}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t px-4 py-3 space-y-3 bg-gray-50/50">
                  {/* Meta row */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    {t.leadSponsor && (
                      <span className="flex items-center gap-1"><FlaskConical className="size-3" /> {t.leadSponsor}</span>
                    )}
                    {t.locations?.[0] && (
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {t.locations[0].city}, {t.locations[0].state}</span>
                    )}
                    {t.startDate && (
                      <span className="flex items-center gap-1"><Calendar className="size-3" /> Started {t.startDate}</span>
                    )}
                    {t.enrollmentCount && (
                      <span className="flex items-center gap-1"><Users className="size-3" /> {t.enrollmentCount} {t.enrollmentType ?? 'participants'}</span>
                    )}
                  </div>

                  {/* Interventions */}
                  {t.interventions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Interventions</h4>
                      <div className="flex flex-wrap gap-1">
                        {t.interventions.map((i, idx) => (
                          <span key={idx} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            {i.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match details */}
                  {match.matchDetails.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Eligibility Assessment</h4>
                      <div className="space-y-1">
                        {match.matchDetails.map((d, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <CriterionIcon met={d.met} />
                            <div>
                              <span className="font-medium text-gray-700">{d.criterion}</span>
                              <span className="text-gray-500 ml-1">— {d.explanation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onSelectTrial(t.nctId)}
                      className="text-xs font-semibold text-[#0033A0] hover:underline"
                    >
                      Ask Sandy about this trial
                    </button>
                    <span className="text-gray-300">|</span>
                    <a
                      href={`https://clinicaltrials.gov/study/${t.nctId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-[#0033A0] flex items-center gap-1"
                    >
                      View on ClinicalTrials.gov <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreBadge({ score, recommendation }: { score: number; recommendation: string }) {
  const color = recommendation === 'STRONG'
    ? 'bg-green-100 text-green-800 border-green-200'
    : recommendation === 'POSSIBLE'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-red-100 text-red-800 border-red-200'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score}%
    </span>
  )
}

function CriterionIcon({ met }: { met: string }) {
  switch (met) {
    case 'YES': return <CheckCircle className="size-3.5 text-green-500 shrink-0 mt-0.5" />
    case 'NO': return <XCircle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
    case 'NEEDS_REVIEW': return <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
    default: return <HelpCircle className="size-3.5 text-gray-400 shrink-0 mt-0.5" />
  }
}
