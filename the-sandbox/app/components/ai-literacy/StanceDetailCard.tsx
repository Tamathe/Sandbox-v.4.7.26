'use client'

import { useState } from 'react'
import { Copy, Check, BookOpen, MessageSquare, AlertTriangle, Users, ClipboardList } from 'lucide-react'
import { STANCE_DETAILS } from '../../lib/stance-constants'
import type { AIStance } from '../../generated/prisma'

const STANCE_COLORS: Record<AIStance, { bg: string; border: string; text: string; badge: string }> = {
  PROHIBIT: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-700' },
  CAUTIOUS: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700' },
  GUIDED: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700' },
  INTEGRATE: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-700' },
  REQUIRE: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' },
}

interface StanceDetailCardProps {
  stance: AIStance
  isCurrent?: boolean
  onSelect?: () => void
}

export default function StanceDetailCard({ stance, isCurrent, onSelect }: StanceDetailCardProps) {
  const detail = STANCE_DETAILS[stance]
  const colors = STANCE_COLORS[stance]
  const [copied, setCopied] = useState(false)

  async function copySyllabus() {
    await navigator.clipboard.writeText(detail.syllabusLanguage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`border rounded-2xl shadow-sm overflow-hidden ${colors.border}`}>
      {/* Header */}
      <div className={`px-6 py-4 ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
              {detail.label} Use
            </span>
            {isCurrent && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0033A0] text-white">
                Your stance
              </span>
            )}
          </div>
          {onSelect && !isCurrent && (
            <button
              onClick={onSelect}
              className="px-3 py-1.5 text-xs font-medium bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] transition-colors"
            >
              Select this stance
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-700">{detail.philosophy}</p>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Syllabus Language */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <BookOpen className="size-4" />
              Syllabus Language
            </h4>
            <button
              onClick={copySyllabus}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border-l-3 border-gray-300 space-y-2 max-h-[360px] overflow-y-auto">
            {detail.syllabusLanguage.split('\n\n').map((para, i) => {
              const lines = para.split('\n')
              const hasBullets = lines.some(l => l.startsWith('•'))
              if (hasBullets) {
                return (
                  <div key={i}>
                    {lines.map((line, j) =>
                      line.startsWith('•') ? (
                        <div key={j} className="flex items-start gap-2 ml-1 mb-1">
                          <span className="mt-2 size-1.5 rounded-full bg-gray-400 shrink-0" />
                          <span className="leading-relaxed">{line.slice(2)}</span>
                        </div>
                      ) : (
                        <p key={j} className="font-semibold text-gray-800 mt-1 mb-1">{line}</p>
                      ),
                    )}
                  </div>
                )
              }
              if (para.startsWith('Why this policy:')) {
                return <p key={i} className="italic leading-relaxed">{para}</p>
              }
              return <p key={i} className="leading-relaxed">{para}</p>
            })}
          </div>
        </div>

        {/* Assignment Implications */}
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-2">
            <ClipboardList className="size-4" />
            Assignment Implications
          </h4>
          <ul className="space-y-1.5">
            {detail.assignmentImplications.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className={`mt-1.5 size-1.5 rounded-full shrink-0 ${colors.badge.split(' ')[0]}`} />
                {imp}
              </li>
            ))}
          </ul>
        </div>

        {/* Student Communication */}
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-2">
            <MessageSquare className="size-4" />
            How to Frame for Students
          </h4>
          <p className="text-sm text-gray-600 italic">&ldquo;{detail.studentCommunication}&rdquo;</p>
        </div>

        {/* Common Concerns */}
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-2">
            <AlertTriangle className="size-4" />
            Common Concerns at This Stance
          </h4>
          <ul className="space-y-1.5">
            {detail.commonConcerns.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1.5 size-1.5 rounded-full bg-gray-300 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Discipline Affinity + Peer Practices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-2">
              <Users className="size-4" />
              Common In
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {detail.disciplineAffinity.map(d => (
                <span key={d} className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Faculty Who Chose This Also</h4>
            <ul className="space-y-1">
              {detail.peerPractices.map((p, i) => (
                <li key={i} className="text-xs text-gray-600">• {p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
