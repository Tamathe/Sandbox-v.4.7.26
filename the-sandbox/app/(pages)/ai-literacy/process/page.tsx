'use client'

import { useState } from 'react'
import { ArrowLeft, Copy, Check, ChevronDown, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../../components/PageHeader'
import { PROCESS_TEMPLATES } from '../../../lib/process-assessment-service'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'
import type { ProcessTemplate } from '../../../lib/process-assessment-service'

export default function ProcessAssessmentPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function copyTemplate(t: ProcessTemplate) {
    const text = formatTemplate(t)
    await navigator.clipboard.writeText(text)
    setCopiedId(t.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      <PageHeader
        title="Process-Based Assessment Tools"
        subtitle="Build assessments where the learning journey is visible — not just the final output"
        action={
          <Link href="/ai-literacy" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" />
            AI Literacy Hub
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Philosophy banner */}
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl mb-8">
          <h3 className="text-sm font-semibold text-blue-800">The core idea</h3>
          <p className="text-sm text-blue-700 mt-1">
            Don&apos;t detect AI use — design it out. When the learning process is visible through checkpoints,
            drafts, peer review, and reflection, the question shifts from &quot;did they use AI?&quot; to &quot;did they learn?&quot;
          </p>
        </div>

        {/* Templates */}
        <div className="space-y-4">
          {PROCESS_TEMPLATES.map(t => {
            const isExpanded = expanded === t.id
            return (
              <div key={t.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : t.id)}
                  className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="size-4 text-[#0033A0]" />
                        <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Replaces: <strong>{t.originalFormat}</strong> — {t.checkpoints.length} checkpoints
                      </p>
                    </div>
                    <ChevronDown className={`size-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{t.description}</p>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-5">
                    {/* Checkpoints */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Process Checkpoints</h4>
                        <button
                          onClick={() => copyTemplate(t)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                        >
                          {copiedId === t.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                          {copiedId === t.id ? 'Copied' : 'Copy template'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {t.checkpoints.map((cp, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="size-6 rounded-full bg-[#0033A0] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{cp.stage}</span>
                                <span className="text-[10px] text-gray-400">({cp.gradingWeight}% of grade)</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{cp.description}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-gray-400">Deliverable: {cp.deliverable}</span>
                                <span className="text-[10px] text-green-600">AI resilience: {cp.aiResilience}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reflection prompts */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">Reflection Prompts</h4>
                      <ul className="space-y-1.5">
                        {t.reflectionPrompts.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 size-1.5 rounded-full bg-amber-400 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* In-class components */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">In-Class Components</h4>
                      <ul className="space-y-1.5">
                        {t.inClassComponents.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 size-1.5 rounded-full bg-blue-400 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <PathwayNav />
      </div>
    </>
  )
}

function formatTemplate(t: ProcessTemplate): string {
  let text = `${t.name}\nReplaces: ${t.originalFormat}\n\n${t.description}\n\nCheckpoints:\n`
  t.checkpoints.forEach((cp, i) => {
    text += `\n${i + 1}. ${cp.stage} (${cp.gradingWeight}%)\n   ${cp.description}\n   Deliverable: ${cp.deliverable}\n`
  })
  text += `\nReflection Prompts:\n`
  t.reflectionPrompts.forEach(p => { text += `• ${p}\n` })
  text += `\nIn-Class Components:\n`
  t.inClassComponents.forEach(c => { text += `• ${c}\n` })
  return text
}
