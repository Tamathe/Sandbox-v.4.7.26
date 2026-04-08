'use client'

import {
  ArrowLeft,
  RotateCcw,
  Phone,
  Mail,
  Reply,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from 'lucide-react'
import type { Business, ContactStatus, OutreachTab, EmailContent } from '../../lib/philanthropy/types'
import { CONTACT_STATUSES } from '../../lib/philanthropy/types'

interface OutreachPanelProps {
  selectedBusinesses: Business[]
  scripts: Record<string, string>
  emails: Record<string, EmailContent>
  followups: Record<string, EmailContent>
  contactStatus: Record<string, ContactStatus>
  activeTabs: Record<string, OutreachTab>
  openAccordion: number | null
  generatingContent: string | null
  onUpdateStatus: (bizName: string, status: ContactStatus) => void
  onSwitchTab: (bizName: string, tab: OutreachTab) => void
  onToggleAccordion: (idx: number) => void
  onGenerate: (biz: Business, type: OutreachTab) => void
  onBack: () => void
  onStartOver: () => void
}

const STATUS_ICONS: Record<string, string> = {
  '': '',
  called: '📞',
  emailed: '✉️',
  waiting: '⏳',
  donated: '🎉',
  declined: '✗',
}

export default function OutreachPanel({
  selectedBusinesses,
  scripts,
  emails,
  followups,
  contactStatus,
  activeTabs,
  openAccordion,
  generatingContent,
  onUpdateStatus,
  onSwitchTab,
  onToggleAccordion,
  onGenerate,
  onBack,
  onStartOver,
}: OutreachPanelProps) {
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function openInEmailApp(biz: Business, type: 'email' | 'followup') {
    const content = type === 'email' ? emails[biz.name] : followups[biz.name]
    if (!content) return
    const mailto = `mailto:${biz.email || ''}?subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(content.body.replace(/\\n/g, '\n'))}`
    window.open(mailto)
  }

  function getContentText(biz: Business, tab: OutreachTab): string {
    if (tab === 'phone') return scripts[biz.name] || ''
    if (tab === 'email') {
      const e = emails[biz.name]
      return e ? `Subject: ${e.subject}\n\n${e.body}` : ''
    }
    const f = followups[biz.name]
    return f ? `Subject: ${f.subject}\n\n${f.body}` : ''
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
          Step 3 of 3
        </p>
        <h2 className="text-2xl font-extrabold text-gray-900">Your Outreach Materials</h2>
        <p className="text-sm text-gray-500 mt-1">
          Track your status, copy scripts, and open emails directly in your email client.
        </p>
      </div>

      {/* Accordion list */}
      <div className="space-y-2">
        {selectedBusinesses.map((biz, idx) => {
          const isOpen = openAccordion === idx
          const tab = activeTabs[biz.name] || 'phone'
          const status = contactStatus[biz.name] || ''
          const loadingThis = generatingContent === biz.name

          return (
            <div
              key={biz.name}
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Accordion header */}
              <button
                type="button"
                onClick={() => onToggleAccordion(idx)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center justify-center size-6 rounded-full bg-[#0033A0] text-white text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-gray-900">{biz.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{biz.type}</span>
                </div>
                {/* Status select */}
                <select
                  className={`rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium ${
                    status === 'donated'
                      ? 'bg-green-50 text-green-700'
                      : status === 'declined'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-50 text-gray-600'
                  }`}
                  value={status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onUpdateStatus(biz.name, e.target.value as ContactStatus)
                  }
                >
                  {CONTACT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {STATUS_ICONS[s.value]} {s.label}
                    </option>
                  ))}
                </select>
                {isOpen ? (
                  <ChevronUp className="size-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400 shrink-0" />
                )}
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-4">
                  {/* Tabs */}
                  <div className="flex gap-1 mb-4">
                    {[
                      { key: 'phone' as const, label: 'Phone Script', Icon: Phone },
                      { key: 'email' as const, label: 'Email', Icon: Mail },
                      { key: 'followup' as const, label: 'Follow-Up', Icon: Reply },
                    ].map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onSwitchTab(biz.name, key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          tab === key
                            ? 'bg-[#0033A0] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  {renderTabContent(biz, tab, loadingThis)}

                  {/* Actions */}
                  {getContentText(biz, tab) && (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(getContentText(biz, tab))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Copy className="size-3.5" /> Copy
                      </button>
                      {(tab === 'email' || tab === 'followup') && (
                        <button
                          type="button"
                          onClick={() => openInEmailApp(biz, tab)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <ExternalLink className="size-3.5" /> Open in Email App
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onGenerate(biz, tab)}
                        disabled={loadingThis}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <RefreshCw className="size-3.5" /> Regenerate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="size-4" /> Change Selection
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="size-4" /> Start Over
        </button>
      </div>
    </div>
  )

  function renderTabContent(biz: Business, tab: OutreachTab, loading: boolean) {
    const hasContent =
      (tab === 'phone' && scripts[biz.name]) ||
      (tab === 'email' && emails[biz.name]) ||
      (tab === 'followup' && followups[biz.name])

    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
          <Loader2 className="size-4 animate-spin" />
          Generating…
        </div>
      )
    }

    if (!hasContent) {
      const labels: Record<OutreachTab, string> = {
        phone: 'Phone Script',
        email: 'Email',
        followup: 'Follow-Up Email',
      }
      return (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">
            Generate a personalized <span className="font-semibold">{labels[tab]}</span> for{' '}
            <span className="font-semibold">{biz.name}</span>.
          </p>
          <button
            type="button"
            onClick={() => onGenerate(biz, tab)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002878] transition-colors"
          >
            <Sparkles className="size-4" /> Generate {labels[tab]}
          </button>
        </div>
      )
    }

    // Render content
    if (tab === 'phone') {
      return (
        <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">
          {scripts[biz.name]}
        </div>
      )
    }

    const content = tab === 'email' ? emails[biz.name] : followups[biz.name]
    if (!content) return null

    return (
      <div className="space-y-2">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-gray-500">Subject:</span>
          <span className="text-gray-900 font-medium">{content.subject}</span>
        </div>
        <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">
          {content.body}
        </div>
      </div>
    )
  }
}
