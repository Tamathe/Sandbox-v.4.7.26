'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, Loader2, FileText, List, Clock, Radio } from 'lucide-react'
import { useReputationPulse } from '../../hooks/useReputationPulse'
import { SCENARIO_LIST, type ScenarioId } from '../../lib/crisis-comms/reputation-pulse/synthetic-data/scenarios'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'
import PipelineFunnel from '../../components/crisis-comms/reputation-pulse/PipelineFunnel'
import CrisisBriefPanel from '../../components/crisis-comms/reputation-pulse/CrisisBriefPanel'
import PostFeed from '../../components/crisis-comms/reputation-pulse/PostFeed'
import SpreadTimeline from '../../components/crisis-comms/reputation-pulse/SpreadTimeline'

type OutputTab = 'brief' | 'posts' | 'timeline'

const THREAT_PILL: Record<string, string> = {
  MODERATE: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export default function ReputationPulsePage() {
  const {
    isPreflightLoading, phase, brief, posts, aiDetection, sentimentResults,
    isAnalyzing,
    messages, chips, isSandyTyping, currentStep,
    sendMessage, selectChip, startOver,
    scenarioId, switchScenario,
    sproutConfigured, sproutTopics, isLiveLoading, loadLiveSprout,
  } = useReputationPulse()

  const [mobileTab, setMobileTab] = useState<'analysis' | 'sandy'>('analysis')
  const [outputTab, setOutputTab] = useState<OutputTab>('brief')
  const showResults = brief !== null || (scenarioId === 'live-sprout' && posts.length > 0)

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 text-[#0033A0] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/hub" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors">
            <ArrowLeft className="size-4" /> Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
              <ShieldAlert className="size-5 text-[#0033A0]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-gray-900">Reputation Pulse</h1>
              <p className="text-sm text-gray-500">Social media analysis — sentiment, themes, and AI-authorship detection</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario picker + data source */}
      <div className={`border-b ${scenarioId === 'live-sprout' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
          <p className={`text-xs flex-1 ${scenarioId === 'live-sprout' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {scenarioId === 'live-sprout' ? 'Analyzing live Sprout Social data.' : 'Analyzing synthetic demo data. Choose a scenario:'}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SCENARIO_LIST.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => switchScenario(s.id as ScenarioId)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  scenarioId === s.id
                    ? 'bg-[#0033A0] text-white border-[#0033A0]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0]'
                }`}
                title={s.description}
              >
                {s.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  scenarioId === s.id ? 'bg-white/20 text-white' : THREAT_PILL[s.threatLevel] ?? 'bg-gray-100 text-gray-600'
                }`}>
                  {s.threatLevel}
                </span>
              </button>
            ))}
            {sproutConfigured && sproutTopics.length > 0 && (
              <>
                <span className="text-xs text-gray-400 mx-1">|</span>
                {sproutTopics.map((topic) => (
                  <button
                    key={topic.topic_id}
                    type="button"
                    disabled={isLiveLoading}
                    onClick={() => loadLiveSprout(topic.topic_id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      scenarioId === 'live-sprout'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-emerald-700 border-emerald-300 hover:border-emerald-500'
                    }`}
                    title={`Live data from Sprout Social: ${topic.name}`}
                  >
                    {isLiveLoading ? <Loader2 className="size-3 animate-spin" /> : <Radio className="size-3" />}
                    {topic.name}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      scenarioId === 'live-sprout' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      LIVE
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button type="button" onClick={() => setMobileTab('analysis')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'analysis' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>
            Analysis
          </button>
          <button type="button" onClick={() => setMobileTab('sandy')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>
            Sandy
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left panel — Analysis output */}
          <div className={`lg:col-span-7 ${mobileTab === 'sandy' ? 'hidden lg:block' : ''}`}>
            {/* Loading state */}
            {isAnalyzing && (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center space-y-4">
                  <Loader2 className="size-12 text-[#0033A0] animate-spin mx-auto" />
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900 mb-1">Loading Scenario</h2>
                    <p className="text-sm text-gray-500">Preparing analysis data...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {showResults && (
              <div className="space-y-4">
                {/* Pipeline funnel — always visible (seeded scenarios only) */}
                {brief?.pipelineFunnel && (
                  <PipelineFunnel funnel={brief.pipelineFunnel} />
                )}

                {/* Output tabs */}
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                  {([
                    { id: 'brief' as OutputTab, label: 'Brief', icon: FileText },
                    { id: 'posts' as OutputTab, label: `Posts (${posts.length})`, icon: List },
                    { id: 'timeline' as OutputTab, label: 'Timeline', icon: Clock },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOutputTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        outputTab === tab.id
                          ? 'bg-[#0033A0] text-white'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="size-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {outputTab === 'brief' && brief && <CrisisBriefPanel brief={brief} />}
                {outputTab === 'brief' && !brief && scenarioId === 'live-sprout' && (
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center">
                    <p className="text-sm text-gray-600">Live data loaded — {posts.length} posts. Ask Sandy to analyze themes, sentiment, or flag concerns.</p>
                  </div>
                )}

                {outputTab === 'posts' && (
                  <PostFeed
                    posts={posts}
                    aiDetection={aiDetection}
                    sentimentResults={sentimentResults}
                  />
                )}

                {outputTab === 'timeline' && (
                  <SpreadTimeline
                    posts={posts}
                    sentimentResults={sentimentResults}
                  />
                )}
              </div>
            )}

            {/* Pre-analysis empty */}
            {!showResults && !isAnalyzing && phase === 'loading' && (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" />
              </div>
            )}
          </div>

          {/* Right panel — Sandy */}
          <div className={`lg:col-span-5 ${mobileTab === 'analysis' ? 'hidden lg:block' : ''}`}>
            <SandyInterviewPanel
              messages={messages}
              chips={chips}
              isSandyTyping={isSandyTyping}
              stepCount={3}
              currentStep={currentStep}
              onSendMessage={sendMessage}
              onChipSelect={selectChip}
              onStartOver={startOver}
              placeholder="Ask Sandy about the analysis..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
