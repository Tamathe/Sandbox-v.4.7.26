'use client'

import { useState } from 'react'
import {
  X,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Shield,
  Clock,
  Users,
  GraduationCap,
  MessageSquare,
  MoreHorizontal,
  FileQuestion,
  Scale,
} from 'lucide-react'
import { SkeletonCard } from '../ui/SkeletonCard'

// ── Types (mirror pdf-parser.ts) ─────────────────────────────────────────────

export interface ExtractedPolicy {
  category: 'late' | 'attendance' | 'grading' | 'academic_integrity' | 'communication' | 'other'
  title: string
  content: string
}

export interface ExtractedGradingWeight {
  category: string
  weight: number
  description: string | null
}

interface PolicyReviewStepProps {
  policies: ExtractedPolicy[]
  gradingWeights: ExtractedGradingWeight[]
  courseId: string
  userEmail: string
  onPoliciesChange: (policies: ExtractedPolicy[]) => void
  onGradingWeightsChange: (weights: ExtractedGradingWeight[]) => void
  onApplyComplete: () => void
  loading?: boolean
}

// ── Category config ──────────────────────────────────────────────────────────

type PolicyCategory = ExtractedPolicy['category']

const CATEGORY_CONFIG: Record<PolicyCategory, { label: string; color: string; icon: typeof Clock }> = {
  late:               { label: 'Late Policy',          color: 'bg-amber-100 text-amber-700',   icon: Clock },
  attendance:         { label: 'Attendance',            color: 'bg-blue-100 text-blue-700',     icon: Users },
  grading:            { label: 'Grading',               color: 'bg-green-100 text-green-700',   icon: GraduationCap },
  academic_integrity: { label: 'Academic Integrity',    color: 'bg-red-100 text-red-700',       icon: Shield },
  communication:      { label: 'Communication',         color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  other:              { label: 'Other',                  color: 'bg-gray-100 text-gray-700',     icon: MoreHorizontal },
}

const CATEGORY_ORDER: PolicyCategory[] = ['late', 'attendance', 'grading', 'academic_integrity', 'communication', 'other']

// ── Skeleton components ─────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div className="border-2 rounded-2xl overflow-hidden bg-white animate-pulse">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-b border-gray-100 last:border-b-0">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
          <div className="size-40 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PolicyReviewStep({
  policies,
  gradingWeights,
  courseId,
  userEmail,
  onPoliciesChange,
  onGradingWeightsChange,
  onApplyComplete,
  loading = false,
}: PolicyReviewStepProps) {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Policy helpers ───────────────────────────────────────────────────────

  function updatePolicy(index: number, patch: Partial<ExtractedPolicy>) {
    const next = policies.map((p, i) => (i === index ? { ...p, ...patch } : p))
    onPoliciesChange(next)
  }

  function deletePolicy(index: number) {
    onPoliciesChange(policies.filter((_, i) => i !== index))
  }

  function addPolicy() {
    onPoliciesChange([...policies, { category: 'other', title: '', content: '' }])
  }

  // ── Grading weight helpers ───────────────────────────────────────────────

  function updateWeight(index: number, patch: Partial<ExtractedGradingWeight>) {
    const next = gradingWeights.map((w, i) => (i === index ? { ...w, ...patch } : w))
    onGradingWeightsChange(next)
  }

  function deleteWeight(index: number) {
    onGradingWeightsChange(gradingWeights.filter((_, i) => i !== index))
  }

  function addWeight() {
    onGradingWeightsChange([...gradingWeights, { category: '', weight: 0, description: null }])
  }

  // ── Total weight ─────────────────────────────────────────────────────────

  const totalWeight = gradingWeights.reduce((sum, w) => sum + w.weight, 0)
  const totalPct = Math.round(totalWeight * 100)
  const weightOk = totalPct >= 98 && totalPct <= 102
  const weightOver = totalPct > 102
  const weightUnder = totalPct < 98

  // ── Group policies by category ───────────────────────────────────────────

  const grouped = CATEGORY_ORDER.reduce<Record<PolicyCategory, { policy: ExtractedPolicy; originalIndex: number }[]>>(
    (acc, cat) => {
      acc[cat] = policies
        .map((p, i) => ({ policy: p, originalIndex: i }))
        .filter(({ policy }) => policy.category === cat)
      return acc
    },
    {} as Record<PolicyCategory, { policy: ExtractedPolicy; originalIndex: number }[]>,
  )

  // ── Apply handler ────────────────────────────────────────────────────────

  async function handleApply() {
    setApplying(true)
    setError(null)

    try {
      const res = await fetch(`/api/courses/${courseId}/apply-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ policies, gradingWeights }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ? JSON.stringify(data.error) : `Request failed (${res.status})`)
      }

      setSuccess(true)
      setTimeout(() => onApplyComplete(), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setApplying(false)
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
        <div>
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
          <SkeletonTable />
        </div>
        <div className="h-12 w-full bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Policies section ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Course Policies</h2>

        {policies.length === 0 && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-10 px-6 bg-gray-50/50 mb-4">
            <FileQuestion className="size-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 text-center">
              No policies detected — add one manually if needed
            </p>
          </div>
        )}

        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            const cfg = CATEGORY_CONFIG[cat]
            const CatIcon = cfg.icon

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <CatIcon className="size-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>

                <div className="space-y-3">
                  {items.map(({ policy, originalIndex }) => (
                    <div
                      key={originalIndex}
                      className="relative border-2 rounded-2xl p-4 bg-white"
                    >
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deletePolicy(originalIndex)}
                        className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0]"
                        aria-label="Remove policy"
                      >
                        <X className="size-4" />
                      </button>

                      {/* Category badge */}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${cfg.color}`}>
                        {cfg.label}
                      </span>

                      {/* Editable title */}
                      <input
                        type="text"
                        value={policy.title}
                        onChange={(e) => updatePolicy(originalIndex, { title: e.target.value })}
                        placeholder="Policy title"
                        className="w-full text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                      />

                      {/* Editable content */}
                      <div className="relative">
                        <textarea
                          value={policy.content}
                          onChange={(e) => updatePolicy(originalIndex, { content: e.target.value.slice(0, 500) })}
                          placeholder="Policy content"
                          rows={3}
                          className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                        />
                        <span className={`absolute bottom-2 right-3 text-xs ${policy.content.length > 450 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          {policy.content.length}/500
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addPolicy}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] rounded-lg px-2 py-1"
        >
          <Plus className="size-4" />
          Add Policy
        </button>
      </div>

      {/* ── Grading weights section ───────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Grading Weights</h2>

        {gradingWeights.length === 0 && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-10 px-6 bg-gray-50/50 mb-4">
            <Scale className="size-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 text-center">
              No grading breakdown detected — add weights manually if needed
            </p>
          </div>
        )}

        {gradingWeights.length > 0 && (
          <div className="border-2 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Category</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 w-24">Weight (%)</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {gradingWeights.map((w, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={w.category}
                        onChange={(e) => updateWeight(i, { category: e.target.value })}
                        placeholder="e.g. Exams"
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(w.weight * 100)}
                        onChange={(e) => {
                          const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                          updateWeight(i, { weight: pct / 100 })
                        }}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={w.description ?? ''}
                        onChange={(e) => updateWeight(i, { description: e.target.value || null })}
                        placeholder="Optional description"
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => deleteWeight(i)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0]"
                        aria-label="Remove weight"
                      >
                        <X className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total row */}
            <div className={`flex items-center justify-between px-4 py-2 text-sm font-semibold border-t-2 ${
              weightOk
                ? 'bg-green-50 text-green-700 border-green-200'
                : weightOver
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span>Total</span>
              <div className="flex items-center gap-1.5">
                {weightOk ? (
                  <CheckCircle className="size-4" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
                <span>{totalPct}%</span>
                {weightOver && <span className="text-xs ml-1">Total exceeds 100%</span>}
                {weightUnder && <span className="text-xs ml-1">Total is below 100%</span>}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={addWeight}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] rounded-lg px-2 py-1"
        >
          <Plus className="size-4" />
          Add Weight
        </button>
      </div>

      {/* ── Error / success banners ───────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 border-2 border-red-200 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 border-2 border-green-200 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="size-4 shrink-0" />
          <span>Policies and grading weights applied successfully!</span>
        </div>
      )}

      {/* ── Apply button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleApply}
        onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
        disabled={applying || success}
        className="w-full flex items-center justify-center gap-2 bg-[#0033A0] text-white font-semibold py-3 rounded-xl hover:bg-[#0033A0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] focus-visible:ring-offset-2"
      >
        {applying ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Applying…
          </>
        ) : success ? (
          <>
            <CheckCircle className="size-4" />
            Applied!
          </>
        ) : (
          'Apply to Course'
        )}
      </button>
    </div>
  )
}
