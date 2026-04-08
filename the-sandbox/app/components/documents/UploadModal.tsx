'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileUp, Trash2 } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'
import { showToast } from '../sandy/Toast'

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onUploaded: () => void
  userEmail: string
  existingTags?: string[]
}

export default function UploadModal({ open, onClose, onUploaded, userEmail, existingTags = [] }: UploadModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'department' | 'all_staff'>('private')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isBatch = files.length > 1

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`))
      const unique = arr.filter((f) => !existing.has(`${f.name}-${f.size}`))
      const merged = [...prev, ...unique]
      // Auto-set title from first file if empty
      if (merged.length === 1 && !title) {
        setTitle(merged[0].name.replace(/\.[^.]+$/, ''))
      } else if (merged.length > 1) {
        setTitle('') // Clear title — batch mode uses filenames
      }
      return merged
    })
    setDragOver(false)
  }, [title])

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 1 && !title) {
        setTitle(next[0].name.replace(/\.[^.]+$/, ''))
      }
      return next
    })
  }

  if (!open) return null

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setTags('')
    setVisibility('private')
    setFiles([])
    setError(null)
    setUploadProgress(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const uploadSingleFile = async (file: File, fileTitle: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', fileTitle)
    if (description.trim()) formData.append('description', description.trim())
    if (tags.trim()) formData.append('tags', tags.trim())
    formData.append('visibility', visibility)

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'x-demo-user-email': userEmail },
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || `Upload failed: ${file.name}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) { setError('Please select at least one file'); return }
    if (!isBatch && !title.trim()) { setError('Please enter a title'); return }

    setUploading(true)
    setError(null)

    try {
      if (isBatch) {
        // Batch upload — each file uses its filename as title
        setUploadProgress({ done: 0, total: files.length })
        let failed = 0
        for (let i = 0; i < files.length; i++) {
          try {
            const fileTitle = files[i].name.replace(/\.[^.]+$/, '')
            await uploadSingleFile(files[i], fileTitle)
          } catch {
            failed++
          }
          setUploadProgress({ done: i + 1, total: files.length })
        }
        const succeeded = files.length - failed
        resetForm()
        onUploaded()
        onClose()
        showToast(failed === 0
          ? `${succeeded} documents uploaded successfully`
          : `${succeeded} uploaded, ${failed} failed`)
      } else {
        // Single file upload
        await uploadSingleFile(files[0], title.trim())
        const uploadedName = title.trim()
        resetForm()
        onUploaded()
        onClose()
        showToast(`${uploadedName} uploaded successfully`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  return (
    <ModalShell title="Upload Document" icon={Upload} onClose={handleClose} zIndex={50}>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {files.length > 0 ? `Files (${files.length})` : 'Files'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
              }}
              className={`w-full flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl py-6 px-4 text-sm transition-colors ${
                dragOver
                  ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                  : files.length > 0
                    ? 'border-gray-300 text-gray-900'
                    : 'border-gray-300 text-gray-500 hover:border-[#0033A0] hover:text-[#0033A0]'
              }`}
            >
              {files.length === 0 ? (
                <>
                  <span className="flex items-center gap-2">
                    <Upload className="size-5" />
                    {dragOver ? 'Drop files here' : 'Click or drag files here'}
                  </span>
                  <span className="text-xs text-gray-400">PDF, Word, Excel, images — max 25 MB. Select multiple files for batch upload.</span>
                </>
              ) : (
                <span className="flex items-center gap-2 text-xs text-[#0033A0]">
                  <Upload className="size-4" />
                  Add more files
                </span>
              )}
            </button>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={`${f.name}-${f.size}-${i}`} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <FileUp className="size-4 text-[#0033A0] flex-shrink-0" />
                      <span className="truncate text-gray-700">{f.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="size-3.5 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title — only for single file uploads */}
          {!isBatch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
              />
            </div>
          )}
          {isBatch && (
            <p className="text-xs text-gray-400">Batch upload: each file will use its filename as the title.</p>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. policy, HR, onboarding"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
            />
            {existingTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {existingTags
                  .filter((t) => !tags.toLowerCase().split(',').map((s) => s.trim().toLowerCase()).includes(t.toLowerCase()))
                  .slice(0, 6)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((prev) => prev ? `${prev}, ${tag}` : tag)}
                      className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:text-[#0033A0] transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
            <div className="flex gap-4">
              {([
                { value: 'private', label: 'Private', hint: 'Only you' },
                { value: 'department', label: 'Department', hint: 'Your department' },
                { value: 'all_staff', label: 'All Staff', hint: 'Every staff member' },
              ] as const).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer" title={opt.hint}>
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="accent-[#0033A0]"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                  <span className="text-xs text-gray-400 hidden sm:inline">({opt.hint})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002878] transition-colors disabled:opacity-50"
            >
              {uploading
                ? uploadProgress
                  ? `Uploading ${uploadProgress.done}/${uploadProgress.total}...`
                  : 'Uploading...'
                : isBatch
                  ? `Upload ${files.length} files`
                  : 'Upload'}
            </button>
          </div>
        </form>
    </ModalShell>
  )
}
