'use client'

import { useState } from 'react'
import { BookOpen, ClipboardList, Activity } from 'lucide-react'
import InstructionCard from './InstructionCard'
import type { EncounterPhase, TranscriptMessage } from '../../lib/virtual-clinic/types'

// ─── Helpers ───────────────────────────────────────────────────────────────

const DOMAIN_MARKER_RE = /<!--DOMAIN:([\w-]+)-->/g
const MANEUVER_MARKER_RE = /<!--MANEUVER:([\w-]+)-->/g

/** Pretty-print a kebab-case domain name. */
function formatDomain(domain: string): string {
  return domain
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Strip hidden markers from text for display. */
function stripMarkers(text: string): string {
  return text.replace(/<!--(?:DOMAIN|MANEUVER):[^>]*-->/g, '').trim()
}

interface DomainSnippet {
  domain: string
  studentQuestion: string
  patientResponse: string
}

interface ManeuverFinding {
  maneuver: string
  finding: string
}

/**
 * Walk the transcript and pair each user message with the following assistant
 * response. Extract domain markers from HISTORY_TAKING assistant messages.
 */
function extractDomainSnippets(transcript: TranscriptMessage[]): DomainSnippet[] {
  const snippets: DomainSnippet[] = []
  for (let i = 0; i < transcript.length - 1; i++) {
    const msg = transcript[i]
    const next = transcript[i + 1]
    if (
      msg.role === 'user' &&
      next.role === 'assistant' &&
      next.phase === 'HISTORY_TAKING'
    ) {
      const matches = [...next.content.matchAll(DOMAIN_MARKER_RE)]
      for (const m of matches) {
        snippets.push({
          domain: m[1],
          studentQuestion: msg.content,
          patientResponse: stripMarkers(next.content),
        })
      }
    }
  }
  return snippets
}

/**
 * Walk the transcript and extract maneuver→finding pairs from PHYSICAL_EXAM
 * assistant messages.
 */
function extractManeuverFindings(transcript: TranscriptMessage[]): ManeuverFinding[] {
  const findings: ManeuverFinding[] = []
  const seen = new Set<string>()
  for (let i = 0; i < transcript.length - 1; i++) {
    const msg = transcript[i]
    const next = transcript[i + 1]
    if (
      msg.role === 'user' &&
      next.role === 'assistant' &&
      next.phase === 'PHYSICAL_EXAM'
    ) {
      const matches = [...next.content.matchAll(MANEUVER_MARKER_RE)]
      for (const m of matches) {
        if (!seen.has(m[1])) {
          seen.add(m[1])
          findings.push({
            maneuver: m[1],
            finding: stripMarkers(next.content),
          })
        }
      }
    }
  }
  return findings
}

/**
 * Group domain snippets by domain name, preserving order of first appearance.
 */
function groupByDomain(snippets: DomainSnippet[]): Map<string, DomainSnippet[]> {
  const map = new Map<string, DomainSnippet[]>()
  for (const s of snippets) {
    const list = map.get(s.domain) ?? []
    list.push(s)
    map.set(s.domain, list)
  }
  return map
}

// ─── Tab Button ────────────────────────────────────────────────────────────

function TabButton({ active, label, badge, onClick }: {
  active: boolean
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
        active
          ? 'bg-[#0033A0] text-white'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ─── Key Info Panel (History Taking) ───────────────────────────────────────

function KeyInfoPanel({ transcript }: { transcript: TranscriptMessage[] }) {
  const snippets = extractDomainSnippets(transcript)
  const grouped = groupByDomain(snippets)

  if (grouped.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <BookOpen className="size-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-400">
          Key information will appear here as you interview the patient.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-1">
      {[...grouped.entries()].map(([domain, items]) => (
        <div key={domain} className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-xs font-extrabold text-[#0033A0] uppercase tracking-wide mb-2">
            {formatDomain(domain)}
          </h4>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="text-sm">
                <p className="text-gray-500 italic text-xs mb-0.5">You asked: &ldquo;{item.studentQuestion}&rdquo;</p>
                <p className="text-gray-800">{item.patientResponse}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Findings Panel (Physical Exam) ────────────────────────────────────────

function FindingsPanel({ transcript }: { transcript: TranscriptMessage[] }) {
  const findings = extractManeuverFindings(transcript)

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <Activity className="size-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-400">
          Exam findings will appear here as you perform maneuvers.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-1">
      {findings.map((f, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="size-3.5 text-[#0033A0]" />
            <span className="text-xs font-extrabold text-[#0033A0] uppercase tracking-wide">
              {formatDomain(f.maneuver)}
            </span>
          </div>
          <p className="text-sm text-gray-800">{f.finding}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Exported: Your Notes Panel (for ProblemRep carry-forward) ─────────────

export function CarriedNotesPanel({ transcript }: { transcript: TranscriptMessage[] }) {
  const snippets = extractDomainSnippets(transcript)
  const grouped = groupByDomain(snippets)
  const findings = extractManeuverFindings(transcript)

  if (grouped.size === 0 && findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-12">
        <ClipboardList className="size-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-400">No notes collected from previous phases.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-1">
      {grouped.size > 0 && (
        <div>
          <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">History Findings</h3>
          {[...grouped.entries()].map(([domain, items]) => (
            <div key={domain} className="mb-3">
              <h4 className="text-xs font-semibold text-[#0033A0] mb-1">{formatDomain(domain)}</h4>
              {items.map((item, i) => (
                <p key={i} className="text-sm text-gray-700 mb-1">{item.patientResponse}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {findings.length > 0 && (
        <div>
          <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">Exam Findings</h3>
          {findings.map((f, i) => (
            <div key={i} className="mb-2">
              <span className="text-xs font-semibold text-[#0033A0]">{formatDomain(f.maneuver)}: </span>
              <span className="text-sm text-gray-700">{f.finding}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

interface TabbedInstructionPanelProps {
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

export default function TabbedInstructionPanel({
  phase,
  caseTitle,
  patientName,
  patientAge,
  patientSex,
  difficulty,
  transcript,
  historyDomainsHit,
  examManeuversRequested,
}: TabbedInstructionPanelProps) {
  const [activeTab, setActiveTab] = useState<'instructions' | 'info' | 'findings'>('instructions')

  const hasTabs = (difficulty === 'BEGINNER' || difficulty === 'INTERMEDIATE') &&
    (phase === 'HISTORY_TAKING' || phase === 'PHYSICAL_EXAM')

  // Reset to instructions when phase changes
  const secondTab = phase === 'PHYSICAL_EXAM' ? 'findings' : 'info'
  const secondLabel = phase === 'PHYSICAL_EXAM' ? 'Findings' : 'Key Info'
  const badgeCount = phase === 'PHYSICAL_EXAM'
    ? extractManeuverFindings(transcript).length
    : extractDomainSnippets(transcript).length > 0
      ? groupByDomain(extractDomainSnippets(transcript)).size
      : 0

  // No tabs for OPENING or ADVANCED/EXPERT
  if (!hasTabs) {
    return (
      <InstructionCard
        phase={phase}
        caseTitle={caseTitle}
        patientName={patientName}
        patientAge={patientAge}
        patientSex={patientSex}
        difficulty={difficulty}
        transcript={transcript}
        historyDomainsHit={historyDomainsHit}
        examManeuversRequested={examManeuversRequested}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-gray-200 bg-white">
        <TabButton
          active={activeTab === 'instructions'}
          label="Instructions"
          onClick={() => setActiveTab('instructions')}
        />
        <TabButton
          active={activeTab === secondTab}
          label={secondLabel}
          badge={badgeCount}
          onClick={() => setActiveTab(secondTab)}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'instructions' && (
          <InstructionCard
            phase={phase}
            caseTitle={caseTitle}
            patientName={patientName}
            patientAge={patientAge}
            patientSex={patientSex}
            difficulty={difficulty}
            transcript={transcript}
            historyDomainsHit={historyDomainsHit}
            examManeuversRequested={examManeuversRequested}
          />
        )}
        {activeTab === 'info' && phase === 'HISTORY_TAKING' && (
          <KeyInfoPanel transcript={transcript} />
        )}
        {activeTab === 'findings' && phase === 'PHYSICAL_EXAM' && (
          <FindingsPanel transcript={transcript} />
        )}
      </div>
    </div>
  )
}
