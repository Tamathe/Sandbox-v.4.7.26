'use client'

import { FileText, Plus } from 'lucide-react'

interface TemplateSelectorProps {
  templates: Array<{
    key: string
    title: string
    organization: string
    description: string
  }>
  selectedKey: string | null
  onSelect: (key: string) => void
}

export default function TemplateSelector({ templates, selectedKey, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {templates.map((tmpl) => {
        const isSelected = selectedKey === tmpl.key
        return (
          <button
            key={tmpl.key}
            type="button"
            onClick={() => onSelect(tmpl.key)}
            className={`text-left border-2 rounded-2xl p-4 transition-colors ${
              isSelected
                ? 'border-[#0033A0] bg-[#0033A0]/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-[#0033A0]/5 flex items-center justify-center shrink-0">
                <FileText className="size-4 text-[#0033A0]" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-gray-900 truncate">{tmpl.title}</h4>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                  {tmpl.organization}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.description}</p>
              </div>
            </div>
          </button>
        )
      })}

      {/* Custom / blank template */}
      <button
        type="button"
        onClick={() => onSelect('custom')}
        className={`text-left border-2 rounded-2xl p-4 transition-colors ${
          selectedKey === 'custom'
            ? 'border-[#0033A0] bg-[#0033A0]/5'
            : 'border-dashed border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Plus className="size-4 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-gray-900">Custom Project</h4>
            <p className="text-xs text-gray-500 mt-1">
              Start from scratch with your own questions
            </p>
          </div>
        </div>
      </button>
    </div>
  )
}
