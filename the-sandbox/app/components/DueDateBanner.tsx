'use client'

import { AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface DueDateBannerProps {
  title: string
  dueAt: string | null
}

export default function DueDateBanner({ title, dueAt }: DueDateBannerProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 mb-3">
      <AlertCircle className="size-4 flex-shrink-0 text-amber-600" />
      <span>
        This session counts as your submission for{' '}
        <span className="font-semibold">{title}</span>
        {dueAt && (
          <>
            {' '}— due{' '}
            <span className="font-semibold">{format(new Date(dueAt), 'MMM d, yyyy')}</span>
          </>
        )}
      </span>
    </div>
  )
}
