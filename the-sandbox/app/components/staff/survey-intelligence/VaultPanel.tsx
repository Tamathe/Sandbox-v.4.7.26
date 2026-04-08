'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Globe, Type, Loader2, Plus } from 'lucide-react'
import VaultDocumentCard from './VaultDocumentCard'

interface VaultPanelProps {
  projectId: string
  userEmail: string
}

interface VaultDoc {
  id: string
  title: string
  sourceType: string
  category: string
  pageCount: number
  createdAt: string
  _count: { chunks: number }
}

const EVIDENCE_CATEGORIES = [
  'benefits',
  'community-service',
  'culture',
  'wellness',
  'diversity',
  'professional-development',
  'governance',
  'teaching',
  'facilities',
  'communication',
  'research',
  'student-success',
]

type UploadMode = 'none' | 'pdf' | 'text' | 'url'

export default function VaultPanel({ projectId, userEmail }: VaultPanelProps) {
  const [docs, setDocs] = useState<VaultDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadMode, setUploadMode] = useState<UploadMode>('none')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Text mode fields
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [textCategory, setTextCategory] = useState(EVIDENCE_CATEGORIES[0])

  // URL mode fields
  const [urlTitle, setUrlTitle] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const [urlCategory, setUrlCategory] = useState(EVIDENCE_CATEGORIES[0])

  // PDF category
  const [pdfCategory, setPdfCategory] = useState(EVIDENCE_CATEGORIES[0])

  const fetchDocs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/staff/survey-intelligence/vault?projectId=${projectId}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents ?? [])
      }
    } catch { /* non-fatal */ }
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [projectId, userEmail])

  const handleDelete = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const handlePdfUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('category', pdfCategory)
      const res = await fetch('/api/staff/survey-intelligence/vault', {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })
      if (res.ok) {
        await fetchDocs()
        setUploadMode('none')
      }
    } catch { /* non-fatal */ }
    setUploading(false)
  }

  const handleTextSubmit = async () => {
    if (!textTitle.trim() || !textContent.trim()) return
    setUploading(true)
    try {
      const res = await fetch('/api/staff/survey-intelligence/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          projectId,
          sourceType: 'text',
          title: textTitle.trim(),
          content: textContent.trim(),
          category: textCategory,
        }),
      })
      if (res.ok) {
        await fetchDocs()
        setTextTitle('')
        setTextContent('')
        setUploadMode('none')
      }
    } catch { /* non-fatal */ }
    setUploading(false)
  }

  const handleUrlSubmit = async () => {
    if (!urlTitle.trim() || !urlValue.trim()) return
    setUploading(true)
    try {
      const res = await fetch('/api/staff/survey-intelligence/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          projectId,
          sourceType: 'url',
          title: urlTitle.trim(),
          url: urlValue.trim(),
          category: urlCategory,
        }),
      })
      if (res.ok) {
        await fetchDocs()
        setUrlTitle('')
        setUrlValue('')
        setUploadMode('none')
      }
    } catch { /* non-fatal */ }
    setUploading(false)
  }

  const categoryLabel = (cat: string) => cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="size-5 text-[#0033A0]" />
            <h3 className="text-base font-extrabold text-gray-900">Evidence Vault</h3>
          </div>
          <span className="text-xs text-gray-400">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Upload buttons */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2">
        <button
          onClick={() => { setUploadMode('pdf'); fileRef.current?.click() }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0]/5 text-[#0033A0] hover:bg-[#0033A0]/10 transition-colors"
        >
          <FileText className="size-3.5" /> Upload PDF
        </button>
        <button
          onClick={() => setUploadMode('text')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0]/5 text-[#0033A0] hover:bg-[#0033A0]/10 transition-colors"
        >
          <Type className="size-3.5" /> Paste Text
        </button>
        <button
          onClick={() => setUploadMode('url')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0]/5 text-[#0033A0] hover:bg-[#0033A0]/10 transition-colors"
        >
          <Globe className="size-3.5" /> Import URL
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handlePdfUpload(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Upload forms */}
      {uploadMode === 'pdf' && (
        <div className="px-5 py-3 border-b border-gray-100 space-y-2">
          <label className="block text-xs font-semibold text-gray-700">Category</label>
          <select
            value={pdfCategory}
            onChange={(e) => setPdfCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
          >
            {EVIDENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
          {uploading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="size-3.5 animate-spin" /> Uploading...
            </div>
          )}
        </div>
      )}

      {uploadMode === 'text' && (
        <div className="px-5 py-3 border-b border-gray-100 space-y-3">
          <input
            type="text"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="Document title"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
          />
          <select
            value={textCategory}
            onChange={(e) => setTextCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
          >
            {EVIDENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Paste evidence text here..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setUploadMode('none')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={!textTitle.trim() || !textContent.trim() || uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0] text-white hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add Document
            </button>
          </div>
        </div>
      )}

      {uploadMode === 'url' && (
        <div className="px-5 py-3 border-b border-gray-100 space-y-3">
          <input
            type="text"
            value={urlTitle}
            onChange={(e) => setUrlTitle(e.target.value)}
            placeholder="Document title"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
          />
          <select
            value={urlCategory}
            onChange={(e) => setUrlCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
          >
            {EVIDENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setUploadMode('none')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlTitle.trim() || !urlValue.trim() || uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0] text-white hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Import URL
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="p-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 text-[#0033A0] animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No documents yet. Upload evidence to get started.
          </p>
        ) : (
          docs.map((doc) => (
            <VaultDocumentCard
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              userEmail={userEmail}
            />
          ))
        )}
      </div>
    </div>
  )
}
