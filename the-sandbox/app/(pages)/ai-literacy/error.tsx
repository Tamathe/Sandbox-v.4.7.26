'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AILiteracyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('AI Literacy page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="size-7 text-red-500" />
      </div>
      <h2 className="mb-2 text-xl font-extrabold text-gray-900">Something went wrong</h2>
      <p className="mb-6 max-w-sm text-sm text-gray-500">
        There was an error loading AI Literacy. Your progress is saved.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
        <Link
          href="/ai-literacy"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          Back to hub
        </Link>
      </div>
    </div>
  )
}
