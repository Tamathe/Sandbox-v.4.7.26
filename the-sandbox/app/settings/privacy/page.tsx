'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, CheckCircle2, XCircle, Download, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'

type CategoryState = {
  category: string
  consented: boolean
  consentedAt: string | null
  revokedAt: string | null
}

type ScoreResult = {
  score: number
  breakdown: { tos: number; consent: number; ferpa: number; categories: number; recency: number }
}

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  analytics: { label: 'Usage Analytics', description: 'Share anonymized usage data to help improve the platform.' },
  'ai-personalization': { label: 'AI Personalization', description: 'Allow Sandy to personalize recommendations based on your activity.' },
  'email-communications': { label: 'Email Updates', description: 'Receive digest emails about platform updates and course activity.' },
}

export default function PrivacySettingsPage() {
  const { currentUser } = useAuth()
  const [categories, setCategories] = useState<CategoryState[]>([])
  const [compliance, setCompliance] = useState<{
    tosAcceptedAt: string | null
    dataConsentAt: string | null
    ferpaAckAt: string | null
  } | null>(null)
  const [scoreData, setScoreData] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [catRes, statusRes, scoreRes] = await Promise.all([
        fetch('/api/users/consent-categories', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/auth/status', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/users/compliance-score', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])

      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data.categories)
      }
      if (statusRes.ok) {
        const data = await statusRes.json()
        setCompliance({
          tosAcceptedAt: data.user.tosAcceptedAt ?? null,
          dataConsentAt: data.user.dataConsentAt ?? null,
          ferpaAckAt: data.user.ferpaAckAt ?? null,
        })
      }
      if (scoreRes.ok) {
        setScoreData(await scoreRes.json())
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  async function handleToggle(category: string, consented: boolean) {
    setSaving(category)
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
      setCategories((prev) =>
        prev.map((c) => (c.category === category ? { ...c, consented: !consented } : c)),
      )
    } finally {
      setSaving(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/users/data-export', {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `my-data-export-${format(new Date(), 'yyyy-MM-dd')}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  const scoreColor = (scoreData?.score ?? 0) >= 80 ? 'text-emerald-600' : (scoreData?.score ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div>
      <PageHeader
        title="Privacy Settings"
        subtitle="Manage your data preferences and compliance status"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Compliance Score */}
        {scoreData && (
          <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-extrabold ${scoreColor}`}>{scoreData.score}</div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Compliance Score</h2>
                <p className="text-sm text-gray-500">Out of 100 — based on your acceptance status and recency</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {([
                { label: 'TOS', value: scoreData.breakdown.tos, max: 25 },
                { label: 'Consent', value: scoreData.breakdown.consent, max: 25 },
                { label: 'FERPA', value: scoreData.breakdown.ferpa, max: 20 },
                { label: 'Categories', value: scoreData.breakdown.categories, max: 15 },
                { label: 'Recency', value: scoreData.breakdown.recency, max: 15 },
              ] as const).map((item) => (
                <div key={item.label} className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="text-lg font-bold text-gray-900">{item.value}/{item.max}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Compliance Status */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Compliance Status</h2>
          <div className="space-y-3">
            {([
              { label: 'Terms of Service', value: compliance?.tosAcceptedAt },
              { label: 'Data Consent', value: compliance?.dataConsentAt },
              ...(currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'
                ? [{ label: 'FERPA Acknowledgement', value: compliance?.ferpaAckAt }]
                : []),
            ] as { label: string; value: string | null | undefined }[]).map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.value ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-5 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {item.value ? `Accepted ${format(new Date(item.value), 'MMM d, yyyy')}` : 'Not accepted'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Consent Categories */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Data Consent Preferences</h2>
          <div className="space-y-3">
            {categories.map((cat) => {
              const meta = CATEGORY_LABELS[cat.category]
              if (!meta) return null
              return (
                <div key={cat.category} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{meta.label}</div>
                    <div className="text-xs text-gray-500">{meta.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggle(cat.category, !cat.consented)}
                    disabled={saving !== null}
                    className="shrink-0 ml-4"
                    aria-label={`Toggle ${meta.label}`}
                  >
                    {saving === cat.category ? (
                      <Loader2 className="size-6 animate-spin text-gray-400" />
                    ) : cat.consented ? (
                      <ToggleRight className="size-8 text-[#0033A0]" />
                    ) : (
                      <ToggleLeft className="size-8 text-gray-300" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Data Export */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Export My Data</h2>
              <p className="text-sm text-gray-500 mt-1">
                Download a copy of all your personal data stored on the University of Kentucky platform in JSON format.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#0033A0' }}
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? 'Exporting...' : 'Download'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
