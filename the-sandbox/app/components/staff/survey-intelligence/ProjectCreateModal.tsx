'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import TemplateSelector from './TemplateSelector'

interface ProjectCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (projectId: string) => void
  userEmail: string
}

interface Template {
  key: string
  title: string
  organization: string
  description: string
}

export default function ProjectCreateModal({ open, onClose, onCreated, userEmail }: ProjectCreateModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [surveyOrg, setSurveyOrg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingTemplates(true)
    fetch('/api/staff/survey-intelligence/templates', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false))
  }, [open, userEmail])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedKey(null)
      setTitle('')
      setSurveyOrg('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/staff/survey-intelligence/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          title: title.trim(),
          templateKey: selectedKey,
          surveyOrg: surveyOrg.trim() || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data.project?.id ?? data.id)
      }
    } catch { /* non-fatal */ }
    setSubmitting(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-[#0033A0]" />
            <h3 className="text-base font-extrabold text-gray-900">New Survey Project</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="size-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Template selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Choose a Template (optional)
            </label>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 text-[#0033A0] animate-spin" />
              </div>
            ) : (
              <TemplateSelector
                templates={templates}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
              />
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="project-title" className="block text-xs font-semibold text-gray-700 mb-1">
              Project Title
            </label>
            <input
              id="project-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SACSCOC 2026 Reaffirmation"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] transition-colors"
              autoFocus
            />
          </div>

          {/* Survey Org */}
          <div>
            <label htmlFor="project-org" className="block text-xs font-semibold text-gray-700 mb-1">
              Survey Organization (optional)
            </label>
            <input
              id="project-org"
              type="text"
              value={surveyOrg}
              onChange={(e) => setSurveyOrg(e.target.value)}
              placeholder="e.g. SACSCOC, Great Colleges to Work For"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
