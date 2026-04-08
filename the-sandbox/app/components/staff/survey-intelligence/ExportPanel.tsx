'use client'

import { useState, useCallback } from 'react'
import { Download, Copy, Check, Loader2 } from 'lucide-react'

interface ExportPanelProps {
  projectId: string
  userEmail: string
}

export default function ExportPanel({ projectId, userEmail }: ExportPanelProps) {
  const [output, setOutput] = useState('')
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/staff/survey-intelligence/projects/${projectId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ format: 'markdown' }),
      })
      if (res.ok) {
        const data = await res.json()
        setOutput(data.content ?? data.text ?? '')
      }
    } catch { /* non-fatal */ }
    setExporting(false)
  }

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="size-5 text-[#0033A0]" />
            <h3 className="text-base font-extrabold text-gray-900">Export Responses</h3>
          </div>
          <div className="flex items-center gap-2">
            {output && (
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  copied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
                }`}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy to Clipboard'}
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0] text-white hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Export All
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        {!output && !exporting ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Click &quot;Export All&quot; to compile all approved and drafted responses.
          </p>
        ) : exporting && !output ? (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Compiling responses...
          </div>
        ) : (
          <textarea
            readOnly
            value={output}
            rows={20}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 font-mono resize-none focus:outline-none"
          />
        )}
      </div>
    </div>
  )
}
