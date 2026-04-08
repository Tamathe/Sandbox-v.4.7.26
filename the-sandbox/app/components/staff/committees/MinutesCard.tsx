'use client'

import { useState, useCallback } from 'react'
import { FileText, ChevronDown, ChevronRight, CheckCircle2, Clock, XCircle, Users, Pencil, Sparkles, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import MotionBlock, { type Motion } from './MotionBlock'
import MinutesActions from './MinutesActions'

/* ── Types ──────────────────────────────────────────────────────── */

interface AgendaItem {
  title: string
  discussion: string
  decisions?: string[]
  motions?: Motion[]
}

interface ActionItem {
  action: string
  ownerName: string
  due: string | null
  priority: string
  status?: string
}

interface Decision {
  decision: string
  vote: string | null
  context: string
}

interface PreviousActionReview {
  action: string
  owner: string
  status: 'complete' | 'in-progress' | 'not-started'
  notes?: string | null
}

export interface MinutesData {
  id: string
  committeeName: string
  meetingNumber: number
  date: string
  location: string | null
  status: string
  attendees: { present: string[]; absent: string[] } | null
  previousActionReview: PreviousActionReview[] | null
  agendaItems: AgendaItem[] | null
  actionItems: ActionItem[] | null
  decisions: Decision[] | null
  formattedMinutes: string | null
}

interface MinutesCardProps {
  minutes: MinutesData
  committeeId: string
  onDistribute: (meetingId: string) => void
  onFinalize: (meetingId: string) => void
  onCreateActionItems: (meetingId: string) => void
  onDownload: (meetingId: string) => void
  onMinutesUpdated?: (formattedMinutes: string) => void
  distributing?: boolean
  finalizing?: boolean
  creatingActions?: boolean
}

/* ── Status badge ───────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  finalized: 'bg-green-100 text-green-800',
}

const REVIEW_ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  complete: { icon: CheckCircle2, color: 'text-green-600' },
  'in-progress': { icon: Clock, color: 'text-amber-500' },
  'not-started': { icon: XCircle, color: 'text-red-500' },
}

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

/* ── Section parser ─────────────────────────────────────────────── */

interface MinutesSection {
  header: string // e.g. "## Attendance"
  content: string // everything until the next ## header
}

function parseMinutesSections(markdown: string): MinutesSection[] {
  const lines = markdown.split('\n')
  const sections: MinutesSection[] = []
  let currentHeader = ''
  let currentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeader || currentLines.length > 0) {
        sections.push({ header: currentHeader, content: currentLines.join('\n').trim() })
      }
      currentHeader = line
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  // Push the last section
  if (currentHeader || currentLines.length > 0) {
    sections.push({ header: currentHeader, content: currentLines.join('\n').trim() })
  }

  return sections
}

function reconstructMinutes(sections: MinutesSection[]): string {
  return sections
    .map((s) => (s.header ? `${s.header}\n${s.content}` : s.content))
    .join('\n\n')
}

/* ── Section editor sub-component ─────────────────────────────── */

function SectionBlock({
  section,
  index,
  committeeId,
  meetingId,
  fullMinutes,
  onSectionUpdated,
}: {
  section: MinutesSection
  index: number
  committeeId: string
  meetingId: string
  fullMinutes: string
  onSectionUpdated: (index: number, newContent: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [revisingWithSandy, setRevisingWithSandy] = useState(false)
  const [reviseInstruction, setReviseInstruction] = useState('')
  const [revising, setRevising] = useState(false)

  const sectionText = section.header ? `${section.header}\n${section.content}` : section.content

  const handleEdit = useCallback(() => {
    setEditContent(section.content)
    setEditing(true)
    setRevisingWithSandy(false)
  }, [section.content])

  const handleSave = useCallback(() => {
    onSectionUpdated(index, editContent)
    setEditing(false)
  }, [index, editContent, onSectionUpdated])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setEditContent('')
  }, [])

  const handleRevise = useCallback(async () => {
    if (!reviseInstruction.trim()) return
    setRevising(true)
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/meetings/${meetingId}/revise-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionContent: sectionText,
          instruction: reviseInstruction,
          fullMinutes,
        }),
      })
      if (res.ok) {
        const data = await res.json() as { revisedSection: string }
        // Parse the revised section — strip the header if it's repeated
        let revised = data.revisedSection
        if (section.header && revised.startsWith(section.header)) {
          revised = revised.slice(section.header.length).trim()
        }
        onSectionUpdated(index, revised)
        setRevisingWithSandy(false)
        setReviseInstruction('')
      }
    } catch { /* ignore */ }
    setRevising(false)
  }, [committeeId, meetingId, sectionText, reviseInstruction, fullMinutes, section.header, index, onSectionUpdated])

  // Don't show edit controls for preamble (no header) sections
  const showControls = !!section.header

  return (
    <div className="group relative">
      {/* Section header + edit button row */}
      {showControls && (
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-extrabold text-gray-900">
            {section.header.replace(/^##\s*/, '')}
          </h3>
          {!editing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-gray-500 hover:text-[#0033A0] hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Pencil className="size-3" />
                Edit
              </button>
              <button
                onClick={() => { setRevisingWithSandy(!revisingWithSandy); setEditing(false) }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Sparkles className="size-3" />
                Revise with Sandy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editing mode */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[120px] p-3 text-xs text-gray-700 border border-gray-200 rounded-xl font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#0033A0] rounded-lg hover:bg-[#002580]"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : revisingWithSandy ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{section.content}</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reviseInstruction}
              onChange={(e) => setReviseInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleRevise() }}
              placeholder="e.g. Make this more concise, Add the budget figure of $12,000..."
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              disabled={revising}
            />
            <button
              onClick={() => void handleRevise()}
              disabled={revising || !reviseInstruction.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {revising ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
              {revising ? 'Revising...' : 'Revise'}
            </button>
            <button
              onClick={() => { setRevisingWithSandy(false); setReviseInstruction('') }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{section.content}</div>
      )}
    </div>
  )
}

/* ── Component ──────────────────────────────────────────────────── */

export default function MinutesCard({
  minutes,
  committeeId,
  onDistribute,
  onFinalize,
  onCreateActionItems,
  onDownload,
  onMinutesUpdated,
  distributing,
  finalizing,
  creatingActions,
}: MinutesCardProps) {
  const [expandedAgenda, setExpandedAgenda] = useState<Set<number>>(new Set([0]))
  const [sections, setSections] = useState<MinutesSection[]>(() =>
    minutes.formattedMinutes ? parseMinutesSections(minutes.formattedMinutes) : []
  )
  const [saving, setSaving] = useState(false)

  const toggleAgenda = (index: number) => {
    setExpandedAgenda((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleSectionUpdated = useCallback(async (index: number, newContent: string) => {
    const updated = sections.map((s, i) => (i === index ? { ...s, content: newContent } : s))
    setSections(updated)

    // Reconstruct and save
    const newMinutes = reconstructMinutes(updated)
    setSaving(true)
    try {
      await fetch(`/api/staff/committees/${committeeId}/meetings/${minutes.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formattedMinutes: newMinutes }),
      })
      onMinutesUpdated?.(newMinutes)
    } catch { /* ignore */ }
    setSaving(false)
  }, [sections, committeeId, minutes.id, onMinutesUpdated])

  const d = new Date(minutes.date)

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-[#0033A0] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="size-5 text-white/80" />
            <div>
              <h2 className="text-base font-extrabold text-white">{minutes.committeeName}</h2>
              <p className="text-xs text-white/70">
                Meeting #{minutes.meetingNumber} — {format(d, 'EEEE, MMMM d, yyyy')}
                {minutes.location && ` — ${minutes.location}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[10px] text-white/70 flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[minutes.status] ?? STATUS_STYLES.draft}`}>
              {minutes.status}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* ── Section-Editable Minutes ──────────────────────────── */}
        {sections.length > 0 && (
          <div className="space-y-5">
            {sections.map((section, i) => (
              <SectionBlock
                key={i}
                section={section}
                index={i}
                committeeId={committeeId}
                meetingId={minutes.id}
                fullMinutes={minutes.formattedMinutes ?? ''}
                onSectionUpdated={handleSectionUpdated}
              />
            ))}
          </div>
        )}

        {/* ── Attendance (structured data fallback) ─────────────── */}
        {!sections.length && minutes.attendees && (
          <section>
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5 mb-2">
              <Users className="size-4 text-[#0033A0]" />
              Attendance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-green-700 mb-1">Present</p>
                <ul className="space-y-0.5">
                  {minutes.attendees.present.map((name) => (
                    <li key={name} className="text-xs text-gray-700 flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-green-500" />
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-red-600 mb-1">Absent</p>
                {minutes.attendees.absent.length > 0 ? (
                  <ul className="space-y-0.5">
                    {minutes.attendees.absent.map((name) => (
                      <li key={name} className="text-xs text-gray-500 flex items-center gap-1">
                        <XCircle className="size-3 text-red-400" />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic">None</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Previous Action Review (fallback) ────────────────── */}
        {!sections.length && minutes.previousActionReview && minutes.previousActionReview.length > 0 && (
          <section>
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Review of Previous Actions</h3>
            <div className="space-y-1">
              {minutes.previousActionReview.map((item, i) => {
                const cfg = REVIEW_ICONS[item.status] ?? REVIEW_ICONS['not-started']
                const Icon = cfg.icon
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Icon className={`size-4 mt-0.5 shrink-0 ${cfg.color}`} />
                    <span className="text-gray-700">
                      <span className="font-medium">{item.owner}:</span> {item.action}
                      {item.notes && <span className="text-gray-400"> — {item.notes}</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Agenda Items (fallback, collapsible) ─────────────── */}
        {!sections.length && minutes.agendaItems && minutes.agendaItems.length > 0 && (
          <section>
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Agenda &amp; Discussion</h3>
            <div className="space-y-2">
              {minutes.agendaItems.map((item, i) => {
                const isExpanded = expandedAgenda.has(i)
                return (
                  <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleAgenda(i)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight className="size-4 text-gray-400 shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">
                        {i + 1}. {item.title}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-gray-50">
                        {item.discussion && (
                          <p className="text-xs text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">
                            {item.discussion}
                          </p>
                        )}
                        {item.motions?.map((motion, mi) => (
                          <MotionBlock key={mi} motion={motion} />
                        ))}
                        {item.decisions && item.decisions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.decisions.map((dec, di) => (
                              <div key={di} className="text-xs text-[#0033A0] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="size-3" />
                                {dec}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Action Items Table ──────────────────────────────── */}
        {minutes.actionItems && minutes.actionItems.length > 0 && (
          <section>
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Action Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-bold text-gray-500 w-8">#</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-500">Action</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-500">Owner</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-500">Due</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-500">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {minutes.actionItems.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-2 text-gray-900 font-medium">{item.action}</td>
                      <td className="py-2 px-2 text-gray-600">{item.ownerName}</td>
                      <td className="py-2 px-2 text-gray-600">{item.due ?? '—'}</td>
                      <td className="py-2 px-2">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium}`}>
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Decisions Table ─────────────────────────────────── */}
        {minutes.decisions && minutes.decisions.length > 0 && (
          <section>
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Decisions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-bold text-gray-500 w-8">#</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-500">Decision</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-500">Vote</th>
                    <th className="text-left py-2 px-2 font-bold text-gray-500">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {minutes.decisions.map((dec, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-2 text-gray-900 font-medium">{dec.decision}</td>
                      <td className="py-2 px-2 text-[#0033A0] font-bold">{dec.vote ?? '—'}</td>
                      <td className="py-2 px-2 text-gray-600">{dec.context}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Action Buttons ──────────────────────────────────── */}
        <MinutesActions
          meetingId={minutes.id}
          status={minutes.status}
          onDistribute={onDistribute}
          onFinalize={onFinalize}
          onCreateActionItems={onCreateActionItems}
          onDownload={onDownload}
          distributing={distributing}
          finalizing={finalizing}
          creatingActions={creatingActions}
        />
      </div>
    </div>
  )
}
