'use client'

import { FileText } from 'lucide-react'

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'campus-wide':    { bg: 'bg-blue-50',    text: 'text-blue-700' },
  'department':     { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'student-facing': { bg: 'bg-amber-50',   text: 'text-amber-700' },
  'executive-brief':{ bg: 'bg-purple-50',  text: 'text-purple-700' },
  'crisis':         { bg: 'bg-red-50',     text: 'text-red-700' },
  'social-media':   { bg: 'bg-pink-50',    text: 'text-pink-700' },
}

export interface CommTemplate {
  id: string
  name: string
  type: string
  description: string
  subject: string
  body: string
  tone: string
  audience: string
  category: string
}

interface TemplateCardProps {
  template: CommTemplate
  onUse: (template: CommTemplate) => void
}

export default function TemplateCard({ template, onUse }: TemplateCardProps) {
  const colors = TYPE_COLORS[template.type] ?? { bg: 'bg-gray-50', text: 'text-gray-700' }
  const typeLabel = template.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-4 flex flex-col gap-3 hover:border-[#0033A0]/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-xl bg-[#0033A0]/5 flex items-center justify-center shrink-0">
          <FileText className="size-4 text-[#0033A0]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900 truncate">{template.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          {typeLabel}
        </span>
        <span className="text-[10px] text-gray-400">{template.audience}</span>
      </div>

      <button
        onClick={() => onUse(template)}
        className="mt-auto w-full text-xs font-semibold text-[#0033A0] bg-[#0033A0]/5 hover:bg-[#0033A0]/10 rounded-lg py-2 transition-colors"
      >
        Use Template
      </button>
    </div>
  )
}
