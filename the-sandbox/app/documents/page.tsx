'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, Search, X, FileText } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import DocumentCard from '../components/documents/DocumentCard'
import UploadModal from '../components/documents/UploadModal'
import DocumentPreviewModal from '../components/documents/DocumentPreviewModal'
import type { DocumentMeta } from '../components/documents/DocumentCard'

type VisibilityTab = 'all' | 'private' | 'department' | 'all_staff'

export default function DocumentLibraryPage() {
  const { currentUser } = useAuth()
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<VisibilityTab>('all')
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [versionHistory, setVersionHistory] = useState<DocumentMeta[] | null>(null)
  const [versionDocTitle, setVersionDocTitle] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocumentMeta | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.set('visibility', activeTab)
      if (search.trim()) params.set('search', search.trim())
      if (tagFilter.trim()) params.set('tags', tagFilter.trim())

      const res = await fetch(`/api/documents?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
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
  }, [currentUser.email, activeTab, search, tagFilter])

  useEffect(() => {
    const timer = setTimeout(fetchDocuments, 300)
    return () => clearTimeout(timer)
  }, [fetchDocuments])

  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/download`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'download'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  const handleViewVersions = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/versions`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setVersionHistory(data.versions ?? [])
        const doc = documents.find((d) => d.id === id)
        setVersionDocTitle(doc?.title ?? 'Document')
      }
    } catch {
      // ignore
    }
  }

  // Collect all tags from documents for quick filtering
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags))).sort()

  // Group documents by first tag (or "Uncategorized")
  const grouped = documents.reduce<Record<string, DocumentMeta[]>>((acc, doc) => {
    const category = doc.tags[0] || 'Uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(doc)
    return acc
  }, {})
  const sortedCategories = Object.keys(grouped).sort()

  const tabs: { key: VisibilityTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'private', label: 'My Files' },
    { key: 'department', label: 'Department' },
    { key: 'all_staff', label: 'All Staff' },
  ]

  return (
    <>
      <PageHeader
        title="Document Library"
        subtitle="Upload, share, and manage internal documents"
        action={
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] transition-colors"
          >
            <Upload className="size-4" />
            Upload
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search + Tag filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {tagFilter && (
                <button
                  onClick={() => setTagFilter('')}
                  className="inline-flex items-center gap-1 text-xs bg-[#0033A0] text-white px-2.5 py-1 rounded-full"
                >
                  {tagFilter} <X className="size-3" />
                </button>
              )}
              {allTags.filter((t) => t !== tagFilter).slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Visibility tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#0033A0] text-[#0033A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Document list */}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-blue-50 mb-4">
              <FileText className="size-7 text-[#0033A0]" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 mb-1">No documents yet</h3>
            <p className="text-sm text-gray-500 mb-4">Upload your first file to get started.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002878] transition-colors"
            >
              <Upload className="size-4" />
              Upload Document
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedCategories.map((category) => (
              <div key={category}>
                <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-3">{category}</h2>
                <div className="space-y-3">
                  {grouped[category].map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      currentUserEmail={currentUser.email}
                      onDownload={handleDownload}
                      onViewVersions={handleViewVersions}
                      onPreview={setPreviewDoc}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <DocumentPreviewModal
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentId={previewDoc.id}
          title={previewDoc.title}
          mimeType={previewDoc.mimeType}
          fileName={previewDoc.fileName}
          userEmail={currentUser.email}
          onDownload={handleDownload}
        />
      )}

      {/* Upload modal */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={fetchDocuments}
        userEmail={currentUser.email}
        existingTags={allTags}
      />

      {/* Version history modal */}
      {versionHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-extrabold text-gray-900">Version History: {versionDocTitle}</h2>
              <button
                onClick={() => setVersionHistory(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {versionHistory.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  currentUserEmail={currentUser.email}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
