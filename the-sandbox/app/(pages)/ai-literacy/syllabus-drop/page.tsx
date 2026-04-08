'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Search, Shield, Check, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import PageHeader from '../../../components/PageHeader'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'

type Step = 'upload' | 'assignments' | 'scanning' | 'results' | 'policy' | 'done'

interface ExtractedAssignment {
  title: string
  description: string
  type: string
}

interface ScanResult {
  assignment: ExtractedAssignment
  scan: { aiCompletability: number; bloomLevel: string; summary: string }
  suggestedLevel: string
}

const STEPS = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'assignments', label: 'Extract', icon: FileText },
  { key: 'results', label: 'Scan', icon: Search },
  { key: 'policy', label: 'Policy', icon: Shield },
  { key: 'done', label: 'Done', icon: Check },
]

export default function SyllabusDropPage() {
  const { currentUser } = useAuth()
  const [step, setStep] = useState<Step>('upload')
  const [syllabusText, setSyllabusText] = useState('')
  const [courseName, setCourseName] = useState('')
  const [stance, setStance] = useState('GUIDED')
  const [assignments, setAssignments] = useState<ExtractedAssignment[]>([])
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [policyText, setPolicyText] = useState('')
  const [avgScore, setAvgScore] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleExtract = useCallback(async () => {
    if (syllabusText.length < 50) return
    setLoading(true)

    try {
      const data = await apiFetch<{ assignments?: ExtractedAssignment[] }>(currentUser.email, '/api/ai-literacy/syllabus-drop', {
        method: 'POST',
        body: JSON.stringify({ syllabusText, action: 'extract' }),
      })
      setAssignments(data.assignments ?? [])
      setStep('assignments')
    } catch (err) {
      console.error('Failed to extract syllabus assignments:', err)
    }
    setLoading(false)
  }, [syllabusText, currentUser.email])

  const handleScanAll = useCallback(async () => {
    setStep('scanning')
    setLoading(true)

    try {
      const data = await apiFetch<{ scanResults?: ScanResult[] }>(currentUser.email, '/api/ai-literacy/syllabus-drop', {
        method: 'POST',
        body: JSON.stringify({ syllabusText, stance, courseName, action: 'scan', assignments }),
      })
      setScanResults(data.scanResults ?? [])
      const avg = data.scanResults?.length
        ? Math.round(data.scanResults.reduce((s: number, r: ScanResult) => s + r.scan.aiCompletability, 0) / data.scanResults.length)
        : 0
      setAvgScore(avg)
      setStep('results')
    } catch {
      // ignore
    }
    setLoading(false)
  }, [syllabusText, stance, courseName, assignments, currentUser.email])

  const handleGeneratePolicy = useCallback(async () => {
    setLoading(true)

    // Use the generate-policy action with existing scan results to avoid
    // re-running the full pipeline (extract + scan) unnecessarily
    try {
      const data = await apiFetch<{ policy?: { fullText?: string } }>(currentUser.email, '/api/ai-literacy/syllabus-drop', {
        method: 'POST',
        body: JSON.stringify({ syllabusText, stance, courseName, action: 'generate-policy', scanResults }),
      })
      setPolicyText(data.policy?.fullText ?? '')
      setStep('policy')
    } catch {
      // ignore
    }
    setLoading(false)
  }, [syllabusText, stance, courseName, scanResults, currentUser.email])

  const currentStepIndex = STEPS.findIndex(s => s.key === step || (step === 'scanning' && s.key === 'results'))

  return (
    <>
      <PageHeader
        title="Syllabus Drop"
        subtitle="Paste your syllabus — get a complete AI policy in minutes"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div className={`size-8 rounded-full flex items-center justify-center ${
                i < currentStepIndex ? 'bg-green-100 text-green-700' :
                i === currentStepIndex ? 'bg-[#0033A0] text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < currentStepIndex ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === currentStepIndex ? 'text-gray-900' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStepIndex ? 'bg-green-200' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Course name (e.g., ENG 101 — Intro to Writing)"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none"
              />
              <select
                value={stance}
                onChange={e => setStance(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none"
              >
                <option value="PROHIBIT">Prohibit</option>
                <option value="CAUTIOUS">Cautious</option>
                <option value="GUIDED">Guided (default)</option>
                <option value="INTEGRATE">Integrate</option>
                <option value="REQUIRE">Require</option>
              </select>
            </div>

            <textarea
              placeholder="Paste your syllabus text here..."
              value={syllabusText}
              onChange={e => setSyllabusText(e.target.value)}
              rows={16}
              className="w-full px-4 py-3 border rounded-2xl text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none font-mono"
            />

            <button
              onClick={handleExtract}
              disabled={syllabusText.length < 50 || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg font-medium hover:bg-[#002880] disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Extract Assignments
            </button>
          </div>
        )}

        {/* Step: Review extracted assignments */}
        {step === 'assignments' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Found {assignments.length} assignments. Review and edit before scanning.</p>
            <div className="space-y-2">
              {assignments.map((a, i) => (
                <div key={i} className="p-3 border rounded-xl bg-white flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.type} · {a.description.slice(0, 100)}{a.description.length > 100 ? '...' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleScanAll}
              disabled={assignments.length === 0 || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg font-medium hover:bg-[#002880] disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Scan All for AI Vulnerability
            </button>
          </div>
        )}

        {/* Step: Scanning */}
        {step === 'scanning' && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Loader2 className="size-8 animate-spin mb-4" />
            <p className="text-sm">Scanning {assignments.length} assignments for AI vulnerability...</p>
          </div>
        )}

        {/* Step: Scan results */}
        {step === 'results' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl text-center ${
              avgScore >= 70 ? 'bg-red-50' : avgScore >= 40 ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <p className="text-3xl font-extrabold text-gray-900">{avgScore}%</p>
              <p className="text-sm text-gray-600">Average AI Completability</p>
            </div>

            {scanResults.length < assignments.length && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Scanned {scanResults.length} of {assignments.length} assignments (limit: 10). The remaining {assignments.length - scanResults.length} were not scanned.
              </p>
            )}

            <div className="space-y-2">
              {scanResults.map((r, i) => (
                <div key={i} className="p-3 border rounded-xl bg-white flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{r.assignment.title}</p>
                    <p className="text-xs text-gray-500">{r.scan.bloomLevel} · {r.scan.summary.slice(0, 80)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${
                      r.scan.aiCompletability >= 70 ? 'text-red-600' :
                      r.scan.aiCompletability >= 40 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {r.scan.aiCompletability}%
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.suggestedLevel === 'PROHIBITED' ? 'bg-red-100 text-red-700' :
                      r.suggestedLevel === 'LIMITED' ? 'bg-amber-100 text-amber-700' :
                      r.suggestedLevel === 'GUIDED' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>{r.suggestedLevel}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleGeneratePolicy}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg font-medium hover:bg-[#002880] disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
              Generate Complete AI Policy
            </button>
          </div>
        )}

        {/* Step: Policy */}
        {step === 'policy' && (
          <div className="space-y-4">
            <div className="border rounded-2xl p-5 bg-white shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Generated AI Policy</h3>
              <textarea
                value={policyText}
                onChange={e => setPolicyText(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(policyText)
                  setStep('done')
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg font-medium hover:bg-[#002880] transition-colors"
              >
                <Check className="size-4" />
                Copy & Finish
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="size-8 text-green-600" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Policy Generated!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your AI policy has been copied to clipboard. Paste it into your syllabus or save it via the Policy Builder.
            </p>
            <a
              href="/ai-literacy/policy"
              className="px-6 py-2.5 bg-[#0033A0] text-white rounded-lg font-medium hover:bg-[#002880] transition-colors inline-block"
            >
              Open Policy Builder to Save
            </a>
          </div>
        )}

        <PathwayNav />
      </div>
    </>
  )
}
