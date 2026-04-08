'use client'

import { FileText, Image, Table, File, Download, Clock, ChevronDown, ChevronUp, History, Link2, Eye, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { showToast } from '../sandy/Toast'

interface DocumentMeta {
  id: string
  uploaderId: string
  title: string
  description: string | null
  fileName: string
  fileSize: number
  mimeType: string
  tags: string[]
  visibility: string
  department: string | null
  version: number
  parentId: string | null
  downloadCount: number
  oneDriveUrl?: string | null
  createdAt: string
  updatedAt: string
  uploader?: { id: string; name: string; email: string; department: string | null }
}

interface DocumentCardProps {
  document: DocumentMeta
  uploaderName?: string
  currentUserEmail: string
  onDownload: (id: string) => void
  onViewVersions?: (id: string) => void
  onPreview?: (doc: DocumentMeta) => void
}

function canPreview(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/') || mimeType.startsWith('text/')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return Table
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document') || mimeType.includes('word')) return FileText
  return File
}

function getVisibilityLabel(visibility: string) {
  switch (visibility) {
    case 'private': return 'Private'
    case 'department': return 'Department'
    case 'all_staff': return 'All Staff'
    default: return visibility
  }
}

function getVisibilityColor(visibility: string) {
  switch (visibility) {
    case 'private': return 'bg-gray-100 text-gray-600'
    case 'department': return 'bg-blue-100 text-blue-700'
    case 'all_staff': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export default function DocumentCard({
  document,
  uploaderName,
  currentUserEmail,
  onDownload,
  onViewVersions,
  onPreview,
}: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = getFileIcon(document.mimeType)
  const displayName = uploaderName ?? document.uploader?.name ?? 'Unknown'

  return (
    <div className="border rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="flex-shrink-0 size-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon className="size-5 text-[#0033A0]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{document.title}</h3>
            {document.version > 1 && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                v{document.version}
              </span>
            )}
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getVisibilityColor(document.visibility)}`}>
              {getVisibilityLabel(document.visibility)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{formatFileSize(document.fileSize)}</span>
            <span className="flex items-center gap-1"><Clock className="size-3" />{formatDate(document.createdAt)}</span>
            <span>{displayName}</span>
          </div>
          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {document.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {document.description && (
            <p className="text-sm text-gray-600">{document.description}</p>
          )}
          <div className="text-xs text-gray-500 space-y-1">
            <div>File: {document.fileName}</div>
            <div>Downloads: {document.downloadCount}</div>
            {document.department && <div>Department: {document.department}</div>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(document.id) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] transition-colors"
            >
              <Download className="size-4" />
              Download
            </button>
            {canPreview(document.mimeType) && onPreview && (
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(document) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="size-4" />
                Preview
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                const url = `${window.location.origin}/documents?search=${encodeURIComponent(document.title)}`
                navigator.clipboard.writeText(url).then(() => {
                  showToast('Link copied to clipboard')
                })
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Link2 className="size-4" />
              Copy Link
            </button>
            {document.oneDriveUrl && (
              <a
                href={document.oneDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="size-4" />
                Open in OneDrive
              </a>
            )}
            {(document.version > 1 || document.parentId) && onViewVersions && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewVersions(document.id) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <History className="size-4" />
                Version History
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export type { DocumentMeta }
