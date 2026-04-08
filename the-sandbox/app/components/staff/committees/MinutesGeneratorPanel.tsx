'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Loader2, FileText } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import AttendanceEditor, { type AttendanceMember } from './AttendanceEditor'
import MinutesPreview from './MinutesPreview'

interface MinutesGeneratorPanelProps {
  committeeId: string
  committeeName: string
  /** Pre-filled from committee.members */
  defaultMembers: AttendanceMember[]
  onGenerated: (meeting: GeneratedMeeting) => void
  /** Pre-fill notes from live meeting */
  prefillNotes?: string
}

export interface GeneratedMeeting {
  id: string
  meetingNumber: number
  date: string
  status: string
  formattedMinutes: string
  actionItems: { action: string; ownerName: string; due: string | null; priority: string }[]
  decisions: { decision: string; vote: string | null; context: string }[]
}

type InputType = 'notes' | 'transcript' | 'structured'

const INPUT_TYPE_OPTIONS: { value: InputType; label: string; description: string }[] = [
  { value: 'notes', label: 'Rough Notes', description: 'Bullet points and scratch text' },
  { value: 'transcript', label: 'Transcript', description: 'Voice recording transcript' },
  { value: 'structured', label: 'Structured', description: 'Agenda-aligned notes with headers' },
]

const PLACEHOLDER = `Discussed nursing report gaps. Walsh will update faculty credentials by tomorrow.
Student outcomes data needs to come from IR - Sarah to request by EOD today.
Foster asked about extension possibility. Kim moved to authorize Morgan to request
extension to April 2 if report not done by March 25 5pm. Lisa seconded. Passed 5-1,
Foster opposed. Next meeting Thursday same time. Everyone present.`

export default function MinutesGeneratorPanel({
  committeeId,
  committeeName,
  defaultMembers,
  onGenerated,
  prefillNotes,
}: MinutesGeneratorPanelProps) {
  const { currentUser } = useAuth()
  const [rawNotes, setRawNotes] = useState(prefillNotes ?? '')
  const [inputType, setInputType] = useState<InputType>('notes')
  const [members, setMembers] = useState<AttendanceMember[]>(defaultMembers)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedMeeting | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!rawNotes.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const presentNames = members.filter((m) => m.present).map((m) => m.name)
      const res = await fetch(`/api/staff/committees/${committeeId}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          rawNotes,
          inputType,
          attendees: presentNames,
          date: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to generate minutes')
      }
      const data = await res.json() as { meeting: GeneratedMeeting }
      setResult(data.meeting)
      onGenerated(data.meeting)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
    setGenerating(false)
  }, [rawNotes, inputType, members, committeeId, currentUser.email, onGenerated])

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2.5 rounded-xl">
          <Sparkles className="size-4" />
          <span className="font-semibold">Minutes generated successfully!</span>
        </div>
        <MinutesPreview
          meetingId={result.id}
          committeeName={committeeName}
          date={result.date}
          meetingNumber={result.meetingNumber}
          status={result.status}
          actionItemCount={result.actionItems?.length ?? 0}
          decisionCount={result.decisions?.length ?? 0}
          minutesExcerpt={result.formattedMinutes ?? ''}
          onViewFull={() => {/* handled by parent switching to meetings tab */}}
        />
        <button
          onClick={() => { setResult(null); setRawNotes('') }}
          className="text-xs font-semibold text-[#0033A0] hover:underline"
        >
          Generate another
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Input type selector */}
      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-2">Input Type</h4>
        <div className="flex gap-2">
          {INPUT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setInputType(opt.value)}
              disabled={generating}
              className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-left transition-colors ${
                inputType === opt.value
                  ? 'border-[#0033A0] bg-[#0033A0]/5'
                  : 'border-gray-200 hover:border-gray-300'
              } ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
              <p className="text-[10px] text-gray-500">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Raw notes textarea */}
      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-2">Meeting Notes</h4>
        <textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          disabled={generating}
          placeholder={PLACEHOLDER}
          rows={8}
          className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] resize-none disabled:opacity-50 placeholder:text-gray-400"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Paste your raw notes, bullet points, or transcript. Sandy will format them into proper minutes.
        </p>
      </div>

      {/* Attendance editor */}
      <AttendanceEditor
        members={members}
        onChange={setMembers}
        disabled={generating}
      />

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={() => void handleGenerate()}
        disabled={generating || !rawNotes.trim()}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
          generating || !rawNotes.trim()
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#0033A0] text-white hover:bg-[#002580]'
        }`}
      >
        {generating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sandy is generating minutes...
          </>
        ) : (
          <>
            <FileText className="size-4" />
            Generate Minutes
          </>
        )}
      </button>
    </div>
  )
}
