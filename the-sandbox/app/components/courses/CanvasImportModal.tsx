'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Loader2, CheckCircle, FileArchive, AlertCircle } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'

interface CanvasImportResult {
  courseId: string
  courseCode: string
  title: string
  modulesImported: number
  materialsCreated: number
  assignmentsCreated: number
  objectivesExtracted: number
  courseMapCreated: boolean
}

interface CanvasImportModalProps {
  open: boolean
  onClose: () => void
  userEmail: string
  onImportComplete: (result: CanvasImportResult) => void
}

export default function CanvasImportModal({
  open,
  onClose,
  userEmail,
  onImportComplete,
}: CanvasImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [courseCode, setCourseCode] = useState('')
  const [title, setTitle] = useState('')
  const [semester, setSemester] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CanvasImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setCourseCode('')
    setTitle('')
    setSemester('')
    setImporting(false)
    setError(null)
    setResult(null)
  }, [])

  const handleClose = useCallback(() => {
    if (importing) return
    reset()
    onClose()
  }, [importing, reset, onClose])

  const handleFile = useCallback((f: File) => {
    const name = f.name.toLowerCase()
    if (!name.endsWith('.imscc') && !name.endsWith('.zip')) {
      setError('Please upload a Canvas export file (.imscc)')
      return
    }
    setFile(f)
    setError(null)

    // Try to extract course code and title from filename
    // e.g. "tek100-202-collab-intelligence-using-modern-ai-spring-2026-export.imscc"
    const base = f.name.replace(/\.(imscc|zip)$/i, '').replace(/-export$/i, '')
    const parts = base.split('-')
    if (parts.length >= 2) {
      // First part is likely the course code
      const code = parts.slice(0, 2).join('-').toUpperCase()
      if (/^[A-Z]{2,6}\d{2,4}/.test(code)) {
        setCourseCode(code)
      }
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const f = e.dataTransfer.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile],
  )

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (courseCode.trim()) formData.append('courseCode', courseCode.trim())
      if (title.trim()) formData.append('title', title.trim())
      if (semester.trim()) formData.append('semester', semester.trim())

      const res = await fetch('/api/courses/import-canvas', {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Import failed (${res.status})`)
      }

      const data: CanvasImportResult = await res.json()
      setResult(data)
      onImportComplete(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <ModalShell title="Import from Canvas" icon={Upload} onClose={handleClose} zIndex={50}>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500 -mt-2">
            Upload a Canvas course export (.imscc) to auto-build your course
          </p>
          {/* Success state */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border-2 border-green-200 bg-green-50 p-4">
                <CheckCircle className="mt-0.5 size-5 shrink-0 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Course imported successfully!</p>
                  <p className="mt-1 text-sm text-green-700">
                    <strong>{result.courseCode}</strong> — {result.title}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-green-700">
                    <span>{result.modulesImported} modules</span>
                    <span>{result.materialsCreated} materials</span>
                    <span>{result.assignmentsCreated} assignments</span>
                    <span>{result.objectivesExtracted} objectives</span>
                  </div>
                  {result.courseMapCreated && (
                    <p className="mt-2 text-xs text-green-600">
                      Course Map created with prerequisite graph
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Upload state */}
          {!result && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-[#0033A0] bg-blue-50'
                    : file
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-[#0033A0] hover:bg-blue-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".imscc,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileArchive className="size-8 text-green-600" />
                    <p className="font-semibold text-green-800">{file.name}</p>
                    <p className="text-xs text-green-600">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB — Click to change
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="size-8 text-gray-400" />
                    <p className="font-semibold text-gray-600">
                      Drop your Canvas export here
                    </p>
                    <p className="text-xs text-gray-400">
                      .imscc file from Canvas &rarr; Settings &rarr; Export Course Content
                    </p>
                    <p className="mt-1 text-[10px] text-gray-300">
                      Supports large exports with embedded video.
                    </p>
                  </div>
                )}
              </div>

              {/* Optional overrides */}
              {file && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                    Optional overrides
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Course Code
                      </label>
                      <input
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        placeholder="Auto-detect"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Semester
                      </label>
                      <input
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        placeholder="Auto-detect"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Auto-detect from export"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={importing}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Import Course
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
    </ModalShell>
  )
}
