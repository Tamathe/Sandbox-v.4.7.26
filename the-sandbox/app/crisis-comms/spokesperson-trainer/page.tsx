'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mic, Loader2, Lightbulb, ChevronUp } from 'lucide-react'
import { useSpokespersonTrainer } from '../../hooks/useSpokespersonTrainer'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'
import InterviewScorecard from '../../components/crisis-comms/spokesperson-trainer/InterviewScorecard'
import CoachingNudge from '../../components/crisis-comms/spokesperson-trainer/CoachingNudge'

export default function SpokespersonTrainerPage() {
  const {
    preflight,
    isPreflightLoading,
    phase,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    scores,
    debriefText,
    drillHistory,
    showHistory,
    setShowHistory,
    currentNudge,
    pastNudges,
    annotations,
    isAnnotating,
    currentStep,
    sendMessage,
    selectChip,
    selectScenario,
    selectDifficulty,
    selectRole,
    setKeyMessages,
    beginInterview,
    startOver,
    dismissNudge,
    backToDebrief,
  } = useSpokespersonTrainer()

  const [mobileTab, setMobileTab] = useState<'scorecard' | 'sandy'>('sandy')
  const [showNudgeHistory, setShowNudgeHistory] = useState(false)

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 text-[#0033A0] animate-spin" />
      </div>
    )
  }

  const placeholders: Record<string, string> = {
    setup: 'Tell Sandy about your scenario...',
    interview: 'Respond to the reporter...',
    debrief: 'Ask about your performance...',
    'model-response': 'Ask about specific techniques...',
    replay: 'Ask about a specific answer...',
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
            <ArrowLeft className="size-4" /> Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-red-50">
              <Mic className="size-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">
                Crisis Spokesperson Trainer
              </h1>
              <p className="text-sm text-gray-500">
                Hot-seat media training with real-time coaching, key message tracking, and press conference mode
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
            onClick={() => setMobileTab('scorecard')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'scorecard'
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500'
            }`}
          >
            Scorecard
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('sandy')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'sandy'
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500'
            }`}
          >
            Interview
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left panel — Scorecard */}
          <div className={`lg:col-span-7 ${mobileTab === 'sandy' ? 'hidden lg:block' : ''}`}>
            <InterviewScorecard
              phase={phase}
              interviewState={interviewState}
              scores={scores}
              debriefText={debriefText}
              drillHistory={drillHistory}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              onSelectScenario={selectScenario}
              onSelectDifficulty={selectDifficulty}
              onSelectRole={selectRole}
              onBeginInterview={beginInterview}
              onKeyMessagesChange={setKeyMessages}
              totalDrillCount={preflight?.totalDrillCount ?? 0}
              annotations={annotations}
              isAnnotating={isAnnotating}
              onBackToDebrief={backToDebrief}
            />
          </div>

          {/* Right panel — Sandy interview + coaching nudge */}
          <div className={`lg:col-span-5 ${mobileTab === 'scorecard' ? 'hidden lg:block' : ''}`}>
            <div className="border rounded-2xl shadow-sm overflow-hidden h-[calc(100vh-220px)] sticky top-6 relative">
              {/* Coaching nudge — floats over the chat */}
              {phase === 'interview' && (
                <div className="absolute top-14 left-0 right-0 z-10 pointer-events-none">
                  <div className="pointer-events-auto">
                    <CoachingNudge nudge={currentNudge} onDismiss={dismissNudge} />
                  </div>
                </div>
              )}
              <div className="h-full">
                <SandyInterviewPanel
                  messages={messages}
                  chips={chips}
                  isSandyTyping={isSandyTyping}
                  stepCount={3}
                  currentStep={currentStep}
                  onSendMessage={sendMessage}
                  onChipSelect={selectChip}
                  onStartOver={startOver}
                  placeholder={placeholders[phase] ?? 'Type your response...'}
                />
              </div>
            </div>

            {/* Past coaching tips — collapsible */}
            {phase === 'interview' && pastNudges.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowNudgeHistory(!showNudgeHistory)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0033A0] transition-colors"
                >
                  <Lightbulb className="size-3" />
                  <span>{pastNudges.length} coaching tip{pastNudges.length > 1 ? 's' : ''}</span>
                  <ChevronUp className={`size-3 transition-transform ${showNudgeHistory ? '' : 'rotate-180'}`} />
                </button>
                {showNudgeHistory && (
                  <div className="mt-1.5 space-y-1">
                    {pastNudges.map((n, i) => (
                      <div key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
                        <span className="font-semibold text-gray-600 uppercase text-[10px] tracking-wide">{n.label}</span>
                        <span className="text-gray-500 ml-1.5">{n.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
