'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface AlertConversionCardProps {
  query: string
  userEmail: string
}

export function AlertConversionCard({ query, userEmail }: AlertConversionCardProps) {
  const [state, setState] = useState<'idle' | 'creating' | 'created'>('idle')
  const [preview, setPreview] = useState<Array<{ title: string; slug: string }>>([])
  const [previewLoading, setPreviewLoading] = useState(true)
  const fetchedRef = useRef(false)

  // Fetch preview articles on mount
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    fetch(`/api/uknow/alerts/preview?q=${encodeURIComponent(query)}`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.articles) setPreview(data.articles) })
      .catch(() => {})
      .finally(() => setPreviewLoading(false))
  }, [query, userEmail])

  const handleCreate = async () => {
    setState('creating')
    try {
      const label = query.length > 60 ? query.slice(0, 57) + '…' : query
      const res = await fetch('/api/uknow/alerts', {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, query }),
      })
      if (res.ok) setState('created')
      else setState('idle')
    } catch {
      setState('idle')
    }
  }

  if (state === 'created') {
    return (
      <div className="border-2 border-emerald-200 rounded-2xl bg-emerald-50/50 p-4 flex items-center gap-3">
        <CheckCircle className="size-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-800">Alert created!</p>
          <p className="text-xs text-emerald-600">
            You&apos;ll get a weekly digest when matching articles are published.{' '}
            <Link href="/uknow?tab=alerts" className="underline">Manage alerts</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-blue-200 rounded-2xl bg-blue-50/30 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-full bg-[#0033A0] flex items-center justify-center shrink-0">
          <Sparkles className="size-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Stay informed</p>
          <p className="text-xs text-gray-600 mt-0.5">
            I can notify you when new articles matching this topic are published.
          </p>
        </div>
      </div>

      {/* Preview articles as social proof */}
      {!previewLoading && preview.length > 0 && (
        <div className="border-t border-blue-100 pt-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Recent matches
          </p>
          <div className="flex flex-col gap-1">
            {preview.slice(0, 3).map((a) => (
              <Link
                key={a.slug}
                href={`/uknow/${a.slug}`}
                className="text-xs font-medium text-[#0033A0] hover:underline truncate"
              >
                {a.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => void handleCreate()}
        disabled={state === 'creating'}
        className="self-start flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#002580] transition-colors disabled:opacity-50"
      >
        {state === 'creating' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Bell className="size-4" />
        )}
        {state === 'creating' ? 'Creating…' : 'Create Alert'}
      </button>
    </div>
  )
}
