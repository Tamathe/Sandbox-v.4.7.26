'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, Presentation, Loader2, Copy, Check } from 'lucide-react'
import { useDataDeskTool } from '../../hooks/useDataDeskTool'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-base mt-3 mb-1 text-[#0033A0]">{children}</h3>,
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }, [text])
  return <button type="button" onClick={handleCopy} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</button>
}

export default function PresentationOutlinerPage() {
  const {
    isPreflightLoading, phase, output, isGenerating,
    messages, chips, isSandyTyping, submitData, sendMessage, selectChip, startOver,
  } = useDataDeskTool('presentation-outliner')

  const [mobileTab, setMobileTab] = useState<'outline' | 'sandy'>('sandy')

  // Presentation outliner is interview-first (no data upload), so trigger immediately
  if (!isPreflightLoading && phase === 'input' && messages.length === 0) {
    submitData()
  }

  if (isPreflightLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="size-8 text-[#0033A0] animate-spin" /></div>

  // Parse slides from output
  const slides = output ? output.split(/^### /m).filter((s) => s.trim()).map((s) => {
    const nl = s.indexOf('\n')
    return { title: nl > -1 ? s.slice(0, nl).trim() : s.trim(), content: nl > -1 ? s.slice(nl + 1).trim() : '' }
  }) : []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/data-desk" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"><ArrowLeft className="size-4" /> Data Desk</Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10"><Presentation className="size-5 text-[#0033A0]" /></div>
            <div><h1 className="text-xl font-extrabold text-gray-900">Presentation Outliner</h1><p className="text-sm text-gray-500">Sandy builds your slide deck outline with speaker notes</p></div>
          </div>
        </div>
      </div>

      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button type="button" onClick={() => setMobileTab('outline')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'outline' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Outline</button>
          <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <div className={`lg:col-span-7 overflow-y-auto space-y-3 ${mobileTab !== 'outline' ? 'hidden lg:block' : ''}`}>
            {slides.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-gray-900">{slides.length} Slides</h2>
                  <CopyBtn text={output} />
                </div>
                {slides.map((slide, i) => (
                  <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-[#0033A0]">{slide.title}</h3>
                      <CopyBtn text={`### ${slide.title}\n${slide.content}`} />
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <DynamicMarkdown components={mdComponents}>{slide.content}</DynamicMarkdown>
                    </div>
                  </div>
                ))}
              </>
            ) : isGenerating ? (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center h-64"><Loader2 className="size-8 text-[#0033A0] animate-spin" /><p className="text-sm text-gray-400 ml-3">Building your slide deck...</p></div>
            ) : (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex flex-col items-center justify-center h-64 text-center">
                <Presentation className="size-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Tell Sandy about your presentation to get started</p>
              </div>
            )}
          </div>

          <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
            <SandyInterviewPanel messages={messages} chips={chips} isSandyTyping={isSandyTyping} stepCount={3} currentStep={output ? 2 : messages.length > 1 ? 1 : 0} onSendMessage={sendMessage} onChipSelect={selectChip} onStartOver={startOver} placeholder="Tell Sandy about your presentation..." disabled={isSandyTyping} />
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6"><p className="text-center text-xs text-gray-400">Data Desk provides AI-generated content — always review and customize before presenting.</p></div>
    </div>
  )
}
