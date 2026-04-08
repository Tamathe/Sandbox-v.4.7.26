'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, UserCheck, Loader2, Copy, Check } from 'lucide-react'
import { useLinkedInOptimizer } from '../../hooks/useLinkedInOptimizer'
import SandyInterviewPanel from '../../components/SandyInterviewPanel'
import type { LinkedInSectionId } from '../../lib/linkedin-optimizer-service'

// ── Section card ───────────────────────────────────────────────────────────

const SECTION_META: Record<LinkedInSectionId, { title: string; icon: string }> = {
  headline: { title: 'Headline', icon: '💼' },
  about: { title: 'About', icon: '👤' },
  'experience-bullets': { title: 'Experience Bullets', icon: '📋' },
  skills: { title: 'Skills to Add', icon: '🎯' },
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-sm mt-2 mb-0.5">{children}</h3>,
}

function SectionCard({
  sectionId,
  content,
  charCount,
  isActive,
  isGenerating,
  onClick,
}: {
  sectionId: LinkedInSectionId
  content: string
  charCount: { count: number; limit: number | null }
  isActive: boolean
  isGenerating: boolean
  onClick: () => void
}) {
  const [copied, setCopied] = useState(false)
  const meta = SECTION_META[sectionId]

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    },
    [content],
  )

  const charColor = charCount.limit
    ? charCount.count > charCount.limit
      ? 'text-red-600'
      : charCount.count > charCount.limit * 0.8
        ? 'text-amber-600'
        : 'text-emerald-600'
    : 'text-gray-400'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white border-2 rounded-2xl p-4 transition-all ${
        isActive
          ? 'border-[#0033A0] border-l-4'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta.icon}</span>
          <span className="text-sm font-bold text-gray-900">{meta.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {charCount.limit && (
            <span className={`text-xs font-medium ${charColor}`}>
              {charCount.count}/{charCount.limit}
            </span>
          )}
          {content && (
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
              }`}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {content ? (
        <div className="text-sm text-gray-700 prose prose-sm max-w-none">
          <DynamicMarkdown components={mdComponents}>{content}</DynamicMarkdown>
        </div>
      ) : isGenerating ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="size-4 text-[#0033A0] animate-spin" />
          <span className="text-xs text-gray-400">Generating {meta.title.toLowerCase()}...</span>
        </div>
      ) : (
        <p className="text-xs text-gray-400 py-4">Click to generate</p>
      )}
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function LinkedInOptimizerPage() {
  const {
    isPreflightLoading,
    sections,
    isGenerating,
    activeSection,
    charCounts,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    isPolishMode,
    sendMessage,
    selectChip,
    clickSection,
    startOver,
  } = useLinkedInOptimizer()

  const [mobileTab, setMobileTab] = useState<'profile' | 'sandy'>('sandy')

  if (isPreflightLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-[#0033A0] animate-spin" />
          <p className="text-sm text-gray-500">Loading your profile data...</p>
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
              <UserCheck className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">LinkedIn Optimizer</h1>
              <p className="text-sm text-gray-500">
                Sandy optimizes every section for maximum search visibility
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
            onClick={() => setMobileTab('profile')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'profile'
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('sandy')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'sandy'
                ? 'text-[#0033A0] border-b-2 border-[#0033A0]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sandy
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {/* Left panel — Section cards */}
          <div
            className={`lg:col-span-7 space-y-4 overflow-y-auto ${
              mobileTab !== 'profile' ? 'hidden lg:block' : ''
            }`}
          >
            {(['headline', 'about', 'experience-bullets', 'skills'] as LinkedInSectionId[]).map(
              (id) => (
                <SectionCard
                  key={id}
                  sectionId={id}
                  content={sections[id]}
                  charCount={charCounts[id] ?? { count: 0, limit: null }}
                  isActive={activeSection === id}
                  isGenerating={isGenerating}
                  onClick={() => clickSection(id)}
                />
              ),
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
                isPolishMode
                  ? 'Ask Sandy to refine any section...'
                  : 'Tell Sandy about your target role...'
              }
              disabled={isSandyTyping}
            />
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-center text-xs text-gray-400">
          LinkedIn Optimizer provides AI-generated suggestions — always review before updating your profile.
        </p>
      </div>
    </div>
  )
}
