'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

interface ExportButtonProps {
  href: string
  label: string
  filename?: string
  className?: string
}

export default function ExportButton({ href, label, filename, className }: ExportButtonProps) {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(href, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()

      // Derive filename from Content-Disposition header or prop
      let downloadName = filename ?? 'export.csv'
      const disposition = res.headers.get('Content-Disposition')
      if (disposition) {
        const match = disposition.match(/filename="?([^";\n]+)"?/)
        if (match?.[1]) downloadName = match[1]
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = downloadName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:text-[#0033A0] hover:bg-gray-100 transition-colors disabled:opacity-50 ${className ?? ''}`}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
    </button>
  )
}
