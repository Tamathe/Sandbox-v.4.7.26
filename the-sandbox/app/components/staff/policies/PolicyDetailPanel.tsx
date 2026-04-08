'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Building2, Users, Bot, ExternalLink } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import PolicyNumberBadge from './PolicyNumberBadge'

interface PolicyChunk {
  id: string
  sectionTitle: string
  content: string
  chunkIndex: number
}

interface PolicyDetail {
  id: string
  policyNumber: string
  title: string
  category: string
  responsibleOffice: string
  appliesTo: string
  effectiveDate: string
  lastRevised: string
  fullText: string
  summary: string | null
  source?: string
  externalUrl?: string | null
  chunks?: PolicyChunk[]
}

interface PolicyDetailPanelProps {
  policyNumber: string
  onClose: () => void
}

/**
 * Build a table-of-contents from chunks (preferred) or markdown headings.
 */
function buildToc(policy: PolicyDetail): { title: string; id: string }[] {
  // If we have chunks, use their section titles (de-duplicated)
  if (policy.chunks && policy.chunks.length > 1) {
    const seen = new Set<string>()
    return policy.chunks
      .filter((c) => {
        if (seen.has(c.sectionTitle)) return false
        seen.add(c.sectionTitle)
        return true
      })
      .map((c) => ({
        title: c.sectionTitle.slice(0, 60),
        id: `section-${c.chunkIndex}`,
      }))
  }

  // Fallback: extract ## headings from markdown
  return policy.fullText.split('\n')
    .filter((line) => /^## /.test(line))
    .map((line) => {
      const title = line.replace(/^## /, '')
      return { title, id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
    })
}

/**
 * Render policy text intelligently — handles both markdown-formatted
 * simulated policies and raw PDF text.
 */
function renderPolicyContent(policy: PolicyDetail): string {
  const text = policy.fullText

  // If we have chunks, render them with section headers
  if (policy.chunks && policy.chunks.length > 1) {
    return policy.chunks.map((chunk) => {
      const sectionId = `section-${chunk.chunkIndex}`
      const header = `<h3 id="${sectionId}" class="text-base font-bold text-gray-900 mt-6 mb-3 scroll-mt-20 border-b border-gray-100 pb-2">${escapeHtml(chunk.sectionTitle)}</h3>`
      const content = formatTextBlock(chunk.content)
      return header + content
    }).join('\n')
  }

  // Check if it looks like markdown (has ## headings)
  if (/^## /m.test(text)) {
    return simpleMarkdown(text)
  }

  // Raw PDF text — apply smart formatting
  return formatTextBlock(text)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Format a block of raw text into readable HTML.
 * Detects numbered sections, bullet points, and paragraphs.
 */
function formatTextBlock(text: string): string {
  const lines = text.split('\n')
  const htmlParts: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      htmlParts.push('<br/>')
      continue
    }

    // Numbered section headers (e.g., "1. Purpose" or "Section 4.2")
    if (/^(?:Section|Article|SECTION|ARTICLE)\s+[\dIVX]+/i.test(trimmed)) {
      htmlParts.push(`<h4 class="font-bold text-gray-800 mt-4 mb-2 text-sm">${escapeHtml(trimmed)}</h4>`)
      continue
    }

    // Numbered sub-items (e.g., "4.1 ..." or "(a) ...")
    if (/^\d+\.\d+\s/.test(trimmed) || /^\([a-z]\)\s/.test(trimmed)) {
      htmlParts.push(`<p class="text-sm text-gray-700 ml-4 mb-1">${escapeHtml(trimmed)}</p>`)
      continue
    }

    // Bullet points
    if (/^[-•]\s/.test(trimmed)) {
      htmlParts.push(`<li class="ml-6 text-sm text-gray-700 list-disc">${escapeHtml(trimmed.replace(/^[-•]\s*/, ''))}</li>`)
      continue
    }

    // ALL-CAPS lines (likely section headers in PDFs)
    if (trimmed.length > 5 && trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      htmlParts.push(`<h4 class="font-bold text-gray-800 mt-4 mb-2 text-sm uppercase">${escapeHtml(trimmed)}</h4>`)
      continue
    }

    // Regular paragraph
    htmlParts.push(`<p class="text-sm text-gray-700 mb-1 leading-relaxed">${escapeHtml(trimmed)}</p>`)
  }

  return htmlParts.join('\n')
}

/**
 * Simple markdown renderer for simulated policy text with ## headings.
 */
function simpleMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h4 class="font-bold text-gray-800 mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, (_, title) => {
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return `<h3 id="${id}" class="text-base font-bold text-gray-900 mt-6 mb-3 scroll-mt-20 border-b border-gray-100 pb-2">${title}</h3>`
    })
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-extrabold text-gray-900 mb-4">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-gray-700">$1</li>')
    .replace(/^(\d+\.\d+)\s+(.+)$/gm, '<p class="text-sm text-gray-700 ml-4 mb-1"><strong>$1</strong> $2</p>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export default function PolicyDetailPanel({ policyNumber, onClose }: PolicyDetailPanelProps) {
  const { currentUser } = useAuth()
  const [policy, setPolicy] = useState<PolicyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const encoded = encodeURIComponent(policyNumber)
        const res = await fetch(`/api/staff/policies/${encoded}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          // Handle both { document: ... } wrapper and raw document
          setPolicy(data.document || data)
        }
      } catch { /* non-fatal */ }
      setLoading(false)
    }
    load()
  }, [policyNumber, currentUser.email])

  const toc = policy ? buildToc(policy) : []

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-3xl bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {policy && <PolicyNumberBadge policyNumber={policy.policyNumber} category={policy.category} />}
              <h2 className="font-extrabold text-gray-900 truncate">{policy?.title || 'Loading...'}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
              <X className="size-5 text-gray-400" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : policy ? (
          <div className="flex">
            {/* TOC sidebar */}
            {toc.length > 1 && (
              <div className="hidden lg:block w-56 flex-shrink-0 border-r border-gray-100 p-4 sticky top-16 h-fit max-h-[calc(100vh-5rem)] overflow-y-auto">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sections</h4>
                <nav className="space-y-1">
                  {toc.map(s => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-xs text-gray-600 hover:text-[#0033A0] py-1 transition-colors line-clamp-2"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 p-6 min-w-0">
              {/* Meta bar */}
              <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Effective: {new Date(policy.effectiveDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  {policy.responsibleOffice}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {policy.appliesTo}
                </div>
              </div>

              {/* External link */}
              {policy.externalUrl && (
                <a
                  href={policy.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-xs font-medium text-[#0033A0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  View on regs.uky.edu
                </a>
              )}

              {/* Summary */}
              {policy.summary && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-800">{policy.summary}</p>
                </div>
              )}

              {/* Full text */}
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: renderPolicyContent(policy) }}
              />
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">Policy not found.</div>
        )}

        {/* Ask Sandy FAB */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('sandy-open-with-context', {
              detail: { message: `Tell me about policy ${policyNumber}` },
            }))
          }}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-[#0033A0] text-white text-sm font-medium rounded-full shadow-lg hover:bg-[#002580] transition-colors z-50"
        >
          <Bot className="size-4" />
          Ask Sandy about this policy
        </button>
      </div>
    </div>
  )
}
