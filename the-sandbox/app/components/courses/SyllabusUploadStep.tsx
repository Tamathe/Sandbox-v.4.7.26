'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react'

interface ParseResultData {
  jobId: string
  cached: boolean
  fileHash: string
  result: unknown
}

interface Props {
  courseId: string
  userEmail: string
  onParsed: (data: ParseResultData) => void
}

const PROGRESS_MESSAGES = [
  'Analyzing syllabus structure...',
  'Normalizing dates and schedules...',
  'Detecting prerequisite relationships...',
  'Assembling course map...',
]

export default function SyllabusUploadStep({ courseId, userEmail, onParsed }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressIdx, setProgressIdx] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleFile = useCallback((f: File) => {
    setError(null)
    const ACCEPTED_TYPES = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ])
    if (!ACCEPTED_TYPES.has(f.type)) {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10 MB limit.')
      return
    }
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleParse = async () => {
    if (!file) return
    setParsing(true)
    setError(null)
    setProgressIdx(0)

    intervalRef.current = setInterval(() => {
      setProgressIdx((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1))
    }, 3000)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/courses/${courseId}/parse-syllabus`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Parse failed (${res.status})`)
      }

      const data: ParseResultData = await res.json()
      onParsed(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse syllabus')
    } finally {
      setParsing(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 transition-colors ${
          dragOver
            ? 'border-[#0033A0] bg-blue-50'
            : file
              ? 'border-[#0033A0] bg-blue-50/30'
              : 'border-gray-300 hover:border-[#0033A0] hover:bg-blue-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        {file ? (
          <div className="ready-entrance flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="size-8 text-[#0033A0]" />
              <CheckCircle2 className="size-5 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setError(null) }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
            >
              <X className="size-3" /> Remove
            </button>
          </div>
        ) : (
          <>
            <Upload className={`size-8 ${dragOver ? 'animate-bounce text-[#0033A0]' : 'text-gray-300'}`} />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                Drop your syllabus here
              </p>
              <p className="text-xs text-gray-500 mt-1">or click to browse (PDF or DOCX, max 10 MB)</p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs text-red-600 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {parsing && (
        <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-[#0033A0] shrink-0" />
            <p className="text-sm text-blue-800">{PROGRESS_MESSAGES[progressIdx]}</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= progressIdx ? 'bg-[#0033A0]' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Parse button */}
      <button
        type="button"
        disabled={!file || parsing}
        onClick={handleParse}
        className="w-full rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {parsing ? 'Parsing...' : 'Parse Syllabus'}
      </button>
    </div>
  )
}
