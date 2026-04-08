'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Loader2, Minus, ChevronRight, Pencil, X, Plus, ArrowRight, Compass, FileText, PenTool, Sparkles, Home } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../lib/auth-context'
import { useEnrichmentStream, EnrichedProfile } from '../hooks/useEnrichmentStream'
import { InterestTagInput } from '../components/InterestTagInput'
import StanceAssessment from '../components/ai-literacy/StanceAssessment'
import StanceMiniResult from '../components/ai-literacy/StanceMiniResult'
import InlinePolicyLite from '../components/ai-literacy/InlinePolicyLite'
import InlineScannerCompact from '../components/ai-literacy/InlineScannerCompact'
import { STANCE_QUESTIONS } from '../lib/stance-constants'
import type { AIStance, DisciplineFamily } from '../generated/prisma'

// ─── Intent options ───────────────────────────────────────────────────────────

const EDUCATOR_INTENTS = [
  { id: 'course-tools', icon: '📚', label: 'Find tools for a course',        description: "I'll add them to a specific class" },
  { id: 'browse',       icon: '🔍', label: "Browse what's available",         description: 'Show me the marketplace' },
  { id: 'referred',     icon: '💬', label: 'A colleague recommended a tool',  description: "I know what I'm looking for" },
  { id: 'explore',      icon: '🚀', label: 'Just exploring',                  description: 'Show me something interesting' },
]

const STUDENT_INTENTS = [
  { id: 'assignment',   icon: '✏️', label: 'I have an assignment to work on', description: 'Point me to the right tool' },
  { id: 'browse',       icon: '🔍', label: "Browse what's available",         description: 'Show me the marketplace' },
  { id: 'referred',     icon: '💬', label: 'My professor recommended a tool', description: "I know what I'm looking for" },
  { id: 'explore',      icon: '🚀', label: 'Just exploring',                  description: 'Show me something interesting' },
]

// ─── Step 1: Email Entry ──────────────────────────────────────────────────────

function EmailStep({ onContinue }: { onContinue: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const normalized = email.trim().toLowerCase()
    if (!normalized) { setError('Please enter your email address.'); return }
    if (!normalized.endsWith('@uky.edu')) {
      setError('Use the format you@uky.edu — the same email you use for Canvas.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      })
      const data = await res.json() as { exists?: boolean; error?: string }
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      if (data.exists) {
        setError('An account with that email already exists. Try signing in instead.')
        return
      }
      onContinue(normalized)
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-uk-blue mb-4">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">University of Kentucky</h1>
          <p className="mt-2 text-gray-500 text-sm">
            UK&apos;s AI-powered educational tool marketplace
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your UK email — we&apos;ll find the rest.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                UK Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@uky.edu"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-uk-blue/30 focus:border-uk-blue transition"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-uk-blue hover:bg-[#002280] text-white font-medium py-3 px-4 rounded-xl transition disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>Continue <ChevronRight className="size-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Streaming Reveal ─────────────────────────────────────────────────

const STEP_DISPLAY_LABELS: Record<string, string> = {
  'Identifying name from email':          'Finding your name',
  'Searching faculty directory':           'Looking you up in the UK directory',
  'Searching student directory':           'Looking you up in the UK directory',
  'Extracting interests from bio':         'Identifying your interests',
  'Fetching course list':                  'Finding your courses',
  'Inferring department from email':       'Identifying your department',
  'Inferring role from email':             'Determining your role',
  'Looking up college from department':    'Finding your college',
}

function displayLabel(raw: string): string {
  return STEP_DISPLAY_LABELS[raw] ?? raw
}

type StreamingStepProps = {
  email: string
  onComplete: (profile: EnrichedProfile, confidence: 'high' | 'medium' | 'low') => void
  onError: () => void
}

function StepIcon({ status }: { status: 'pending' | 'success' | 'skip' | 'waiting' }) {
  if (status === 'success') return (
    <span className="flex items-center justify-center size-5 rounded-full bg-green-100">
      <Check className="size-3 text-green-600" />
    </span>
  )
  if (status === 'pending') return (
    <span className="flex items-center justify-center size-5">
      <Loader2 className="size-4 text-amber-500 animate-spin" />
    </span>
  )
  if (status === 'skip') return (
    <span className="flex items-center justify-center size-5 rounded-full bg-gray-100">
      <Minus className="size-3 text-gray-400" />
    </span>
  )
  // waiting
  return (
    <span className="size-5 flex items-center justify-center">
      <span className="size-1.5 rounded-full bg-gray-300" />
    </span>
  )
}

function StreamingStep({ email, onComplete, onError }: StreamingStepProps) {
  const { steps, fields, profile, confidence, status, errorMessage } = useEnrichmentStream(email)

  useEffect(() => {
    if (status === 'complete' && profile && confidence) {
      // Small delay so user sees the final "✓ Done" state
      const t = setTimeout(() => onComplete(profile, confidence), 600)
      return () => clearTimeout(t)
    }
    if (status === 'error') {
      const t = setTimeout(() => onError(), 1200)
      return () => clearTimeout(t)
    }
  }, [status, profile, confidence, onComplete, onError])

  const nameField = fields['name']
  const titleField = fields['title']
  const deptField = fields['department']

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-uk-blue mb-4">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Setting up your profile...</h2>
          <p className="text-sm text-gray-400 mt-1">{email}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 space-y-3">
          {steps.filter((s) => s.status !== 'skip').map((s, i) => (
            <div key={i} className="flex items-start gap-3 animate-fade-in">
              <StepIcon status={s.status} />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700">
                  {displayLabel(s.step)}
                </span>
                {/* Inline field reveals */}
                {s.step.includes('Identifying') && nameField && (
                  <p className="text-xs text-uk-blue font-medium mt-0.5">
                    {String(nameField.value)}
                  </p>
                )}
                {s.step.includes('directory') && (titleField || deptField) && (
                  <p className="text-xs text-uk-blue font-medium mt-0.5">
                    {[titleField && String(titleField.value), deptField && String(deptField.value)]
                      .filter(Boolean).join(' • ')}
                  </p>
                )}
                {s.step.includes('courses') && fields['courses'] && (
                  <p className="text-xs text-uk-blue font-medium mt-0.5">
                    {(fields['courses'].value as { code: string }[]).map((c) => c.code).join(', ')}
                  </p>
                )}
                {s.step.includes('interests') && fields['interests'] && (
                  <p className="text-xs text-uk-blue font-medium mt-0.5">
                    {(fields['interests'].value as { tag: string }[]).map((t) => t.tag).join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}

          {status === 'streaming' && steps.length === 0 && (
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 text-amber-500 animate-spin" />
              <span className="text-sm text-gray-500">Starting...</span>
            </div>
          )}

          {/* ── Profile field reveal ─────────────────────────────────────── */}
          {(() => {
            const REVEAL_FIELDS = [
              { key: 'name',       label: 'Name'       },
              { key: 'title',      label: 'Title'      },
              { key: 'department', label: 'Department' },
              { key: 'college',    label: 'College'    },
              { key: 'interests',  label: 'Interests'  },
            ]
            const hasAny = REVEAL_FIELDS.some(f => fields[f.key] != null)
            if (!hasAny) return null
            const lastArrivedIdx = REVEAL_FIELDS.reduce(
              (acc, f, i) => (fields[f.key] != null ? i : acc), -1
            )
            return (
              <div className="border-t border-gray-100 pt-3 space-y-2.5">
                {REVEAL_FIELDS.map(({ key, label }, idx) => {
                  const field = fields[key]
                  const isActive = idx === lastArrivedIdx && status === 'streaming'
                  return (
                    <div key={key} className="flex items-start gap-3">
                      <span className="text-xs text-gray-400 w-24 pt-0.5 shrink-0">{label}</span>
                      {field ? (
                        <div className="flex items-center gap-1.5 flex-1 transition-opacity duration-500">
                          {key === 'interests' ? (
                            <div className="flex flex-wrap gap-1">
                              {(field.value as { tag: string }[]).slice(0, 4).map(t => (
                                <span key={t.tag} className="text-xs bg-blue-50 text-uk-blue px-2 py-0.5 rounded-full font-medium">
                                  {t.tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-800 font-medium">{String(field.value)}</span>
                          )}
                          {isActive && <Loader2 className="size-3 text-gray-300 animate-spin shrink-0" />}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-1.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-32" />
                          {isActive && <Loader2 className="size-3 text-amber-400 animate-spin shrink-0" />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {status === 'error' && (
            <div className="flex items-center gap-3 text-amber-600">
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Profile Confirmation ─────────────────────────────────────────────

// ─── Current semester constant ───────────────────────────────────────────────
const CURRENT_SEMESTER = 'Spring 2026'

// ─── Course import types ──────────────────────────────────────────────────────
type CourseImportItem = {
  code: string
  name: string
  semester: string
  source: string
  confidence: 'high' | 'medium' | 'low'
  checked: boolean
}

type ConfirmationProps = {
  email: string
  initialProfile: EnrichedProfile
  confidence: 'high' | 'medium' | 'low'
  onSuccess: (name: string, role: 'EDUCATOR' | 'STUDENT' | 'ADMIN') => void
}

/** True when the email prefix is a LinkBlue ID (no dots, has a digit) */
function detectLinkBlue(email: string): boolean {
  const prefix = email.split('@')[0]
  return !prefix.includes('.') && /\d/.test(prefix)
}

function ProfileConfirmation({ email, initialProfile, confidence, onSuccess }: ConfirmationProps) {
  const { addCreatedUser } = useAuth()
  const isLinkBlue = detectLinkBlue(email)

  // LinkBlue IDs (e.g. tsthe2) are not real names — start with blank so user fills in
  const [name, setName] = useState(isLinkBlue ? '' : initialProfile.name)
  const [role, setRole] = useState<'EDUCATOR' | 'STUDENT' | 'ADMIN'>(initialProfile.role)
  const [title, setTitle] = useState(initialProfile.title ?? '')
  const [department, setDepartment] = useState(initialProfile.department ?? '')
  const [college, setCollege] = useState(initialProfile.college ?? '')
  // ── Course import state ─────────────────────────────────────────────────────
  const [courseItems, setCourseItems] = useState<CourseImportItem[]>(() =>
    initialProfile.courses.map((c) => ({
      code: c.code,
      name: c.name,
      semester: CURRENT_SEMESTER,
      source: 'ai-enrichment',
      confidence: 'high' as const,
      checked: true,
    }))
  )
  const [showManualCourse, setShowManualCourse] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualSemester, setManualSemester] = useState(CURRENT_SEMESTER)

  // ── Interest state ──────────────────────────────────────────────────────────
  // enrichedTags: from LLM profile (pre-selected by default)
  // deselectedEnriched: enriched tags the user toggled off
  // platformSuggestions: from /api/onboarding/interest-suggestions (dashed border, not pre-selected)
  // selectedSuggested: platform tags the user tapped to add
  // customTags: additional tags entered via InterestTagInput
  const enrichedTags = initialProfile.interests
  const [deselectedEnriched, setDeselectedEnriched] = useState<Set<string>>(new Set())
  const [platformSuggestions, setPlatformSuggestions] = useState<string[]>([])
  const [selectedSuggested, setSelectedSuggested] = useState<Set<string>>(new Set())
  const [customTags, setCustomTags] = useState<string[]>([])

  const [editing, setEditing] = useState(confidence !== 'high')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch platform suggestions once we know department + role
  useEffect(() => {
    const alreadyShown = [...enrichedTags]
    const params = new URLSearchParams({ role })
    if (initialProfile.department) params.set('department', initialProfile.department)
    if (initialProfile.title) params.set('title', initialProfile.title)
    if (alreadyShown.length) params.set('exclude', alreadyShown.join(','))

    fetch(`/api/onboarding/interest-suggestions?${params}`)
      .then((r) => r.json())
      .then((d: { suggestions?: string[] }) => {
        if (d.suggestions) setPlatformSuggestions(d.suggestions)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confidenceLabel = isLinkBlue && confidence === 'low'
    ? 'Enter your details'
    : { high: 'We found you', medium: 'Partial match', low: "We couldn't find you" }[confidence]
  const confidenceColor = isLinkBlue && confidence === 'low'
    ? 'text-uk-blue'
    : { high: 'text-green-600', medium: 'text-amber-600', low: 'text-gray-500' }[confidence]
  const confidenceIcon = isLinkBlue && confidence === 'low'
    ? '→'
    : { high: '✓', medium: '~', low: '?' }[confidence]

  // Build final interest lists for submission
  const acceptedInterests = [
    ...enrichedTags
      .filter((t) => !deselectedEnriched.has(t))
      .map((t) => ({ tag: t, source: 'bio-extraction', accepted: true })),
    ...Array.from(selectedSuggested).map((t) => ({ tag: t, source: 'department-taxonomy', accepted: true })),
    ...customTags.map((t) => ({ tag: t, source: 'free-form', accepted: true })),
  ]
  const rejectedInterests = enrichedTags
    .filter((t) => deselectedEnriched.has(t))
    .map((t) => ({ tag: t, source: 'bio-extraction', accepted: false }))

  const addManualCourse = () => {
    const code = manualCode.trim().toUpperCase()
    const name = manualName.trim()
    if (!code || !name) return
    if (courseItems.find((c) => c.code === code)) return
    setCourseItems((prev) => [...prev, {
      code, name,
      semester: manualSemester || CURRENT_SEMESTER,
      source: 'manual',
      confidence: 'high',
      checked: true,
    }])
    setManualCode('')
    setManualName('')
    setManualSemester(CURRENT_SEMESTER)
    setShowManualCourse(false)
  }

  const handleSubmit = async () => {
    setError(null)
    if (!name.trim()) {
      setError('Please enter your full name.')
      setEditing(true)
      return
    }
    setSubmitting(true)
    try {
      // 1. Create account
      const res = await fetch('/api/onboarding/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name.trim(),
          role,
          title: title.trim() || null,
          department: department.trim() || null,
          college: college.trim() || null,
          enrichmentSource: 'ai-inferred',
          enrichmentConfidence: confidence,
          interests: [...acceptedInterests, ...rejectedInterests],
        }),
      })
      const data = await res.json() as { user?: { id: string; name: string; email: string; role: string }; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to create account.'); return }

      // Register in auth context so they're immediately logged in
      addCreatedUser({
        id: data.user!.id,
        name: data.user!.name,
        email: data.user!.email,
        role: data.user!.role as 'EDUCATOR' | 'STUDENT' | 'ADMIN',
        department: department.trim() || '',
        college: college.trim() || '',
      })

      // 2. Import courses (educators only, best-effort — don't block onboarding)
      const selectedCourses = courseItems.filter((c) => c.checked)
      if (role === 'EDUCATOR' && selectedCourses.length > 0) {
        try {
          await fetch('/api/onboarding/import-courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              courses: selectedCourses.map((c) => ({
                code: c.code,
                name: c.name,
                semester: c.semester,
                source: c.source,
                confidence: c.confidence,
              })),
            }),
          })
        } catch {
          // Non-blocking — courses can be added later
        }
      }

      onSuccess(name.trim(), role)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Entrance animation ──────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-uk-blue/30 focus:border-uk-blue transition'
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-10">
      <div
        className="w-full max-w-lg transition-all duration-[400ms] ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-uk-blue mb-4">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <span className={`text-sm font-semibold ${confidenceColor}`}>
                {confidenceIcon} {confidenceLabel}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">{email}</p>
            </div>
            <button
              onClick={() => setEditing((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-uk-blue transition px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <Pencil className="size-3" />
              {editing ? 'Done editing' : 'Edit'}
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Name + Role */}
            {isLinkBlue && editing && (
              <p className="text-xs text-uk-blue bg-blue-50 rounded-lg px-3 py-2">
                Your UK email uses a LinkBlue ID. Please enter your full name below.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name{isLinkBlue ? ' *' : ''}</label>
                {editing ? (
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isLinkBlue ? 'Your full name' : undefined}
                    autoFocus={isLinkBlue}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">{name || '—'}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Role</label>
                {editing ? (
                  <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as 'EDUCATOR' | 'STUDENT' | 'ADMIN')}>
                    <option value="EDUCATOR">Educator</option>
                    <option value="STUDENT">Student</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-gray-900 capitalize">{role.toLowerCase()}</p>
                )}
              </div>
            </div>

            {/* Title + College — educators only */}
            {role === 'EDUCATOR' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Title</label>
                  {editing ? (
                    <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Associate Professor" />
                  ) : (
                    <p className="text-sm text-gray-700">{title || <span className="text-gray-300">—</span>}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>College</label>
                  {editing ? (
                    <input className={inputClass} value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. College of Engineering" />
                  ) : (
                    <p className="text-sm text-gray-700">{college || <span className="text-gray-300">—</span>}</p>
                  )}
                </div>
              </div>
            )}

            {/* Department — educators only */}
            {role === 'EDUCATOR' && (
              <div>
                <label className={labelClass}>Department</label>
                {editing ? (
                  <input className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Technology, Entrepreneurship & Knowledge" />
                ) : (
                  <p className="text-sm text-gray-700">{department || <span className="text-gray-300">—</span>}</p>
                )}
              </div>
            )}

            {/* Courses — educator course import */}
            {role === 'EDUCATOR' && (
              <div>
                <label className={labelClass}>
                  Courses we found
                  <span className="ml-1 text-gray-400 font-normal">(select the ones to import)</span>
                </label>

                <div className="space-y-2 mb-3">
                  {courseItems.map((item) => (
                    <label
                      key={item.code}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        item.checked
                          ? 'border-uk-blue/30 bg-uk-blue/5'
                          : 'border-gray-200 bg-white opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() =>
                          setCourseItems((prev) =>
                            prev.map((c) => c.code === item.code ? { ...c, checked: !c.checked } : c)
                          )
                        }
                        className="mt-0.5 accent-uk-blue"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {item.code}
                          </span>
                          <span className="text-sm text-gray-500">{item.name}</span>
                          {item.confidence === 'low' && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              not sure this is yours
                            </span>
                          )}
                          {item.source === 'manual' && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                              manual
                            </span>
                          )}
                        </div>
                        {item.semester && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.semester}</p>
                        )}
                      </div>
                      {item.checked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setCourseItems((prev) => prev.filter((c) => c.code !== item.code))
                          }}
                          className="text-gray-300 hover:text-red-400 transition"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </label>
                  ))}

                  {courseItems.length === 0 && !showManualCourse && (
                    <p className="text-sm text-gray-400 italic py-1">No courses found automatically.</p>
                  )}
                </div>

                {/* Manual course add */}
                {showManualCourse ? (
                  <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-medium text-gray-600">Add a course manually</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Course code</label>
                        <input
                          className={inputClass}
                          placeholder="TEK-400"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Semester</label>
                        <select
                          className={inputClass}
                          value={manualSemester}
                          onChange={(e) => setManualSemester(e.target.value)}
                        >
                          <option>Spring 2026</option>
                          <option>Fall 2026</option>
                          <option>Summer 2026</option>
                          <option>Fall 2025</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Course name</label>
                      <input
                        className={inputClass}
                        placeholder="Advanced Venture Lab"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualCourse() } }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addManualCourse}
                        disabled={!manualCode.trim() || !manualName.trim()}
                        className="px-4 py-1.5 bg-uk-blue text-white text-xs font-medium rounded-lg transition disabled:opacity-50 hover:bg-[#002280]"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualCourse(false)}
                        className="px-4 py-1.5 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowManualCourse(true)}
                    className="flex items-center gap-1.5 text-xs text-uk-blue hover:text-[#002280] transition"
                  >
                    <Plus className="size-3.5" />
                    Add a course manually
                  </button>
                )}

                {courseItems.some((c) => c.checked) && (
                  <p className="text-xs text-gray-400 mt-2">
                    We&apos;ll create course spaces for the checked ones. You can add, remove, or configure them at any time.
                  </p>
                )}
              </div>
            )}

            {/* ── Interests ──────────────────────────────────────────────── */}
            <div>
              <label className={labelClass}>
                Interests
                <span className="ml-1 text-gray-400 font-normal">
                  {enrichedTags.length > 0 ? '(tap to toggle — we pre-selected these from your profile)' : '(add topics you care about)'}
                </span>
              </label>

              {/* Unified tag pool — enriched pre-selected, suggestions not, all look identical */}
              {(enrichedTags.length > 0 || platformSuggestions.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Enriched tags — pre-selected, click to deselect */}
                  {enrichedTags.map((tag) => {
                    const active = !deselectedEnriched.has(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => setDeselectedEnriched((prev) => {
                          const next = new Set(prev)
                          if (next.has(tag)) next.delete(tag)
                          else next.add(tag)
                          return next
                        })}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition ${
                          active
                            ? 'bg-uk-blue text-white border-uk-blue'
                            : 'bg-white text-gray-300 border-gray-200'
                        }`}
                      >
                        {active && <Check className="size-2.5" />}
                        {tag}
                      </button>
                    )
                  })}
                  {/* Platform suggestions — not pre-selected, click to add */}
                  {platformSuggestions.map((tag) => {
                    const active = selectedSuggested.has(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => setSelectedSuggested((prev) => {
                          const next = new Set(prev)
                          if (next.has(tag)) next.delete(tag)
                          else next.add(tag)
                          return next
                        })}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition ${
                          active
                            ? 'bg-uk-blue text-white border-uk-blue'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-uk-blue hover:text-uk-blue'
                        }`}
                      >
                        {active ? <Check className="size-2.5" /> : <Plus className="size-2.5" />}
                        {tag}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Interest tag input with API-backed autocomplete */}
              <InterestTagInput
                tags={customTags}
                onChange={setCustomTags}
                exclude={[...enrichedTags, ...platformSuggestions]}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              {editing ? 'Preview' : 'Edit anything above'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim()}
              className="flex items-center gap-2 bg-uk-blue hover:bg-[#002280] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>This looks right <ChevronRight className="size-4" /></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          All details can be changed later in your profile settings.
        </p>
      </div>
    </div>
  )
}

// ─── Step 4: Intent ───────────────────────────────────────────────────────────

type IntentStepProps = {
  name: string
  role: 'EDUCATOR' | 'STUDENT' | 'ADMIN'
  email: string
  onComplete: (redirectUrl: string) => void
}

function IntentStep({ name, role, email, onComplete }: IntentStepProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [referredQuery, setReferredQuery] = useState('')
  const [showReferred, setShowReferred]   = useState(false)

  const intents   = role === 'STUDENT' ? STUDENT_INTENTS : EDUCATOR_INTENTS
  const firstName = name.split(' ')[0]

  async function handleIntent(intentId: string, toolQuery?: string) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/set-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': email },
        body: JSON.stringify({ intent: intentId, toolQuery: toolQuery ?? null }),
      })
      let redirectUrl = '/'
      if (res.ok) {
        const data = await res.json() as { redirectUrl: string; sandyPrompt: string | null }
        redirectUrl = data.redirectUrl ?? '/'
        if (data.sandyPrompt) {
          try { localStorage.setItem('uky-sandy-intent-prompt', data.sandyPrompt) } catch {}
        }
      }
      onComplete(redirectUrl)
    } catch {
      setError('Something went wrong — taking you home.')
      setTimeout(() => onComplete('/'), 1500)
    } finally {
      setSubmitting(false)
    }
  }

  const cardClass = 'flex flex-col items-start gap-1 rounded-2xl border-2 border-gray-200 p-4 text-left transition-all hover:border-uk-blue hover:bg-blue-50 disabled:opacity-50'

  if (showReferred) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
            <h2 className="text-xl font-extrabold text-gray-900">What course are you working on?</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your course number and we&apos;ll show you the right tools.
            </p>
            <div className="mt-5">
              <input
                type="text"
                autoFocus
                value={referredQuery}
                onChange={(e) => setReferredQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) handleIntent('referred', referredQuery) }}
                placeholder="e.g. ENG 201, LAW 756, CS 215"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue focus:border-transparent"
              />
              <p className="mt-1.5 text-xs text-gray-400">Course number, name, or subject — anything works.</p>
            </div>
            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            <button
              type="button"
              disabled={submitting || !referredQuery.trim()}
              onClick={() => handleIntent('referred', referredQuery)}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-uk-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#002280] disabled:opacity-40 transition-colors"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? 'Loading…' : 'Find tools for this course'}
              {!submitting && <ArrowRight className="size-4" />}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleIntent('browse')}
              className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              Skip — take me to the marketplace
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-uk-blue mb-4">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
          <h2 className="text-xl font-extrabold text-gray-900">One last thing, {firstName} —</h2>
          <p className="mt-1 text-sm text-gray-500">What brings you to the University of Kentucky platform today?</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {intents.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={submitting}
                onClick={() => { opt.id === 'referred' ? setShowReferred(true) : handleIntent(opt.id) }}
                className={cardClass}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-bold text-gray-900">{opt.label}</span>
                <span className="text-xs text-gray-500">{opt.description}</span>
              </button>
            ))}
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <button
            type="button"
            disabled={submitting}
            onClick={() => onComplete('/')}
            className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            {submitting ? 'Loading…' : 'Skip for now →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AI Literacy Guided Onboard ──────────────────────────────────────────────

const LITERACY_STEPS = [
  { label: 'Discover your stance', icon: Compass, color: 'bg-blue-50 text-blue-600' },
  { label: 'Build a course policy', icon: FileText, color: 'bg-amber-50 text-amber-600' },
  { label: 'Scan an assignment', icon: PenTool, color: 'bg-red-50 text-red-600' },
]

type LiteracyPhase = 'intro' | 'stance' | 'stance-result' | 'policy' | 'scan'

function AILiteracyOnboard() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [phase, setPhase] = useState<LiteracyPhase>('intro')
  const [currentStep, setCurrentStep] = useState(0)
  const [stanceResult, setStanceResult] = useState<{ stance: string; score: number } | null>(null)
  const [policyName, setPolicyName] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Resume from saved progress (and restore stance if available)
  useEffect(() => {
    fetch('/api/ai-literacy/quick-start', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then((data: { quickStartStep?: number; quickStartCompleted?: boolean; hasStance?: boolean; stance?: string | null }) => {
        if (data.quickStartCompleted) {
          router.push('/onboard/complete')
          return
        }
        if (data.stance) {
          setStanceResult({ stance: data.stance, score: 0 })
        }
        if (data.quickStartStep && data.quickStartStep > 0) {
          setCurrentStep(data.quickStartStep)
          if (data.quickStartStep === 1) setPhase('policy')
          else if (data.quickStartStep === 2) setPhase('scan')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser.email, router])

  const saveProgress = useCallback(async (step: number, completed = false) => {
    await fetch('/api/ai-literacy/quick-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ step, completed }),
    }).catch(() => {})
  }, [currentUser.email])

  const handleStanceComplete = useCallback(async (
    responses: { questionId: string; selectedValue: number; optionLabel: string }[],
    disciplineFamily?: DisciplineFamily,
    reflectionNote?: string
  ) => {
    const res = await fetch('/api/ai-literacy/stance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ responses, disciplineFamily, reflectionNote }),
    })
    if (res.ok) {
      const data = await res.json()
      setStanceResult({ stance: data.stance, score: data.score })
      setPhase('stance-result')
      try { const gp = JSON.parse(localStorage.getItem('golden-path-progress') || '{}'); gp.stance = true; localStorage.setItem('golden-path-progress', JSON.stringify(gp)) } catch {}
      void saveProgress(1)
    }
  }, [currentUser.email, saveProgress])

  // Build completion URL params from current state
  const buildCompletionParams = useCallback(() => {
    const params = new URLSearchParams()
    if (stanceResult?.stance) params.set('stance', stanceResult.stance)
    if (policyName) params.set('policyName', policyName)
    return params
  }, [stanceResult, policyName])

  // Early exit — user clicks "I'm done for now" at any point
  const handleEarlyExit = useCallback(() => {
    void saveProgress(currentStep, true)
    const params = buildCompletionParams()
    if (scanCount > 0) params.set('scanCount', String(scanCount))
    router.push(`/onboard/complete?${params.toString()}`)
  }, [saveProgress, currentStep, buildCompletionParams, scanCount, router])

  const handlePolicyComplete = useCallback(() => {
    try {
      const stored = localStorage.getItem('uky-last-policy-name')
      if (stored) setPolicyName(stored)
    } catch {}
    try { const gp = JSON.parse(localStorage.getItem('golden-path-progress') || '{}'); gp.policy = true; localStorage.setItem('golden-path-progress', JSON.stringify(gp)) } catch {}
    setCurrentStep(2)
    setPhase('scan')
    void saveProgress(2)
  }, [saveProgress])

  const handlePolicySkip = useCallback(() => {
    setCurrentStep(2)
    setPhase('scan')
    void saveProgress(2)
  }, [saveProgress])

  const handleScanComplete = useCallback(() => {
    const newCount = scanCount + 1
    setScanCount(newCount)
    try { const gp = JSON.parse(localStorage.getItem('golden-path-progress') || '{}'); gp.scan = true; localStorage.setItem('golden-path-progress', JSON.stringify(gp)) } catch {}
    void saveProgress(3, true)
    const params = buildCompletionParams()
    params.set('scanCount', String(newCount))
    router.push(`/onboard/complete?${params.toString()}`)
  }, [saveProgress, scanCount, buildCompletionParams, router])

  const handleScanSkip = useCallback(() => {
    void saveProgress(3, true)
    const params = buildCompletionParams()
    if (scanCount > 0) params.set('scanCount', String(scanCount))
    router.push(`/onboard/complete?${params.toString()}`)
  }, [saveProgress, buildCompletionParams, scanCount, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-6 text-uk-blue animate-spin" />
      </div>
    )
  }

  // ── Intro hero ──────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="size-16 rounded-2xl bg-uk-blue flex items-center justify-center mx-auto mb-6">
            <Sparkles className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            Let&apos;s get your first course set up
          </h1>
          <p className="text-gray-500 mb-10 max-w-lg mx-auto">
            Three quick steps — most people finish in under 10 minutes. No right answers — every position is supported.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
            {LITERACY_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${step.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{step.label}</span>
                  {i < LITERACY_STEPS.length - 1 && <ArrowRight className="size-4 text-gray-300 hidden sm:block" />}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => { setCurrentStep(0); setPhase('stance') }}
              className="px-8 py-3 bg-uk-blue text-white rounded-lg font-semibold hover:bg-[#002880] transition-colors"
            >
              Get Started
            </button>
          </div>

          <Link href="/" className="inline-flex items-center gap-1.5 mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <Home className="size-3.5" />
            Skip to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Stepper + active phase ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-8 sm:pt-12">
      <div className="max-w-2xl mx-auto">
        {/* Progress stepper */}
        <div className="flex items-center gap-2 mb-8">
          {LITERACY_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i < currentStep ? 'bg-green-100 text-green-700' :
                i === currentStep ? 'bg-uk-blue text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < currentStep ? <Check className="size-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {i < LITERACY_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-green-200' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Skip escape hatch */}
        <div className="flex justify-end mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <Home className="size-3" />
            Skip to dashboard
          </Link>
        </div>

        {/* Phase content */}
        {phase === 'stance' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Discover Your AI Teaching Stance</h2>
            <StanceAssessment
              questions={STANCE_QUESTIONS}
              onComplete={handleStanceComplete}
              onCancel={() => router.push('/')}
            />
          </div>
        )}

        {phase === 'stance-result' && stanceResult && (
          <div className="space-y-6">
            <StanceMiniResult stance={stanceResult.stance as AIStance} score={stanceResult.score} />
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => { setCurrentStep(1); setPhase('policy'); void saveProgress(1) }}
                className="px-6 py-2.5 bg-uk-blue text-white rounded-lg text-sm font-medium hover:bg-[#002880] transition-colors"
              >
                Continue to Policy Builder
              </button>
              <button
                onClick={handleEarlyExit}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                I&apos;m done for now
              </button>
            </div>
          </div>
        )}

        {phase === 'policy' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Build a Course AI Policy</h2>
            <p className="text-sm text-gray-600 mb-4">
              {stanceResult?.stance ? (
                <>Your stance is <span className="font-semibold text-uk-blue">{stanceResult.stance.replace(/_/g, ' ')}</span>. Let&apos;s turn that into a concrete policy.</>
              ) : (
                <>Let&apos;s create a syllabus-ready AI policy for one of your courses.</>
              )}
            </p>
            <InlinePolicyLite
              stance={(stanceResult?.stance as AIStance) ?? 'GUIDED'}
              userEmail={currentUser.email}
              onComplete={handlePolicyComplete}
              onSkip={handlePolicySkip}
            />
          </div>
        )}

        {phase === 'scan' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Scan an Assignment</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste one of your assignment prompts to see how easily AI could complete it.
            </p>
            <InlineScannerCompact
              userEmail={currentUser.email}
              onComplete={handleScanComplete}
              onSkip={handleScanSkip}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root Orchestrator ────────────────────────────────────────────────────────

type Phase = 'email' | 'streaming' | 'confirm' | 'intent' | 'done'

export default function OnboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent')

  const [phase, setPhase]         = useState<Phase>('email')
  const [email, setEmail]         = useState('')
  const [profile, setProfile]     = useState<EnrichedProfile | null>(null)
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('low')
  const [confirmedName, setConfirmedName] = useState('')
  const [confirmedRole, setConfirmedRole] = useState<'EDUCATOR' | 'STUDENT' | 'ADMIN'>('STUDENT')

  // If intent=ai-literacy, render the guided AI literacy flow
  if (intent === 'ai-literacy') {
    return <AILiteracyOnboard />
  }

  const handleEmailContinue = (e: string) => {
    setEmail(e)
    setPhase('streaming')
  }

  const handleStreamComplete = (p: EnrichedProfile, c: 'high' | 'medium' | 'low') => {
    setProfile(p)
    setConfidence(c)
    setPhase('confirm')
  }

  const handleStreamError = () => {
    // Build a blank profile for manual entry
    setProfile({
      name: email.split('@')[0].split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      role: 'STUDENT',
      title: null,
      department: null,
      college: null,
      interests: [],
      courses: [],
    })
    setConfidence('low')
    setPhase('confirm')
  }

  const handleSuccess = (name: string, role: 'EDUCATOR' | 'STUDENT' | 'ADMIN') => {
    setConfirmedName(name)
    setConfirmedRole(role)
    try {
      const firstName = name.split(' ')[0]
      if (firstName) localStorage.setItem('uky-just-onboarded', firstName)
    } catch {}
    setPhase('intent')
  }

  const handleIntentComplete = (redirectUrl: string) => {
    setPhase('done')
    router.push(redirectUrl)
  }

  if (phase === 'email') {
    return <EmailStep onContinue={handleEmailContinue} />
  }

  if (phase === 'streaming') {
    return (
      <StreamingStep
        email={email}
        onComplete={handleStreamComplete}
        onError={handleStreamError}
      />
    )
  }

  if (phase === 'confirm' && profile) {
    return (
      <ProfileConfirmation
        email={email}
        initialProfile={profile}
        confidence={confidence}
        onSuccess={handleSuccess}
      />
    )
  }

  if (phase === 'intent') {
    return (
      <IntentStep
        name={confirmedName}
        role={confirmedRole}
        email={email}
        onComplete={handleIntentComplete}
      />
    )
  }

  // 'done' — briefly shown before router.push kicks in
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 mb-4">
          <Check className="size-8 text-green-600" />
        </div>
        <p className="text-gray-700 font-medium">Account created! Taking you home...</p>
      </div>
    </div>
  )
}
