'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, FileSearch, Loader2, Copy, Check, Upload, X, FileText } from 'lucide-react'
import { useDataDeskTool } from '../../hooks/useDataDeskTool'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }, [text])
  return <button type="button" onClick={handleCopy} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</button>
}

function SectionedOutput({ output }: { output: string }) {
  const sections = output.split(/^## /m).filter((s) => s.trim()).map((s) => {
    const nl = s.indexOf('\n')
    return { title: nl > -1 ? s.slice(0, nl).trim() : s.trim(), content: nl > -1 ? s.slice(nl + 1).trim() : '' }
  })
  if (sections.length <= 1) return <div className="prose prose-sm max-w-none text-gray-800"><DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown></div>
  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-900">{sec.title}</h3><CopyBtn text={sec.content} /></div>
          <div className="prose prose-sm max-w-none text-gray-700"><DynamicMarkdown components={mdComponents}>{sec.content}</DynamicMarkdown></div>
        </div>
      ))}
    </div>
  )
}

export default function ReportSummarizerPage() {
  const {
    isPreflightLoading, phase, inputFile, setInputFile, output, isGenerating,
    messages, chips, isSandyTyping, submitData, sendMessage, selectChip, startOver,
  } = useDataDeskTool('report-summarizer')

  const [mobileTab, setMobileTab] = useState<'analysis' | 'sandy'>('analysis')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showSandy = phase !== 'input'

  const handleFile = useCallback((f: File) => {
    if (f.type === 'application/pdf') setInputFile(f)
  }, [setInputFile])

  if (isPreflightLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="size-8 text-[#0033A0] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/data-desk" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"><ArrowLeft className="size-4" /> Data Desk</Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10"><FileSearch className="size-5 text-[#0033A0]" /></div>
            <div><h1 className="text-xl font-extrabold text-gray-900">Report Summarizer</h1><p className="text-sm text-gray-500">Upload a report and Sandy summarizes it from your perspective</p></div>
          </div>
        </div>
      </div>

      {showSandy && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="flex max-w-6xl mx-auto">
            <button type="button" onClick={() => setMobileTab('analysis')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'analysis' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Summary</button>
            <button type="button" onClick={() => setMobileTab('sandy')} className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500'}`}>Sandy</button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {phase === 'input' && (
          <div className="max-w-2xl mx-auto">
            <div
              className={`bg-white border-2 ${dragOver ? 'border-[#0033A0] bg-blue-50' : 'border-dashed border-gray-300'} rounded-2xl p-12 text-center transition-colors cursor-pointer`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {inputFile ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="size-10 text-[#0033A0]" />
                  <p className="text-sm font-medium text-gray-900">{inputFile.name}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); submitData() }} className="px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] transition-colors">Summarize This Report</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setInputFile(null) }} className="px-3 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:border-gray-400 transition-colors"><X className="size-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="size-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">Drop a PDF report here, or click to browse</p>
                  <p className="text-xs text-gray-400">PDF files only</p>
                </div>
              )}
            </div>
          </div>
        )}

        {phase !== 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
            <div className={`lg:col-span-7 overflow-y-auto ${mobileTab !== 'analysis' ? 'hidden lg:block' : ''}`}>
              {output ? <SectionedOutput output={output} /> : isGenerating ? (
                <div className="bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center h-64"><Loader2 className="size-8 text-[#0033A0] animate-spin" /><p className="text-sm text-gray-400 ml-3">Reading and summarizing...</p></div>
              ) : null}
            </div>
            <div className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${mobileTab !== 'sandy' ? 'hidden lg:flex' : ''}`} style={{ minHeight: 400 }}>
              <SandyInterviewPanel messages={messages} chips={chips} isSandyTyping={isSandyTyping} stepCount={2} currentStep={output ? 1 : 0} onSendMessage={sendMessage} onChipSelect={selectChip} onStartOver={startOver} placeholder="Ask Sandy about the report..." disabled={isSandyTyping} />
            </div>
          </div>
        )}
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6"><p className="text-center text-xs text-gray-400">Data Desk provides AI-generated analysis — always verify findings against original data.</p></div>
    </div>
  )
}
