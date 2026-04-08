'use client'

import { Download, Sparkles, Upload } from 'lucide-react'

interface QuickActionsWidgetProps {
  onSwitchTab: (tab: string) => void
  onImportCanvas?: () => void
}

const actions = [
  { label: 'Upload Syllabus', icon: Upload, tab: 'content' },
  { label: 'Import from Canvas', icon: Download, tab: null },
  { label: 'Build with AI', icon: Sparkles, tab: 'analytics' },
] as const

export default function QuickActionsWidget({ onSwitchTab, onImportCanvas }: QuickActionsWidgetProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {actions.map(({ label, icon: Icon, tab }) => (
        <button
          key={label}
          type="button"
          onClick={() => {
            if (tab) {
              onSwitchTab(tab)
            } else {
              onImportCanvas?.()
            }
          }}
          className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-[#0033A0] hover:bg-blue-50 hover:text-[#0033A0]"
        >
          <Icon className="size-5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  )
}
