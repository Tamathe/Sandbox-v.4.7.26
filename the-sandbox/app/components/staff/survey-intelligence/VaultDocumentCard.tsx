'use client'

import { useState } from 'react'
import { FileText, Globe, Type, Trash2 } from 'lucide-react'

interface VaultDocumentCardProps {
  doc: {
    id: string
    title: string
    sourceType: string
    category: string
    pageCount: number
    createdAt: string
    _count: { chunks: number }
  }
  onDelete: (id: string) => void
  userEmail: string
}

const SOURCE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  url: Globe,
  text: Type,
}

export default function VaultDocumentCard({ doc, onDelete, userEmail }: VaultDocumentCardProps) {
  const [confirming, setConfirming] = useState(false)
  const Icon = SOURCE_ICONS[doc.sourceType] ?? FileText
  const categoryLabel = doc.category.replace(/-/g, ' ')

  const handleDelete = async () => {
    try {
      await fetch(`/api/staff/survey-intelligence/vault/${doc.id}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      onDelete(doc.id)
    } catch { /* non-fatal */ }
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-4 flex items-start gap-3 hover:border-gray-300 transition-colors">
      <div className="size-9 rounded-xl bg-[#0033A0]/5 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-[#0033A0]" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-gray-900 truncate">{doc.title}</h4>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0033A0]/10 text-[#0033A0]">
            {categoryLabel}
          </span>
          <span className="text-[10px] text-gray-400">
            {doc._count.chunks} chunk{doc._count.chunks !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {confirming ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDelete}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          title="Delete document"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  )
}
