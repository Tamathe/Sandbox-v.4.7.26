'use client'

import { useParams, redirect } from 'next/navigation'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import {
  ArrowLeft, Loader2, Copy, Check, PenLine, Wrench,
  ShieldCheck, FileText, Mail, RefreshCw, UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { getWriteRoomTool } from '../../lib/write-room'
import type { WriteRoomField } from '../../lib/write-room'
import { useAuth } from '../../lib/auth-context'

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, FileText, Mail, RefreshCw, UserCheck, Wrench,
}

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Wrench
}

// ── Markdown renderer components (matches existing codebase style) ──────────
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

// ── Dynamic form field ──────────────────────────────────────────────────────
function FormField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: WriteRoomField
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
          rows={4}
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

// ── Sectioned output (LinkedIn Optimizer) ───────────────────────────────────
function SectionedOutput({ output }: { output: string }) {
  const sections = output
    .split(/^## /m)
    .filter(s => s.trim())
    .map(s => {
      const nlIndex = s.indexOf('\n')
      return {
        title: nlIndex > -1 ? s.slice(0, nlIndex).trim() : s.trim(),
        content: nlIndex > -1 ? s.slice(nlIndex + 1).trim() : '',
      }
    })

  if (sections.length <= 1) {
    // Still streaming or didn't parse — show as single block
    return (
      <div className="prose prose-sm max-w-none">
        <DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
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

// ── Main page ───────────────────────────────────────────────────────────────
export default function WriteRoomToolPage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string

  // Elevated tools have dedicated pages — redirect
  if (slug === 'cover-letter') redirect('/write-room/cover-letter')
  if (slug === 'email-rewriter') redirect('/write-room/email-rewriter')
  if (slug === 'linkedin-optimizer') redirect('/write-room/linkedin-optimizer')
  if (slug === 'resume-builder') redirect('/write-room/resume-builder')
  if (slug === 'ai-policy-builder') redirect('/write-room/ai-policy-builder')

  const tool = getWriteRoomTool(slug)

  const [formData, setFormData] = useState<Record<string, string>>({})
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [locked, setLocked] = useState(false) // for before-after variant
  const abortRef = useRef<AbortController | null>(null)

  const setField = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  const canSubmit = tool?.fields
    .filter(f => f.required)
    .every(f => formData[f.name]?.trim()) ?? false

  const handleGenerate = useCallback(async () => {
    if (!tool || !canSubmit || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setOutput('')
    setLoading(true)
    if (tool.variant === 'before-after') setLocked(true)

    try {
      const res = await fetch('/api/write-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ slug, formData }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('Request failed')

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
  }, [tool, canSubmit, loading, slug, formData, currentUser.email])

  const handleReset = useCallback(() => {
    abortRef.current?.abort()
    setOutput('')
    setLocked(false)
  }, [])

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4"><PenLine className="size-12 mx-auto text-gray-300" /></div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tool not found</h1>
        <p className="text-gray-500 mb-6">This Write Room tool doesn&apos;t exist yet.</p>
        <Link
          href="/write-room"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Write Room
        </Link>
      </div>
    )
  }

  const Icon = getIcon(tool.icon)
  const isSectioned = tool.variant === 'sectioned'
  const isBeforeAfter = tool.variant === 'before-after'

  // ── Sectioned layout (LinkedIn Optimizer) ─────────────────────────────────
  if (isSectioned) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <Link
              href="/write-room"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-3 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Write Room
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
          {/* Form */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-5">
            {tool.fields.map(field => (
              <FormField
                key={field.name}
                field={field}
                value={formData[field.name] ?? ''}
                onChange={val => setField(field.name, val)}
                disabled={loading}
              />
            ))}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canSubmit || loading}
              className="w-full py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> Generating...</> : 'Optimize'}
            </button>
          </div>

          {/* Sectioned output */}
          {output && <SectionedOutput output={output} />}
        </div>
      </div>
    )
  }

  // ── Default + Before-After layout (2-column grid) ─────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Link
            href="/write-room"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-3 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Write Room
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column — Form or locked original (before-after) */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            {isBeforeAfter && locked ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Original</h2>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-[#0033A0] hover:underline font-medium"
                  >
                    Rewrite Again
                  </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {formData.originalEmail}
                </div>
              </>
            ) : (
              <div className="space-y-5">
                {tool.fields.map(field => (
                  <FormField
                    key={field.name}
                    field={field}
                    value={formData[field.name] ?? ''}
                    onChange={val => setField(field.name, val)}
                    disabled={loading}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canSubmit || loading}
                  className="w-full py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="size-4 animate-spin" /> Generating...</> : 'Generate'}
                </button>
              </div>
            )}
          </div>

          {/* Right column — Output */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 relative">
            {output ? (
              <>
                <div className="absolute top-4 right-4">
                  <CopyButton text={output} />
                </div>
                <div className="prose prose-sm max-w-none text-gray-800 pr-20">
                  <DynamicMarkdown components={mdComponents}>{output}</DynamicMarkdown>
                </div>
              </>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="size-8 text-[#0033A0] animate-spin" />
                <p className="text-sm text-gray-400">Generating your content...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <PenLine className="size-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">
                  Fill in the form and click Generate
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Your AI-generated content will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <p className="text-center text-xs text-gray-400">
          Write Room provides AI-generated content — always review and personalize before using.
        </p>
      </div>
    </div>
  )
}
