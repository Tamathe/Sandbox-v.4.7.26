'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, CalendarClock, Loader2, Copy, Check, ChevronRight } from 'lucide-react'
import { useMeetingMachineTool } from '../../hooks/useMeetingMachineTool'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
  table: ({ children }: { children?: React.ReactNode }) => <div className="overflow-x-auto"><table className="w-full text-sm border-collapse border border-gray-200">{children}</table></div>,
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="border border-gray-200 px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
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

export default function AgendaBuilderPage() {
  const {
    isPreflightLoading, output, isGenerating, messages, chips, isSandyTyping,
    sendMessage, selectChip, saveToPipeline, startOver,
  } = useMeetingMachineTool('agenda-builder')

  const [mobileTab, setMobileTab] = useState<'agenda' | 'sandy'>('sandy')

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
          <Link href="/meeting-machine" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors">
            <ArrowLeft className="size-4" /> Meeting Machine
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
              <CalendarClock className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Agenda Builder</h1>
              <p className="text-sm text-gray-500">Sandy helps you build a perfectly timed meeting agenda</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button type="button" onClick={() => setMobileTab('agenda')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'agenda' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Agenda</button>
          <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <div className={`lg:col-span-7 bg-white border-2 border-gray-200 rounded-2xl p-6 overflow-y-auto ${mobileTab !== 'agenda' ? 'hidden lg:block' : ''}`}>
            {output ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Your Agenda</h2>
                  <div className="flex items-center gap-2">
                    <CopyBtn text={output} />
                    <button type="button" onClick={() => saveToPipeline('minutes-taker')} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] transition-colors">
                      Start Minutes <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-800">
                  <DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown>
                </div>
              </>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                <p className="text-sm text-gray-400">Building your agenda...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <CalendarClock className="size-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Answer Sandy&apos;s questions to build your agenda</p>
              </div>
            )}
          </div>

          <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
            <SandyInterviewPanel messages={messages} chips={chips} isSandyTyping={isSandyTyping} stepCount={3} currentStep={output ? 2 : messages.length > 1 ? 1 : 0} onSendMessage={sendMessage} onChipSelect={selectChip} onStartOver={startOver} placeholder="Tell Sandy about your meeting..." disabled={isSandyTyping} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">Meeting Machine provides AI-generated content — always review before sharing.</p>
      </div>
    </div>
  )
}
