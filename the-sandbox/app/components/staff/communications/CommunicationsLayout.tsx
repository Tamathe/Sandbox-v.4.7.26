'use client'

import { PenLine, FileStack, Send } from 'lucide-react'
import SegmentedControl from '../../SegmentedControl'

export type CommTab = 'draft' | 'my-drafts' | 'sent'

interface CommunicationsLayoutProps {
  activeTab: CommTab
  onTabChange: (tab: CommTab) => void
  children: React.ReactNode
}

const TABS: { key: CommTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'draft',     label: 'Draft with Sandy', icon: PenLine },
  { key: 'my-drafts', label: 'My Drafts',        icon: FileStack },
  { key: 'sent',      label: 'Sent',             icon: Send },
]

export default function CommunicationsLayout({ activeTab, onTabChange, children }: CommunicationsLayoutProps) {
  return (
    <div>
      {/* Tab bar */}
      <SegmentedControl
        value={activeTab}
        onChange={onTabChange}
        options={TABS.map(t => ({ value: t.key, label: <><t.icon className="size-4" />{t.label}</> }))}
        className="max-w-md"
      />

      {/* Content */}
      <div className="mt-6">{children}</div>
    </div>
  )
}
