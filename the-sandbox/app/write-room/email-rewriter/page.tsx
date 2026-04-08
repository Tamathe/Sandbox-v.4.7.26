'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { useEmailRewriter } from '../../hooks/useEmailRewriter'
import PasteZone from '../../components/write-room/PasteZone'
import VariantCarousel from '../../components/write-room/VariantCarousel'
import BeforeAfterView from '../../components/write-room/BeforeAfterView'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

export default function EmailRewriterPage() {
  const {
    isPreflightLoading,
    phase,
    originalEmail,
    setOriginalEmail,
    intent,
    variants,
    activeVariantId,
    setActiveVariantId,
    selectedRewrite,
    isRefining,
    messages,
    chips,
    isSandyTyping,
    submitEmail,
    selectVariant,
    sendMessage,
    selectChip,
    startOver,
  } = useEmailRewriter()

  // Mobile tab toggle
  const [mobileTab, setMobileTab] = useState<'email' | 'sandy'>('email')

  // Loading state
  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-[#0033A0] animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  const showSandy = phase !== 'paste'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/write-room"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Write Room
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
              <RefreshCw className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Email Rewriter</h1>
              <p className="text-sm text-gray-500">
                Paste any email and get 3 polished versions instantly
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tab toggle (only when Sandy is visible) */}
      {showSandy && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="flex max-w-6xl mx-auto">
            <button
              type="button"
              onClick={() => setMobileTab('email')}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
                mobileTab === 'email'
                  ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('sandy')}
              className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
                mobileTab === 'sandy'
                  ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sandy
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Paste phase — full width, centered */}
        {phase === 'paste' && (
          <div className="bg-white border-2 border-gray-200 rounded-2xl" style={{ minHeight: 'calc(100vh - 220px)' }}>
            <PasteZone
              value={originalEmail}
              onChange={setOriginalEmail}
              onSubmit={submitEmail}
            />
          </div>
        )}

        {/* Analyzing phase — loading spinner */}
        {phase === 'analyzing' && (
          <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center" style={{ minHeight: 'calc(100vh - 220px)' }}>
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 text-[#0033A0] animate-spin" />
              <p className="text-sm text-gray-500">Analyzing your email and generating 3 versions...</p>
            </div>
          </div>
        )}

        {/* Variants + Selected phases — split layout */}
        {(phase === 'variants' || phase === 'selected' || phase === 'refining') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>
            {/* Left panel — email content */}
            <div
              className={`lg:col-span-7 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${
                mobileTab !== 'email' ? 'hidden lg:flex' : ''
              }`}
            >
              {phase === 'variants' ? (
                <>
                  {/* Original email (collapsed top) */}
                  <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Original</span>
                      <span className="text-xs text-gray-400">{originalEmail.split(/\s+/).length} words</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                      {originalEmail}
                    </div>
                  </div>

                  {/* Variant carousel */}
                  <div className="flex-1">
                    <VariantCarousel
                      variants={variants}
                      activeId={activeVariantId}
                      onTabChange={setActiveVariantId}
                      onSelect={selectVariant}
                    />
                  </div>
                </>
              ) : (
                <BeforeAfterView
                  originalEmail={originalEmail}
                  rewrittenEmail={selectedRewrite ?? ''}
                  isRefining={isRefining}
                  subjectLine={intent?.subjectLine ?? null}
                  onStartOver={startOver}
                />
              )}
            </div>

            {/* Right panel — Sandy */}
            <div
              className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${
                mobileTab !== 'sandy' ? 'hidden lg:flex' : ''
              }`}
              style={{ minHeight: 400 }}
            >
              <SandyInterviewPanel
                messages={messages}
                chips={chips}
                isSandyTyping={isSandyTyping}
                stepCount={2}
                currentStep={phase === 'selected' || phase === 'refining' ? 1 : 0}
                onSendMessage={sendMessage}
                onChipSelect={selectChip}
                onStartOver={startOver}
                placeholder={
                  phase === 'selected' || phase === 'refining'
                    ? 'Tell Sandy what to change...'
                    : 'Pick a version or ask Sandy...'
                }
                disabled={isSandyTyping}
              />
            </div>
          </div>
        )}
      </div>

      {/* Privacy */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">
          Email Rewriter provides AI-generated content — always review before sending.
        </p>
      </div>
    </div>
  )
}
