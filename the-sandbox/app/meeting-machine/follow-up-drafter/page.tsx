'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, Forward, Loader2, Copy, Check, RotateCcw } from 'lucide-react'
import { useMeetingMachineTool } from '../../hooks/useMeetingMachineTool'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-4 mb-2 pb-2 border-b border-gray-200">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-sm mt-2 mb-0.5 text-gray-600">{children}</h3>,
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

export default function FollowUpDrafterPage() {
  const {
    isPreflightLoading, output, isGenerating, messages, chips, isSandyTyping, pipelineData,
    sendMessage, selectChip, startOver,
  } = useMeetingMachineTool('follow-up-drafter')

  const [mobileTab, setMobileTab] = useState<'emails' | 'sandy'>('sandy')

  if (isPreflightLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="size-8 text-[#0033A0] animate-spin" /></div>
  }

  // Split output into per-recipient email sections
  const emailSections = output
    ? output.split(/^## /m).filter((s) => s.trim()).map((s) => {
        const nlIdx = s.indexOf('\n')
        return {
          title: nlIdx > -1 ? s.slice(0, nlIdx).trim() : s.trim(),
          content: nlIdx > -1 ? s.slice(nlIdx + 1).trim() : '',
        }
      })
    : []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/meeting-machine" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors">
            <ArrowLeft className="size-4" /> Meeting Machine
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10"><Forward className="size-5 text-[#0033A0]" /></div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Follow-up Drafter</h1>
              <p className="text-sm text-gray-500">{pipelineData ? 'Sandy has your decisions and action items — drafting personalized emails' : 'Draft personalized follow-up emails for every attendee'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button type="button" onClick={() => setMobileTab('emails')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'emails' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Emails</button>
          <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <div className={`lg:col-span-7 overflow-y-auto space-y-4 ${mobileTab !== 'emails' ? 'hidden lg:block' : ''}`}>
            {emailSections.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">{emailSections.length} Follow-up Email{emailSections.length !== 1 ? 's' : ''}</h2>
                  <div className="flex items-center gap-2">
                    <CopyBtn text={output} />
                    <button type="button" onClick={startOver} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors">
                      <RotateCcw className="size-3.5" /> Start Over
                    </button>
                  </div>
                </div>
                {emailSections.map((section, i) => (
                  <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 text-sm">{section.title}</h3>
                      <CopyBtn text={section.content} />
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <DynamicMarkdown components={mdComponents}>{section.content}</DynamicMarkdown>
                    </div>
                  </div>
                ))}
              </>
            ) : isGenerating ? (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                <p className="text-sm text-gray-400">Drafting personalized follow-up emails...</p>
              </div>
            ) : (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex flex-col items-center justify-center h-64 text-center">
                <Forward className="size-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Tell Sandy about the meeting and she&apos;ll draft follow-ups for each attendee</p>
              </div>
            )}
          </div>

          <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
            <SandyInterviewPanel messages={messages} chips={chips} isSandyTyping={isSandyTyping} stepCount={3} currentStep={output ? 2 : messages.length > 1 ? 1 : 0} onSendMessage={sendMessage} onChipSelect={selectChip} onStartOver={startOver} placeholder="Tell Sandy about the meeting context..." disabled={isSandyTyping} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">Meeting Machine provides AI-generated content — always review before sending.</p>
      </div>
    </div>
  )
}
