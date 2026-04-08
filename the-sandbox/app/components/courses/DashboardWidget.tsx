'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'

interface DashboardWidgetProps {
  title: string
  icon?: LucideIcon
  collapsible?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
  action?: React.ReactNode
}

export default function DashboardWidget({
  title,
  icon: Icon,
  collapsible = true,
  defaultOpen = true,
  children,
  action,
}: DashboardWidgetProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className={`flex items-center gap-1.5 text-sm font-bold text-gray-700 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {collapsible && (open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />)}
          {Icon && <Icon className="size-4" />}
          {title}
        </button>
        {action && <div>{action}</div>}
      </div>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  )
}
