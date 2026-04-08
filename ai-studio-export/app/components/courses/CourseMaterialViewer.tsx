'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileText, X, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

type CourseMaterialViewerMaterial = {
  id: string
  title: string
  content: string
  materialType: string
  moduleNumber: number | null
}

export default function CourseMaterialViewer({
  material,
  onClose,
}: {
  material: CourseMaterialViewerMaterial | null
  onClose: () => void
}) {
  const { currentUser } = useAuth()
  const [isRead, setIsRead] = useState(false)
  const [marking, setMarking] = useState(false)

  if (!material) return null

  async function handleMarkRead() {
    if (!material) return
    setMarking(true)
    try {
      await fetch(`/api/materials/${material.id}/mark-read`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      setIsRead(true)
    } catch { /* ignore */ }
    finally { setMarking(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 cursor-default"
        aria-label="Close document viewer"
      />
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0033A0]">
                <FileText className="h-3.5 w-3.5" />
                {material.materialType}
              </span>
              {material.moduleNumber ? (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  Module {material.moduleNumber}
                </span>
              ) : null}
              {isRead ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  <Check className="h-3 w-3" />
                  Read
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleMarkRead()}
                  disabled={marking}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-60"
                >
                  <Check className="h-3 w-3" />
                  {marking ? '…' : 'Mark as read'}
                </button>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{material.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Referenced source material from this course workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{material.content}</ReactMarkdown>
          </div>
        </div>
      </aside>
    </div>
  )
}
