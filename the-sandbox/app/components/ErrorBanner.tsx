import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  retry?: () => void
  className?: string
}

export default function ErrorBanner({ message, retry, className = '' }: ErrorBannerProps) {
  return (
    <div
      className={`border border-red-200 bg-red-50 rounded-2xl p-4 flex items-start gap-3 ${className}`}
      role="alert"
    >
      <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700">{message}</p>
        {retry && (
          <button
            onClick={retry}
            className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
