'use client'

import { useState } from 'react'
import { FlaskConical, PanelLeft, MessageCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SandyInterviewPanel from '../components/SandyInterviewPanel'
import TrialResultsPanel from '../components/clinical-trial-matcher/TrialResultsPanel'
import { useClinicalTrialMatcher } from '../hooks/useClinicalTrialMatcher'

export default function ClinicalTrialMatcherPage() {
  const {
    isPreflightLoading,
    messages,
    chips,
    isSandyTyping,
    sendMessage,
    selectChip,
    startOver,
    matches,
    interviewState,
    isSearching,
    isMatching,
    stepCount,
    currentStep,
  } = useClinicalTrialMatcher()

  // Mobile tab toggle
  const [mobileTab, setMobileTab] = useState<'results' | 'sandy'>('sandy')

  if (isPreflightLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-[#0033A0] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleSelectTrial = (nctId: string) => {
    sendMessage(`Tell me more about ${nctId}`)
    setMobileTab('sandy')
  }

  return (
    <div>
      <PageHeader
        title="Clinical Trial Matcher"
        subtitle="AI-powered clinical trial search and eligibility matching"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Mobile toggle */}
        <div className="flex gap-2 mb-4 lg:hidden">
          <button
            onClick={() => setMobileTab('results')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mobileTab === 'results' ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <PanelLeft className="size-4" /> Results
          </button>
          <button
            onClick={() => setMobileTab('sandy')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mobileTab === 'sandy' ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <MessageCircle className="size-4" /> Sandy
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left — Results */}
          <div className={`lg:col-span-7 ${mobileTab !== 'results' ? 'hidden lg:block' : ''}`}>
            <div className="border rounded-2xl shadow-sm bg-white p-5 min-h-[500px]">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="size-5 text-[#0033A0]" />
                <h2 className="text-lg font-extrabold text-gray-900">Trial Results</h2>
                {matches.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-auto">
                    Powered by ClinicalTrials.gov
                  </span>
                )}
              </div>
              <TrialResultsPanel
                matches={matches}
                patient={interviewState.patient}
                isSearching={isSearching}
                isMatching={isMatching}
                onSelectTrial={handleSelectTrial}
              />
            </div>
          </div>

          {/* Right — Sandy */}
          <div className={`lg:col-span-5 ${mobileTab !== 'sandy' ? 'hidden lg:block' : ''}`}>
            <div className="border rounded-2xl shadow-sm bg-white min-h-[500px]">
              <SandyInterviewPanel
                messages={messages}
                chips={chips}
                isSandyTyping={isSandyTyping}
                stepCount={stepCount}
                currentStep={currentStep}
                onSendMessage={sendMessage}
                onChipSelect={selectChip}
                onStartOver={startOver}
                placeholder="Describe the patient case..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
