'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send as SendIcon, Loader2, Sparkles, Info } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import CommunicationsLayout, { type CommTab } from '../../components/staff/communications/CommunicationsLayout'
import TemplateGallery from '../../components/staff/communications/TemplateGallery'
import DraftList, { type DraftItem } from '../../components/staff/communications/DraftList'
import CommunicationDraftCard, { type CommunicationDraft } from '../../components/staff/communications/CommunicationDraftCard'
import type { CommTemplate } from '../../components/staff/communications/TemplateCard'

export default function CommunicationsPage() {
  const router = useRouter()
  const { currentUser } = useAuth()

  if (currentUser.role !== 'STAFF' && currentUser.role !== 'ADMIN') {
    router.replace('/')
    return null
  }

  const [activeTab, setActiveTab] = useState<CommTab>('draft')

  /* ── Draft with Sandy tab state ──────────────────────────────────── */
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [activeDraft, setActiveDraft] = useState<CommunicationDraft | null>(null)

  /* ── Drafts / Sent lists ─────────────────────────────────────────── */
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [sentItems, setSentItems] = useState<DraftItem[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [sentLoading, setSentLoading] = useState(false)

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }),
    [currentUser.email],
  )

  /* ── Fetch drafts ────────────────────────────────────────────────── */
  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true)
    try {
      const res = await fetch('/api/staff/communications?status=draft,pending-review', {
        headers: headers(),
      })
      if (res.ok) {
        const data = await res.json() as { drafts: DraftItem[] }
        setDrafts(data.drafts ?? [])
      }
    } catch { /* */ }
    setDraftsLoading(false)
  }, [headers])

  const fetchSent = useCallback(async () => {
    setSentLoading(true)
    try {
      const res = await fetch('/api/staff/communications?status=sent', {
        headers: headers(),
      })
      if (res.ok) {
        const data = await res.json() as { drafts: DraftItem[] }
        setSentItems(data.drafts ?? [])
      }
    } catch { /* */ }
    setSentLoading(false)
  }, [headers])

  /* Load lists when switching to those tabs */
  useEffect(() => {
    if (activeTab === 'my-drafts') void fetchDrafts()
    if (activeTab === 'sent') void fetchSent()
  }, [activeTab, fetchDrafts, fetchSent])

  /* ── Create draft from prompt ────────────────────────────────────── */
  const handleCreateDraft = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    try {
      const res = await fetch('/api/staff/communications', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      if (res.ok) {
        const data = await res.json() as { communication: CommunicationDraft }
        setActiveDraft(data.communication)
        setPrompt('')
      }
    } catch { /* */ }
    setGenerating(false)
  }

  /* ── Create draft from template ──────────────────────────────────── */
  const handleUseTemplate = async (template: CommTemplate) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/staff/communications', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ templateId: template.id }),
      })
      if (res.ok) {
        const data = await res.json() as { communication: CommunicationDraft }
        setActiveDraft(data.communication)
      }
    } catch { /* */ }
    setGenerating(false)
  }

  /* ── View a draft from the list ──────────────────────────────────── */
  const handleViewDraft = async (id: string) => {
    try {
      const [commRes, stepsRes] = await Promise.all([
        fetch(`/api/staff/communications/${id}`, { headers: headers() }),
        fetch(`/api/staff/communications/${id}/approval-status`, { headers: headers() }),
      ])
      if (commRes.ok) {
        const data = await commRes.json() as { communication: CommunicationDraft }
        let approvalSteps: CommunicationDraft['approvalSteps'] = null
        if (stepsRes.ok) {
          const stepsData = await stepsRes.json() as { steps: CommunicationDraft['approvalSteps'] }
          approvalSteps = stepsData.steps
        }
        setActiveDraft({ ...data.communication, approvalSteps })
        setActiveTab('draft')
      }
    } catch { /* */ }
  }

  /* ── Delete a draft ──────────────────────────────────────────────── */
  const handleDeleteDraft = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/communications/${id}`, {
        method: 'DELETE',
        headers: headers(),
      })
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== id))
        if (activeDraft?.id === id) setActiveDraft(null)
      }
    } catch { /* */ }
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Communications"
        subtitle="Draft, review, and send university communications with Sandy"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simulated data banner */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <Info className="size-4 shrink-0" />
          <span><strong>Simulated data</strong> — Templates and drafts shown are demo content. AI-generated text uses the institutional voice engine.</span>
        </div>

        <CommunicationsLayout activeTab={activeTab} onTabChange={setActiveTab}>

          {/* ── Tab: Draft with Sandy ────────────────────────────────── */}
          {activeTab === 'draft' && (
            <div className="space-y-8">
              {/* Active draft card */}
              {activeDraft && (
                <CommunicationDraftCard
                  draft={activeDraft}
                  onUpdated={setActiveDraft}
                />
              )}

              {/* Prompt input */}
              {!activeDraft && (
                <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="size-5 text-[#0033A0]" />
                    <h2 className="text-lg font-extrabold text-gray-900">Draft with Sandy</h2>
                  </div>

                  <p className="text-sm text-gray-500 mb-4">
                    Describe what you want to communicate. Sandy will generate a polished draft in UK institutional voice.
                  </p>

                  <div className="flex gap-3">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleCreateDraft()
                      }}
                      placeholder="Draft a campus-wide notice about the Canvas maintenance window Saturday 2-6am..."
                      rows={3}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 resize-none placeholder:text-gray-400"
                    />
                    <button
                      onClick={() => void handleCreateDraft()}
                      disabled={!prompt.trim() || generating}
                      className="self-end flex items-center gap-1.5 text-sm font-semibold text-white bg-[#0033A0] hover:bg-[#0033A0]/90 disabled:opacity-50 rounded-xl px-5 py-3 transition-colors shrink-0"
                    >
                      {generating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <SendIcon className="size-4" />
                      )}
                      Generate
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2">
                    Press Ctrl+Enter to generate. Sandy will detect the communication type and audience automatically.
                  </p>
                </div>
              )}

              {/* New draft button when viewing a draft */}
              {activeDraft && (
                <button
                  onClick={() => setActiveDraft(null)}
                  className="text-sm font-semibold text-[#0033A0] hover:underline"
                >
                  + Start a new draft
                </button>
              )}

              {/* Template gallery */}
              {!activeDraft && <TemplateGallery onUseTemplate={(t) => void handleUseTemplate(t)} />}
            </div>
          )}

          {/* ── Tab: My Drafts ──────────────────────────────────────── */}
          {activeTab === 'my-drafts' && (
            <DraftList
              drafts={drafts}
              loading={draftsLoading}
              onView={(id) => void handleViewDraft(id)}
              onDelete={(id) => void handleDeleteDraft(id)}
              emptyLabel="No drafts or pending reviews."
            />
          )}

          {/* ── Tab: Sent ───────────────────────────────────────────── */}
          {activeTab === 'sent' && (
            <DraftList
              drafts={sentItems}
              loading={sentLoading}
              onView={(id) => void handleViewDraft(id)}
              onDelete={() => {}}
              emptyLabel="No sent communications yet."
            />
          )}

        </CommunicationsLayout>
      </div>
    </div>
  )
}
