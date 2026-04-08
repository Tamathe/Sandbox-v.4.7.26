'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Loader2 } from 'lucide-react'
import { useCoverLetterInterview } from '../../hooks/useCoverLetterInterview'
import LetterPreview from '../../components/write-room/LetterPreview'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

export default function CoverLetterPage() {
  const {
    preflight,
    isPreflightLoading,
    rawLetter,
    sections,
    isGenerating,
    activeSection,
    isRefinementMode,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    sendMessage,
    selectChip,
    clickSection,
    startOver,
  } = useCoverLetterInterview()

  // Mobile tab toggle
  const [mobileTab, setMobileTab] = useState<'letter' | 'sandy'>('sandy')

  // Loading state
  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-[#0033A0] animate-spin" />
          <p className="text-sm text-gray-500">Loading your profile...</p>
        </div>
      </div>
    )
  }

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
              <Mail className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Cover Letter Generator</h1>
              <p className="text-sm text-gray-500">
                Sandy guides you through a personalized cover letter
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => setMobileTab('letter')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'letter'
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Letter
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

      {/* Main content — split panel */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full" style={{ minHeight: 'calc(100vh - 180px)' }}>
          {/* Left panel — Letter preview */}
          <div
            className={`lg:col-span-7 bg-white border-2 border-gray-200 rounded-2xl p-6 overflow-y-auto ${
              mobileTab !== 'letter' ? 'hidden lg:block' : ''
            }`}
          >
            <LetterPreview
              sections={sections}
              isGenerating={isGenerating}
              activeSection={activeSection}
              isRefinementMode={isRefinementMode}
              rawLetter={rawLetter}
              onSectionClick={clickSection}
            />
          </div>

          {/* Right panel — Sandy interview */}
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
              stepCount={4}
              currentStep={currentStep}
              onSendMessage={sendMessage}
              onChipSelect={selectChip}
              onStartOver={startOver}
              placeholder={
                isRefinementMode
                  ? 'Ask Sandy to refine your letter...'
                  : 'Tell Sandy about the role...'
              }
              disabled={isSandyTyping}
            />
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">
          Cover Letter Generator provides AI-generated content — always review and personalize before using.
        </p>
      </div>
    </div>
  )
}
