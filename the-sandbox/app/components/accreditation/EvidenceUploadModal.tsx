'use client'

import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

interface EvidenceUploadModalProps {
  standards: { id: string; standardNumber: string; standardTitle: string }[]
  onClose: () => void
  onUploaded: () => void
}

export default function EvidenceUploadModal({ standards, onClose, onUploaded }: EvidenceUploadModalProps) {
  const { currentUser } = useAuth()
  const [standardId, setStandardId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceType, setEvidenceType] = useState('custom')
  const [programCode, setProgramCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!standardId || !title || !description || !currentUser) return
    setSubmitting(true)
    try {
      await apiFetch(currentUser.email, '/api/accreditation/evidence/upload', {
        method: 'POST',
        body: JSON.stringify({ standardId, title, description, evidenceType, programCode: programCode || undefined }),
      })
      onUploaded()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-extrabold text-gray-900">Upload Evidence</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard</label>
            <select
              value={standardId}
              onChange={e => setStandardId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select a standard...</option>
              {standards.map(s => (
                <option key={s.id} value={s.id}>
                  {s.standardNumber} — {s.standardTitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Fall 2025 Assessment Committee Report"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this evidence demonstrates..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Type</label>
              <select
                value={evidenceType}
                onChange={e => setEvidenceType(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="assessment_data">Assessment Data</option>
                <option value="syllabi">Syllabi</option>
                <option value="faculty_credential">Faculty Credential</option>
                <option value="policy_document">Policy Document</option>
                <option value="accessibility_report">Accessibility Report</option>
                <option value="student_support">Student Support</option>
                <option value="feedback">Feedback</option>
                <option value="custom">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program (optional)</label>
              <input
                value={programCode}
                onChange={e => setProgramCode(e.target.value)}
                placeholder="e.g., CS-BS"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!standardId || !title || !description || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-medium text-white hover:bg-[#002880] disabled:opacity-50"
          >
            <Upload className="size-4" />
            {submitting ? 'Uploading...' : 'Upload Evidence'}
          </button>
        </div>
      </div>
    </div>
  )
}
