'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import type { PortfolioItem, PortfolioType } from '../generated/prisma'

export type PortfolioItemRecord = Omit<
  PortfolioItem,
  'startDate' | 'endDate' | 'createdAt' | 'updatedAt' | 'metadata'
> & {
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  metadata: unknown
}

type Props = {
  open: boolean
  defaultType: PortfolioType
  editItem?: PortfolioItemRecord
  onClose: () => void
  onSave: (item: PortfolioItemRecord) => void
}

const TYPE_OPTIONS: Array<{ value: PortfolioType; label: string }> = [
  { value: 'EDUCATION', label: 'Education' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'AWARD', label: 'Award' },
  { value: 'CERTIFICATION', label: 'Certification' },
]

function toMonthInputValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 7)
}

export default function PortfolioAddItemModal({
  open,
  defaultType,
  editItem,
  onClose,
  onSave,
}: Props) {
  const { currentUser } = useAuth()
  const [type, setType] = useState<PortfolioType>(defaultType)
  const [title, setTitle] = useState('')
  const [organization, setOrganization] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [present, setPresent] = useState(false)
  const [description, setDescription] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    if (editItem) {
      setType(editItem.type)
      setTitle(editItem.title)
      setOrganization(editItem.organization ?? '')
      setStartDate(toMonthInputValue(editItem.startDate))
      setEndDate(toMonthInputValue(editItem.endDate))
      setPresent(!editItem.endDate)
      setDescription(editItem.description ?? '')
      setSkillsInput(editItem.skills.join(', '))
      setUrl(editItem.url ?? '')
    } else {
      setType(defaultType)
      setTitle('')
      setOrganization('')
      setStartDate('')
      setEndDate('')
      setPresent(false)
      setDescription('')
      setSkillsInput('')
      setUrl('')
    }

    setError('')
    setSaving(false)
  }, [open, defaultType, editItem])

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      type,
      title: title.trim(),
      organization,
      startDate: startDate || null,
      endDate: present ? 'Present' : endDate || null,
      description,
      skills: skillsInput
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      url,
    }

    try {
      const response = await fetch(
        editItem ? `/api/portfolio/items/${editItem.id}` : '/api/portfolio',
        {
          method: editItem ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save portfolio item')
      }

      onSave((data.item ?? data) as PortfolioItemRecord)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save portfolio item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/35" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {editItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
            </h2>
            <p className="text-sm text-gray-500">
              Capture your education, experience, projects, awards, and credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as PortfolioType)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]"
                placeholder="e.g. Software Engineer Intern"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Organization</label>
              <input
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]"
                placeholder="Company, university, or course name"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="month"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="month"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  disabled={present}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0] disabled:bg-gray-50 disabled:text-gray-400"
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={present}
                    onChange={(event) => setPresent(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                  />
                  Present / ongoing
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]"
                placeholder="Describe the work, impact, or achievement"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Skills</label>
              <input
                value={skillsInput}
                onChange={(event) => setSkillsInput(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]"
                placeholder="Comma-separated, e.g. Legal research, Brief writing, Negotiation"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">URL</label>
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]"
                placeholder="https://..."
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editItem ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
