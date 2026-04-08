'use client'

import { useState } from 'react'
import { Upload, Sparkles, FileText } from 'lucide-react'
import Button from '../Button'
import ErrorBanner from '../ErrorBanner'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { ClinicalCaseInput } from '../../lib/virtual-clinic/types'

interface CaseImportPanelProps {
  onImported: (data: Partial<ClinicalCaseInput>) => void
}

export default function CaseImportPanel({ onImported }: CaseImportPanelProps) {
  const { currentUser } = useAuth()
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!currentUser || !rawText.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch<ClinicalCaseInput>(
        currentUser.email,
        '/api/virtual-clinic/cases/import',
        { method: 'POST', body: JSON.stringify({ rawText }) },
      )
      onImported(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Upload className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Import with AI</h3>
      </div>

      <p className="text-xs text-gray-500">
        Paste an OSCE checklist, PDF-extracted text, or free-form case description. AI will parse it into a structured case for your review.
      </p>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={12}
        placeholder={`Paste your clinical case text here...\n\nExamples:\n- OSCE station checklist\n- Case study from a textbook\n- Free-form patient description\n- PDF-extracted text`}
        className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-y"
        disabled={loading}
      />

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <FileText className="size-3.5" />
        <span>{rawText.length.toLocaleString()} / 50,000 characters</span>
      </div>

      {error && <ErrorBanner message={error} retry={handleImport} />}

      <Button
        onClick={handleImport}
        loading={loading}
        disabled={!rawText.trim()}
        icon={<Sparkles className="size-4" />}
      >
        {loading ? 'Parsing with AI...' : 'Import with AI'}
      </Button>

      {loading && (
        <div className="text-xs text-gray-500 animate-pulse">
          This may take 15-30 seconds. Sonnet is extracting patient demographics, history, exam findings, differentials, and scoring rubric...
        </div>
      )}
    </div>
  )
}
