'use client'

import { useState, useEffect } from 'react'
import { Info, X } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

const DISMISSED_KEY = 'uky-evaluator-dismissed-callouts'

function getDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveDismissed(ids: string[]) {
  try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)) } catch {}
}

export default function EvaluatorInsightCallout({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const { evaluatorMode } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(getDismissed().includes(id))
  }, [id])

  if (!evaluatorMode || dismissed) return null

  function handleDismiss() {
    const next = [...getDismissed(), id]
    saveDismissed(next)
    setDismissed(true)
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
      <Info className="size-4 text-[#0033A0] shrink-0 mt-0.5" />
      <div className="flex-1 leading-relaxed">{children}</div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-blue-400 transition hover:bg-blue-100 hover:text-blue-600 cursor-pointer"
        aria-label="Dismiss insight"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
