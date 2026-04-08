'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50 min-h-screen">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="w-full max-w-md rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="size-7 text-red-500" />
            </div>
            <h1 className="mb-2 text-xl font-extrabold text-gray-900">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              An unexpected error occurred. Please try again, or return to the
              home page if the problem persists.
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              <RefreshCw className="size-4" />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
