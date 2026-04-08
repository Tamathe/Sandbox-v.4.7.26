'use client'

import { useState } from 'react'
import { Copy, Check, Edit3, Eye } from 'lucide-react'

interface PolicyPreviewProps {
  mainParagraph: string
  assignmentTable: { title: string; level: string; explanation: string }[]
  disclosureRequirements: string
  consequencesLanguage: string
  fullText: string
  onEditFullText: (text: string) => void
}

export default function PolicyPreview({
  mainParagraph,
  assignmentTable,
  disclosureRequirements,
  consequencesLanguage,
  fullText,
  onEditFullText,
}: PolicyPreviewProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(fullText)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  async function copyText(text: string, section: string) {
    await navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  function handleSaveEdit() {
    onEditFullText(editText)
    setEditing(false)
  }

  const LEVEL_COLORS: Record<string, string> = {
    PROHIBITED: 'bg-red-100 text-red-700',
    LIMITED: 'bg-amber-100 text-amber-700',
    GUIDED: 'bg-blue-100 text-blue-700',
    REQUIRED: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="space-y-6">
      {/* Toggle edit/preview */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Generated Policy</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyText(fullText, 'full')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {copiedSection === 'full' ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copiedSection === 'full' ? 'Copied!' : 'Copy all'}
          </button>
          <button
            onClick={() => { setEditing(!editing); setEditText(fullText) }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {editing ? <Eye className="size-3" /> : <Edit3 className="size-3" />}
            {editing ? 'Preview' : 'Edit'}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={20}
            className="w-full p-4 border border-gray-200 rounded-xl text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent resize-y"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setEditing(false); setEditText(fullText) }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-1.5 text-xs font-medium bg-[#0033A0] text-white rounded-lg hover:bg-[#002880]"
            >
              Apply Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Main paragraph */}
          <Section
            title="Policy Statement"
            content={mainParagraph}
            onCopy={() => copyText(mainParagraph, 'main')}
            copied={copiedSection === 'main'}
          />

          {/* Assignment table */}
          {assignmentTable.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">AI Use by Assignment</h4>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Assignment</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">AI Level</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell">What This Means</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentTable.map((a, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2.5 text-gray-900">{a.title}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[a.level] ?? 'bg-gray-100 text-gray-600'}`}>
                            {a.level}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">{a.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Disclosure */}
          <Section
            title="Disclosure Requirements"
            content={disclosureRequirements}
            onCopy={() => copyText(disclosureRequirements, 'disclosure')}
            copied={copiedSection === 'disclosure'}
          />

          {/* Consequences */}
          <Section
            title="Consequences"
            content={consequencesLanguage}
            onCopy={() => copyText(consequencesLanguage, 'consequences')}
            copied={copiedSection === 'consequences'}
          />
        </div>
      )}
    </div>
  )
}

function Section({ title, content, onCopy, copied }: { title: string; content: string; onCopy: () => void; copied: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{title}</h4>
        <button onClick={onCopy} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}
