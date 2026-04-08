'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, Check, FileText } from 'lucide-react'

interface Props {
  sessionId: string | null
  userEmail: string
  onUploaded: (doc: { id: string; fileName: string; chunkCount: number }) => void
}

export default function DocumentUploadButton({ sessionId, userEmail, onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !sessionId) return

    setIsUploading(true)
    setUploadedName(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)

      const res = await fetch('/api/workshop/research-hub/upload', {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(data.error || 'Upload failed')
      }

      const data = await res.json()
      onUploaded(data.document)
      setUploadedName(file.name)
      setTimeout(() => setUploadedName(null), 3000)
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const disabled = !sessionId

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => {
          if (!disabled) fileInputRef.current?.click()
        }}
        disabled={disabled || isUploading}
        title={disabled ? 'Save session first to upload documents' : 'Upload PDF to research context'}
        className="flex-shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {uploadedName ? (
          <Check className="size-4 text-emerald-300" />
        ) : isUploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
      </button>
      {uploadedName && (
        <span className="text-[10px] text-emerald-300 truncate max-w-[100px] flex items-center gap-1">
          <FileText className="size-3" />
          {uploadedName}
        </span>
      )}
    </>
  )
}
