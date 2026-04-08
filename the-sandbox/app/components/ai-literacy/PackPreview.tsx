'use client'

import { useState } from 'react'
import {
  FileText, Copy, Pencil, Check, Trash2, ArrowRightLeft,
  ChevronDown, ChevronUp, ClipboardCheck, Clock, Package, Loader2, Download,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import TemplatePicker from './TemplatePicker'
import PackExport from './PackExport'

interface RubricRow {
  criterion: string
  excellent: string
  proficient: string
  developing: string
  insufficient: string
}

interface Template {
  id: string
  title: string
  description: string
  aiTier: string
  aiLevel: string
  syllabusLanguage: string
  rubricRows: RubricRow[]
  implementationNotes: string
  disciplineFamily: string
  assignmentType: string
  tags: string[]
}

interface PackItem {
  id: string
  templateId: string | null
  template: Template | null
  customTitle: string | null
  customDescription: string | null
  customAiLevel: string | null
  customSyllabusLanguage: string | null
  customRubricRows: RubricRow[] | null
  sortOrder: number
}

interface PackCheckpoint {
  id: string
  checkpoint: { id: string; name: string; description: string; gradingWeight: string } | null
  customName: string | null
  customDescription: string | null
  customWeight: string | null
  sortOrder: number
}

interface Pack {
  id: string
  name: string
  disciplineFamily: string
  policyLanguage: string | null
  timelinePlan: { week: number; action: string }[] | null
  status: string
  courseId: string
  course?: { id: string; courseCode: string; title: string }
  items: PackItem[]
  checkpoints: PackCheckpoint[]
}

interface PackPreviewProps {
  pack: Pack
  onAdopt: () => Promise<void>
  onRefresh: () => Promise<void>
}

const TIER_COLORS: Record<string, string> = {
  FOUNDATION: 'bg-gray-100 text-gray-700',
  AWARENESS: 'bg-sky-100 text-sky-700',
  PARTNERSHIP: 'bg-violet-100 text-violet-700',
  FLUENCY: 'bg-emerald-100 text-emerald-700',
}

const AI_LEVEL_COLORS: Record<string, string> = {
  PROHIBIT: 'bg-red-100 text-red-700',
  CAUTIOUS: 'bg-amber-100 text-amber-700',
  GUIDED: 'bg-blue-100 text-blue-700',
  INTEGRATE: 'bg-indigo-100 text-indigo-700',
  REQUIRE: 'bg-green-100 text-green-700',
}

export default function PackPreview({ pack, onAdopt, onRefresh }: PackPreviewProps) {
  const { currentUser } = useAuth()
  const [editingPolicy, setEditingPolicy] = useState(false)
  const [policyText, setPolicyText] = useState(pack.policyLanguage ?? '')
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [copiedPolicy, setCopiedPolicy] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [swapItem, setSwapItem] = useState<PackItem | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [adopting, setAdopting] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    'x-demo-user-email': currentUser.email,
  }

  const customizeUrl = `/api/ai-literacy/starter-packs/${pack.id}/customize`

  // Policy actions
  const handleCopyPolicy = async () => {
    await navigator.clipboard.writeText(policyText)
    setCopiedPolicy(true)
    setTimeout(() => setCopiedPolicy(false), 2000)
  }

  const handleSavePolicy = async () => {
    setSavingPolicy(true)
    const res = await fetch(customizeUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ updatePolicyLanguage: policyText }),
    })
    setSavingPolicy(false)
    if (res.ok) {
      setEditingPolicy(false)
      await onRefresh()
    }
  }

  // Item actions
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSwapConfirm = async (newTemplateId: string) => {
    if (!swapItem) return
    await fetch(customizeUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ swapItem: { itemId: swapItem.id, newTemplateId } }),
    })
    setSwapItem(null)
    await onRefresh()
  }

  const handleRemoveItem = async (itemId: string) => {
    setRemovingId(itemId)
    await fetch(customizeUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ removeItem: { itemId } }),
    })
    setRemovingId(null)
    await onRefresh()
  }

  const handleAdopt = async () => {
    setAdopting(true)
    await onAdopt()
    setAdopting(false)
  }

  const courseName = pack.course ? `${pack.course.courseCode} — ${pack.course.title}` : pack.name
  const timeline = (pack.timelinePlan ?? []) as { week: number; action: string }[]

  return (
    <div className="space-y-8">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="size-3.5" />
          Export Pack
        </button>
      </div>

      {/* Policy Preview Card */}
      <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-[#0033A0]" />
            <h2 className="font-extrabold text-gray-900">AI Policy Language</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPolicy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copiedPolicy ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
              {copiedPolicy ? 'Copied' : 'Copy'}
            </button>
            {!editingPolicy && (
              <button
                onClick={() => setEditingPolicy(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Pencil className="size-3.5" />
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="p-5">
          {editingPolicy ? (
            <div className="space-y-3">
              <textarea
                value={policyText}
                onChange={e => setPolicyText(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-[#0033A0] outline-none resize-y"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setPolicyText(pack.policyLanguage ?? '')
                    setEditingPolicy(false)
                  }}
                  className="px-4 py-2 text-xs font-medium text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePolicy}
                  disabled={savingPolicy}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002880] disabled:opacity-50 transition-colors"
                >
                  {savingPolicy && <Loader2 className="size-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {policyText || 'No policy language generated yet.'}
            </p>
          )}
        </div>
      </div>

      {/* Assignment Cards Grid */}
      <div>
        <h2 className="font-extrabold text-gray-900 mb-4">Assignments ({pack.items.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pack.items.map(item => {
            const title = item.customTitle ?? item.template?.title ?? 'Untitled'
            const description = item.customDescription ?? item.template?.description ?? ''
            const tier = item.template?.aiTier ?? 'FOUNDATION'
            const aiLevel = item.customAiLevel ?? item.template?.aiLevel ?? 'GUIDED'
            const syllabusLanguage = item.customSyllabusLanguage ?? item.template?.syllabusLanguage ?? ''
            const rubricRows = (item.customRubricRows ?? item.template?.rubricRows ?? []) as RubricRow[]
            const implNotes = item.template?.implementationNotes ?? ''
            const isExpanded = expandedItems.has(item.id)

            return (
              <div key={item.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[tier] ?? 'bg-gray-100 text-gray-700'}`}>
                        {tier}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${AI_LEVEL_COLORS[aiLevel] ?? 'bg-gray-100 text-gray-700'}`}>
                        {aiLevel}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{description}</p>

                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="flex items-center gap-1 text-xs text-[#0033A0] hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      {isExpanded ? 'Collapse' : 'Details'}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSwapItem(item)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <ArrowRightLeft className="size-3" />
                        Swap
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removingId === item.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {removingId === item.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-gray-50/50 space-y-3">
                    {syllabusLanguage && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Syllabus Language</h4>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{syllabusLanguage}</p>
                      </div>
                    )}

                    {rubricRows.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Rubric</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px] text-gray-600">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1 pr-2 font-semibold text-gray-700">Criterion</th>
                                <th className="text-left py-1 pr-2 font-semibold text-gray-700">Excellent</th>
                                <th className="text-left py-1 pr-2 font-semibold text-gray-700">Proficient</th>
                                <th className="text-left py-1 pr-2 font-semibold text-gray-700">Developing</th>
                                <th className="text-left py-1 font-semibold text-gray-700">Insufficient</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rubricRows.map((row, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                  <td className="py-1 pr-2 font-medium text-gray-700">{row.criterion}</td>
                                  <td className="py-1 pr-2">{row.excellent}</td>
                                  <td className="py-1 pr-2">{row.proficient}</td>
                                  <td className="py-1 pr-2">{row.developing}</td>
                                  <td className="py-1">{row.insufficient}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {implNotes && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Implementation Notes</h4>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{implNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Checkpoints */}
      {pack.checkpoints.length > 0 && (
        <div>
          <h2 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardCheck className="size-5 text-[#0033A0]" />
            Process Checkpoints
          </h2>
          <div className="border rounded-2xl shadow-sm bg-white divide-y">
            {pack.checkpoints.map(cp => {
              const name = cp.customName ?? cp.checkpoint?.name ?? 'Checkpoint'
              const desc = cp.customDescription ?? cp.checkpoint?.description ?? ''
              const weight = cp.customWeight ?? cp.checkpoint?.gradingWeight ?? ''
              return (
                <div key={cp.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-4">{weight}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline Preview */}
      {timeline.length > 0 && (
        <div>
          <h2 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="size-5 text-[#0033A0]" />
            Implementation Timeline
          </h2>
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
              {timeline.map((step, i) => (
                <div key={i} className="relative pb-4 last:pb-0">
                  <div className="absolute -left-4 top-1 size-3 rounded-full border-2 border-[#0033A0] bg-white" />
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">Week {step.week}:</span> {step.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adopt Section */}
      <div className="border rounded-2xl shadow-sm bg-gradient-to-br from-[#0033A0]/5 to-white p-8 text-center">
        <Package className="size-10 text-[#0033A0] mx-auto mb-3" />
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">Adopt This Pack</h2>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          This will create an AI policy for {courseName} and activate your implementation tracker.
        </p>
        <button
          onClick={handleAdopt}
          disabled={adopting}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#0033A0] text-white rounded-xl text-sm font-semibold hover:bg-[#002880] disabled:opacity-50 transition-colors shadow-md"
        >
          {adopting ? <Loader2 className="size-5 animate-spin" /> : <Package className="size-5" />}
          Adopt This Pack
        </button>
      </div>

      {/* Template Picker Modal */}
      {swapItem && (
        <TemplatePicker
          discipline={pack.disciplineFamily}
          currentTemplateId={swapItem.templateId}
          onSelect={handleSwapConfirm}
          onClose={() => setSwapItem(null)}
        />
      )}

      {/* Pack Export Modal */}
      {showExport && (
        <PackExport pack={pack} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
