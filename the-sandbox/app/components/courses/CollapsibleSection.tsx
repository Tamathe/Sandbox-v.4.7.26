'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'

export default function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: LucideIcon
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-6 border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-1.5 mb-3"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Icon className="size-4" />
        {title}
      </button>
      {open && children}
    </div>
  )
}
