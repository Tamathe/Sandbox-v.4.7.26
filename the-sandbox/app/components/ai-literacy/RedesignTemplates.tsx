'use client'

import { useState } from 'react'
import { ArrowRight, Copy, Check } from 'lucide-react'

interface RedesignTemplate {
  id: string
  originalType: string
  redesignApproach: string
  description: string
  bloomShift: string
  effort: 'low' | 'medium' | 'high'
  before: string
  after: string
}

const EFFORT_BADGES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

export default function RedesignTemplates({ templates }: { templates: RedesignTemplate[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function copyAfter(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-extrabold text-gray-900">Redesign Templates</h3>
        <p className="text-sm text-gray-600 mt-1">Pre-built before/after examples. Click any template to see the full transformation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => {
          const isExpanded = expanded === t.id
          return (
            <div key={t.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : t.id)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{t.originalType}</span>
                  <ArrowRight className={`size-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#0033A0] font-medium">{t.redesignApproach}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${EFFORT_BADGES[t.effort]}`}>{t.effort} effort</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">{t.bloomShift}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{t.description}</p>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 gap-3">
                    {/* Before */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-red-500 tracking-wider">Before (AI-vulnerable)</span>
                      <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-gray-700 whitespace-pre-wrap">
                        {t.before}
                      </div>
                    </div>

                    {/* After */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase text-green-600 tracking-wider">After (AI-resilient)</span>
                        <button
                          onClick={() => copyAfter(t.id, t.after)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                          {copiedId === t.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                          {copiedId === t.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="mt-1 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-gray-700 whitespace-pre-wrap">
                        {t.after}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
