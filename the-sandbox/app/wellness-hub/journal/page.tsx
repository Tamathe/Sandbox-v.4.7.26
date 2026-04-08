'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, HeartPulse, Loader2, Copy, Check } from 'lucide-react'
import { useWellnessHubTool } from '../../hooks/useWellnessHubTool'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button type="button" onClick={handleCopy} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function SymptomJournalPage() {
  const {
    isPreflightLoading, output, isGenerating, messages, chips, isSandyTyping,
    sendMessage, selectChip, startOver,
  } = useWellnessHubTool('journal')

  const [mobileTab, setMobileTab] = useState<'check-in' | 'sandy'>('sandy')

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 text-[#0033A0] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/wellness-hub" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors">
            <ArrowLeft className="size-4" /> Wellness Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
              <HeartPulse className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Symptom Journal</h1>
              <p className="text-sm text-gray-500">Sandy helps you track symptoms and discover patterns</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button type="button" onClick={() => setMobileTab('check-in')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'check-in' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Check-in</button>
          <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <div className={`lg:col-span-7 bg-white border-2 border-gray-200 rounded-2xl p-6 overflow-y-auto ${mobileTab !== 'check-in' ? 'hidden lg:block' : ''}`}>
            {output ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Your Insight</h2>
                  <CopyBtn text={output} />
                </div>
                <div className="prose prose-sm max-w-none text-gray-800">
                  <DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown>
                </div>
              </>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                <p className="text-sm text-gray-400">Analyzing your symptom patterns...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <HeartPulse className="size-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Tell Sandy about any symptoms you&apos;re experiencing</p>
              </div>
            )}
          </div>

          <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
            <SandyInterviewPanel messages={messages} chips={chips} isSandyTyping={isSandyTyping} stepCount={4} currentStep={output ? 3 : messages.length > 1 ? Math.min(messages.filter(m => m.role === 'user').length, 3) : 0} onSendMessage={sendMessage} onChipSelect={selectChip} onStartOver={startOver} placeholder="Tell Sandy about your symptoms..." disabled={isSandyTyping} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">Wellness Hub provides AI-generated insights — not medical advice.</p>
      </div>
    </div>
  )
}
