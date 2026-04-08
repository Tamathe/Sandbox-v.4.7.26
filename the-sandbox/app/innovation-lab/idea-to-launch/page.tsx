'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, Lightbulb, Loader2, Copy, Check, FileText, RefreshCw } from 'lucide-react'
import { useIdeaToLaunch } from '../../hooks/useIdeaToLaunch'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="font-extrabold text-xl mb-1">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-4 mb-1 text-[#0033A0]">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-base mt-2 mb-0.5">{children}</h3>,
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
      }`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

const PHASE_ICONS: Record<string, string> = {
  spark: '💡',
  landscape: '🔍',
  market: '📊',
  protection: '🛡️',
  pitch: '🎯',
  'action-plan': '🚀',
  refinement: '✨',
}

export default function IdeaToLaunchPage() {
  const {
    isPreflightLoading,
    rawBrief,
    isGenerating,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    currentPhase,
    phaseLabel,
    sendMessage,
    selectChip,
    generateBrief,
    startOver,
  } = useIdeaToLaunch()

  const [mobileTab, setMobileTab] = useState<'brief' | 'sandy'>('sandy')

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-[#0033A0] animate-spin" />
          <p className="text-sm text-gray-500">Loading Innovation Lab...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/innovation-lab" className="text-gray-400 hover:text-[#0033A0] transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Lightbulb className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-gray-900">Idea to Launch</h1>
              <p className="text-xs text-gray-500">
                {PHASE_ICONS[currentPhase]} Phase {currentStep + 1}: {phaseLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMobileTab('brief')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              mobileTab === 'brief'
                ? 'bg-white text-[#0033A0] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Innovation Brief
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('sandy')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              mobileTab === 'sandy'
                ? 'bg-white text-[#0033A0] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sandy
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
          {/* Left panel — Innovation Brief */}
          <div
            className={`lg:col-span-7 bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col ${
              mobileTab === 'brief' ? '' : 'hidden lg:flex'
            }`}
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-[#0033A0]" />
                <span className="text-sm font-semibold text-gray-900">Innovation Brief</span>
              </div>
              <div className="flex items-center gap-2">
                {rawBrief && <CopyBtn text={rawBrief} />}
                {currentStep >= 2 && (
                  <button
                    type="button"
                    onClick={generateBrief}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {rawBrief ? (
                <div className="prose prose-sm max-w-none">
                  <DynamicMarkdown components={mdComponents}>{rawBrief}</DynamicMarkdown>
                </div>
              ) : isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-sm">Generating your Innovation Brief...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                  <div className="size-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Lightbulb className="size-8 text-gray-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Your Innovation Brief will appear here</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Tell Sandy about your idea and it will build as you go
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — Sandy Interview */}
          <div
            className={`lg:col-span-5 bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col ${
              mobileTab === 'sandy' ? '' : 'hidden lg:flex'
            }`}
          >
            <SandyInterviewPanel
              messages={messages}
              chips={chips}
              isSandyTyping={isSandyTyping}
              stepCount={6}
              currentStep={currentStep}
              onSendMessage={sendMessage}
              onChipSelect={selectChip}
              onStartOver={startOver}
              placeholder="Tell Sandy about your idea..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
