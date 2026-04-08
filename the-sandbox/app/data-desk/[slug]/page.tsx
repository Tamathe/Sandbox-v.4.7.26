'use client'

import { useParams, redirect } from 'next/navigation'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import {
  ArrowLeft, Loader2, Copy, Check, Upload, X, FileText, Wrench,
  BarChart3, ClipboardList, FileSearch, Presentation,
  type LucideIcon,
} from 'lucide-react'
import SegmentedControl from '../../components/SegmentedControl'
import { getDataDeskTool } from '../../lib/data-desk'
import type { DataDeskField } from '../../lib/data-desk'
import { useAuth } from '../../lib/auth-context'

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3, ClipboardList, FileSearch, Presentation, FileText, Wrench,
}

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Wrench
}

// ── Markdown components ─────────────────────────────────────────────────────
const mdComponents = {
  p:          ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong:     ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em:         ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul:         ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol:         ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li:         ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1:         ({ children }: { children?: React.ReactNode }) => <h1 className="font-extrabold text-xl mt-3 mb-1">{children}</h1>,
  h2:         ({ children }: { children?: React.ReactNode }) => <h2 className="font-extrabold text-lg mt-3 mb-1">{children}</h2>,
  h3:         ({ children }: { children?: React.ReactNode }) => <h3 className="font-semibold text-base mt-2 mb-0.5">{children}</h3>,
  code:       ({ children }: { children?: React.ReactNode }) => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600">{children}</blockquote>,
  a:          ({ href, children }: { href?: string; children?: React.ReactNode }) => <a href={href} className="text-[#0033A0] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
}

// ── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
      } ${className ?? ''}`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Sectioned output ────────────────────────────────────────────────────────
function SectionedOutput({ output, sections }: { output: string; sections: readonly string[] }) {
  const parsed = output
    .split(/^## /m)
    .filter(s => s.trim())
    .map(s => {
      const nlIndex = s.indexOf('\n')
      return {
        title: nlIndex > -1 ? s.slice(0, nlIndex).trim() : s.trim(),
        content: nlIndex > -1 ? s.slice(nlIndex + 1).trim() : '',
      }
    })

  if (parsed.length <= 1 && sections.length > 1) {
    // Still streaming — show raw
    return (
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
        <div className="prose prose-sm max-w-none text-gray-800">
          <DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {parsed.map((sec, i) => (
        <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">{sec.title}</h3>
            <CopyButton text={sec.content} />
          </div>
          <div className="prose prose-sm max-w-none text-gray-700">
            <DynamicMarkdown components={mdComponents}>{sec.content}</DynamicMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Skeleton loading cards ──────────────────────────────────────────────────
function SkeletonCards({ sections }: { sections: readonly string[] }) {
  return (
    <div className="space-y-4">
      {sections.map((title, i) => (
        <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-5 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-400">{title}</h3>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Form field ──────────────────────────────────────────────────────────────
function FormField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: DataDeskField
  value: string
  onChange: (val: string) => void
  disabled: boolean
}) {
  const baseClass =
    'w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 disabled:bg-gray-50'

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={3}
          className={baseClass + ' resize-none'}
        />
      ) : field.type === 'select' ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={baseClass}
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseClass}
        />
      )}
    </div>
  )
}

// ── Drop zone ───────────────────────────────────────────────────────────────
function DropZone({
  accept,
  file,
  onFile,
  onRemove,
  disabled,
}: {
  accept: string
  file: File | null
  onFile: (f: File) => void
  onRemove: () => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) onFile(f)
    },
    [onFile],
  )

  if (file) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-3">
        <FileText className="size-5 text-[#0033A0] flex-shrink-0" />
        <span className="text-sm text-gray-800 truncate flex-1">{file.name}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-colors ${
        dragOver
          ? 'border-[#0033A0] bg-blue-50'
          : 'border-gray-300 hover:border-[#0033A0] hover:bg-gray-50'
      }`}
    >
      <Upload className="size-8 text-gray-300" />
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600">Drop your file here or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">
          {accept.includes('image') && 'PNG, JPG, GIF, or WebP'}
          {accept.includes('pdf') && 'PDF documents'}
          {accept.includes('csv') && 'CSV or text files'}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function DataDeskToolPage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string

  // Elevated tools have dedicated pages — redirect
  if (slug === 'chart-explainer') redirect('/data-desk/chart-explainer')
  if (slug === 'survey-analyzer') redirect('/data-desk/survey-analyzer')
  if (slug === 'report-summarizer') redirect('/data-desk/report-summarizer')
  if (slug === 'presentation-outliner') redirect('/data-desk/presentation-outliner')

  const tool = getDataDeskTool(slug)

  const [file, setFile] = useState<File | null>(null)
  const [textContent, setTextContent] = useState('')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload') // survey only
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const setField = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  const canSubmit = (() => {
    if (!tool) return false
    if (tool.inputType === 'form') {
      return tool.fields?.filter(f => f.required).every(f => formData[f.name]?.trim()) ?? false
    }
    if (tool.inputType === 'text') {
      return inputMode === 'paste' ? textContent.trim().length > 0 : !!file
    }
    return !!file
  })()

  const handleAnalyze = useCallback(async () => {
    if (!tool || !canSubmit || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setOutput('')
    setLoading(true)

    try {
      let body: BodyInit
      const headers: Record<string, string> = {
        'x-demo-user-email': currentUser.email,
      }

      if (tool.inputType === 'form') {
        // JSON body
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({ slug, formData })
      } else if (tool.inputType === 'text' && inputMode === 'paste') {
        // JSON body with text content
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({ slug, content: textContent })
      } else {
        // FormData for file uploads
        const fd = new FormData()
        fd.append('slug', slug)
        if (file) fd.append('file', file)
        if (textContent && !file) fd.append('content', textContent)
        body = fd
      }

      const res = await fetch('/api/data-desk', {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || 'Request failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setOutput(prev => prev + decoder.decode(value))
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setOutput(`_Error: ${msg}_`)
    } finally {
      setLoading(false)
    }
  }, [tool, canSubmit, loading, slug, formData, textContent, file, inputMode, currentUser.email])

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tool not found</h1>
        <p className="text-gray-500 mb-6">This Data Desk tool doesn&apos;t exist yet.</p>
        <Link
          href="/data-desk"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Data Desk
        </Link>
      </div>
    )
  }

  const Icon = getIcon(tool.icon)

  const acceptMap: Record<string, string> = {
    image: 'image/png,image/jpeg,image/gif,image/webp',
    pdf: 'application/pdf',
    text: '.csv,.txt,text/csv,text/plain',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Link
            href="/data-desk"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-3 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Data Desk
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
              <Icon className="size-5 text-[#0033A0]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">{tool.title}</h1>
              <p className="text-sm text-gray-500">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Input area */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-5">
          {tool.inputType === 'form' && tool.fields ? (
            // Presentation Outliner — form fields
            <>
              {tool.fields.map(field => (
                <FormField
                  key={field.name}
                  field={field}
                  value={formData[field.name] ?? ''}
                  onChange={val => setField(field.name, val)}
                  disabled={loading}
                />
              ))}
            </>
          ) : tool.inputType === 'text' ? (
            // Survey Analyzer — toggle between upload and paste
            <>
              <SegmentedControl
                value={inputMode}
                onChange={setInputMode}
                options={[
                  { value: 'upload' as const, label: 'Upload File' },
                  { value: 'paste' as const, label: 'Paste Data' },
                ]}
              />
              {inputMode === 'upload' ? (
                <DropZone
                  accept={acceptMap[tool.inputType]}
                  file={file}
                  onFile={setFile}
                  onRemove={() => setFile(null)}
                  disabled={loading}
                />
              ) : (
                <textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Paste your survey results, CSV data, or text content here..."
                  disabled={loading}
                  rows={10}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 resize-none font-mono"
                />
              )}
            </>
          ) : (
            // Image or PDF upload
            <DropZone
              accept={acceptMap[tool.inputType]}
              file={file}
              onFile={setFile}
              onRemove={() => setFile(null)}
              disabled={loading}
            />
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canSubmit || loading}
            className="w-full py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing...</> : 'Analyze'}
          </button>
        </div>

        {/* Output */}
        {loading && !output && <SkeletonCards sections={tool.sections} />}
        {output && <SectionedOutput output={output} sections={tool.sections} />}

        {/* Privacy */}
        {!output && !loading && (
          <p className="text-center text-xs text-gray-400">
            Data Desk provides AI-generated analysis — always verify insights against your original data.
          </p>
        )}
      </div>
    </div>
  )
}
