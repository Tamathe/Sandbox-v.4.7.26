'use client'

import { useState, useEffect } from 'react'
import { X, Download, FileText } from 'lucide-react'

interface DocumentPreviewModalProps {
  open: boolean
  onClose: () => void
  documentId: string
  title: string
  mimeType: string
  fileName: string
  userEmail: string
  onDownload: (id: string) => void
}

function isPreviewable(mimeType: string): 'pdf' | 'image' | 'text' | false {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('text/')) return 'text'
  return false
}

export default function DocumentPreviewModal({
  open,
  onClose,
  documentId,
  title,
  mimeType,
  fileName,
  userEmail,
  onDownload,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  if (!open) return null

  const previewType = isPreviewable(mimeType)
  const previewUrl = `/api/documents/${documentId}/preview`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-gray-900 truncate">{title}</h2>
            <p className="text-xs text-gray-500">{fileName}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => onDownload(documentId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] transition-colors"
            >
              <Download className="size-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-hidden bg-gray-50 min-h-0">
          {previewType === 'pdf' && !error && (
            <>
              {loading && (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  Loading preview...
                </div>
              )}
              <iframe
                src={`${previewUrl}#toolbar=1&navpanes=0`}
                className={`w-full h-full min-h-[60vh] ${loading ? 'hidden' : ''}`}
                title={`Preview: ${title}`}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true) }}
              />
            </>
          )}

          {previewType === 'image' && !error && (
            <div className="flex items-center justify-center p-6 h-full min-h-[40vh]">
              {loading && (
                <div className="text-sm text-gray-500">Loading preview...</div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={title}
                className={`max-w-full max-h-[70vh] rounded-lg shadow-sm object-contain ${loading ? 'hidden' : ''}`}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true) }}
              />
            </div>
          )}

          {previewType === 'text' && !error && (
            <TextPreview url={previewUrl} userEmail={userEmail} onError={() => setError(true)} />
          )}

          {(!previewType || error) && (
            <div className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-3">
              <div className="size-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FileText className="size-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {error ? 'Preview failed to load' : 'Preview not available for this file type'}
              </p>
              <p className="text-xs text-gray-400">{fileName}</p>
              <button
                onClick={() => onDownload(documentId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] transition-colors mt-2"
              >
                <Download className="size-4" />
                Download to view
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Fetches text content and renders it in a scrollable pre block */
function TextPreview({ url, userEmail, onError }: { url: string; userEmail: string; onError: () => void }) {
  const [content, setContent] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(url, { headers: { 'x-demo-user-email': userEmail } })
      .then((res) => {
        if (!res.ok) throw new Error('Failed')
        return res.text()
      })
      .then((text) => { if (!cancelled) { setContent(text); setLoaded(true) } })
      .catch(() => { if (!cancelled) { setLoaded(true); onError() } })
    return () => { cancelled = true }
  }, [url, userEmail, onError])

  if (!loaded) {
    return <div className="flex items-center justify-center h-full min-h-[40vh] text-sm text-gray-500">Loading preview...</div>
  }

  return (
    <div className="p-6 overflow-auto h-full min-h-[40vh] max-h-[70vh]">
      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white border rounded-xl p-4">
        {content}
      </pre>
    </div>
  )
}
