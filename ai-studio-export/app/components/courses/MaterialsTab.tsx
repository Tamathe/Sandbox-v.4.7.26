'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { PrivacyFooter } from '../PrivacyFooter'
import type { CourseMaterial, Course, ToolSuggestion } from './course-types'
import {
  MATERIAL_TYPES,
  TYPE_COLORS,
  TOOL_TYPE_COLORS,
  buildSuggestionHref,
  courseHeaders,
  getModuleKey,
  materialPreview,
  parseModuleNumber,
  readJson,
  sortModuleKeys,
} from './course-utils'

// ──────────────────────────────────────────────
// Syllabus import card (shown when course is empty)
// ──────────────────────────────────────────────
function SyllabusImportCard({
  courseId,
  userEmail,
  onImported,
}: {
  courseId: string
  userEmail: string
  onImported: (count: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setImporting(true)
    setError(null)
    setNotice(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/courses/${courseId}/materials/import-syllabus`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setNotice(`${data.count} materials created — review and adjust below.`)
      onImported(data.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0033A0]">
            <Sparkles className="h-4 w-4" />
            Start with your syllabus
          </div>
          <p className="text-sm text-blue-800">
            Upload a PDF syllabus and we'll scaffold your module structure automatically.
          </p>
          {notice && (
            <p className="mt-2 text-sm font-medium text-emerald-700">{notice}</p>
          )}
          {error && (
            <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting modules…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload syllabus PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Add / Edit material form
// ──────────────────────────────────────────────
interface MaterialFormValues {
  title: string
  content: string
  materialType: string
  moduleNumber: string
  isVisible: boolean
}

function MaterialForm({
  initialValues,
  courseId,
  userEmail,
  onSaved,
  onCancel,
  editingMaterialId,
}: {
  initialValues: MaterialFormValues
  courseId: string
  userEmail: string
  onSaved: () => void
  onCancel: () => void
  editingMaterialId?: string
}) {
  const [form, setForm] = useState<MaterialFormValues>(initialValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfNotice, setPdfNotice] = useState<string | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [pdfInputKey, setPdfInputKey] = useState(0)

  async function handlePdfUpload(file: File) {
    setPdfUploading(true)
    setPdfNotice(null)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/courses/${courseId}/materials/upload`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setForm((prev) => ({
        ...prev,
        content: data.content || prev.content,
        title: prev.title || data.suggestedTitle || '',
      }))
      setPdfNotice(`PDF parsed — ${data.pageCount} pages. Review and save below.`)
      setPdfInputKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF upload failed')
    } finally {
      setPdfUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingMaterialId) {
        await readJson(`/api/courses/${courseId}/materials`, {
          method: 'PATCH',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({
            materialId: editingMaterialId,
            title: form.title.trim(),
            content: form.content.trim(),
            materialType: form.materialType,
            moduleNumber: form.moduleNumber || null,
            isVisible: form.isVisible,
          }),
        })
      } else {
        await readJson(`/api/courses/${courseId}/materials`, {
          method: 'POST',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({
            title: form.title.trim(),
            content: form.content.trim(),
            materialType: form.materialType,
            moduleNumber: form.moduleNumber ? Number.parseInt(form.moduleNumber, 10) : null,
            isVisible: form.isVisible,
          }),
        })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save material')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* PDF upload */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          Upload PDF (optional)
        </label>
        <div className="flex items-center gap-3">
          <input
            key={pdfInputKey}
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handlePdfUpload(file)
            }}
          />
          <button
            type="button"
            disabled={pdfUploading}
            onClick={() => pdfInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {pdfUploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</>
            ) : (
              <><Upload className="h-4 w-4" /> Upload PDF</>
            )}
          </button>
          {pdfNotice && <span className="text-sm text-emerald-700">{pdfNotice}</span>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_180px_140px]">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Title
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Week 3 lecture notes"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Type
          </label>
          <select
            value={form.materialType}
            onChange={(e) => setForm((p) => ({ ...p, materialType: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
          >
            {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Module
          </label>
          <input
            type="number"
            min="1"
            max="99"
            value={form.moduleNumber}
            onChange={(e) => setForm((p) => ({ ...p, moduleNumber: e.target.value }))}
            placeholder="Optional"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          Content
        </label>
        <textarea
          value={form.content}
          onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
          rows={8}
          placeholder="Paste markdown, lecture notes, rubric details, or reading summaries here."
          className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
        />
      </div>

      <PrivacyFooter />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
          />
          Visible to students
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
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingMaterialId ? 'Save changes' : 'Save material'}
          </button>
        </div>
      </div>
    </form>
  )
}

// ──────────────────────────────────────────────
// Main MaterialsTab
// ──────────────────────────────────────────────
interface MaterialsTabProps {
  courseId: string
  courseCode: string
  selectedCourse: Course
  canManage: boolean
  isEducator: boolean
  userEmail: string
  materials: CourseMaterial[]
  onRefresh: () => void
  onOpenViewer: (materialId: string) => void
  suggestionsByModule: Record<string, ToolSuggestion[] | null | undefined>
  onSuggestionsFetched: (moduleKey: string, suggestions: ToolSuggestion[] | null | undefined) => void
}

export default function MaterialsTab({
  courseId,
  courseCode,
  selectedCourse,
  canManage,
  isEducator,
  userEmail,
  materials,
  onRefresh,
  onOpenViewer,
  suggestionsByModule,
  onSuggestionsFetched,
}: MaterialsTabProps) {
  const [moduleFormTarget, setModuleFormTarget] = useState<string | null>(null)
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [expandedMaterials, setExpandedMaterials] = useState<Record<string, boolean>>({})
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [movingMaterialId, setMovingMaterialId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const groupedMaterials = materials.reduce<Record<string, CourseMaterial[]>>((acc, m) => {
    const key = getModuleKey(m.moduleNumber)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})
  const sortedModuleKeys = sortModuleKeys(Object.keys(groupedMaterials))
  const materialsById = new Map(materials.map((m) => [m.id, m]))

  async function handleToggleVisibility(material: CourseMaterial) {
    try {
      await readJson(`/api/courses/${courseId}/materials`, {
        method: 'PATCH',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ materialId: material.id, isVisible: !material.isVisible }),
      })
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update visibility')
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    setDeleting(true)
    try {
      await readJson(`/api/courses/${courseId}/materials?materialId=${materialId}`, {
        method: 'DELETE',
        headers: courseHeaders(userEmail),
      })
      setDeletingMaterialId(null)
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete material')
    } finally {
      setDeleting(false)
    }
  }

  async function handleMoveToModule(materialId: string, targetModuleKey: string) {
    setMovingMaterialId(materialId)
    try {
      const moduleNumber = parseModuleNumber(targetModuleKey) // null for General
      await readJson(`/api/courses/${courseId}/materials`, {
        method: 'PATCH',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ materialId, moduleNumber }),
      })
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to move material')
    } finally {
      setMovingMaterialId(null)
    }
  }

  async function handleSuggestTools(moduleKey: string) {
    onSuggestionsFetched(moduleKey, null) // null = loading
    try {
      const payload = await readJson<{ suggestions: ToolSuggestion[] }>(
        `/api/courses/${courseId}/suggest-tools`,
        {
          method: 'POST',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ moduleNumber: parseModuleNumber(moduleKey) }),
        }
      )
      onSuggestionsFetched(moduleKey, payload.suggestions)
    } catch (err) {
      onSuggestionsFetched(moduleKey, [])
      setActionError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    }
  }

  function renderSuggestionPanel(moduleKey: string) {
    const suggestions = suggestionsByModule[moduleKey]
    if (suggestions === undefined) return null

    if (suggestions === null) {
      return (
        <div className="border-t border-blue-200 bg-blue-50 px-4 py-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking through tool ideas for {moduleKey}…
          </div>
        </div>
      )
    }

    if (suggestions.length === 0) return null

    return (
      <div className="border-t border-blue-200 bg-blue-50 px-4 py-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0033A0]">
          <Sparkles className="h-4 w-4" />
          AI-generated tool ideas for {moduleKey}
        </div>
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <div key={`${suggestion.title}-${idx}`} className="rounded-2xl border border-blue-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {idx + 1}. {suggestion.title}
                    </h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TOOL_TYPE_COLORS[suggestion.toolType] || 'bg-gray-100 text-gray-600'}`}>
                      {suggestion.toolType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-gray-600">{suggestion.description}</p>
                  <p className="text-xs leading-relaxed text-blue-800">
                    <span className="font-semibold">Why:</span> {suggestion.rationale}
                  </p>
                  {suggestion.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestion.citations.map((citation) => {
                        const mat = materialsById.get(citation.materialId)
                        if (!mat) return null
                        return (
                          <button
                            key={`${suggestion.title}-${citation.materialId}`}
                            type="button"
                            onClick={() => openViewerLocal(citation.materialId)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#0033A0] transition-colors hover:border-[#0033A0] hover:bg-blue-100"
                            title={citation.note}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {mat.moduleNumber ? `Module ${mat.moduleNumber}: ` : ''}{mat.title}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSuggestionsFetched(moduleKey, suggestions.filter((_, i) => i !== idx))}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss
                </button>
              </div>
              <div className="mt-4">
                <Link
                  href={buildSuggestionHref(courseCode, suggestion, moduleKey)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                >
                  <Sparkles className="h-4 w-4" />
                  Build this tool
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function openViewerLocal(materialId: string) {
    setExpandedMaterials((prev) => ({ ...prev, [materialId]: true }))
    onOpenViewer(materialId)
  }

  const isEmpty = sortedModuleKeys.length === 0

  return (
    <div>
      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
          <button type="button" onClick={() => setActionError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Syllabus import card — shown only when course is empty and user can manage */}
      {isEmpty && canManage && (
        <SyllabusImportCard
          courseId={courseId}
          userEmail={userEmail}
          onImported={() => {
            onRefresh()
          }}
        />
      )}

      {isEmpty ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <h3 className="mb-1 text-sm font-semibold text-gray-600">No materials yet</h3>
          <p className="mb-4 text-xs text-gray-400">
            {canManage
              ? 'Upload readings, lecture notes, rubrics, or cases so students and Sandy have something to work with.'
              : 'This course does not have any visible materials yet.'}
          </p>
          {canManage && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setModuleFormTarget('General')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
              >
                <Plus className="h-4 w-4" />
                Add first material
              </button>
              <PrivacyFooter />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {sortedModuleKeys.map((moduleKey) => {
            const moduleMaterials = groupedMaterials[moduleKey] ?? []
            return (
              <div key={moduleKey} className="overflow-hidden rounded-3xl border border-gray-200">
                {/* Module header */}
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{moduleKey}</h3>
                      <p className="text-sm text-gray-500">
                        {moduleMaterials.length} material{moduleMaterials.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isEducator && (
                        <button
                          type="button"
                          onClick={() => handleSuggestTools(moduleKey)}
                          disabled={suggestionsByModule[moduleKey] === null || moduleMaterials.length === 0}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-100 disabled:opacity-60"
                        >
                          {suggestionsByModule[moduleKey] === null ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Suggest tools
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setModuleFormTarget(moduleKey)
                            setEditingMaterialId(null)
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                        >
                          <Plus className="h-4 w-4" />
                          Add to {moduleKey}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Materials list */}
                <div className="divide-y divide-gray-100">
                  {moduleMaterials.map((material) => {
                    const isExpanded = !!expandedMaterials[material.id]
                    const isEditingThis = editingMaterialId === material.id
                    const isDeletingThis = deletingMaterialId === material.id

                    return (
                      <div key={material.id} className={`bg-white ${!material.isVisible ? 'opacity-60' : ''}`}>
                        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                          {/* Title / preview button */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMaterials((prev) => ({ ...prev, [material.id]: !prev[material.id] }))
                            }
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{material.title}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[material.materialType] || 'bg-gray-100 text-gray-600'}`}>
                                  {material.materialType}
                                </span>
                                {!material.isVisible && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    Hidden from students
                                  </span>
                                )}
                              </div>
                              <p className="text-sm leading-relaxed text-gray-500">
                                {materialPreview(material.content)}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                            ) : (
                              <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                            )}
                          </button>

                          {/* Actions */}
                          {canManage && (
                            <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMaterialId(material.id)
                                  setModuleFormTarget(null)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              {/* Move to module */}
                              {sortedModuleKeys.length > 1 && (
                                <div className="relative">
                                  {movingMaterialId === material.id ? (
                                    <div className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                                    </div>
                                  ) : (
                                    <select
                                      value={getModuleKey(material.moduleNumber)}
                                      onChange={(e) => handleMoveToModule(material.id, e.target.value)}
                                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 outline-none hover:bg-gray-50 focus:border-[#0033A0] cursor-pointer"
                                      title="Move to module"
                                    >
                                      {sortedModuleKeys.map((key) => (
                                        <option key={key} value={key}>{key}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleVisibility(material)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                                title={material.isVisible ? 'Hide from students' : 'Show to students'}
                              >
                                {material.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                {material.isVisible ? 'Hide' : 'Show'}
                              </button>
                              {/* Inline delete confirm */}
                              {isDeletingThis ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-700">Delete this material?</span>
                                  <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                    Yes, delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingMaterialId(null)}
                                    className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingMaterialId(material.id)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded content */}
                        {isExpanded && !isEditingThis && (
                          <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <ReactMarkdown>{material.content}</ReactMarkdown>
                            </div>
                          </div>
                        )}

                        {/* Inline edit form */}
                        {isEditingThis && (
                          <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                            <MaterialForm
                              editingMaterialId={material.id}
                              courseId={courseId}
                              userEmail={userEmail}
                              initialValues={{
                                title: material.title,
                                content: material.content,
                                materialType: material.materialType,
                                moduleNumber: material.moduleNumber?.toString() ?? '',
                                isVisible: material.isVisible,
                              }}
                              onSaved={() => {
                                setEditingMaterialId(null)
                                onRefresh()
                              }}
                              onCancel={() => setEditingMaterialId(null)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add material inline form */}
                {canManage && moduleFormTarget === moduleKey && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                    <MaterialForm
                      courseId={courseId}
                      userEmail={userEmail}
                      initialValues={{
                        title: '',
                        content: '',
                        materialType: 'lecture',
                        moduleNumber: parseModuleNumber(moduleKey)?.toString() ?? '',
                        isVisible: true,
                      }}
                      onSaved={() => {
                        setModuleFormTarget(null)
                        onRefresh()
                      }}
                      onCancel={() => setModuleFormTarget(null)}
                    />
                  </div>
                )}

                {renderSuggestionPanel(moduleKey)}
              </div>
            )
          })}

          {/* Add new module / general add button */}
          {canManage && (
            <button
              type="button"
              onClick={() => setModuleFormTarget('General')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add material
            </button>
          )}

          {/* General module add form (when no General module exists yet) */}
          {canManage && moduleFormTarget === 'General' && !groupedMaterials['General'] && (
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 px-4 py-4">
              <MaterialForm
                courseId={courseId}
                userEmail={userEmail}
                initialValues={{
                  title: '',
                  content: '',
                  materialType: 'lecture',
                  moduleNumber: '',
                  isVisible: true,
                }}
                onSaved={() => {
                  setModuleFormTarget(null)
                  onRefresh()
                }}
                onCancel={() => setModuleFormTarget(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
