'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface ExportModalProps {
  open: boolean
  code: string
  defaultAppName: string
  onClose: () => void
}

const README_STEPS = [
  'Install Node.js from nodejs.org and use the current LTS version.',
  'Install VS Code from code.visualstudio.com.',
  'Unzip the exported folder anywhere on your computer.',
  'Open the folder in VS Code.',
  'Open the VS Code terminal and run: npm install, then npm run dev.',
]

export default function ExportModal({
  open,
  code,
  defaultAppName,
  onClose,
}: ExportModalProps) {
  const { currentUser } = useAuth()
  const [appName, setAppName] = useState(defaultAppName)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAppName(defaultAppName)
      setError(null)
    }
  }, [defaultAppName, open])

  if (!open) return null

  const handleDownload = async () => {
    if (!code.trim()) return

    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch('/api/playground/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          code,
          appName: appName.trim() || defaultAppName,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Export failed')
      }

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `${(appName.trim() || defaultAppName || 'my-sandbox-app')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'my-sandbox-app'}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl rounded-[32px] bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0033A0]">
              Graduation
            </div>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              You&apos;ve outgrown the Playground - that&apos;s a good sign.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              We&apos;ll package your app as a Vite + React project so you can keep building in VS
              Code with room for a real backend.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            aria-label="Close export modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div>
            <label htmlFor="export-app-name" className="mb-2 block text-sm font-semibold text-gray-800">
              App name
            </label>
            <input
              id="export-app-name"
              value={appName}
              onChange={(event) => setAppName(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
              placeholder="my-sandbox-app"
            />
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
            <div className="text-sm font-semibold text-gray-900">What you&apos;ll get</div>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>A ready-to-run Vite + React project</li>
              <li>Your app extracted into `src/App.jsx`</li>
              <li>A step-by-step README for local development</li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-900">Get started in 5 steps</div>
            <ol className="mt-3 space-y-2 text-sm text-gray-600">
              {README_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isExporting || !code.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing ZIP...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download ZIP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
