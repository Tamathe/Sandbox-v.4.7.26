'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, FileText, Loader2, Copy, Check } from 'lucide-react'
import { useResumeBuilder } from '../../hooks/useResumeBuilder'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'
import type { ResumeSectionId } from '../../lib/resume-builder-service'

const SECTION_LABELS: Record<ResumeSectionId, string> = {
  header: 'Header',
  summary: 'Summary',
  education: 'Education',
  experience: 'Experience',
  skills: 'Skills',
}

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
    // Strip section markers for clean copy
    const clean = text.replace(/<!-- SECTION:\w+ -->\n?/g, '').trim()
    await navigator.clipboard.writeText(clean)
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

export default function ResumeBuilderPage() {
  const {
    isPreflightLoading,
    rawResume,
    sections,
    isGenerating,
    activeSection,
    isRefinementMode,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    sendMessage,
    selectChip,
    clickSection,
    startOver,
  } = useResumeBuilder()

  const [mobileTab, setMobileTab] = useState<'resume' | 'sandy'>('sandy')

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-[#0033A0] animate-spin" />
          <p className="text-sm text-gray-500">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/write-room"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Write Room
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
              <FileText className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Resume Builder</h1>
              <p className="text-sm text-gray-500">
                Sandy builds your resume from your profile — then tailors it to your target role
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => setMobileTab('resume')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'resume' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('sandy')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'sandy' ? 'text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sandy
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {/* Left panel — Resume */}
          <div
            className={`lg:col-span-7 bg-white border-2 border-gray-200 rounded-2xl p-6 overflow-y-auto ${
              mobileTab !== 'resume' ? 'hidden lg:block' : ''
            }`}
          >
            {sections.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Your Resume</h2>
                  <CopyBtn text={rawResume} />
                </div>

                <div className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => clickSection(section.id)}
                      className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                        activeSection === section.id
                          ? 'bg-blue-50 border-l-4 border-[#0033A0]'
                          : isRefinementMode
                            ? 'hover:bg-gray-50 cursor-pointer'
                            : ''
                      }`}
                    >
                      <div className="prose prose-sm max-w-none text-gray-800">
                        <DynamicMarkdown components={mdComponents}>{section.content}</DynamicMarkdown>
                      </div>
                    </button>
                  ))}
                </div>

                {isRefinementMode && (
                  <p className="text-xs text-gray-400 text-center mt-4">Click any section to refine it with Sandy</p>
                )}
              </>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                <p className="text-sm text-gray-400">Building your resume from your profile...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="size-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Your resume will appear here</p>
              </div>
            )}
          </div>

          {/* Right panel — Sandy */}
          <div
            className={`lg:col-span-5 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col ${
              mobileTab !== 'sandy' ? 'hidden lg:flex' : ''
            }`}
            style={{ minHeight: 400 }}
          >
            <SandyInterviewPanel
              messages={messages}
              chips={chips}
              isSandyTyping={isSandyTyping}
              stepCount={5}
              currentStep={currentStep}
              onSendMessage={sendMessage}
              onChipSelect={selectChip}
              onStartOver={startOver}
              placeholder={
                isRefinementMode
                  ? 'Ask Sandy to refine your resume...'
                  : 'Tell Sandy about the role you want...'
              }
              disabled={isSandyTyping}
            />
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">
          Resume Builder provides AI-generated content — always review and personalize before submitting.
        </p>
      </div>
    </div>
  )
}
