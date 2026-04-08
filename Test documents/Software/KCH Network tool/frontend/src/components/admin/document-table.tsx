'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, RefreshCw, FileText, Search, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react'
import { api } from '@/lib/api'
import type { Document } from '@/lib/types'

export default function DocumentTable() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listDocuments({
        search: search || undefined,
        document_type: typeFilter || undefined,
        limit: pageSize,
        offset: page * pageSize,
      })
      setDocuments(data.documents)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, page])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    try {
      await api.deleteDocument(doc.id)
      loadDocuments()
    } catch (err) {
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  function statusIcon(status: string) {
    switch (status) {
      case 'ready':
        return <CheckCircle size={14} className="text-green-500" />
      case 'processing':
        return <Clock size={14} className="text-yellow-500" />
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />
      default:
        return <FileText size={14} className="text-kch-gray-400" />
    }
  }

  function handleOpenDocument(doc: Document) {
    const url = api.getDocumentDownloadUrl(doc.id)
    const token = api.getToken()
    window.open(`${url}?token=${encodeURIComponent(token || '')}`, '_blank')
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-kch-gray-400" />
          <input
            type="text"
            className="input-field pl-9 text-sm"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <select
          className="input-field text-sm w-auto"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0) }}
        >
          <option value="">All Types</option>
          <option value="policy">Policy</option>
          <option value="guideline">Guideline</option>
          <option value="protocol">Protocol</option>
          <option value="admin">Administrative</option>
          <option value="epic">Epic</option>
        </select>
        <button onClick={loadDocuments} className="btn-secondary text-sm flex items-center gap-1">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kch-gray-50 border-b border-kch-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-kch-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-kch-gray-600 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-kch-gray-600 hidden lg:table-cell">Size</th>
                <th className="text-left px-4 py-3 font-medium text-kch-gray-600 hidden lg:table-cell">Chunks</th>
                <th className="text-left px-4 py-3 font-medium text-kch-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-kch-gray-600 hidden sm:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-kch-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kch-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-kch-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-kch-gray-400">
                    No documents found
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-kch-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleOpenDocument(doc)}
                        className="flex items-center gap-2 text-left group w-full"
                        title="Open document"
                      >
                        <FileText size={16} className="text-kch-gray-400 flex-shrink-0 group-hover:text-kch-blue" />
                        <div className="min-w-0">
                          <p className="font-medium text-kch-gray-900 truncate group-hover:text-kch-blue group-hover:underline">{doc.title}</p>
                          <p className="text-xs text-kch-gray-400 truncate">{doc.original_filename}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs bg-kch-gray-100 px-2 py-0.5 rounded-full text-kch-gray-600">
                        {doc.document_type || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-kch-gray-600 hidden lg:table-cell">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-kch-gray-600 hidden lg:table-cell">
                      {doc.chunk_count ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {statusIcon(doc.status)}
                        <span className="text-xs capitalize">{doc.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-kch-gray-500 text-xs hidden sm:table-cell">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDocument(doc)}
                          className="p-1.5 text-kch-gray-400 hover:text-kch-blue rounded transition-colors"
                          title="Download document"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 text-kch-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Delete document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-kch-gray-200 bg-kch-gray-50">
            <span className="text-xs text-kch-gray-500">
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="btn-secondary text-xs px-2 py-1"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= total}
                className="btn-secondary text-xs px-2 py-1"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
