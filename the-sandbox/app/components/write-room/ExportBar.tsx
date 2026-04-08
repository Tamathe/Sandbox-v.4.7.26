'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, Download } from 'lucide-react'

interface ExportBarProps {
  letter: string
}

export default function ExportBar({ letter }: ExportBarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    // Strip section markers for clean copy
    const clean = letter
      .replace(/<!-- SECTION:\w+ -->\n?/g, '')
      .trim()
    await navigator.clipboard.writeText(clean)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [letter])

  const handleDownload = useCallback(() => {
    const clean = letter
      .replace(/<!-- SECTION:\w+ -->\n?/g, '')
      .trim()
    const blob = new Blob([clean], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cover-letter.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [letter])

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          copied
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
        }`}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors"
      >
        <Download className="size-3.5" />
        Download
      </button>
    </div>
  )
}
