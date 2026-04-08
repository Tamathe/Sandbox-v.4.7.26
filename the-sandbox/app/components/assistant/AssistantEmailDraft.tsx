'use client'

import React, { useState, useCallback } from 'react'
import { FileText, Check, X, Lightbulb, BookmarkPlus } from 'lucide-react'
import type { DraftPattern } from '../../lib/assistant/email-rule-learner'

interface Props {
  draftId: string
  preview: string
  subject?: string
  fromName?: string
  userEmail?: string
  onApprove: () => void
  onDiscard: () => void
}

export default function AssistantEmailDraft({ preview, subject, fromName, userEmail, onApprove, onDiscard }: Props) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'discarded'>('pending')
  const [suggestedPattern, setSuggestedPattern] = useState<DraftPattern | null>(null)
  const [ruleBannerState, setRuleBannerState] = useState<'hidden' | 'showing' | 'saving' | 'saved' | 'dismissed'>('hidden')

  const checkForPatterns = useCallback(async () => {
    if (!userEmail) return
    try {
      const res = await fetch('/api/assistant/email/suggest-rules', {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) return
      const data = await res.json() as { patterns: DraftPattern[] }
      if (data.patterns.length > 0) {
        setSuggestedPattern(data.patterns[0])
        setRuleBannerState('showing')
      }
    } catch {
      // Silent fail — rule suggestion is non-critical
    }
  }, [userEmail])

  const handleApprove = () => {
    setStatus('approved')
    onApprove()
    // Check for learned patterns after a short delay (let the approval persist first)
    setTimeout(checkForPatterns, 1500)
  }

  const handleDiscard = () => {
    setStatus('discarded')
    onDiscard()
  }

  const handleSaveRule = async () => {
    if (!suggestedPattern || !userEmail) return
    setRuleBannerState('saving')
    try {
      const res = await fetch('/api/assistant/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ pattern: suggestedPattern }),
      })
      if (res.ok) {
        setRuleBannerState('saved')
      }
    } catch {
      setRuleBannerState('showing') // Reset on failure
    }
  }

  const handleDismissRule = () => {
    setRuleBannerState('dismissed')
  }

  return (
    <div className={`rounded-xl border-2 p-3 my-2 ${
      status === 'approved' ? 'border-green-300 bg-green-50' :
      status === 'discarded' ? 'border-gray-200 bg-gray-50 opacity-60' :
      'border-amber-300 bg-amber-50'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <FileText className="size-4 text-amber-600" />
        <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Draft Reply</span>
        {status !== 'pending' && (
          <span className={`text-xs font-semibold ml-auto ${status === 'approved' ? 'text-green-600' : 'text-gray-400'}`}>
            {status === 'approved' ? '✓ Approved' : 'Discarded'}
          </span>
        )}
      </div>

      {(subject || fromName) && (
        <p className="text-xs text-gray-500 mb-1">
          Re: {subject ?? 'No subject'} {fromName ? `(from ${fromName})` : ''}
        </p>
      )}

      <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
        {preview}
      </div>

      {status === 'pending' && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleApprove}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
          >
            <Check className="size-3" /> Approve
          </button>
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="size-3" /> Discard
          </button>
        </div>
      )}

      {/* Rule suggestion banner — appears after approval when patterns detected */}
      {ruleBannerState === 'showing' && suggestedPattern && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="size-4 text-[#0033A0] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0033A0]">Sandy noticed a pattern</p>
              <p className="text-xs text-gray-700 mt-1">{suggestedPattern.proposedRule}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Based on {suggestedPattern.sampleCount} drafts ({Math.round(suggestedPattern.approvalRate * 100)}% approval rate)
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveRule}
                  className="flex items-center gap-1 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#002880] transition-colors"
                >
                  <BookmarkPlus className="size-3" /> Save as Rule
                </button>
                <button
                  onClick={handleDismissRule}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ruleBannerState === 'saving' && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-2">
          <p className="text-xs text-[#0033A0] text-center">Saving rule...</p>
        </div>
      )}

      {ruleBannerState === 'saved' && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2">
          <p className="text-xs text-green-700 text-center font-semibold">
            Rule saved — Sandy will use this for future drafts
          </p>
        </div>
      )}
    </div>
  )
}
