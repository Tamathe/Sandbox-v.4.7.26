'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Wand2, Save, Users, Clock, Loader2, X } from 'lucide-react'
import type {
  SerializedIncident,
  SerializedDocument,
  IncidentStatus,
  DocumentType,
} from '../../../lib/crisis-comms/command-center/types'
import SeverityBadge from './SeverityBadge'
import { IncidentStatusBadge, DocumentStatusBadge } from './StatusBadge'
import DocumentIcon from './DocumentIcon'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_FLOW: IncidentStatus[] = ['DRAFTING', 'ACTIVE', 'CONTAINED', 'CLOSED']

const CHAR_LIMITS: Partial<Record<DocumentType, number>> = {
  EMERGENCY_TEXT_ALERT: 160,
  SOCIAL_TWITTER: 280,
  SOCIAL_INSTAGRAM: 2200,
}

interface WorkspacePhaseProps {
  incident: SerializedIncident
  activeDocument: SerializedDocument | null
  activeDocumentId: string | null
  loading: boolean
  onSelectDocument: (id: string) => void
  onUpdateDocument: (content: string) => void
  onAiEdit: (instruction: string) => void
  onUpdateStatus: (status: IncidentStatus) => void
}

export default function WorkspacePhase({
  incident,
  activeDocument,
  activeDocumentId,
  loading,
  onSelectDocument,
  onUpdateDocument,
  onAiEdit,
  onUpdateStatus,
}: WorkspacePhaseProps) {
  const [editContent, setEditContent] = useState(activeDocument?.content ?? '')
  const [aiInstruction, setAiInstruction] = useState('')
  const [showAiInput, setShowAiInput] = useState(false)
  const [copiedRoom, setCopiedRoom] = useState(false)
  const [copiedDoc, setCopiedDoc] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  // Sync editContent when active document changes
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setEditContent(activeDocument?.content ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocument?.id, activeDocument?.content])

  function handleContentChange(value: string) {
    setEditContent(value)
    setHasUnsavedChanges(true)
  }

  function handleSave() {
    onUpdateDocument(editContent)
    setHasUnsavedChanges(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 1500)
  }

  function handleAiEdit() {
    if (!aiInstruction.trim()) return
    if (hasUnsavedChanges) onUpdateDocument(editContent)
    onAiEdit(aiInstruction.trim())
    setAiInstruction('')
    setShowAiInput(false)
    setHasUnsavedChanges(false)
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(incident.roomCode)
    setCopiedRoom(true)
    setTimeout(() => setCopiedRoom(false), 2000)
  }

  function copyDocument() {
    navigator.clipboard.writeText(editContent)
    setCopiedDoc(true)
    setTimeout(() => setCopiedDoc(false), 1500)
  }

  function handleEditorKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      if (hasUnsavedChanges) handleSave()
    }
  }

  function handleStatusChange(newStatus: IncidentStatus) {
    if (newStatus === 'CLOSED' && !confirm('Close this incident? This will archive it.')) return
    onUpdateStatus(newStatus)
  }

  const currentStatusIdx = STATUS_FLOW.indexOf(incident.status as IncidentStatus)
  const availableStatuses = STATUS_FLOW.slice(Math.max(0, currentStatusIdx))

  const charLimit = activeDocument ? CHAR_LIMITS[activeDocument.type as DocumentType] : undefined
  const charCount = editContent.length
  const overLimit = charLimit ? charCount > charLimit : false

  const documents = incident.documents ?? []
  const timeline = [...(incident.timelineEvents ?? [])].reverse()
  const participants = incident.participants ?? []

  const timelineItems = (
    <>
      {timeline.map((evt) => (
        <div key={evt.id} className="flex gap-2.5">
          <div className="mt-1.5 size-2 rounded-full bg-[#0033A0] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900">
              {formatAction(evt.action)}
            </p>
            {evt.detail && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{evt.detail}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
              <Clock className="size-3" />
              {timeAgo(evt.createdAt)}
              {evt.user && <span>— {evt.user.name}</span>}
            </div>
          </div>
        </div>
      ))}
      {timeline.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No events yet</p>
      )}
    </>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity as 1 | 2 | 3} />
          <IncidentStatusBadge status={incident.status} />
        </div>

        {/* Room code */}
        <button
          onClick={copyRoomCode}
          title={`Click to copy: ${incident.roomCode}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 hover:border-[#0033A0]/40 transition-colors"
        >
          Room: {incident.roomCode}
          {copiedRoom ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
        </button>

        {/* Participants */}
        <div className="relative group">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 cursor-default">
            <Users className="size-3.5" />
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </div>
          {participants.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-3 hidden group-hover:block z-20">
              <div className="space-y-1.5">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-900">{p.user?.name ?? 'Unknown'}</span>
                    <span className="text-gray-400 uppercase text-[10px]">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline toggle (below lg) */}
        <button
          onClick={() => setShowTimeline(true)}
          className="lg:hidden flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0033A0] transition-colors"
        >
          <Clock className="size-3.5" />
          Timeline ({timeline.length})
        </button>

        {/* Status control */}
        <div className="ml-auto">
          <select
            value={incident.status}
            onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
          >
            {availableStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left sidebar: document list */}
        <div className="w-64 shrink-0 border rounded-2xl shadow-sm bg-white overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Documents ({documents.length})</h3>
          </div>
          <div className="p-2 space-y-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  if (hasUnsavedChanges) handleSave()
                  onSelectDocument(doc.id)
                  setHasUnsavedChanges(false)
                }}
                className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  doc.id === activeDocumentId
                    ? 'bg-[#0033A0]/5 border border-[#0033A0]/20'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <DocumentIcon type={doc.type as DocumentType} className="size-4 text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{doc.title}</p>
                  <DocumentStatusBadge status={doc.status} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: document editor */}
        <div className="flex-1 border rounded-2xl shadow-sm bg-white flex flex-col min-w-0">
          {activeDocument ? (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <DocumentIcon type={activeDocument.type as DocumentType} className="size-5 text-[#0033A0]" />
                <h3 className="text-sm font-semibold text-gray-900">{activeDocument.title}</h3>
                <DocumentStatusBadge status={activeDocument.status} />
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={copyDocument}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedDoc ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                    {copiedDoc ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setShowAiInput(!showAiInput)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <Wand2 className="size-3.5" />
                    AI Edit
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#0033A0] hover:bg-[#002880] disabled:opacity-40 transition-colors"
                  >
                    {savedFeedback ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
                    {savedFeedback ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>

              {/* AI instruction bar */}
              {showAiInput && (
                <div className="px-4 py-3 border-b border-purple-100 bg-purple-50/50 flex gap-2">
                  <input
                    type="text"
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                    placeholder="e.g., Make it shorter, Add more empathy, Make it more formal..."
                    className="flex-1 border border-purple-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button
                    onClick={handleAiEdit}
                    disabled={loading || !aiInstruction.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                    Revise
                  </button>
                </div>
              )}

              {/* Character count bar for social posts */}
              {charLimit && (
                <div className={`px-4 py-1.5 border-b text-xs flex items-center justify-between ${overLimit ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                  <span>{activeDocument.type.replace(/_/g, ' ').toLowerCase()} character limit</span>
                  <span className="font-mono font-medium">{charCount} / {charLimit}</span>
                </div>
              )}

              {/* Editor */}
              <textarea
                value={editContent}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                className="flex-1 p-4 text-sm font-mono resize-none focus:outline-none"
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Select a document from the sidebar
            </div>
          )}
        </div>

        {/* Right sidebar: timeline (desktop) */}
        <div className="w-72 shrink-0 border rounded-2xl shadow-sm bg-white overflow-y-auto hidden lg:block">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Timeline</h3>
          </div>
          <div className="p-3 space-y-3">
            {timelineItems}
          </div>
        </div>
      </div>

      {/* Timeline slide-over (mobile/tablet) */}
      {showTimeline && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setShowTimeline(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-80 z-40 bg-white border-l shadow-xl overflow-y-auto lg:hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-sm font-semibold text-gray-700">Timeline</h3>
              <button onClick={() => setShowTimeline(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              {timelineItems}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    INCIDENT_CREATED: 'Incident created',
    PARTICIPANT_JOINED: 'Participant joined',
    ASSESSMENT_CONFIRMED: 'Assessment confirmed',
    DOCUMENTS_GENERATED: 'Documents generated',
    DOCUMENT_EDITED: 'Document edited',
    DOCUMENT_FINALIZED: 'Document finalized',
    AI_REVISION: 'AI revision applied',
    STATUS_CHANGED: 'Status changed',
    INCIDENT_CLOSED: 'Incident closed',
  }
  return map[action] ?? action
}
