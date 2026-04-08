'use client'

import { useState } from 'react'
import { CheckCircle, ChevronRight, Loader2, Sparkles, Upload, X } from 'lucide-react'
import type { Course, CourseMaterial } from './course-types'
import { courseHeaders, readJson } from './course-utils'
import { setColdStartStep } from '../../lib/cold-start'

interface CourseSetupWizardProps {
  course: Course
  userEmail: string
  onDone: (updatedMaterials?: CourseMaterial[]) => void
  onSkip: () => void
}

type WizardStep = 'import' | 'review' | 'assistant'

export default function CourseSetupWizard({ course, userEmail, onDone, onSkip }: CourseSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('import')
  const [importedMaterials, setImportedMaterials] = useState<CourseMaterial[]>([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const [generatingBot, setGeneratingBot] = useState(false)
  const [botError, setBotError] = useState<string | null>(null)
  const [botToolId, setBotToolId] = useState<string | null>(null)

  async function handleSyllabusUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/courses/${course.id}/materials/import-syllabus`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Import failed')

      const materialsRes = await readJson<CourseMaterial[]>(`/api/courses/${course.id}/materials`, {
        headers: courseHeaders(userEmail),
      })
      setImportedMaterials(materialsRes)
      setColdStartStep(userEmail, 'syllabusUploaded')
      setStep('review')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import syllabus')
    } finally {
      setImporting(false)
    }
  }

  async function handleGenerateAssistant() {
    setGeneratingBot(true)
    setBotError(null)

    try {
      const res = await fetch(`/api/courses/${course.id}/generate-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to create assistant')
      setBotToolId(data.toolId ?? null)
      setStep('assistant')
    } catch (err) {
      setBotError(err instanceof Error ? err.message : 'Failed to create AI Teaching Assistant')
    } finally {
      setGeneratingBot(false)
    }
  }

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'import', label: 'Import Syllabus' },
    { id: 'review', label: 'Review' },
    { id: 'assistant', label: 'AI Assistant' },
  ]
  const stepIndex = steps.findIndex((s) => s.id === step)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0033A0] to-[#2c66cf] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Course Setup</p>
              <h2 className="text-xl font-semibold">Set up {course.courseCode}</h2>
              <p className="mt-1 text-sm text-blue-100">Let's get your course ready in 3 quick steps.</p>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-xl p-1.5 text-blue-200 hover:bg-white/10"
              aria-label="Skip setup"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="mt-4 flex items-center gap-3">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    i < stepIndex
                      ? 'bg-emerald-400 text-white'
                      : i === stepIndex
                      ? 'bg-white text-[#0033A0]'
                      : 'bg-white/20 text-blue-100'
                  }`}
                >
                  {i < stepIndex ? <CheckCircle className="size-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === stepIndex ? 'text-white' : 'text-blue-200'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <ChevronRight className="size-3 text-blue-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 'import' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600">
                Upload your syllabus PDF and we'll automatically extract your module structure and create materials for each section.
              </p>

              {importError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {importError}
                </div>
              )}

              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 px-5 py-6 transition-colors hover:border-[#0033A0] hover:bg-blue-50">
                {importing ? (
                  <>
                    <Loader2 className="size-8 animate-spin text-[#0033A0]" />
                    <p className="text-sm font-medium text-gray-600">Extracting module structure…</p>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-gray-300" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Click to upload syllabus PDF</p>
                      <p className="mt-1 text-xs text-gray-400">PDF format, max 10 MB</p>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  disabled={importing}
                  onChange={handleSyllabusUpload}
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setColdStartStep(userEmail, 'syllabusUploaded'); setStep('review') }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Skip this step
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-5">
              {importedMaterials.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    We created <strong>{importedMaterials.length} materials</strong> from your syllabus. You can edit or add more from the Materials tab.
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-gray-200">
                    {importedMaterials.slice(0, 20).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 last:border-0">
                        <CheckCircle className="size-4 flex-shrink-0 text-emerald-500" />
                        <span className="text-sm text-gray-700">{m.title}</span>
                        {m.moduleNumber && (
                          <span className="ml-auto text-xs text-gray-400">Module {m.moduleNumber}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  No syllabus imported. You can add materials manually from the Materials tab at any time.
                </p>
              )}

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('import')}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerateAssistant()}
                  disabled={generatingBot}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#002580] disabled:opacity-60"
                >
                  {generatingBot ? (
                    <><Loader2 className="size-4 animate-spin" /> Creating assistant…</>
                  ) : (
                    <><Sparkles className="size-4" /> Create AI Teaching Assistant</>
                  )}
                </button>
              </div>

              {botError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {botError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onDone(importedMaterials.length > 0 ? importedMaterials : undefined)}
                  className="text-sm text-gray-400 hover:text-gray-600 underline"
                >
                  Skip and finish
                </button>
              </div>
            </div>
          )}

          {step === 'assistant' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <Sparkles className="size-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Your course is ready!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your AI Teaching Assistant has been created and linked to {course.courseCode}. Students can use it right away.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                {botToolId && (
                  <a
                    href={`/tools/${botToolId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Sparkles className="size-4" />
                    Open Teaching Assistant
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onDone(importedMaterials.length > 0 ? importedMaterials : undefined)}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Go to course
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
