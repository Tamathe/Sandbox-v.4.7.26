'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, FileText, Loader2, Copy, Check } from 'lucide-react'
import { useContractDrafter } from '../../hooks/useContractDrafter'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'
import { parseContractSections } from '../../lib/contract-drafter-service'

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
  const copy = useCallback(async () => {
    const clean = text.replace(/<!-- SECTION:[\w-]+ -->/g, '').replace(/\[LEGAL REVIEW NEEDED\]/g, '\u2696\uFE0F LEGAL REVIEW NEEDED').trim()
    await navigator.clipboard.writeText(clean)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }, [text])
  return <button type="button" onClick={copy} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</button>
}

export default function ContractDrafterPage() {
  const {
    isPreflightLoading, rawDraft, isGenerating, messages, chips,
    isSandyTyping, currentStep, isRefinementMode,
    sendMessage, selectChip, handleSectionClick, startOver,
  } = useContractDrafter()

  const [mobileTab, setMobileTab] = useState<'draft' | 'sandy'>('sandy')
  const sections = parseContractSections(rawDraft)
  const showDraft = rawDraft || isGenerating

  if (isPreflightLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="size-8 text-[#0033A0] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/hub" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"><ArrowLeft className="size-4" /> Hub</Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10"><FileText className="size-5 text-[#0033A0]" /></div>
            <div><h1 className="text-xl font-extrabold text-gray-900">Contract Drafter</h1><p className="text-sm text-gray-500">Sandy drafts university contracts with compliance flags and legal review markers</p></div>
          </div>
        </div>
      </div>

      {showDraft && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="flex max-w-6xl mx-auto">
            <button type="button" onClick={() => setMobileTab('draft')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'draft' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Contract</button>
            <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <div className={`lg:col-span-7 overflow-y-auto ${!showDraft || mobileTab !== 'draft' ? 'hidden lg:block' : ''}`}>
            {rawDraft ? (
              <div className="space-y-4">
                <div className="flex justify-end"><CopyBtn text={rawDraft} /></div>
                {sections.length > 0 ? sections.map((sec) => (
                  <div key={sec.id} onClick={() => handleSectionClick(sec.id)} className={`bg-white border-2 border-gray-200 rounded-2xl p-5 ${isRefinementMode ? 'cursor-pointer hover:border-[#0033A0]/40 hover:shadow-sm transition-all' : ''}`}>
                    <div className="prose prose-sm max-w-none text-gray-800"><DynamicMarkdown components={mdComponents}>{sec.content}</DynamicMarkdown></div>
                  </div>
                )) : (
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                    <div className="prose prose-sm max-w-none text-gray-800"><DynamicMarkdown components={mdComponents}>{rawDraft}</DynamicMarkdown></div>
                  </div>
                )}
              </div>
            ) : isGenerating ? (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center h-64">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" /><p className="text-sm text-gray-400 ml-3">Drafting your contract...</p>
              </div>
            ) : (
              <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center h-64">
                <p className="text-sm text-gray-400">Tell Sandy about your contract to get started.</p>
              </div>
            )}
          </div>
          <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${showDraft && mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
            <SandyInterviewPanel messages={messages} chips={chips} isSandyTyping={isSandyTyping} stepCount={6} currentStep={currentStep} onSendMessage={sendMessage} onChipSelect={selectChip} onStartOver={startOver} placeholder={isRefinementMode ? 'Ask Sandy to revise a section...' : 'Tell Sandy about the contract...'} disabled={isSandyTyping} />
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-amber-600 font-medium">AI-generated draft — must be reviewed by UK Legal before execution.</p>
      </div>
    </div>
  )
}
