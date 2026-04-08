'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, FileText, Check } from 'lucide-react'

interface PickerDocument {
  id: string
  title: string
  fileName: string
  mimeType: string
  fileSize: number
  tags: string[]
  createdAt: string
}

interface DocumentPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (documentId: string, title: string) => void
  userEmail: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentPicker({ open, onClose, onSelect, userEmail }: DocumentPickerProps) {
  const [documents, setDocuments] = useState<PickerDocument[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/documents?${params.toString()}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [search, userEmail])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(fetchDocuments, 300)
    return () => clearTimeout(timer)
  }, [open, fetchDocuments])

  if (!open) return null

  const handleConfirm = () => {
    const doc = documents.find((d) => d.id === selectedId)
    if (doc) {
      onSelect(doc.id, doc.title)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-extrabold text-gray-900">Select Document</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
          )}
          {!loading && documents.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">No documents found</div>
          )}
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedId(doc.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                selectedId === doc.id ? 'bg-blue-50 border border-[#0033A0]' : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <FileText className="size-5 text-[#0033A0] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{doc.title}</div>
                <div className="text-xs text-gray-500">{doc.fileName} -- {formatFileSize(doc.fileSize)}</div>
              </div>
              {selectedId === doc.id && (
                <Check className="size-5 text-[#0033A0] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002878] transition-colors disabled:opacity-50"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}
