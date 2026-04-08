'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, FileUser, Loader2, Copy, Check } from 'lucide-react'
import { useInstitutionalResume } from '../../hooks/useInstitutionalResume'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'
import { parseResumeSections } from '../../lib/institutional-resume-service'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-2xl font-extrabold mt-4 mb-2">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-lg font-extrabold mt-3 mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    const clean = text.replace(/<!-- SECTION:\w+ -->/g, '').trim()
    await navigator.clipboard.writeText(clean)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button type="button" onClick={copy} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function InstitutionalResumePage() {
  const {
    isPreflightLoading, rawResume, isGenerating, messages, chips,
    isSandyTyping, currentStep, isRefinementMode,
    sendMessage, selectChip, handleSectionClick, startOver,
  } = useInstitutionalResume()

  const [mobileTab, setMobileTab] = useState<'resume' | 'sandy'>('resume')
  const sections = parseResumeSections(rawResume)

  if (isPreflightLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="size-8 text-[#0033A0] animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/hub" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"><ArrowLeft className="size-4" /> Hub</Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10"><FileUser className="size-5 text-[#0033A0]" /></div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Institutional Resume Builder</h1>
              <p className="text-sm text-gray-500">Sandy builds your resume from your institutional footprint</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button type="button" onClick={() => setMobileTab('resume')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'resume' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Resume</button>
          <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {/* Left: Resume */}
          <div className={`lg:col-span-7 overflow-y-auto ${mobileTab !== 'resume' ? 'hidden lg:block' : ''}`}>
            {rawResume ? (
              <div className="space-y-4">
                <div className="flex justify-end"><CopyBtn text={rawResume} /></div>
                {sections.length > 0 ? sections.map((sec) => (
                  <div
                    key={sec.id}
                    onClick={() => handleSectionClick(sec.id)}
                    className={`bg-white border-2 border-gray-200 rounded-2xl p-5 ${isRefinementMode ? 'cursor-pointer hover:border-[#0033A0]/40 hover:shadow-sm transition-all' : ''}`}
                  >
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <DynamicMarkdown components={mdComponents}>{sec.content}</DynamicMarkdown>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <DynamicMarkdown components={mdComponents}>{rawResume}</DynamicMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ) : isGenerating ? (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center h-64">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                <p className="text-sm text-gray-400 ml-3">Building your resume from institutional data...</p>
              </div>
            ) : null}
          </div>

          {/* Right: Sandy */}
          <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
            <SandyInterviewPanel
              messages={messages}
              chips={chips}
              isSandyTyping={isSandyTyping}
              stepCount={6}
              currentStep={currentStep}
              onSendMessage={sendMessage}
              onChipSelect={selectChip}
              onStartOver={startOver}
              placeholder={isRefinementMode ? 'Ask Sandy to refine a section...' : 'Tell Sandy more about your needs...'}
              disabled={isSandyTyping}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">AI-generated resume — always verify details before submitting.</p>
      </div>
    </div>
  )
}
