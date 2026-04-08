'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  Clock3,
  Loader2,
  RefreshCw,
  Workflow,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

type TraceStatus = 'RUNNING' | 'COMPLETED' | 'FAILED'
type StatusFilter = 'ALL' | TraceStatus

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
  lastSyncAt: string | null
  lastError: string | null
  institutionKey: string
}

type TraceUser = {
  id: string
  name: string
  email: string
  role: string
}

type SandyExecutionTraceSummary = {
  id: string
  sessionId: string
  status: TraceStatus
  currentPage: string | null
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  toolCallCount: number
  approvalCount: number
  errorCount: number
  lastUserMessage: string | null
  user: TraceUser
  integrations: IntegrationSummary[]
}

type SandyExecutionEventRecord = {
  id: string
  sequence: number
  eventType: string
  toolName: string | null
  toolCallId: string | null
  approvalId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

type SandyExecutionTraceDetail = SandyExecutionTraceSummary & {
  requestMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  requestMessageCount: number
  finalResponse: string | null
  failureMessage: string | null
  modelName: string | null
  events: SandyExecutionEventRecord[]
}

function formatTimestamp(value: string | null, fallback = 'Never') {
  if (!value) return fallback
  return format(new Date(value), 'MMM d, yyyy h:mm:ss a')
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return 'Unknown'
  if (durationMs < 1000) return durationMs === 0 ? '0 ms' : 'Under 1s'
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)}s`
  return `${(durationMs / 60_000).toFixed(1)}m`
}

function statusClasses(status: TraceStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700'
    case 'FAILED':
      return 'bg-rose-100 text-rose-700'
    case 'RUNNING':
    default:
      return 'bg-blue-100 text-blue-700'
  }
}

function integrationStatusClasses(status: IntegrationSummary['status']) {
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

function eventTypeClasses(eventType: string) {
  switch (eventType) {
    case 'tool_call':
      return 'bg-blue-100 text-blue-700'
    case 'tool_result':
      return 'bg-emerald-100 text-emerald-700'
    case 'approval_request':
    case 'approval_resolved':
      return 'bg-amber-100 text-amber-800'
    case 'error':
      return 'bg-rose-100 text-rose-700'
    case 'text':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export default function SandyTracesPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [traces, setTraces] = useState<SandyExecutionTraceSummary[]>([])
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<SandyExecutionTraceDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTraceDetail = useCallback(
    async (traceId: string) => {
      setLoadingDetail(true)
      try {
        const response = await fetch(`/api/admin/sandy-traces/${traceId}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })

        if (response.status === 403) {
          router.replace('/')
          return
        }

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null
          throw new Error(data?.error ?? 'Failed to load Sandy trace detail')
        }

        const data = (await response.json()) as { trace: SandyExecutionTraceDetail }
        setError(null)
        setSelectedTrace(data.trace)
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load Sandy trace detail'
        setError(message)
      } finally {
        setLoadingDetail(false)
      }
    },
    [currentUser.email, router],
  )

  const loadTraces = useCallback(async () => {
    setLoadingList(true)
    setError(null)

    try {
      const url =
        statusFilter === 'ALL'
          ? '/api/admin/sandy-traces'
          : `/api/admin/sandy-traces?status=${statusFilter}`
      const response = await fetch(url, {
        headers: { 'x-demo-user-email': currentUser.email },
      })

      if (response.status === 403) {
        router.replace('/')
        return
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(data?.error ?? 'Failed to load Sandy execution traces')
      }

      const data = (await response.json()) as { traces: SandyExecutionTraceSummary[] }
      const items = data.traces ?? []
      setTraces(items)
      setSelectedTraceId((current) => {
        const nextSelectedId =
          items.find((trace) => trace.id === current)?.id ?? items[0]?.id ?? null
        if (!nextSelectedId) {
          setSelectedTrace(null)
        }
        return nextSelectedId
      })
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load Sandy execution traces'
      setError(message)
      setTraces([])
      setSelectedTraceId(null)
      setSelectedTrace(null)
    } finally {
      setLoadingList(false)
    }
  }, [currentUser.email, router, statusFilter])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }

    void loadTraces()
  }, [currentUser.role, loadTraces, router])

  useEffect(() => {
    if (!selectedTraceId) return
    void loadTraceDetail(selectedTraceId)
  }, [loadTraceDetail, selectedTraceId])

  const stats = useMemo(
    () => ({
      total: traces.length,
      running: traces.filter((trace) => trace.status === 'RUNNING').length,
      failed: traces.filter((trace) => trace.status === 'FAILED').length,
      withTools: traces.filter((trace) => trace.toolCallCount > 0).length,
    }),
    [traces],
  )

  const statCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Loaded traces', value: stats.total, icon: Workflow },
    { label: 'Running', value: stats.running, icon: Clock3 },
    { label: 'Failed', value: stats.failed, icon: XCircle },
    { label: 'With tool calls', value: stats.withTools, icon: Wrench },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/admin" className="flex items-center gap-1 hover:text-[#0033A0]">
              <ChevronLeft className="size-4" />
              Admin Control Tower
            </Link>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-900">
            <Bot className="size-8 text-[#0033A0]" />
            Sandy Execution Traces
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Inspect persisted Sandy runs, tool activity, approvals, and the integration snapshot captured at execution time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">
            <span className="sr-only">Status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All statuses</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadTraces()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <card.icon className="size-4 text-[#0033A0]" />
              {card.label}
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Recent Runs
            </h2>
          </div>

          {loadingList ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-[#0033A0]" />
            </div>
          ) : traces.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No Sandy traces match this filter yet.
            </div>
          ) : (
            <div className="max-h-[75vh] space-y-3 overflow-y-auto p-4">
              {traces.map((trace) => {
                const selected = trace.id === selectedTraceId

                return (
                  <button
                    key={trace.id}
                    type="button"
                    onClick={() => setSelectedTraceId(trace.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selected
                        ? 'border-[#0033A0] bg-[#0033A0]/5 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{trace.user.name}</div>
                        <div className="text-xs text-slate-500">{trace.user.email}</div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses(trace.status)}`}
                      >
                        {trace.status}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      <div>Started: {formatTimestamp(trace.startedAt)}</div>
                      <div>Session: {trace.sessionId}</div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <div className="font-semibold text-slate-900">{trace.toolCallCount}</div>
                        <div>Tools</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <div className="font-semibold text-slate-900">{trace.approvalCount}</div>
                        <div>Approvals</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <div className="font-semibold text-slate-900">{trace.errorCount}</div>
                        <div>Errors</div>
                      </div>
                    </div>

                    {trace.currentPage ? (
                      <div className="mt-3 text-xs font-medium text-[#0033A0]">
                        {trace.currentPage}
                      </div>
                    ) : null}

                    {trace.lastUserMessage ? (
                      <p className="mt-3 line-clamp-3 text-sm text-slate-700">
                        {trace.lastUserMessage}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">No user message stored.</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {trace.integrations.slice(0, 4).map((integration) => (
                        <span
                          key={`${trace.id}-${integration.key}`}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${integrationStatusClasses(integration.status)}`}
                        >
                          {integration.key}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Trace Detail</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Full request context, integration snapshot, final output, and ordered execution events.
                </p>
              </div>

              {selectedTrace ? (
                <div className="text-sm text-slate-500">
                  Selected trace: <span className="font-semibold text-slate-700">{selectedTrace.id}</span>
                </div>
              ) : null}
            </div>
          </div>

          {loadingDetail ? (
            <div className="flex min-h-[520px] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-[#0033A0]" />
            </div>
          ) : !selectedTrace ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Select a Sandy run to inspect its trace.
            </div>
          ) : (
            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Run Summary</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses(selectedTrace.status)}`}
                    >
                      {selectedTrace.status}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-slate-900">Operator</dt>
                      <dd>{selectedTrace.user.name} ({selectedTrace.user.email})</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Session</dt>
                      <dd className="break-all">{selectedTrace.sessionId}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Started</dt>
                      <dd>{formatTimestamp(selectedTrace.startedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Completed</dt>
                      <dd>{formatTimestamp(selectedTrace.completedAt, 'In progress')}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Duration</dt>
                      <dd>{formatDuration(selectedTrace.durationMs)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Model</dt>
                      <dd>{selectedTrace.modelName ?? 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Current page</dt>
                      <dd>{selectedTrace.currentPage ?? 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Message count</dt>
                      <dd>{selectedTrace.requestMessageCount}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tool calls
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        {selectedTrace.toolCallCount}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Approvals
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        {selectedTrace.approvalCount}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Errors
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        {selectedTrace.errorCount}
                      </div>
                    </div>
                  </div>

                  {selectedTrace.failureMessage ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                        <AlertTriangle className="size-4" />
                        Failure message
                      </div>
                      <p className="mt-2 text-sm text-rose-700">
                        {selectedTrace.failureMessage}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5">
                  <h3 className="text-base font-bold text-slate-900">Integration Snapshot</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Captured from the persisted integration control plane at execution start.
                  </p>

                  <div className="mt-4 space-y-3">
                    {selectedTrace.integrations.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-slate-500">
                        No integration snapshot was stored for this run.
                      </div>
                    ) : (
                      selectedTrace.integrations.map((integration) => (
                        <div
                          key={integration.id}
                          className="rounded-2xl border border-gray-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-slate-900">
                              {integration.name}
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${integrationStatusClasses(integration.status)}`}
                            >
                              {integration.status.replace('_', ' ')}
                            </span>
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                              {integration.mode.toLowerCase()}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-slate-600">
                            {integration.systemLabel} · {integration.providerLabel}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {integration.capabilities.map((capability) => (
                              <span
                                key={`${integration.id}-${capability}`}
                                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0033A0]"
                              >
                                {capability}
                              </span>
                            ))}
                          </div>

                          <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                            <div>
                              <dt className="font-semibold text-slate-900">Configured</dt>
                              <dd>{integration.configured ? 'Yes' : 'No'}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-900">Auth mode</dt>
                              <dd>{integration.authMode ?? 'None'}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-900">Base URL</dt>
                              <dd className="break-all">{integration.baseUrl ?? 'Not set'}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-900">Last checked</dt>
                              <dd>{formatTimestamp(integration.lastCheckedAt)}</dd>
                            </div>
                          </dl>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-3xl border border-gray-200 bg-white p-5">
                  <h3 className="text-base font-bold text-slate-900">Request Context</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Stored request messages for this run.
                  </p>

                  <div className="mt-4 space-y-3">
                    {selectedTrace.requestMessages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-slate-500">
                        No request messages were stored.
                      </div>
                    ) : (
                      selectedTrace.requestMessages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={`rounded-2xl border px-4 py-3 ${
                            message.role === 'user'
                              ? 'border-blue-100 bg-blue-50'
                              : 'border-gray-200 bg-slate-50'
                          }`}
                        >
                          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            {message.role}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                            {message.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5">
                  <h3 className="text-base font-bold text-slate-900">Final Response</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Concatenated assistant text emitted during the run.
                  </p>

                  <div className="mt-4 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-4">
                    {selectedTrace.finalResponse ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {selectedTrace.finalResponse}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No final response text was stored for this run.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5">
                <h3 className="text-base font-bold text-slate-900">Execution Timeline</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ordered event log from the live agent stream.
                </p>

                <div className="mt-4 space-y-3">
                  {selectedTrace.events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-slate-500">
                      No execution events were stored for this run.
                    </div>
                  ) : (
                    selectedTrace.events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-gray-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                              #{event.sequence}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${eventTypeClasses(event.eventType)}`}
                            >
                              {event.eventType.replace('_', ' ')}
                            </span>
                            {event.toolName ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0033A0]">
                                {event.toolName}
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-slate-500">
                            {formatTimestamp(event.createdAt)}
                          </div>
                        </div>

                        {(event.toolCallId || event.approvalId) ? (
                          <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                            {event.toolCallId ? (
                              <div>
                                <span className="font-semibold text-slate-900">Tool call:</span>{' '}
                                {event.toolCallId}
                              </div>
                            ) : null}
                            {event.approvalId ? (
                              <div>
                                <span className="font-semibold text-slate-900">Approval:</span>{' '}
                                {event.approvalId}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                          <pre className="max-h-72 overflow-x-auto overflow-y-auto px-4 py-3 text-xs text-slate-100">
                            {JSON.stringify(event.payload ?? {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
