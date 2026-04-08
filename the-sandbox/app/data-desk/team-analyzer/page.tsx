'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, Users, Loader2, Copy, Check } from 'lucide-react'
import { useTeamAnalyzer } from '../../hooks/useTeamAnalyzer'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-base mt-2 mb-1">{children}</h3>,
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }, [text])
  return <button type="button" onClick={handleCopy} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</button>
}

function SectionedOutput({ output }: { output: string }) {
  const sections = output.split(/^## /m).filter(s => s.trim()).map(s => {
    const nl = s.indexOf('\n')
    return { title: nl > -1 ? s.slice(0, nl).trim() : s.trim(), content: nl > -1 ? s.slice(nl + 1).trim() : '' }
  })
  if (sections.length <= 1) return <div className="prose prose-sm max-w-none text-gray-800"><DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown></div>
  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-900">{sec.title}</h3><CopyBtn text={`## ${sec.title}\n${sec.content}`} /></div>
          <div className="prose prose-sm max-w-none text-gray-700"><DynamicMarkdown components={mdComponents}>{sec.content}</DynamicMarkdown></div>
        </div>
      ))}
    </div>
  )
}

export default function TeamAnalyzerPage() {
  const {
    isPreflightLoading, output, isGenerating, messages, chips,
    isSandyTyping, currentStep, sendMessage, selectChip, startOver,
  } = useTeamAnalyzer()

  const [mobileTab, setMobileTab] = useState<'analysis' | 'sandy'>('sandy')
  const showOutput = output || isGenerating

  if (isPreflightLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="size-8 text-[#0033A0] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/hub" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"><ArrowLeft className="size-4" /> Hub</Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10"><Users className="size-5 text-[#0033A0]" /></div>
            <div><h1 className="text-xl font-extrabold text-gray-900">Team Structure Analyzer</h1><p className="text-sm text-gray-500">Sandy maps what your team actually does — not what the org chart says</p></div>
          </div>
        </div>
      </div>

      {showOutput && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="flex max-w-6xl mx-auto">
            <button type="button" onClick={() => setMobileTab('analysis')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'analysis' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Analysis</button>
            <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <div className={`lg:col-span-7 overflow-y-auto ${!showOutput || mobileTab !== 'analysis' ? 'hidden lg:block' : ''}`}>
            {output ? <SectionedOutput output={output} /> : isGenerating ? (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center h-64">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" /><p className="text-sm text-gray-400 ml-3">Analyzing team structure...</p>
              </div>
            ) : (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center h-64">
                <p className="text-sm text-gray-400">Tell Sandy about your team to get started.</p>
              </div>
            )}
          </div>
          <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${showOutput && mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
            <SandyInterviewPanel messages={messages} chips={chips} isSandyTyping={isSandyTyping} stepCount={5} currentStep={currentStep} onSendMessage={sendMessage} onChipSelect={selectChip} onStartOver={startOver} placeholder="Describe your team's work..." disabled={isSandyTyping} />
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6"><p className="text-center text-xs text-gray-400">AI-generated analysis — verify organizational data before making structural decisions.</p></div>
    </div>
  )
}
