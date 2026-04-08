'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { BuilderDocument } from '../lib/types'

interface FilesPanelProps {
  sessionId: string | null
  documents: BuilderDocument[]
  userEmail: string
  onUploaded: (doc: BuilderDocument) => void
  onDeleted: (docId: string) => void
}

export default function FilesPanel({ sessionId, documents, userEmail, onUploaded, onDeleted }: FilesPanelProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (!sessionId) return
    if (file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, [file.name]: 'Only PDF files are supported' }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [file.name]: 'File too large (max 10MB)' }))
      return
    }

    setUploading(prev => [...prev, file.name])
    setErrors(prev => { const n = { ...prev }; delete n[file.name]; return n })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('sessionId', sessionId)

    try {
      const res = await fetch('/api/upload/pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onUploaded({ id: data.id, filename: data.filename, wordCount: data.wordCount, sessionId, createdAt: new Date().toISOString() })
    } catch (err) {
      setErrors(prev => ({ ...prev, [file.name]: err instanceof Error ? err.message : 'Upload failed' }))
    } finally {
      setUploading(prev => prev.filter(n => n !== file.name))
    }
  }, [sessionId, onUploaded])

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(uploadFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (docId: string) => {
    if (!sessionId) return
    try {
      await fetch(`/api/builder/${sessionId}/documents?docId=${docId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      onDeleted(docId)
    } catch { /* ignore */ }
  }

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-xs">
          <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Start a conversation first</p>
          <p className="text-gray-400 text-xs mt-1">Your session will be created on your first message, then you can upload PDFs here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-[#0033A0] mb-1">How uploaded PDFs are used</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          Uploaded PDFs are extracted and injected into your tool&apos;s knowledge base. When students interact with your tool, Claude will draw on this content to answer questions and guide learning — like giving it your syllabus, lecture notes, or readings.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-[#0033A0] bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragging ? 'text-[#0033A0]' : 'text-gray-300'}`} />
        <p className="font-semibold text-gray-700 text-sm">Drop PDFs here</p>
        <p className="text-gray-400 text-xs mt-1">or click to browse — max 10MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Uploading */}
      {uploading.map(name => (
        <div key={name} className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Loader2 className="w-4 h-4 text-[#0033A0] animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
            <p className="text-xs text-blue-600">Extracting text...</p>
          </div>
        </div>
      ))}

      {/* Errors */}
      {Object.entries(errors).map(([name, msg]) => (
        <div key={name} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 truncate">{name}</p>
            <p className="text-xs text-red-500">{msg}</p>
          </div>
        </div>
      ))}

      {/* Uploaded docs */}
      {documents.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Knowledge Base ({documents.length} file{documents.length !== 1 ? 's' : ''})
          </p>
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 group">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                  <p className="text-xs text-gray-400">{doc.wordCount.toLocaleString()} words</p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && uploading.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-xs">No documents uploaded yet.</p>
          <p className="text-gray-300 text-xs mt-1">Uploaded PDFs become the tool&apos;s knowledge base.</p>
        </div>
      )}
    </div>
  )
}
