'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

const DOCUMENT_TYPES = [
  { value: 'policy', label: 'Clinical Policy' },
  { value: 'guideline', label: 'Treatment Guideline' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'admin', label: 'Administrative' },
  { value: 'epic', label: 'Epic Documentation' },
  { value: 'other', label: 'Other' },
]

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md']

export default function UploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [department, setDepartment] = useState('')
  const [hospitalSite, setHospitalSite] = useState('')
  const [tags, setTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    const ext = '.' + selected.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setStatus('error')
      setStatusMessage(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
      return
    }

    setFile(selected)
    if (!title) {
      setTitle(selected.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    }
    setStatus('idle')
  }

  function clearFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return

    setUploading(true)
    setStatus('idle')

    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await api.uploadDocument(file, {
        title: title.trim(),
        document_type: documentType || undefined,
        department: department || undefined,
        hospital_site: hospitalSite || undefined,
        tags: tagList.length > 0 ? tagList : undefined,
      })

      setStatus('success')
      setStatusMessage(`"${title}" uploaded successfully. Document is being processed.`)

      // Reset form
      setFile(null)
      setTitle('')
      setDocumentType('')
      setDepartment('')
      setHospitalSite('')
      setTags('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status messages */}
      {status === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg">
          <CheckCircle size={16} />
          <span className="text-sm">{statusMessage}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle size={16} />
          <span className="text-sm">{statusMessage}</span>
        </div>
      )}

      {/* File drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-kch-gray-300 rounded-xl p-8 text-center cursor-pointer
                   hover:border-kch-blue hover:bg-kch-blue/5 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText size={24} className="text-kch-blue" />
            <div className="text-left">
              <p className="text-sm font-medium text-kch-gray-900">{file.name}</p>
              <p className="text-xs text-kch-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearFile() }}
              className="p-1 hover:bg-kch-gray-200 rounded"
            >
              <X size={16} className="text-kch-gray-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload size={32} className="mx-auto text-kch-gray-400 mb-3" />
            <p className="text-sm text-kch-gray-600 font-medium">
              Click to select a document
            </p>
            <p className="text-xs text-kch-gray-400 mt-1">
              PDF, DOCX, TXT, or MD (max 50MB)
            </p>
          </>
        )}
      </div>

      {/* Metadata fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-kch-gray-700 mb-1">
            Document Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Pediatric Sepsis Screening Protocol"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-kch-gray-700 mb-1">
            Document Type
          </label>
          <select
            className="input-field"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="">Select type...</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-kch-gray-700 mb-1">
            Department
          </label>
          <input
            type="text"
            className="input-field"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g., Pediatric ICU"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-kch-gray-700 mb-1">
            Hospital Site
          </label>
          <input
            type="text"
            className="input-field"
            value={hospitalSite}
            onChange={(e) => setHospitalSite(e.target.value)}
            placeholder="e.g., Kentucky Children's Hospital"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-kch-gray-700 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            className="input-field"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., sepsis, pediatric, screening"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!file || !title.trim() || uploading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Uploading & Processing...
          </>
        ) : (
          <>
            <Upload size={18} />
            Upload Document
          </>
        )}
      </button>
    </form>
  )
}
