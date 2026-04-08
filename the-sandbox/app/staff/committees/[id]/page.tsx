'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, MapPin, Clock, Calendar, Save, X } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import ExportButton from '../../../components/ExportButton'
import CommitteeDetailLayout, { type CommitteeTab } from '../../../components/staff/committees/CommitteeDetailLayout'
import MeetingsList, { type MeetingSummary } from '../../../components/staff/committees/MeetingsList'
import MinutesCard, { type MinutesData } from '../../../components/staff/committees/MinutesCard'
import CommitteeActionItemsList, { type CommitteeActionItem } from '../../../components/staff/committees/CommitteeActionItemsList'
import DecisionLog, { type Decision } from '../../../components/staff/committees/DecisionLog'
import MinutesGeneratorPanel, { type GeneratedMeeting } from '../../../components/staff/committees/MinutesGeneratorPanel'
import type { AttendanceMember } from '../../../components/staff/committees/AttendanceEditor'
import NextMeetingHero from '../../../components/staff/committees/NextMeetingHero'
import AgendaEditor, { type AgendaItem } from '../../../components/staff/committees/AgendaEditor'
import LiveNotesEditor from '../../../components/staff/committees/LiveNotesEditor'
import ActionItemConfirmation, { type ExtractedActionItem } from '../../../components/staff/committees/ActionItemConfirmation'
import DistributionPreview from '../../../components/staff/committees/DistributionPreview'

/* ── Types ──────────────────────────────────────────────────────── */

interface CommitteeDetail {
  id: string
  name: string
  description: string | null
  type: string
  cadence: string | null
  meetingDay: string | null
  meetingTime: string | null
  meetingLocation: string | null
  members: { name: string; role: string; userId?: string }[]
}

/* ── Inner component that uses useSearchParams ──────────────────── */

function CommitteeDetailInner() {
  const { currentUser } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const committeeId = params.id as string

  const initialTab = (searchParams.get('tab') as CommitteeTab) || 'meetings'
  const [activeTab, setActiveTab] = useState<CommitteeTab>(initialTab)

  const [committee, setCommittee] = useState<CommitteeDetail | null>(null)
  const [meetings, setMeetings] = useState<MeetingSummary[]>([])
  const [actionItems, setActionItems] = useState<CommitteeActionItem[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<MinutesData | null>(null)

  const [loadingCommittee, setLoadingCommittee] = useState(true)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [loadingActions, setLoadingActions] = useState(false)
  const [loadingDecisions, setLoadingDecisions] = useState(false)

  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [editingAgenda, setEditingAgenda] = useState(false)
  const [draftAgenda, setDraftAgenda] = useState<AgendaItem[]>([])
  const [savingAgenda, setSavingAgenda] = useState(false)

  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null)
  const [meetingDuration, setMeetingDuration] = useState('')
  const [prefillNotes, setPrefillNotes] = useState<string | undefined>(undefined)

  const distributing = false // distribution now handled inside DistributionPreview
  const [finalizing, setFinalizing] = useState(false)
  const [showDistributionPreview, setShowDistributionPreview] = useState(false)

  // Action item confirmation state
  const [showActionConfirmation, setShowActionConfirmation] = useState(false)
  const [pendingActionItems, setPendingActionItems] = useState<ExtractedActionItem[]>([])
  const [confirmationMeetingId, setConfirmationMeetingId] = useState<string | null>(null)

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }),
    [currentUser.email],
  )

  /* ── Fetch committee detail ──────────────────────────────────── */
  useEffect(() => {
    setLoadingCommittee(true)
    void fetch(`/api/staff/committees/${committeeId}`, { headers: { 'x-demo-user-email': currentUser.email } })
      .then((r) => r.json())
      .then((data: { committee: CommitteeDetail }) => setCommittee(data.committee))
      .catch(() => {})
      .finally(() => setLoadingCommittee(false))
  }, [committeeId, currentUser.email])

  /* ── Fetch agenda ──────────────────────────────────────────── */
  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/agenda`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { agenda: AgendaItem[] }
        setAgenda(data.agenda ?? [])
      }
    } catch { /* ignore */ }
  }, [committeeId, currentUser.email])

  useEffect(() => { void fetchAgenda() }, [fetchAgenda])

  const handleSaveAgenda = useCallback(async () => {
    setSavingAgenda(true)
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/agenda`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ agenda: draftAgenda }),
      })
      if (res.ok) {
        setAgenda(draftAgenda)
        setEditingAgenda(false)
      }
    } catch { /* ignore */ }
    setSavingAgenda(false)
  }, [committeeId, draftAgenda, headers])

  const handleEditAgenda = useCallback(() => {
    setDraftAgenda([...agenda])
    setEditingAgenda(true)
  }, [agenda])

  const handleCancelAgenda = useCallback(() => {
    setEditingAgenda(false)
    setDraftAgenda([])
  }, [])

  /* ── Meeting lifecycle ─────────────────────────────────────── */
  const handleStartMeeting = useCallback(async () => {
    if (activeMeetingId) {
      setActiveTab('live-meeting')
      return
    }
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/meetings/draft`, {
        method: 'POST',
        headers: headers(),
      })
      if (res.ok) {
        const data = await res.json() as { meeting: { id: string } }
        setActiveMeetingId(data.meeting.id)
        setMeetingStartTime(new Date())
        setActiveTab('live-meeting')
      }
    } catch { /* ignore */ }
  }, [activeMeetingId, committeeId, headers])

  const handleEndMeeting = useCallback((finalNotes: string) => {
    setPrefillNotes(finalNotes)
    setActiveMeetingId(null)
    setMeetingStartTime(null)
    setMeetingDuration('')
    setActiveTab('generate')
  }, [])

  // Update meeting duration display
  useEffect(() => {
    if (!meetingStartTime) return
    const timer = setInterval(() => {
      const diff = Date.now() - meetingStartTime.getTime()
      const totalMin = Math.floor(diff / 60000)
      const hours = Math.floor(totalMin / 60)
      const minutes = totalMin % 60
      setMeetingDuration(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`)
    }, 60000)
    setMeetingDuration('0m')
    return () => clearInterval(timer)
  }, [meetingStartTime])

  /* ── Fetch meetings ──────────────────────────────────────────── */
  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true)
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/meetings`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { meetings: MeetingSummary[] }
        setMeetings(data.meetings ?? [])
      }
    } catch { /* ignore */ }
    setLoadingMeetings(false)
  }, [committeeId, currentUser.email])

  /* ── Fetch action items ──────────────────────────────────────── */
  const fetchActions = useCallback(async () => {
    setLoadingActions(true)
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/actions`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { items: CommitteeActionItem[] }
        setActionItems(data.items ?? [])
      }
    } catch { /* ignore */ }
    setLoadingActions(false)
  }, [committeeId, currentUser.email])

  /* ── Build decisions from meetings ───────────────────────────── */
  const fetchDecisions = useCallback(async () => {
    setLoadingDecisions(true)
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/meetings`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as {
          meetings: (MeetingSummary & {
            decisions?: { decision: string; vote: string | null; context: string; movedBy: string | null; secondedBy: string | null }[]
          })[]
        }
        const allDec: Decision[] = []
        for (const m of data.meetings ?? []) {
          for (const [i, dec] of (m.decisions ?? []).entries()) {
            allDec.push({
              id: `${m.id}-dec-${i}`,
              decision: dec.decision,
              vote: dec.vote,
              context: dec.context,
              movedBy: dec.movedBy ?? null,
              secondedBy: dec.secondedBy ?? null,
              meetingId: m.id,
              meetingNumber: m.meetingNumber,
              meetingDate: m.date,
            })
          }
        }
        setDecisions(allDec)
      }
    } catch { /* ignore */ }
    setLoadingDecisions(false)
  }, [committeeId, currentUser.email])

  /* ── Eagerly fetch actions for hero card open count ──────────── */
  useEffect(() => { void fetchActions() }, [fetchActions])

  /* ── Tab-based fetching ──────────────────────────────────────── */
  useEffect(() => {
    if (activeTab === 'meetings') void fetchMeetings()
    else if (activeTab === 'actions') void fetchActions()
    else if (activeTab === 'decisions') void fetchDecisions()
  }, [activeTab, fetchMeetings, fetchActions, fetchDecisions])

  /* ── View a single meeting's minutes ─────────────────────────── */
  const viewMinutes = useCallback(async (meetingId: string) => {
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/meetings/${meetingId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { meeting: MinutesData }
        setSelectedMeeting({ ...data.meeting, committeeName: committee?.name ?? '' })
        setShowActionConfirmation(false)
      }
    } catch { /* ignore */ }
  }, [committeeId, currentUser.email, committee?.name])

  /* ── Action handlers ─────────────────────────────────────────── */
  const handleDistribute = useCallback(() => {
    setShowDistributionPreview(true)
  }, [])

  const handleDistributionSent = useCallback(() => {
    setShowDistributionPreview(false)
  }, [])

  const handleFinalize = useCallback(async (meetingId: string) => {
    setFinalizing(true)
    try {
      await fetch(`/api/staff/committees/${committeeId}/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status: 'finalized' }),
      })
      if (selectedMeeting) setSelectedMeeting({ ...selectedMeeting, status: 'finalized' })
    } catch { /* ignore */ }
    setFinalizing(false)
  }, [committeeId, headers, selectedMeeting])

  const handleCreateActionItems = useCallback((meetingId: string) => {
    // Open ActionItemConfirmation with the extracted items from the meeting
    const items = (selectedMeeting?.actionItems ?? []) as ExtractedActionItem[]
    setPendingActionItems(items)
    setConfirmationMeetingId(meetingId)
    setShowActionConfirmation(true)
  }, [selectedMeeting])

  const handleActionItemsConfirmed = useCallback(() => {
    setShowActionConfirmation(false)
    setPendingActionItems([])
    setConfirmationMeetingId(null)
    void fetchActions()
  }, [fetchActions])

  const handleDownload = useCallback((meetingId: string) => {
    if (!selectedMeeting?.formattedMinutes) return
    const blob = new Blob([selectedMeeting.formattedMinutes], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `minutes-${meetingId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedMeeting])

  const handleToggleComplete = useCallback(async (id: string, complete: boolean) => {
    try {
      await fetch(`/api/staff/committees/${committeeId}/actions/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status: complete ? 'complete' : 'open' }),
      })
      setActionItems((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: complete ? 'complete' : 'open' } : item),
      )
    } catch { /* ignore */ }
  }, [committeeId, headers])

  const handleUpdateNotes = useCallback(async (id: string, notes: string) => {
    try {
      await fetch(`/api/staff/committees/${committeeId}/actions/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ notes }),
      })
      setActionItems((prev) =>
        prev.map((item) => item.id === id ? { ...item, notes } : item),
      )
    } catch { /* ignore */ }
  }, [committeeId, headers])

  const handleAddToTasks = useCallback(async (item: CommitteeActionItem) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          title: item.action,
          priority: item.priority === 'critical' ? 'P0' : item.priority === 'high' ? 'P1' : 'P2',
          dueDate: item.dueDate ?? undefined,
          tags: ['committee'],
          source: 'committee',
          sourceId: item.id,
        }),
      })
    } catch { /* ignore */ }
  }, [headers])

  const handleGenerated = useCallback((meeting: GeneratedMeeting) => {
    void fetchMeetings()
    setActiveTab('meetings')
    void viewMinutes(meeting.id)
  }, [fetchMeetings, viewMinutes])

  const handleMinutesUpdated = useCallback((formattedMinutes: string) => {
    if (selectedMeeting) {
      setSelectedMeeting({ ...selectedMeeting, formattedMinutes })
    }
  }, [selectedMeeting])

  /* ── Members for attendance editor ───────────────────────────── */
  const defaultMembers: AttendanceMember[] = (committee?.members ?? []).map((m) => ({
    name: m.name,
    role: m.role,
    present: true,
  }))

  /* ── Render ──────────────────────────────────────────────────── */
  if (loadingCommittee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-64 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!committee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-600">Committee not found</p>
          <button onClick={() => router.push('/staff/committees')} className="mt-2 text-xs text-[#0033A0] font-medium hover:underline">
            Back to Committees
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Committee header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/staff/committees')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline mb-3"
          >
            <ArrowLeft className="size-3.5" />
            All Committees
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900">{committee.name}</h1>
          {committee.description && (
            <p className="text-sm text-gray-500 mt-1">{committee.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {committee.cadence && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Clock className="size-3" /> {committee.cadence}
              </span>
            )}
            {committee.meetingDay && committee.meetingTime && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="size-3" /> {committee.meetingDay} at {committee.meetingTime}
              </span>
            )}
            {committee.meetingLocation && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="size-3" /> {committee.meetingLocation}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Users className="size-3" /> {committee.members.length} members
            </span>
          </div>

          {/* Next Meeting Hero */}
          <div className="mt-5">
            <NextMeetingHero
              committee={committee}
              agenda={agenda}
              openActionItems={actionItems.filter(a => a.status === 'open' || a.status === 'in-progress').length}
              onStartMeeting={() => void handleStartMeeting()}
              onEditAgenda={handleEditAgenda}
              isInMeeting={!!activeMeetingId}
              meetingDuration={meetingDuration}
            />
          </div>

          {/* Inline Agenda Editor */}
          {editingAgenda && !activeMeetingId && (
            <div className="mt-4 border rounded-2xl shadow-sm bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-gray-900">Edit Agenda</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelAgenda}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg"
                  >
                    <X className="size-3.5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveAgenda()}
                    disabled={savingAgenda}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#0033A0] rounded-lg hover:bg-[#0033A0]/90 disabled:opacity-50"
                  >
                    <Save className="size-3.5" />
                    {savingAgenda ? 'Saving...' : 'Save Agenda'}
                  </button>
                </div>
              </div>
              <AgendaEditor items={draftAgenda} onChange={setDraftAgenda} disabled={savingAgenda} />
            </div>
          )}
        </div>
      </div>

      {/* Tab layout + content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CommitteeDetailLayout activeTab={activeTab} onTabChange={setActiveTab} isInMeeting={!!activeMeetingId}>
          {/* Meetings tab */}
          {activeTab === 'meetings' && (
            selectedMeeting ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setSelectedMeeting(null); setShowActionConfirmation(false) }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to meetings list
                  </button>
                  <ExportButton
                    href={`/api/export/committees/${committeeId}/minutes/${selectedMeeting.id}`}
                    label="Export minutes as markdown"
                  />
                </div>
                <MinutesCard
                  minutes={selectedMeeting}
                  committeeId={committeeId}
                  onDistribute={handleDistribute}
                  onFinalize={handleFinalize}
                  onCreateActionItems={handleCreateActionItems}
                  onDownload={handleDownload}
                  onMinutesUpdated={handleMinutesUpdated}
                  distributing={distributing}
                  finalizing={finalizing}
                />
                {/* Distribution Preview Panel */}
                {showDistributionPreview && (
                  <DistributionPreview
                    minutes={selectedMeeting}
                    committeeMembers={committee.members}
                    committeeId={committeeId}
                    onSent={handleDistributionSent}
                    onCancel={() => setShowDistributionPreview(false)}
                  />
                )}
                {/* Action Item Confirmation Panel */}
                {showActionConfirmation && confirmationMeetingId && (
                  <ActionItemConfirmation
                    items={pendingActionItems}
                    committeeMembers={committee.members}
                    meetingId={confirmationMeetingId}
                    committeeId={committeeId}
                    onConfirmed={handleActionItemsConfirmed}
                  />
                )}
              </div>
            ) : (
              <MeetingsList
                meetings={meetings}
                loading={loadingMeetings}
                onViewMinutes={(meetingId) => void viewMinutes(meetingId)}
              />
            )
          )}

          {/* Action Items tab */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <ExportButton
                  href={`/api/export/committees/${committeeId}/actions`}
                  label="Export action items to CSV"
                />
              </div>
              <CommitteeActionItemsList
                items={actionItems}
                loading={loadingActions}
                onToggleComplete={(id, complete) => void handleToggleComplete(id, complete)}
                onUpdateNotes={(id, notes) => void handleUpdateNotes(id, notes)}
                onAddToTasks={(item) => void handleAddToTasks(item)}
              />
            </div>
          )}

          {/* Decisions tab */}
          {activeTab === 'decisions' && (
            <DecisionLog
              decisions={decisions}
              loading={loadingDecisions}
              onMeetingClick={(meetingId) => {
                setActiveTab('meetings')
                void viewMinutes(meetingId)
              }}
            />
          )}

          {/* Live Meeting tab */}
          {activeTab === 'live-meeting' && activeMeetingId && (
            <LiveNotesEditor
              committeeId={committeeId}
              meetingId={activeMeetingId}
              agenda={agenda}
              onEnd={handleEndMeeting}
            />
          )}

          {/* Generate Minutes tab */}
          {activeTab === 'generate' && (
            <MinutesGeneratorPanel
              committeeId={committeeId}
              committeeName={committee.name}
              defaultMembers={defaultMembers}
              onGenerated={handleGenerated}
              prefillNotes={prefillNotes}
            />
          )}
        </CommitteeDetailLayout>
      </div>
    </div>
  )
}

/* ── Page wrapper with Suspense for useSearchParams ──────────────── */

export default function CommitteeDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-sm text-gray-400">Loading...</div>
      </div>
    }>
      <CommitteeDetailInner />
    </Suspense>
  )
}
