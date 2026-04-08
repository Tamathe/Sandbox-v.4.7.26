'use client'

import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TabNav from '../components/TabNav'
import ComplianceDashboard from '../components/accessibility/ComplianceDashboard'
import { useAuth } from '../lib/auth-context'

const TABS = [
  { id: 'scan', label: 'Scan & Fix', icon: Shield },
  { id: 'dashboard', label: 'Compliance Dashboard', icon: BarChart3 },
] as const

// ── Types ────────────────────────────────────────────────────────────────────

interface ReadabilityInfo {
  fleschKincaid: number
  fleschReadingEase: number
  avgSentenceLength: number
  passiveVoicePercent: number
  wordCount: number
  sentenceCount: number
  overallGrade: string
  overallScore: number
  summary: string
  jargonTerms: Array<{ term: string; count: number; suggestion: string }>
  longSentences: Array<{ text: string; wordCount: number }>
}

interface DocumentIssue {
  id: string
  type: string
  severity: 'critical' | 'major' | 'minor'
  location: string
  description: string
  wcagCriteria: string
  suggestion: string
  autoFixable: boolean
}

interface DocumentStructure {
  pageCount: number
  hasTitle: boolean
  headings: Array<{ level: number; text: string; page: number }>
  headingHierarchyValid: boolean
  tables: Array<{ page: number; hasHeaders: boolean; rows: number; cols: number }>
  images: Array<{ page: number; hasAltText: boolean; description?: string }>
  links: Array<{ page: number; text: string; isDescriptive: boolean }>
  lists: Array<{ page: number; type: string; items: number }>
}

interface ScanResult {
  overallScore: number
  overallGrade: string
  issues: DocumentIssue[]
  structure: DocumentStructure
  readability: ReadabilityInfo
  autoFixable: number
  manualRequired: number
}

interface RemediationResult {
  remediatedContent: string
  changes: Array<{
    id: string
    fixType: string
    description: string
    before: string
    after: string
    confidence: number
  }>
  beforeGrade: string
  afterGrade: string
  beforeScore: number
  afterScore: number
}

type Step = 'input' | 'scanning' | 'report' | 'remediating' | 'result'

// ── Grade styling ────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<string, { bg: string; text: string; ring: string; bar: string }> = {
  A: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-200', bar: 'bg-green-500' },
  B: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', bar: 'bg-blue-500' },
  C: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', bar: 'bg-amber-500' },
  D: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', bar: 'bg-orange-500' },
  F: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', bar: 'bg-red-500' },
}

const SEVERITY_ICONS: Record<string, { icon: typeof XCircle; color: string }> = {
  critical: { icon: XCircle, color: 'text-red-600' },
  major: { icon: AlertTriangle, color: 'text-orange-600' },
  minor: { icon: BookOpen, color: 'text-blue-600' },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ADAComplianceTool() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'dashboard' ? 'dashboard' : 'scan')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [step, setStep] = useState<Step>('input')
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState('')
  const [uploading, setUploading] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [remediation, setRemediation] = useState<RemediationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-demo-user-email': currentUser.email,
  }), [currentUser.email])

  // ── PDF upload ──────────────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)')
      return
    }

    setUploading(true)
    setError(null)
    setFilename(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/avatar/extract-pdf', {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
        body: formData,
      })

      if (!res.ok) throw new Error('Failed to extract PDF text')
      const data = await res.json()
      setContent(data.text || '')
    } catch {
      setError('Failed to parse PDF. Try pasting the text directly.')
    } finally {
      setUploading(false)
    }
  }

  // ── Scan ────────────────────────────────────────────────────────────────
  async function handleScan() {
    if (!content.trim() || content.trim().length < 50) {
      setError('Please provide at least 50 characters of content to scan.')
      return
    }

    setStep('scanning')
    setError(null)

    try {
      const res = await fetch('/api/accessibility/scan', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          text: content,
          filename: filename || 'document',
        }),
      })

      if (!res.ok) throw new Error('Scan failed')
      const data = await res.json()
      setScanResult(data)
      setStep('report')
    } catch {
      setError('Scan failed. Please try again.')
      setStep('input')
    }
  }

  // ── Remediate ───────────────────────────────────────────────────────────
  async function handleRemediate() {
    setStep('remediating')
    setError(null)

    try {
      const res = await fetch('/api/accessibility/remediate', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          action: 'generate',
          targetType: 'freetext',
          targetId: 'ada-tool',
          text: content,
          fixTypes: ['all'],
        }),
      })

      if (!res.ok) throw new Error('Remediation failed')
      const data = await res.json()
      setRemediation(data)
      setStep('result')
    } catch {
      setError('Remediation failed. Please try again.')
      setStep('report')
    }
  }

  // ── Copy / Download ─────────────────────────────────────────────────────
  function handleCopy() {
    const text = remediation?.remediatedContent ?? content
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const text = remediation?.remediatedContent ?? content
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ? filename.replace(/\.pdf$/i, '-accessible.txt') : 'accessible-content.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    setStep('input')
    setContent('')
    setFilename('')
    setScanResult(null)
    setRemediation(null)
    setError(null)
    setExpandedIssues(new Set())
  }

  function toggleIssue(id: string) {
    setExpandedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const gradeStyle = (grade: string) => GRADE_STYLES[grade] ?? GRADE_STYLES.C

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="ADA Compliance"
        subtitle="Scan, fix, and track WCAG 2.1 AA accessibility across all your content"
      />

      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className="mt-2" />

      {activeTab === 'dashboard' && (
        <div className="mt-6">
          <ComplianceDashboard />
        </div>
      )}

      {activeTab === 'scan' && error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)}><X className="size-4" /></button>
        </div>
      )}

      {/* ── Step 1: Input ────────────────────────────────────────────── */}
      {activeTab === 'scan' && step === 'input' && (
        <div className="mt-6 space-y-4">
          {/* Upload zone */}
          <div
            className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 transition-colors hover:border-[#0033A0] hover:bg-blue-50/30"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) void handleFileUpload(file)
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileUpload(file)
              }}
            />
            {uploading ? (
              <>
                <Loader2 className="size-8 animate-spin text-[#0033A0]" />
                <span className="text-sm font-semibold text-[#0033A0]">Extracting text from PDF...</span>
              </>
            ) : (
              <>
                <Upload className="size-8 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600">
                  Drop a PDF here or click to upload
                </span>
                <span className="text-xs text-gray-400">Max 10MB</span>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400">OR PASTE TEXT</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Text input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your course material, syllabus, lecture notes, or any educational content here..."
            rows={12}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
          />

          {content.trim().length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {content.split(/\s+/).filter(Boolean).length} words
                {filename && <> · {filename}</>}
              </span>
              <button
                type="button"
                onClick={() => void handleScan()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
              >
                <Shield className="size-4" />
                Scan for Accessibility
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Scanning ─────────────────────────────────────────── */}
      {activeTab === 'scan' && step === 'scanning' && (
        <div className="mt-12 flex flex-col items-center gap-4 py-16">
          <Loader2 className="size-12 animate-spin text-[#0033A0]" />
          <h3 className="text-lg font-extrabold text-gray-900">Scanning for accessibility issues...</h3>
          <p className="text-sm text-gray-500">Checking headings, structure, readability, images, links, and more</p>
        </div>
      )}

      {/* ── Step 3: Report ───────────────────────────────────────────── */}
      {activeTab === 'scan' && step === 'report' && scanResult && (
        <div className="mt-6 space-y-5">
          {/* Grade header */}
          <div className={`flex flex-col gap-4 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between ${gradeStyle(scanResult.overallGrade).bg} ${gradeStyle(scanResult.overallGrade).ring} ring-1`}>
            <div className="flex items-center gap-4">
              <div className={`flex size-16 items-center justify-center rounded-full ring-2 ${gradeStyle(scanResult.overallGrade).ring} ${gradeStyle(scanResult.overallGrade).bg}`}>
                <span className={`text-3xl font-extrabold ${gradeStyle(scanResult.overallGrade).text}`}>
                  {scanResult.overallGrade}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  Accessibility Score: {Math.round(scanResult.overallScore * 100)}%
                </h3>
                <p className="text-sm text-gray-600">
                  {scanResult.issues.length} issue{scanResult.issues.length !== 1 ? 's' : ''} found
                  {scanResult.autoFixable > 0 && ` · ${scanResult.autoFixable} auto-fixable`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {scanResult.autoFixable > 0 && (
                <button
                  type="button"
                  onClick={() => void handleRemediate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                >
                  <Sparkles className="size-4" />
                  Fix {scanResult.autoFixable} Issues with AI
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <RefreshCw className="size-4" />
                New scan
              </button>
            </div>
          </div>

          {/* Structure summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Headings', value: scanResult.structure.headings.length, ok: scanResult.structure.headingHierarchyValid },
              { label: 'Tables', value: scanResult.structure.tables.length, ok: scanResult.structure.tables.every((t) => t.hasHeaders) },
              { label: 'Images', value: scanResult.structure.images.length, ok: scanResult.structure.images.every((i) => i.hasAltText) },
              { label: 'Links', value: scanResult.structure.links.length, ok: scanResult.structure.links.every((l) => l.isDescriptive) },
              { label: 'Lists', value: scanResult.structure.lists.length, ok: true },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                <div className="text-xl font-extrabold text-gray-900">{item.value}</div>
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                  {item.label}
                  {item.value > 0 && (item.ok
                    ? <CheckCircle2 className="size-3 text-green-500" />
                    : <AlertTriangle className="size-3 text-amber-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Readability summary */}
          <div className={`rounded-2xl border p-4 ${gradeStyle(scanResult.readability.overallGrade).bg} ${gradeStyle(scanResult.readability.overallGrade).ring} ring-1`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className={`size-4 ${gradeStyle(scanResult.readability.overallGrade).text}`} />
                <span className={`text-sm font-semibold ${gradeStyle(scanResult.readability.overallGrade).text}`}>
                  Readability: Grade {Math.round(scanResult.readability.fleschKincaid)} ({scanResult.readability.overallGrade})
                </span>
              </div>
              <span className="text-xs text-gray-500">{scanResult.readability.summary}</span>
            </div>
            {scanResult.readability.jargonTerms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {scanResult.readability.jargonTerms.slice(0, 6).map((j) => (
                  <span key={j.term} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">
                    {j.term} → {j.suggestion}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Issues list */}
          {scanResult.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-gray-700">Issues ({scanResult.issues.length})</h3>
              {scanResult.issues.map((issue) => {
                const sev = SEVERITY_ICONS[issue.severity] ?? SEVERITY_ICONS.minor
                const Icon = sev.icon
                const isExpanded = expandedIssues.has(issue.id)

                return (
                  <div key={issue.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleIssue(issue.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left"
                    >
                      <Icon className={`mt-0.5 size-4 flex-shrink-0 ${sev.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {issue.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${issue.severity === 'critical' ? 'bg-red-100 text-red-700' : issue.severity === 'major' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {issue.severity}
                          </span>
                          {issue.autoFixable && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">auto-fixable</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{issue.description}</p>
                      </div>
                      {isExpanded ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-3 space-y-1.5 text-xs">
                        <div><span className="font-semibold text-gray-700">Location:</span> <span className="text-gray-600">{issue.location}</span></div>
                        <div><span className="font-semibold text-gray-700">WCAG:</span> <span className="text-gray-600">{issue.wcagCriteria}</span></div>
                        <div className="rounded-lg bg-gray-50 p-2.5"><span className="font-semibold text-gray-700">Fix:</span> {issue.suggestion}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {scanResult.issues.length === 0 && (
            <div className="rounded-2xl border border-green-200 bg-green-50 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-2 size-10 text-green-500" />
              <h3 className="text-lg font-extrabold text-green-800">No accessibility issues detected</h3>
              <p className="mt-1 text-sm text-green-600">This content meets WCAG 2.1 AA guidelines</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Remediating ──────────────────────────────────────── */}
      {activeTab === 'scan' && step === 'remediating' && (
        <div className="mt-12 flex flex-col items-center gap-4 py-16">
          <Sparkles className="size-12 animate-pulse text-[#0033A0]" />
          <h3 className="text-lg font-extrabold text-gray-900">Fixing accessibility issues...</h3>
          <p className="text-sm text-gray-500">Adding headings, simplifying sentences, restructuring content</p>
        </div>
      )}

      {/* ── Step 5: Remediation Result ───────────────────────────────── */}
      {activeTab === 'scan' && step === 'result' && remediation && (
        <div className="mt-6 space-y-5">
          {/* Grade comparison */}
          <div className="flex items-center justify-center gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div className={`mx-auto flex size-16 items-center justify-center rounded-full ring-2 ${gradeStyle(remediation.beforeGrade).ring} ${gradeStyle(remediation.beforeGrade).bg}`}>
                <span className={`text-2xl font-extrabold ${gradeStyle(remediation.beforeGrade).text}`}>{remediation.beforeGrade}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">Before</div>
              <div className="text-sm font-bold text-gray-700">{Math.round(remediation.beforeScore * 100)}%</div>
            </div>
            <ArrowRight className="size-6 text-gray-300" />
            <div className="text-center">
              <div className={`mx-auto flex size-16 items-center justify-center rounded-full ring-2 ${gradeStyle(remediation.afterGrade).ring} ${gradeStyle(remediation.afterGrade).bg}`}>
                <span className={`text-2xl font-extrabold ${gradeStyle(remediation.afterGrade).text}`}>{remediation.afterGrade}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">After</div>
              <div className="text-sm font-bold text-gray-700">{Math.round(remediation.afterScore * 100)}%</div>
            </div>
          </div>

          {/* Changes applied */}
          {remediation.changes.length > 0 && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-green-800">
                <Check className="size-4" />
                {remediation.changes.length} change{remediation.changes.length !== 1 ? 's' : ''} applied
              </h3>
              <ul className="mt-2 space-y-1">
                {remediation.changes.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-xs text-green-700">
                    <CheckCircle2 className="mt-0.5 size-3 flex-shrink-0" />
                    {c.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Remediated content */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-700">Accessible Content</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {copied ? <Check className="size-3.5 text-green-600" /> : <ClipboardCopy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Download className="size-3.5" />
                  Download
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={remediation.remediatedContent}
              rows={16}
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <RefreshCw className="size-4" />
              Scan another document
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
