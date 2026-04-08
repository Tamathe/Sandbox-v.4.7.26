'use client'

import { ReactNode } from 'react'

export interface AdminBriefingLayoutProps {
  left: ReactNode
  right: ReactNode
}

/**
 * Responsive 2-column grid for the admin command center.
 * Desktop: 3-column grid (left=2/3, right=1/3).
 * Mobile: single-column stack.
 */
export default function AdminBriefingLayout({ left, right }: AdminBriefingLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content — left column */}
      <div className="lg:col-span-2 space-y-6">
        {left}
      </div>

      {/* Sidebar — right column */}
      <div className="space-y-6">
        {right}
      </div>
    </div>
  )
}
