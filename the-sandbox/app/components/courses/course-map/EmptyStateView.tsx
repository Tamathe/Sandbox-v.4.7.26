'use client'

import { useRef, useState } from 'react'
import { ChevronDown, Copy, Download, FileText, LayoutTemplate, Loader2, Sparkles, Upload, X } from 'lucide-react'
import type { CourseMapWeek, CourseMapResult, ConfirmResult } from './types'
import { COURSE_MAP_TEMPLATES } from '../../../lib/course-map-templates'

interface EmptyStateViewProps {
  viewState: 'empty' | 'generating'
  files: File[]
  dragOver: boolean
  canvasCourseId?: string | null
  importingFromCanvas: boolean
  showClonePanel: boolean
  loadingCloneable: boolean
  cloneableCourses: { id: string; courseCode: string; title: string }[]
  cloningFromId: string | null
  onAddFiles: (files: FileList | File[]) => void
  onRemoveFile: (index: number) => void
  onSetDragOver: (value: boolean) => void
  onGenerate: () => void
  onImportFromCanvas: () => void
  onShowClonePanel: (show: boolean) => void
  onLoadCloneableCourses: () => void
  onClone: (sourceCourseId: string) => void
  onSelectTemplate: (weeks: CourseMapWeek[], metadata: CourseMapResult['metadata']) => void
}

// ── Generation progress stages ──────────────────────────────────────────────

const GENERATION_STAGES = [
  { label: 'Reading PDF...', duration: 4000 },
  { label: 'Extracting course schedule...', duration: 6000 },
  { label: 'Identifying learning objectives...', duration: 8000 },
  { label: 'Mapping weekly topics...', duration: 7000 },
  { label: 'Detecting assignments & due dates...', duration: 6000 },
  { label: 'Building your course map...', duration: 10000 },
]

function GenerationProgress() {
  const [stageIndex, setStageIndex] = useState(0)

  // Advance stages on timed intervals
  useState(() => {
    let timeout: ReturnType<typeof setTimeout>
    let current = 0
    function advance() {
      if (current < GENERATION_STAGES.length - 1) {
        timeout = setTimeout(() => {
          current++
          setStageIndex(current)
          advance()
        }, GENERATION_STAGES[current].duration)
      }
    }
    advance()
    return () => clearTimeout(timeout)
  })

  const stage = GENERATION_STAGES[stageIndex]
  const progress = ((stageIndex + 1) / GENERATION_STAGES.length) * 100

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin text-[#0033A0]" />
        <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
      </div>
      <div className="mx-auto w-64 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0033A0] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-xs text-gray-400">
        Step {stageIndex + 1} of {GENERATION_STAGES.length} — this usually takes 30-60 seconds
      </p>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function EmptyStateView({
  viewState,
  files,
  dragOver,
  canvasCourseId,
  importingFromCanvas,
  showClonePanel,
  loadingCloneable,
  cloneableCourses,
  cloningFromId,
  onAddFiles,
  onRemoveFile,
  onSetDragOver,
  onGenerate,
  onImportFromCanvas,
  onShowClonePanel,
  onLoadCloneableCourses,
  onClone,
  onSelectTemplate,
}: EmptyStateViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    onSetDragOver(false)
    if (e.dataTransfer.files.length) onAddFiles(e.dataTransfer.files)
  }

  // Dynamic: if Canvas is linked, lead with Canvas import
  const hasCanvas = !!canvasCourseId

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-extrabold text-gray-900">Course Map Builder</h3>
        <p className="mt-1 text-sm text-gray-500">
          {hasCanvas
            ? 'Import your existing Canvas modules or upload a syllabus PDF to build your course map.'
            : 'Upload your syllabus PDF and we\'ll generate a week-by-week course map automatically.'}
        </p>
      </div>

      {/* ── PRIMARY PATH: Canvas import (when linked) ── */}
      {hasCanvas && viewState === 'empty' && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onImportFromCanvas}
            disabled={importingFromCanvas}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
          >
            {importingFromCanvas ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing from Canvas...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Import from Canvas
              </>
            )}
          </button>
        </div>
      )}

      {/* ── PRIMARY PATH: Upload (when no Canvas) / SECONDARY (when Canvas) ── */}
      {hasCanvas && viewState === 'empty' && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Or upload a syllabus</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); onSetDragOver(true) }}
        onDragLeave={() => onSetDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-[#0033A0] bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="mx-auto size-8 text-gray-400" />
        <p className="mt-2 text-sm font-semibold text-gray-700">
          Drag & drop PDF files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Up to 5 PDFs, 10 MB each. First file is treated as the primary syllabus.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onAddFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              <FileText className="size-4 text-gray-400" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              {i === 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Primary</span>}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemoveFile(i) }}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="size-3.5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Generate button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onGenerate}
          disabled={files.length === 0 || viewState === 'generating'}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {viewState === 'generating' ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate Course Map
            </>
          )}
        </button>
      </div>

      {/* ── Staged progress feedback ── */}
      {viewState === 'generating' && <GenerationProgress />}

      {/* ── More options (templates + clone) — collapsed by default ── */}
      {viewState === 'empty' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <button
              type="button"
              onClick={() => setShowMoreOptions((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors"
            >
              More options
              <ChevronDown className={`size-3 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
            </button>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {showMoreOptions && (
            <div className="space-y-4">
              {/* Templates */}
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Start from a template</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {COURSE_MAP_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        const templateWeeks: CourseMapWeek[] = tmpl.weeks.map((w) => ({
                          ...w,
                          toolSuggestions: [],
                        }))
                        onSelectTemplate(templateWeeks, {
                          totalWeeks: templateWeeks.length,
                          totalObjectives: templateWeeks.reduce((s, w) => s + w.objectives.length, 0),
                          totalAssignments: 0,
                          documentsProcessed: 0,
                          notice: null,
                        })
                      }}
                      className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 text-left transition-colors hover:border-[#0033A0] hover:bg-blue-50"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <LayoutTemplate className="size-4 text-[#0033A0]" />
                        <span className="text-sm font-bold text-gray-900">{tmpl.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{tmpl.description}</p>
                      <p className="mt-2 text-xs font-semibold text-[#0033A0]">{tmpl.weekCount} weeks</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Clone from another course */}
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clone from another course</p>
                {!showClonePanel ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        onShowClonePanel(true)
                        onLoadCloneableCourses()
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-[#0033A0] hover:text-[#0033A0]"
                    >
                      <Copy className="size-4" />
                      Clone from another course
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">Select a course to clone from</span>
                      <button type="button" onClick={() => onShowClonePanel(false)} className="rounded-full p-1 hover:bg-gray-100">
                        <X className="size-4 text-gray-400" />
                      </button>
                    </div>
                    {loadingCloneable && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="size-5 animate-spin text-gray-400" />
                      </div>
                    )}
                    {!loadingCloneable && cloneableCourses.length === 0 && (
                      <p className="py-4 text-center text-sm text-gray-400">No other courses with course maps found</p>
                    )}
                    {!loadingCloneable && cloneableCourses.length > 0 && (
                      <ul className="space-y-2">
                        {cloneableCourses.map((c) => (
                          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{c.courseCode}</p>
                              <p className="text-xs text-gray-400">{c.title}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onClone(c.id)}
                              disabled={cloningFromId !== null}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                            >
                              {cloningFromId === c.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                              Clone
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
