'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { DEMO_USERS, useAuth } from '../../lib/auth-context'
import type { UxAuditSection, UxAuditSectionId, UxAuditStep } from '../../lib/ux-audit'

type StepResponse = {
  worked?: 'yes' | 'partial' | 'no'
  frictionScore?: 0 | 1 | 2 | 3
  feeling?: 'calm' | 'uncertain' | 'frustrated'
  notes?: string
  suggestedFix?: string
}

type StepMeta = {
  sectionId: UxAuditSectionId
  sectionTitle: string
  step: UxAuditStep
}

const RESPONSE_STORAGE_KEY = 'sandbox-ux-audit-responses-v1'

function getInitialResponses() {
  if (typeof window === 'undefined') return {} as Record<string, StepResponse>
  try {
    const stored = localStorage.getItem(RESPONSE_STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as Record<string, StepResponse>
  } catch {
    return {}
  }
}

function getDemoUserForSection(sectionId: UxAuditSectionId) {
  if (sectionId === 'admin') return DEMO_USERS.find((user) => user.role === 'ADMIN') ?? null
  if (sectionId === 'educator') return DEMO_USERS.find((user) => user.role === 'EDUCATOR') ?? null
  if (sectionId === 'student') return DEMO_USERS.find((user) => user.role === 'STUDENT') ?? null
  return null
}

function buildReport(steps: StepMeta[], responses: Record<string, StepResponse>) {
  const completed = steps
    .map((meta) => ({ meta, response: responses[meta.step.id] }))
    .filter(({ response }) => response && response.frictionScore !== undefined)

  const severityGroups = {
    critical: completed.filter(({ response }) => response?.frictionScore === 3),
    real: completed.filter(({ response }) => response?.frictionScore === 2),
    minor: completed.filter(({ response }) => response?.frictionScore === 1),
    great: completed.filter(
      ({ response }) => response?.frictionScore === 0 && Boolean(response.notes?.trim())
    ),
  }

  return [
    '# UX Audit Report',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    '## Completed Steps',
    ...completed.flatMap(({ meta, response }) => [
      `### Step ${meta.step.stepNumber} - ${meta.step.title}`,
      `- Section: ${meta.sectionTitle}`,
      `- Did it work as expected? ${response?.worked ?? 'not answered'}`,
      `- Likely feeling: ${response?.feeling ?? 'not answered'}`,
      `- Friction score: ${response?.frictionScore ?? 'not scored'}`,
      `- Notes: ${response?.notes?.trim() || 'None recorded'}`,
      `- Suggested fix: ${response?.suggestedFix?.trim() || 'None recorded'}`,
      '',
    ]),
    '## Critical Blockers (Score 3)',
    ...(severityGroups.critical.length
      ? severityGroups.critical.map(
          ({ meta, response }) =>
            `- Step ${meta.step.stepNumber}: ${response?.notes?.trim() || meta.step.title} | Fix: ${response?.suggestedFix?.trim() || 'Not provided'}`
        )
      : ['- None recorded']),
    '',
    '## Real Problems (Score 2)',
    ...(severityGroups.real.length
      ? severityGroups.real.map(
          ({ meta, response }) =>
            `- Step ${meta.step.stepNumber}: ${response?.notes?.trim() || meta.step.title} | Fix: ${response?.suggestedFix?.trim() || 'Not provided'}`
        )
      : ['- None recorded']),
    '',
    '## Minor Polish (Score 1)',
    ...(severityGroups.minor.length
      ? severityGroups.minor.map(
          ({ meta, response }) =>
            `- Step ${meta.step.stepNumber}: ${response?.notes?.trim() || meta.step.title} | Fix: ${response?.suggestedFix?.trim() || 'Not provided'}`
        )
      : ['- None recorded']),
    '',
    '## What Felt Great',
    ...(severityGroups.great.length
      ? severityGroups.great.map(
          ({ meta, response }) => `- Step ${meta.step.stepNumber}: ${response?.notes?.trim() || meta.step.title}`
        )
      : ['- None recorded yet']),
  ].join('\n')
}

export default function UxAuditRunner({ sections }: { sections: UxAuditSection[] }) {
  const { currentUser, setCurrentUser } = useAuth()
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, StepResponse>>(getInitialResponses)
  const [selectedStepId, setSelectedStepId] = useState(() => sections[0]?.steps[0]?.id ?? '')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const steps = useMemo<StepMeta[]>(
    () =>
      sections.flatMap((section) =>
        section.steps.map((step) => ({
          sectionId: section.id,
          sectionTitle: section.title,
          step,
        }))
      ),
    [sections]
  )

  const selectedMeta = steps.find((entry) => entry.step.id === selectedStepId) ?? steps[0]
  const selectedResponse = responses[selectedMeta?.step.id ?? ''] ?? {}

  const updateResponse = (patch: Partial<StepResponse>) => {
    if (!selectedMeta) return
    setResponses((previous) => {
      const next = {
        ...previous,
        [selectedMeta.step.id]: {
          ...previous[selectedMeta.step.id],
          ...patch,
        },
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(RESPONSE_STORAGE_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  const selectedIndex = steps.findIndex((entry) => entry.step.id === selectedMeta?.step.id)
  const previousStep = selectedIndex > 0 ? steps[selectedIndex - 1] : null
  const nextStep = selectedIndex >= 0 && selectedIndex < steps.length - 1 ? steps[selectedIndex + 1] : null
  const report = buildReport(steps, responses)

  const findings = steps
    .map((entry) => ({
      entry,
      response: responses[entry.step.id],
    }))
    .filter(({ response }) => response?.frictionScore !== undefined)

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin-only UX Audit Runner</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This workflow is meant for platform QA and stewardship. Switch to an admin demo user to
            continue.
          </p>
          <button
            type="button"
            onClick={() => {
              const adminUser = DEMO_USERS.find((user) => user.role === 'ADMIN')
              if (adminUser) setCurrentUser(adminUser)
              router.push('/admin/ux-audit')
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-5 py-3 text-sm font-semibold text-white hover:bg-[#002580]"
          >
            <ShieldCheck className="h-4 w-4" />
            Switch to Admin
          </button>
        </div>
      </div>
    )
  }

  if (!selectedMeta) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-2xl font-bold text-slate-900">Audit Script Not Available</h1>
          <p className="mt-3 text-sm text-slate-600">
            The UX audit markdown could not be parsed into runnable steps.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0033A0] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">UX Audit Runner</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The markdown script is now a guided audit flow. It uses the live script file as source
            of truth, stores your notes locally in this browser, and exports a consolidated
            friction report.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(report)
              setCopyState('copied')
              window.setTimeout(() => setCopyState('idle'), 1500)
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Clipboard className="h-4 w-4" />
            {copyState === 'copied' ? 'Copied' : 'Copy Report'}
          </button>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const anchor = document.createElement('a')
              anchor.href = url
              anchor.download = `sandbox-ux-audit-${Date.now()}.md`
              anchor.click()
              URL.revokeObjectURL(url)
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white hover:bg-[#002580]"
          >
            <Download className="h-4 w-4" />
            Export Markdown
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
        <div className="font-semibold text-slate-900">Demo mapping note</div>
        <p className="mt-1 leading-6">
          The source script references Maya Johnson and James Rivera, but those exact mock-auth
          accounts do not exist in this repo. This runner maps the personas to the closest live demo
          users so the audit can actually be executed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          {sections.map((section) => {
            const demoUser = getDemoUserForSection(section.id)
            const completedCount = section.steps.filter(
              (step) => responses[step.id]?.frictionScore !== undefined
            ).length

            return (
              <div key={section.id} className="rounded-3xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">{section.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{section.description}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {completedCount}/{section.steps.length}
                  </span>
                </div>
                {demoUser ? (
                  <button
                    type="button"
                    onClick={() => setCurrentUser(demoUser)}
                    className="mt-3 w-full rounded-2xl border border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Use {demoUser.name} ({demoUser.email})
                  </button>
                ) : null}
                <div className="mt-4 space-y-2">
                  {section.steps.map((step) => {
                    const response = responses[step.id]
                    const isActive = step.id === selectedMeta.step.id
                    const isComplete = response?.frictionScore !== undefined

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setSelectedStepId(step.id)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-[#0033A0] text-white'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                            isComplete
                              ? 'bg-emerald-500'
                              : isActive
                                ? 'bg-white'
                                : 'bg-slate-300'
                          }`}
                        />
                        <span className="text-sm font-medium">
                          Step {step.stepNumber}
                          <span className={`block text-xs ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            {step.title}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </aside>

        <main className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0033A0]">
                  Step {selectedMeta.step.stepNumber}
                </div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{selectedMeta.step.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{selectedMeta.sectionTitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMeta.step.routeHints.map((routeHint) => (
                  <Link
                    key={routeHint}
                    href={routeHint}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {routeHint}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>

            {selectedMeta.step.instructions.length > 0 ? (
              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-900">Do this</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {selectedMeta.step.instructions.map((instruction) => (
                    <li key={instruction} className="rounded-2xl bg-slate-50 px-4 py-3">
                      {instruction}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {selectedMeta.step.observe.length > 0 ? (
              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-900">Observe</div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  {selectedMeta.step.observe.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  Did it work as expected?
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'partial', label: 'Partly' },
                    { value: 'no', label: 'No' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateResponse({ worked: option.value as StepResponse['worked'] })}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                        selectedResponse.worked === option.value
                          ? 'bg-[#0033A0] text-white'
                          : 'border border-gray-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  What would a real user likely feel?
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { value: 'calm', label: 'Calm' },
                    { value: 'uncertain', label: 'Uncertain' },
                    { value: 'frustrated', label: 'Frustrated' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateResponse({ feeling: option.value as StepResponse['feeling'] })
                      }
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                        selectedResponse.feeling === option.value
                          ? 'bg-slate-900 text-white'
                          : 'border border-gray-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-900">Friction score</label>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {[
                  { value: 0, label: '0 Smooth', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { value: 1, label: '1 Minor', style: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { value: 2, label: '2 Problem', style: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { value: 3, label: '3 Blocker', style: 'bg-red-50 text-red-700 border-red-200' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateResponse({
                        frictionScore: option.value as StepResponse['frictionScore'],
                      })
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                      selectedResponse.frictionScore === option.value
                        ? option.style
                        : 'border-gray-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  What was confusing, slow, or unclear?
                </label>
                <textarea
                  value={selectedResponse.notes ?? ''}
                  onChange={(event) => updateResponse({ notes: event.target.value })}
                  rows={5}
                  className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                  placeholder="Record the friction or, if this step felt great, note why."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900">Suggested fix</label>
                <textarea
                  value={selectedResponse.suggestedFix ?? ''}
                  onChange={(event) => updateResponse({ suggestedFix: event.target.value })}
                  rows={5}
                  className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                  placeholder="What would reduce the friction here?"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {selectedResponse.frictionScore !== undefined ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Saved locally in this browser
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Score this step to mark it complete
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {previousStep ? (
                  <button
                    type="button"
                    onClick={() => setSelectedStepId(previousStep.step.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </button>
                ) : null}
                {nextStep ? (
                  <button
                    type="button"
                    onClick={() => setSelectedStepId(nextStep.step.id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white hover:bg-[#002580]"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#0033A0]" />
              <h2 className="text-lg font-bold text-slate-900">Live Report Summary</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Completed', value: findings.length, tone: 'text-slate-900 bg-slate-100' },
                {
                  label: 'Critical',
                  value: findings.filter(({ response }) => response?.frictionScore === 3).length,
                  tone: 'text-red-800 bg-red-100',
                },
                {
                  label: 'Problems',
                  value: findings.filter(({ response }) => response?.frictionScore === 2).length,
                  tone: 'text-amber-800 bg-amber-100',
                },
                {
                  label: 'Minor',
                  value: findings.filter(({ response }) => response?.frictionScore === 1).length,
                  tone: 'text-blue-800 bg-blue-100',
                },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl px-4 py-4 ${item.tone}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                    {item.label}
                  </div>
                  <div className="mt-2 text-3xl font-bold">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {findings.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No scored findings yet. Complete a step to start building the report.
                </p>
              ) : (
                findings
                  .filter(({ response }) => (response?.frictionScore ?? 0) > 0)
                  .slice(0, 8)
                  .map(({ entry, response }) => (
                    <div key={entry.step.id} className="rounded-2xl border border-gray-200 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          Step {entry.step.stepNumber}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          Score {response?.frictionScore}
                        </span>
                        <span className="text-xs text-slate-400">{entry.sectionTitle}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {response?.notes?.trim() || entry.step.title}
                      </p>
                      {response?.suggestedFix?.trim() ? (
                        <p className="mt-1 text-xs font-medium text-[#0033A0]">
                          Fix: {response.suggestedFix.trim()}
                        </p>
                      ) : null}
                    </div>
                  ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
