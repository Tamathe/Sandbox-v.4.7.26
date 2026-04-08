'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, MessageSquare } from 'lucide-react'
import {
  BranchingAnswers,
  StudentActivity,
  StructureLevel,
  SessionLength,
  ACTIVITY_OPTIONS,
  STRUCTURE_OPTIONS,
  LENGTH_OPTIONS,
  matchTemplates,
} from '../lib/branching-flow'
import { ExperienceType } from '../lib/experience-types'

interface BuildBranchingFlowProps {
  onSelect: (prompt: string) => void
}

type Step = 'activity' | 'structure' | 'length' | 'results'

export default function BuildBranchingFlow({ onSelect }: BuildBranchingFlowProps) {
  const [step, setStep] = useState<Step>('activity')
  const [answers, setAnswers] = useState<Partial<BranchingAnswers>>({})
  const [results, setResults] = useState<ExperienceType[]>([])
  const [showAllResults, setShowAllResults] = useState(false)

  function selectActivity(id: StudentActivity) {
    setAnswers(prev => ({ ...prev, activity: id }))
    setStep('structure')
  }

  function selectStructure(id: StructureLevel) {
    setAnswers(prev => ({ ...prev, structure: id }))
    setStep('length')
  }

  function selectLength(id: SessionLength) {
    const full: BranchingAnswers = {
      activity: answers.activity!,
      structure: answers.structure!,
      length: id,
    }
    setAnswers(full)
    setResults(matchTemplates(full))
    setStep('results')
  }

  function goBack() {
    if (step === 'structure') setStep('activity')
    else if (step === 'length') setStep('structure')
    else if (step === 'results') setStep('length')
  }

  function reset() {
    setStep('activity')
    setAnswers({})
    setResults([])
  }

  const stepNumber = step === 'activity' ? 1 : step === 'structure' ? 2 : step === 'length' ? 3 : 4

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-gray-900">Not sure where to start?</h2>
        <p className="text-sm text-gray-500">Answer 3 quick questions and we&apos;ll suggest the right format.</p>
      </div>

      {/* Step indicator */}
      {step !== 'results' && (
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                n < stepNumber ? 'bg-[#0033A0] text-white' :
                n === stepNumber ? 'bg-[#0033A0] text-white ring-2 ring-[#0033A0]/30' :
                'bg-gray-200 text-gray-400'
              }`}>
                {n}
              </div>
              {n < 3 && <div className={`w-8 h-0.5 rounded-full ${n < stepNumber ? 'bg-[#0033A0]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Back button */}
      {step !== 'activity' && (
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft className="size-3" />
          Back
        </button>
      )}

      {/* Q1: Activity */}
      {step === 'activity' && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">What should students <span className="text-[#0033A0]">do</span>?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACTIVITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectActivity(opt.id)}
                className="text-left rounded-2xl border-2 border-gray-200 bg-white p-4 hover:border-[#0033A0] hover:shadow-md transition-all group"
              >
                <div className="font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors">{opt.label}</div>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q2: Structure */}
      {step === 'structure' && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">How <span className="text-[#0033A0]">structured</span> should it be?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STRUCTURE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectStructure(opt.id)}
                className="text-left rounded-2xl border-2 border-gray-200 bg-white p-4 hover:border-[#0033A0] hover:shadow-md transition-all group"
              >
                <div className="font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors">{opt.label}</div>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q3: Length */}
      {step === 'length' && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">How <span className="text-[#0033A0]">long</span> should a session last?</p>
          <div className="grid grid-cols-3 gap-3">
            {LENGTH_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectLength(opt.id)}
                className="rounded-2xl border-2 border-gray-200 bg-white p-4 hover:border-[#0033A0] hover:shadow-md transition-all group text-center"
              >
                <div className="font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {step === 'results' && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Here&apos;s what we&apos;d recommend:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {(showAllResults ? results : results.slice(0, 4)).map(t => (
              <button
                key={t.name}
                type="button"
                onClick={() => onSelect(t.promptTemplate)}
                className="text-left rounded-2xl border-2 border-gray-200 bg-white p-5 hover:border-[#0033A0]/40 hover:shadow-md transition-all group"
              >
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-[#0033A0] transition-colors">
                  {t.name}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#0033A0]">
                  Use this <ArrowRight className="size-3" />
                </div>
              </button>
            ))}
          </div>
          {results.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAllResults(!showAllResults)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllResults ? 'Show fewer' : `Show all ${results.length} results`}
            </button>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Start over
            </button>
            <span className="text-xs text-gray-300">or</span>
            <button
              type="button"
              onClick={() => onSelect("I'm not sure what I want to build yet. Help me figure out what kind of learning experience would work for my course.")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:underline"
            >
              <MessageSquare className="size-3" />
              Describe your own idea instead
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
