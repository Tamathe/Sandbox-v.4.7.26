'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, Loader2, AlertCircle, X } from 'lucide-react'
import { usePhilanthropyAssistant } from '../hooks/usePhilanthropyAssistant'
import SandyInterviewPanel from '../components/SandyInterviewPanel'
import CampaignForm from '../components/philanthropy/CampaignForm'
import BusinessResults from '../components/philanthropy/BusinessResults'
import OutreachPanel from '../components/philanthropy/OutreachPanel'
import LoadingScreen from '../components/philanthropy/LoadingScreen'

const STEP_MAP: Record<string, number> = { form: 1, generating: 1, results: 2, outreach: 3 }

export default function PhilanthropyAssistantPage() {
  const {
    isPreflightLoading,
    phase,
    form,
    updateForm,
    submitForm,
    businesses,
    selectedBusinesses,
    toggleBusiness,
    scripts,
    emails,
    followups,
    contactStatus,
    activeTabs,
    openAccordion,
    updateContactStatus,
    switchTab,
    toggleAccordion,
    generateOutreachContent,
    generatingContent,
    isGenerating,
    loadingMessage,
    error,
    setError,
    goToForm,
    goToResults,
    goToOutreach,
    startOver,
    sandyMessages,
    sandyChips,
    isSandyTyping,
    sendSandyMessage,
    selectSandyChip,
    resetSandy,
  } = usePhilanthropyAssistant()

  const [mobileTab, setMobileTab] = useState<'wizard' | 'sandy'>('wizard')

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 text-[#0033A0] animate-spin" />
      </div>
    )
  }

  const placeholders: Record<string, string> = {
    form: 'Tell Sandy about your campaign...',
    generating: 'Sandy is here while we search...',
    results: 'Ask Sandy about these businesses...',
    outreach: 'Ask Sandy for outreach tips...',
  }

  function handleStartOver() {
    startOver()
    resetSandy()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"
          >
            <ArrowLeft className="size-4" /> Explore
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-rose-50">
              <Heart className="size-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">
                AXO Philanthropy Assistant
              </h1>
              <p className="text-sm text-gray-500">
                Find local donors and generate personalized outreach materials
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile tab toggle */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white">
        {(['wizard', 'sandy'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mobileTab === tab
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500'
            }`}
          >
            {tab === 'wizard' ? 'Campaign' : 'Sandy'}
          </button>
        ))}
      </div>

      {/* Main content — split panel */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left panel: Wizard (7 cols) */}
          <div className={`lg:col-span-7 ${mobileTab !== 'wizard' ? 'hidden lg:block' : ''}`}>
            {/* Phase: Form */}
            {phase === 'form' && (
              <CampaignForm
                form={form}
                onChange={updateForm}
                onSubmit={submitForm}
                isDisabled={isGenerating}
              />
            )}

            {/* Phase: Generating */}
            {phase === 'generating' && <LoadingScreen message={loadingMessage} />}

            {/* Phase: Results */}
            {phase === 'results' && (
              <BusinessResults
                businesses={businesses}
                selectedBusinesses={selectedBusinesses}
                city={form.city}
                organization={form.organization}
                onToggleBusiness={toggleBusiness}
                onBack={goToForm}
                onNext={goToOutreach}
              />
            )}

            {/* Phase: Outreach */}
            {phase === 'outreach' && (
              <OutreachPanel
                selectedBusinesses={selectedBusinesses}
                scripts={scripts}
                emails={emails}
                followups={followups}
                contactStatus={contactStatus}
                activeTabs={activeTabs}
                openAccordion={openAccordion}
                generatingContent={generatingContent}
                onUpdateStatus={updateContactStatus}
                onSwitchTab={switchTab}
                onToggleAccordion={toggleAccordion}
                onGenerate={generateOutreachContent}
                onBack={goToResults}
                onStartOver={handleStartOver}
              />
            )}
          </div>

          {/* Right panel: Sandy (5 cols) */}
          <div
            className={`lg:col-span-5 ${mobileTab !== 'sandy' ? 'hidden lg:block' : ''}`}
          >
            <div className="sticky top-4 h-[calc(100vh-12rem)]">
              <SandyInterviewPanel
                messages={sandyMessages}
                chips={sandyChips}
                isSandyTyping={isSandyTyping}
                stepCount={3}
                currentStep={STEP_MAP[phase] || 1}
                onSendMessage={sendSandyMessage}
                onChipSelect={selectSandyChip}
                placeholder={placeholders[phase] || 'Talk to Sandy...'}
                onStartOver={handleStartOver}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
