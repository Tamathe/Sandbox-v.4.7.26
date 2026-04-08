'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Shield, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../lib/auth-context'

const DISMISSED_KEY = 'consent-banner-dismissed'

type CategoryState = {
  category: string
  consented: boolean
  consentedAt: string | null
  revokedAt: string | null
}

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  analytics: { label: 'Usage Analytics', description: 'Help us improve the platform by sharing anonymized usage data.' },
  'ai-personalization': { label: 'AI Personalization', description: 'Allow Sandy to personalize recommendations based on your activity.' },
  'email-communications': { label: 'Email Updates', description: 'Receive digest emails about platform updates and course activity.' },
}

export default function ConsentBanner() {
  const { currentUser } = useAuth()
  const [categories, setCategories] = useState<CategoryState[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/users/consent-categories', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const data = await res.json()
      setCategories(data.categories)
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }
    void fetchCategories()
  }, [fetchCategories])

  // Show banner when any category is missing consent
  const hasMissing = categories.some((c) => !c.consented)

  if (loading || !hasMissing || dismissed) return null

  function handleDismiss() {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISSED_KEY, '1') } catch { /* noop */ }
  }

  async function handleToggle(category: string, consented: boolean) {
    setSaving(category)
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.category === category ? { ...c, consented } : c)),
    )
    try {
      await fetch('/api/users/consent-categories', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ category, consented }),
      })
    } catch {
      // Revert on error
      setCategories((prev) =>
        prev.map((c) => (c.category === category ? { ...c, consented: !consented } : c)),
      )
    } finally {
      setSaving(null)
    }
  }

  async function handleAcceptAll() {
    const unconsented = categories.filter((c) => !c.consented)
    setCategories((prev) => prev.map((c) => ({ ...c, consented: true })))
    setSaving('all')
    try {
      await Promise.all(
        unconsented.map((c) =>
          fetch('/api/users/consent-categories', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-demo-user-email': currentUser.email,
            },
            body: JSON.stringify({ category: c.category, consented: true }),
          }),
        ),
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start gap-3">
          <Shield className="size-5 shrink-0 mt-0.5 text-[#0033A0]" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-2">
              Data consent preferences
            </p>
            <div className="space-y-2">
              {categories.map((cat) => {
                const meta = CATEGORY_LABELS[cat.category]
                if (!meta) return null
                return (
                  <label key={cat.category} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cat.consented}
                      onChange={(e) => void handleToggle(cat.category, e.target.checked)}
                      disabled={saving !== null}
                      className="mt-0.5 size-4 rounded border-gray-300 accent-[#0033A0]"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{meta.label}</span>
                      <span className="text-gray-500"> — {meta.description}</span>
                    </span>
                    {saving === cat.category && <Loader2 className="size-3.5 animate-spin text-gray-400 mt-0.5" />}
                  </label>
                )
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => void handleAcceptAll()}
                disabled={saving !== null}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 bg-[#0033A0]"
              >
                {saving === 'all' ? <Loader2 className="inline size-3.5 animate-spin mr-1" /> : null}
                Accept All
              </button>
              <Link
                href="/privacy"
                className="text-sm font-medium hover:underline text-[#0033A0]"
              >
                Learn More
              </Link>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
