'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Save,
  ServerCog,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

type IntegrationSummary = {
  id: string
  key: string
  name: string
  systemLabel: string
  providerLabel: string
  capabilities: string[]
  mode: 'SIMULATED' | 'REAL'
  status: 'HEALTHY' | 'DEGRADED' | 'BLOCKED' | 'NOT_CONFIGURED'
  configured: boolean
  authMode: string | null
  baseUrl: string | null
  tenantHint: string | null
  dataOwner: string | null
  syncDirection: string | null
  metadata: Record<string, unknown> | null
  lastCheckedAt: string | null
  lastHealthyAt: string | null
  lastFailureAt: string | null
  lastError: string | null
}

type DraftState = {
  mode: 'SIMULATED' | 'REAL'
  authMode: string
  baseUrl: string
  tenantHint: string
  dataOwner: string
  syncDirection: string
  metadataText: string
  lastError: string
}

type Toast = { type: 'success' | 'error'; message: string }

function formatTimestamp(value: string | null) {
  if (!value) return 'Never'
  return format(new Date(value), 'MMM d, yyyy h:mm a')
}

function createDraft(integration: IntegrationSummary): DraftState {
  return {
    mode: integration.mode,
    authMode: integration.authMode ?? '',
    baseUrl: integration.baseUrl ?? '',
    tenantHint: integration.tenantHint ?? '',
    dataOwner: integration.dataOwner ?? '',
    syncDirection: integration.syncDirection ?? '',
    metadataText: integration.metadata ? JSON.stringify(integration.metadata, null, 2) : '',
    lastError: integration.lastError ?? '',
  }
}

function statusClasses(status: IntegrationSummary['status']) {
  switch (status) {
    case 'HEALTHY':
      return 'bg-emerald-100 text-emerald-700'
    case 'DEGRADED':
      return 'bg-amber-100 text-amber-800'
    case 'BLOCKED':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default function IntegrationsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([])
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [healthId, setHealthId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((message: string, type: Toast['type']) => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }, [])

  const syncDrafts = useCallback((items: IntegrationSummary[]) => {
    const next: Record<string, DraftState> = {}
    for (const integration of items) {
      next[integration.id] = createDraft(integration)
    }
    setDrafts(next)
  }, [])

  const loadIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ integrations: IntegrationSummary[] }>(currentUser.email, '/api/admin/integrations')
      const items = data.integrations ?? []
      setIntegrations(items)
      syncDrafts(items)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch integrations'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, router, showToast, syncDrafts])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    void loadIntegrations()
  }, [currentUser.role, loadIntegrations, router])

  const updateDraft = useCallback(
    (id: string, field: keyof DraftState, value: string) => {
      setDrafts((current) => ({
        ...current,
        [id]: {
          ...current[id],
          [field]: value,
        } as DraftState,
      }))
    },
    [],
  )

  const stats = useMemo(
    () => ({
      total: integrations.length,
      healthy: integrations.filter((item) => item.status === 'HEALTHY').length,
      blocked: integrations.filter((item) => item.status === 'BLOCKED').length,
      simulated: integrations.filter((item) => item.mode === 'SIMULATED').length,
    }),
    [integrations],
  )

  async function saveIntegration(id: string) {
    const draft = drafts[id]
    if (!draft) return

    let metadata: Record<string, unknown> | null = null
    if (draft.metadataText.trim()) {
      try {
        const parsed = JSON.parse(draft.metadataText)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Metadata JSON must be an object')
        }
        metadata = parsed as Record<string, unknown>
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Metadata JSON is invalid'
        showToast(message, 'error')
        return
      }
    }

    setSavingId(id)
    try {
      const data = await apiFetch<{ integration: IntegrationSummary }>(currentUser.email, `/api/admin/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          mode: draft.mode,
          authMode: draft.authMode || null,
          baseUrl: draft.baseUrl || null,
          tenantHint: draft.tenantHint || null,
          dataOwner: draft.dataOwner || null,
          syncDirection: draft.syncDirection || null,
          metadata,
          lastError: draft.lastError || null,
        }),
      })
      setIntegrations((current) =>
        current.map((item) => (item.id === id ? data.integration : item)),
      )
      setDrafts((current) => ({
        ...current,
        [id]: createDraft(data.integration),
      }))
      showToast(`Saved ${data.integration.name}`, 'success')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save integration'
      showToast(message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function runHealthCheck(id: string, simulate: boolean) {
    setHealthId(id)
    try {
      const data = await apiFetch<{
        integration: IntegrationSummary
        healthCheck: { message: string }
      }>(currentUser.email, `/api/admin/integrations/${id}/health`, {
        method: 'POST',
        body: JSON.stringify({ simulate }),
      })

      setIntegrations((current) =>
        current.map((item) => (item.id === id ? data.integration : item)),
      )
      setDrafts((current) => ({
        ...current,
        [id]: createDraft(data.integration),
      }))
      showToast(data.healthCheck.message, 'success')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to run health check'
      showToast(message, 'error')
    } finally {
      setHealthId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {toast ? (
        <div
          className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="size-4" />
          ) : (
            <AlertTriangle className="size-4" />
          )}
          {toast.message}
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/admin" className="flex items-center gap-1 hover:text-[#0033A0]">
              <ChevronLeft className="size-4" />
              Admin Control Tower
            </Link>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-900">
            <ServerCog className="size-8 text-[#0033A0]" />
            Integrations Control Plane
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage simulated vs real connector state, runtime metadata, and health for deployable institutional integrations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadIntegrations()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="size-4" />
          Refresh Inventory
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          ['Integrations', stats.total],
          ['Healthy', stats.healthy],
          ['Blocked', stats.blocked],
          ['Simulated', stats.simulated],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {integrations.map((integration) => {
          const draft = drafts[integration.id] ?? createDraft(integration)
          const isSaving = savingId === integration.id
          const isRunningHealth = healthId === integration.id

          return (
            <section
              key={integration.id}
              className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900">{integration.name}</h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses(integration.status)}`}
                      >
                        {integration.status.replace('_', ' ')}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                        {integration.mode.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {integration.systemLabel} · {integration.providerLabel}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:text-right">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {integration.configured ? 'Configured' : 'Not configured'}
                      </div>
                      <div>Last checked: {formatTimestamp(integration.lastCheckedAt)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Last healthy</div>
                      <div>{formatTimestamp(integration.lastHealthyAt)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {integration.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full bg-[#0033A0]/10 px-2.5 py-1 text-xs font-semibold text-[#0033A0]"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Mode</span>
                      <select
                        value={draft.mode}
                        onChange={(event) =>
                          updateDraft(integration.id, 'mode', event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                      >
                        <option value="SIMULATED">Simulated</option>
                        <option value="REAL">Real</option>
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Auth mode</span>
                      <input
                        value={draft.authMode}
                        onChange={(event) => updateDraft(integration.id, 'authMode', event.target.value)}
                        placeholder="oauth, api-token, api-key, simulated"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Base URL</span>
                      <input
                        value={draft.baseUrl}
                        onChange={(event) => updateDraft(integration.id, 'baseUrl', event.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Tenant hint</span>
                      <input
                        value={draft.tenantHint}
                        onChange={(event) => updateDraft(integration.id, 'tenantHint', event.target.value)}
                        placeholder="tenant id or campus hint"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Data owner</span>
                      <input
                        value={draft.dataOwner}
                        onChange={(event) => updateDraft(integration.id, 'dataOwner', event.target.value)}
                        placeholder="Registrar, LMS team, IT, ..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Sync direction</span>
                      <input
                        value={draft.syncDirection}
                        onChange={(event) => updateDraft(integration.id, 'syncDirection', event.target.value)}
                        placeholder="read-only, read/write, import/export"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                      />
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-700">Metadata JSON</span>
                    <textarea
                      value={draft.metadataText}
                      onChange={(event) => updateDraft(integration.id, 'metadataText', event.target.value)}
                      rows={8}
                      className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-3 py-3 font-mono text-xs outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                      placeholder='{"scope":["calendar","email"]}'
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-700">Last error note</span>
                    <textarea
                      value={draft.lastError}
                      onChange={(event) => updateDraft(integration.id, 'lastError', event.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                      placeholder="Optional admin note or manual error detail"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void saveIntegration(integration.id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002580] disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => void runHealthCheck(integration.id, false)}
                      disabled={isRunningHealth}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {isRunningHealth ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />}
                      Run Health Check
                    </button>

                    <button
                      type="button"
                      onClick={() => void runHealthCheck(integration.id, true)}
                      disabled={isRunningHealth}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <ShieldCheck className="size-4" />
                      Dry Run
                    </button>
                  </div>
                </div>

                <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Runtime Snapshot
                    </h3>
                    <dl className="mt-3 space-y-3 text-sm text-slate-600">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="font-medium text-slate-700">Provider/system</dt>
                        <dd className="text-right">{integration.systemLabel}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="font-medium text-slate-700">Configured</dt>
                        <dd>{integration.configured ? 'Yes' : 'No'}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="font-medium text-slate-700">Last checked</dt>
                        <dd>{formatTimestamp(integration.lastCheckedAt)}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="font-medium text-slate-700">Last healthy</dt>
                        <dd>{formatTimestamp(integration.lastHealthyAt)}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="font-medium text-slate-700">Last failure</dt>
                        <dd>{formatTimestamp(integration.lastFailureAt)}</dd>
                      </div>
                    </dl>
                  </div>

                  {integration.lastError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Last error</p>
                      <p className="mt-1 text-sm text-rose-700">{integration.lastError}</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Last error</p>
                      <p className="mt-1 text-sm text-emerald-700">No stored integration error.</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Metadata Preview
                    </h3>
                    <div className="mt-3 space-y-2">
                      {integration.metadata && Object.keys(integration.metadata).length > 0 ? (
                        Object.entries(integration.metadata).map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {key}
                            </div>
                            <div className="mt-1 break-words text-sm text-slate-700">
                              {Array.isArray(value)
                                ? value.join(', ')
                                : typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                          No additional metadata stored for this integration yet.
                        </p>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
