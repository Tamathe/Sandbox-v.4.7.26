'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, FolderSync, Loader2, Copy, Check, AlertTriangle, Download, Terminal } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import type { NamingPreset } from '../../lib/file-cleaner-service'

interface RenameEntry {
  original: string
  proposed: string
  flags: string[]
}

interface DuplicateCandidate {
  files: string[]
  similarity: number
}

interface CleanerResult {
  renames: RenameEntry[]
  duplicates: DuplicateCandidate[]
  summary: string
  powershellScript: string
  bashScript: string
  convention: string
}

const PRESETS: { value: NamingPreset; label: string; example: string }[] = [
  { value: 'date-first', label: 'Date First', example: '2026-03-24_execcomms_ocr-response-draft' },
  { value: 'project-based', label: 'Project Based', example: 'shared-governance_minutes_v2' },
  { value: 'department-archive', label: 'Department Archive', example: 'execcomms_2026_policy_ferpa-update' },
  { value: 'custom', label: 'Custom', example: 'Describe your own pattern' },
]

const FLAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  duplicate: { bg: 'bg-red-50', text: 'text-red-700', label: 'Possible duplicate' },
  'too-long': { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Name too long' },
  'special-chars': { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Special characters' },
  'no-date': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'No date found' },
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }, [text])
  return <button type="button" onClick={copy} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'}`}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : label ?? 'Copy'}</button>
}

export default function FileCleanerPage() {
  const { currentUser } = useAuth()
  const [fileList, setFileList] = useState('')
  const [preset, setPreset] = useState<NamingPreset>('date-first')
  const [customPattern, setCustomPattern] = useState('')
  const [department, setDepartment] = useState('')
  const [result, setResult] = useState<CleanerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptTab, setScriptTab] = useState<'powershell' | 'bash'>('powershell')

  const analyze = useCallback(async () => {
    if (!fileList.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/tools/file-cleaner/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ fileList, preset, customPattern: preset === 'custom' ? customPattern : undefined, department: department || undefined }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }, [fileList, preset, customPattern, department, currentUser.email])

  const downloadScript = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/hub" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-2 transition-colors"><ArrowLeft className="size-4" /> Hub</Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10"><FolderSync className="size-5 text-[#0033A0]" /></div>
            <div><h1 className="text-xl font-extrabold text-gray-900">File & Folder Cleaner</h1><p className="text-sm text-gray-500">Paste your messy file list and get a clean rename map with scripts</p></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Input section */}
        {!result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="naming-convention" className="block text-sm font-semibold text-gray-700 mb-1">Naming Convention</label>
                <select id="naming-convention" value={preset} onChange={(e) => setPreset(e.target.value as NamingPreset)} className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]">
                  {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">{PRESETS.find(p => p.value === preset)?.example}</p>
              </div>
              <div>
                <label htmlFor="department-input" className="block text-sm font-semibold text-gray-700 mb-1">Department (optional)</label>
                <input id="department-input" type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., execcomms" className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]" />
              </div>
              {preset === 'custom' && (
                <div>
                  <label htmlFor="custom-pattern" className="block text-sm font-semibold text-gray-700 mb-1">Custom Pattern</label>
                  <input id="custom-pattern" type="text" value={customPattern} onChange={(e) => setCustomPattern(e.target.value)} placeholder="Describe your naming pattern..." className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0]" />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="file-list" className="block text-sm font-semibold text-gray-700 mb-1">File List</label>
              <textarea id="file-list" value={fileList} onChange={(e) => setFileList(e.target.value)} placeholder="Paste your file names here, one per line..." rows={12} className="w-full rounded-2xl border-2 border-gray-200 px-5 py-4 text-sm font-mono text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] resize-none" />
            </div>

            <button type="button" onClick={analyze} disabled={!fileList.trim() || loading} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] disabled:bg-gray-300 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <FolderSync className="size-4" />}
              {loading ? 'Analyzing...' : 'Clean These Names'}
            </button>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Results</h2>
                  <p className="text-sm text-gray-600 mt-1">{result.summary}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Convention: {result.convention}</p>
                </div>
                <button type="button" onClick={() => { setResult(null); setError(null) }} className="text-sm text-[#0033A0] font-semibold hover:underline">Start Over</button>
              </div>
            </div>

            {/* Duplicates warning */}
            {result.duplicates.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="size-5 text-amber-600" />
                  <h3 className="font-bold text-amber-800">Possible Duplicates Found</h3>
                </div>
                {result.duplicates.map((dup, i) => (
                  <div key={i} className="text-sm text-amber-700 mt-2">
                    <span className="font-medium">{Math.round(dup.similarity * 100)}% similar:</span> {dup.files.join(' ↔ ')}
                  </div>
                ))}
              </div>
            )}

            {/* Rename table */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Rename Map ({result.renames.length} files)</h3>
                <CopyBtn text={result.renames.map(r => `${r.original} → ${r.proposed}`).join('\n')} label="Copy Map" />
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {result.renames.map((entry, i) => (
                  <div key={i} className="px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-red-600 line-through truncate">{entry.original}</p>
                        <p className="text-sm font-mono text-emerald-700 truncate mt-0.5">{entry.proposed}</p>
                      </div>
                      {entry.flags.length > 0 && (
                        <div className="flex gap-1 shrink-0">
                          {entry.flags.map(flag => {
                            const style = FLAG_STYLES[flag]
                            return style ? (
                              <span key={flag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Script output */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-gray-500" />
                  <h3 className="font-bold text-gray-900">Rename Script</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button type="button" onClick={() => setScriptTab('powershell')} className={`px-3 py-1 text-xs font-medium ${scriptTab === 'powershell' ? 'bg-[#0033A0] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>PowerShell</button>
                    <button type="button" onClick={() => setScriptTab('bash')} className={`px-3 py-1 text-xs font-medium ${scriptTab === 'bash' ? 'bg-[#0033A0] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Bash</button>
                  </div>
                  <CopyBtn text={scriptTab === 'powershell' ? result.powershellScript : result.bashScript} />
                  <button type="button" onClick={() => downloadScript(scriptTab === 'powershell' ? result.powershellScript : result.bashScript, scriptTab === 'powershell' ? 'rename.ps1' : 'rename.sh')} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors">
                    <Download className="size-3.5" /> Download
                  </button>
                </div>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-gray-700 overflow-x-auto max-h-64 bg-gray-50">
                {scriptTab === 'powershell' ? result.powershellScript : result.bashScript}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
