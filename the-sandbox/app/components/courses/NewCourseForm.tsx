'use client'

import { Loader2 } from 'lucide-react'

interface NewCourseFormProps {
  form: { courseCode: string; title: string; description: string; isPublic: boolean }
  onFormChange: (updates: Partial<{ courseCode: string; title: string; description: string; isPublic: boolean }>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  creating: boolean
}

export default function NewCourseForm({ form, onFormChange, onSubmit, onCancel, creating }: NewCourseFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Course Code
          </label>
          <input
            value={form.courseCode}
            onChange={(e) => onFormChange({ courseCode: e.target.value })}
            placeholder="TEK-100"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Title
          </label>
          <input
            value={form.title}
            onChange={(e) => onFormChange({ title: e.target.value })}
            placeholder="Technology & Society"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => onFormChange({ description: e.target.value })}
          rows={2}
          placeholder="What is this course about?"
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => onFormChange({ isPublic: e.target.checked })}
            className="size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
          />
          Public course
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
          >
            {creating && <Loader2 className="size-4 animate-spin" />}
            Create Course
          </button>
        </div>
      </div>
    </form>
  )
}
