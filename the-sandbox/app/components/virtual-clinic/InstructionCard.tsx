'use client'

import { useState, useEffect } from 'react'
import { Stethoscope, MessageSquare, Activity, Info, EyeOff, Eye } from 'lucide-react'
import ScaffoldingBanner from './ScaffoldingBanner'
import { checkScaffolding, getDomainChecklist } from '../../lib/virtual-clinic/scaffolding-service'
import type { EncounterPhase, TranscriptMessage, ScaffoldingLevel } from '../../lib/virtual-clinic/types'

// ─── Difficulty → Scaffolding Level ─────────────────────────────────────────

function deriveScaffoldingLevel(difficulty: string): ScaffoldingLevel {
  switch (difficulty) {
    case 'BEGINNER': return 'full'
    case 'INTERMEDIATE': return 'light'
    default: return 'none' // ADVANCED, EXPERT
  }
}

// ─── Phase Instruction Content ──────────────────────────────────────────────

interface PhaseInstruction {
  icon: React.ReactNode
  title: string
  subtitle: string
  guidance: string
}

function getPhaseInstruction(
  phase: EncounterPhase,
  domainCount: number,
  maneuverCount: number,
  messageCount: number,
): PhaseInstruction {
  if (phase === 'OPENING') {
    if (messageCount === 0) {
      return {
        icon: <MessageSquare className="size-5 text-[#0033A0]" />,
        title: 'Greet Your Patient',
        subtitle: 'Introduce yourself and establish rapport.',
        guidance: 'Start by greeting the patient and asking what brings them in today. A warm introduction helps build trust.',
      }
    }
    if (messageCount < 3) {
      return {
        icon: <MessageSquare className="size-5 text-[#0033A0]" />,
        title: 'Continue the Conversation',
        subtitle: 'Good start — keep listening.',
        guidance: 'Follow up on the patient\'s chief complaint. Ask open-ended questions to learn more before moving to History Taking.',
      }
    }
    return {
      icon: <MessageSquare className="size-5 text-emerald-600" />,
      title: 'Ready to Advance',
      subtitle: 'You\'ve established rapport.',
      guidance: 'When you\'re ready, advance to History Taking to begin a systematic interview.',
    }
  }

  if (phase === 'HISTORY_TAKING') {
    if (domainCount === 0) {
      return {
        icon: <Stethoscope className="size-5 text-[#0033A0]" />,
        title: 'Take the History',
        subtitle: 'Explore the patient\'s symptoms and background.',
        guidance: 'Ask about their symptoms, medical history, medications, allergies, social and family history. Cover all major domains.',
      }
    }
    if (domainCount < 4) {
      return {
        icon: <Stethoscope className="size-5 text-[#0033A0]" />,
        title: 'Keep Exploring',
        subtitle: `${domainCount} domain${domainCount === 1 ? '' : 's'} covered so far.`,
        guidance: 'You\'re making progress. Consider what other aspects of the patient\'s history might be relevant.',
      }
    }
    return {
      icon: <Stethoscope className="size-5 text-emerald-600" />,
      title: 'Thorough History',
      subtitle: `${domainCount} domains covered — strong foundation.`,
      guidance: 'You\'ve covered significant ground. Advance when ready, or continue exploring if there\'s more to ask.',
    }
  }

  if (phase === 'PHYSICAL_EXAM') {
    if (maneuverCount === 0) {
      return {
        icon: <Activity className="size-5 text-[#0033A0]" />,
        title: 'Perform the Exam',
        subtitle: 'Describe maneuvers you want to perform.',
        guidance: 'Tell the patient what you\'d like to examine. Describe each maneuver and the patient will report findings.',
      }
    }
    if (maneuverCount < 3) {
      return {
        icon: <Activity className="size-5 text-[#0033A0]" />,
        title: 'Continue Examining',
        subtitle: `${maneuverCount} maneuver${maneuverCount === 1 ? '' : 's'} performed.`,
        guidance: 'Consider whether additional exam maneuvers would help narrow your differential diagnosis.',
      }
    }
    return {
      icon: <Activity className="size-5 text-emerald-600" />,
      title: 'Exam Progressing Well',
      subtitle: `${maneuverCount} maneuvers performed.`,
      guidance: 'You\'ve gathered significant physical exam data. Advance when you feel ready to synthesize your findings.',
    }
  }

  // Fallback (should not happen — other phases have dedicated forms)
  return {
    icon: <Stethoscope className="size-5 text-[#0033A0]" />,
    title: 'Continue',
    subtitle: '',
    guidance: '',
  }
}

// ─── Advance Phase Tooltips ─────────────────────────────────────────────────

const ADVANCE_TOOLTIPS: Partial<Record<EncounterPhase, string>> = {
  OPENING: 'Moves to History Taking — you\'ll begin a systematic patient interview.',
  HISTORY_TAKING: 'Moves to Problem Representation — you\'ll summarize the key clinical features.',
  PROBLEM_REPRESENTATION: 'Moves to Differential Diagnosis — you\'ll rank possible diagnoses.',
  DIFFERENTIAL_DIAGNOSIS: 'Moves to Physical Exam — you\'ll perform exam maneuvers.',
  PHYSICAL_EXAM: 'Moves to Diagnostic Plan — you\'ll order labs, imaging, and referrals.',
  DIAGNOSTIC_PLAN: 'Moves to Feedback — your encounter will be scored.',
}

export function getAdvanceTooltip(phase: EncounterPhase): string | undefined {
  return ADVANCE_TOOLTIPS[phase]
}

// ─── InstructionCard Component ──────────────────────────────────────────────

interface InstructionCardProps {
  phase: EncounterPhase
  caseTitle: string
  patientName: string
  patientAge: number
  patientSex: string
  difficulty: string
  transcript: TranscriptMessage[]
  historyDomainsHit: Record<string, boolean>
  examManeuversRequested: string[]
}

export default function InstructionCard({
  phase,
  caseTitle,
  patientName,
  patientAge,
  patientSex,
  difficulty,
  transcript,
  historyDomainsHit,
  examManeuversRequested,
}: InstructionCardProps) {
  // Count domains (exclude __affectState)
  const domainCount = Object.entries(historyDomainsHit)
    .filter(([k, v]) => k !== '__affectState' && v === true)
    .length
  const maneuverCount = examManeuversRequested.length
  const phaseMessages = transcript.filter((m) => m.role === 'user' && m.phase === phase).length

  const instruction = getPhaseInstruction(phase, domainCount, maneuverCount, phaseMessages)

  // Scaffolding
  const scaffoldingLevel = deriveScaffoldingLevel(difficulty)
  const showScaffolding = phase === 'HISTORY_TAKING' || phase === 'PHYSICAL_EXAM'

  const scaffoldingPrompt = phase === 'HISTORY_TAKING'
    ? checkScaffolding(scaffoldingLevel, transcript, historyDomainsHit)
    : null
  const domainChecklist = scaffoldingLevel === 'full'
    ? getDomainChecklist(historyDomainsHit)
    : null

  // Hide hints toggle (localStorage persisted)
  const [hintsHidden, setHintsHidden] = useState(false)
  useEffect(() => {
    setHintsHidden(localStorage.getItem('vc-scaffolding-hidden') === 'true')
  }, [])

  const toggleHints = () => {
    const next = !hintsHidden
    setHintsHidden(next)
    localStorage.setItem('vc-scaffolding-hidden', String(next))
  }

  const hasScaffolding = scaffoldingLevel !== 'none' && showScaffolding && (scaffoldingPrompt || domainChecklist)

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full">
        <div className="mx-auto mb-4">{instruction.icon}</div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-1">{instruction.title}</h2>
        {instruction.subtitle && (
          <p className="text-sm font-medium text-gray-600 mb-2">{instruction.subtitle}</p>
        )}

        {/* Patient info */}
        <p className="text-xs text-gray-400 mb-3">
          {caseTitle} — {patientName}, {patientAge}yo {patientSex}
        </p>

        <p className="text-sm text-gray-500 mb-4">{instruction.guidance}</p>

        {/* Domain / Maneuver counters for Beginner/Intermediate */}
        {(difficulty === 'BEGINNER' || difficulty === 'INTERMEDIATE') && phase === 'HISTORY_TAKING' && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mb-4">
            <Stethoscope className="size-3.5 text-gray-400" />
            <span>{domainCount} of 8 history domains explored</span>
          </div>
        )}
        {(difficulty === 'BEGINNER' || difficulty === 'INTERMEDIATE') && phase === 'PHYSICAL_EXAM' && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mb-4">
            <Activity className="size-3.5 text-gray-400" />
            <span>{maneuverCount} exam maneuver{maneuverCount === 1 ? '' : 's'} performed</span>
          </div>
        )}

        {/* Scaffolding Banner */}
        {hasScaffolding && (
          <div className="mt-2">
            <button
              onClick={toggleHints}
              className="flex items-center gap-1 mx-auto text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
            >
              {hintsHidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              {hintsHidden ? 'Show hints' : 'Hide hints'}
            </button>
            {!hintsHidden && (
              <ScaffoldingBanner prompt={scaffoldingPrompt} domainChecklist={domainChecklist} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
