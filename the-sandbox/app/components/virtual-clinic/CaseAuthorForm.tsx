'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Save,
  Send,
  AlertTriangle,
} from 'lucide-react'
import Button from '../Button'
import type { ClinicalCaseInput, ClinicalProgram, ScoringRubric, ScaffoldingLevel } from '../../lib/virtual-clinic/types'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_RUBRICS: Record<ClinicalProgram, ScoringRubric> = {
  DNP_PSYCHIATRY: {
    historyWeight: 0.25,
    examWeight: 0.2,
    differentialWeight: 0.25,
    planWeight: 0.2,
    communicationWeight: 0.1,
  },
  COLLEGE_OF_MEDICINE: {
    historyWeight: 0.2,
    examWeight: 0.25,
    differentialWeight: 0.25,
    planWeight: 0.2,
    communicationWeight: 0.1,
  },
}

const EMPTY_RUBRIC: ScoringRubric = DEFAULT_RUBRICS.DNP_PSYCHIATRY

const EMPTY_CASE: ClinicalCaseInput = {
  title: '',
  chiefComplaint: '',
  program: 'DNP_PSYCHIATRY',
  difficulty: 'INTERMEDIATE',
  targetYear: null,
  organSystems: [],
  learningObjectives: [],
  tags: [],
  patientName: '',
  patientAge: 0,
  patientSex: '',
  patientPronouns: null,
  personalityNotes: null,
  historyOfPresentIllness: {},
  pastMedicalHistory: {},
  medications: [],
  allergies: [],
  socialHistory: {},
  familyHistory: {},
  reviewOfSystems: {},
  physicalExamFindings: {},
  vitalSigns: { heartRate: 0, bloodPressure: '', respiratoryRate: 0, temperature: 0, oxygenSaturation: 0 },
  defaultNormalFindings: null,
  availableLabs: [],
  availableImaging: [],
  correctDifferentials: [],
  keyHistoryQuestions: [],
  keyExamManeuvers: [],
  criticalActions: [],
  scoringRubric: EMPTY_RUBRIC,
  courseId: null,
}

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'

// ── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-2xl shadow-sm bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
        {open ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  )
}

// ── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-[#0033A0] text-xs px-2 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={add} className="text-[#0033A0] hover:bg-blue-50 rounded-lg px-2">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ── List Input (for objects with a label field) ──────────────────────────────

function ListInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (trimmed) {
      onChange([...value, trimmed])
      setInput('')
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <ul className="space-y-1 mb-2">
        {value.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="flex-1">{item}</span>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={add} className="text-[#0033A0] hover:bg-blue-50 rounded-lg px-2">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ── Key-Value Pairs (for physicalExamFindings) ───────────────────────────────

function KeyValuePairs({
  label,
  value,
  onChange,
}: {
  label: string
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}) {
  const entries = Object.entries(value)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  function add() {
    if (newKey.trim()) {
      onChange({ ...value, [newKey.trim()]: newVal.trim() ? JSON.parse(`"${newVal.trim()}"`) : '' })
      setNewKey('')
      setNewVal('')
    }
  }

  function remove(key: string) {
    const copy = { ...value }
    delete copy[key]
    onChange(copy)
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="space-y-2 mb-2">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start gap-2 text-sm">
            <span className="font-medium text-gray-700 min-w-[140px]">{key}</span>
            <span className="flex-1 text-gray-600">{typeof val === 'string' ? val : JSON.stringify(val)}</span>
            <button type="button" onClick={() => remove(key)} className="text-gray-400 hover:text-red-500 mt-0.5">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Maneuver name" className="w-1/3 border rounded-lg px-3 py-1.5 text-sm" />
        <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="Finding" className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
        <button type="button" onClick={add} className="text-[#0033A0] hover:bg-blue-50 rounded-lg px-2">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ── JSON Textarea ────────────────────────────────────────────────────────────

function JsonTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: unknown
  onChange: (v: unknown) => void
  rows?: number
}) {
  const [text, setText] = useState(() =>
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
  )
  const [error, setError] = useState('')

  useEffect(() => {
    setText(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  }, [value])

  function handleBlur() {
    try {
      const parsed = JSON.parse(text)
      onChange(parsed)
      setError('')
    } catch {
      setError('Invalid JSON')
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        rows={rows}
        className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${error ? 'border-red-300' : ''}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Rubric Sliders ───────────────────────────────────────────────────────────

function RubricEditor({
  value,
  onChange,
}: {
  value: ScoringRubric
  onChange: (r: ScoringRubric) => void
}) {
  const sum =
    value.historyWeight +
    value.examWeight +
    value.differentialWeight +
    value.planWeight +
    value.communicationWeight

  const isValid = Math.abs(sum - 1) <= 0.01

  const fields: { key: keyof ScoringRubric; label: string }[] = [
    { key: 'historyWeight', label: 'History Taking' },
    { key: 'examWeight', label: 'Physical Exam' },
    { key: 'differentialWeight', label: 'Differential Diagnosis' },
    { key: 'planWeight', label: 'Diagnostic Plan' },
    { key: 'communicationWeight', label: 'Communication' },
  ]

  return (
    <div className="space-y-3">
      {fields.map(({ key, label }) => (
        <div key={key}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-gray-600">{label}</span>
            <span className="text-gray-500">{(value[key] * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(value[key] * 100)}
            onChange={(e) =>
              onChange({ ...value, [key]: parseInt(e.target.value) / 100 })
            }
            className="w-full accent-[#0033A0]"
          />
        </div>
      ))}
      <div className={`flex items-center gap-2 text-sm font-semibold ${isValid ? 'text-green-600' : 'text-amber-600'}`}>
        {!isValid && <AlertTriangle className="size-4" />}
        Total: {(sum * 100).toFixed(0)}%
        {!isValid && <span className="font-normal text-xs">(must equal 100%)</span>}
      </div>
    </div>
  )
}

// ── Main Form ────────────────────────────────────────────────────────────────

interface CaseAuthorFormProps {
  initialData?: Partial<ClinicalCaseInput>
  caseId?: string
  onSaved?: (id: string) => void
}

export default function CaseAuthorForm({ initialData, caseId, onSaved }: CaseAuthorFormProps) {
  const { currentUser } = useAuth()
  const [form, setForm] = useState<ClinicalCaseInput>(() => ({
    ...EMPTY_CASE,
    ...initialData,
    scoringRubric: initialData?.scoringRubric ?? EMPTY_RUBRIC,
  }))
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(caseId ?? '')

  // When initialData changes (e.g. from AI import), update form
  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        scoringRubric: initialData.scoringRubric ?? prev.scoringRubric,
      }))
    }
  }, [initialData])

  function update<K extends keyof ClinicalCaseInput>(key: K, value: ClinicalCaseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!currentUser) return
    setSaving(true)
    setError('')
    try {
      if (savedId) {
        await apiFetch(currentUser.email, `/api/virtual-clinic/cases/${savedId}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
      } else {
        const created = await apiFetch<{ id: string }>(currentUser.email, '/api/virtual-clinic/cases', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        setSavedId(created.id)
        onSaved?.(created.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!currentUser || !savedId) return
    setPublishing(true)
    setError('')
    try {
      // Save first, then publish
      await apiFetch(currentUser.email, `/api/virtual-clinic/cases/${savedId}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      await apiFetch(currentUser.email, `/api/virtual-clinic/cases/${savedId}/publish`, {
        method: 'POST',
      })
      update('published', true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-2xl p-4 flex items-start gap-3" role="alert">
          <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Program Selection */}
      <div className="border rounded-2xl shadow-sm bg-white px-5 py-4">
        <label className="block text-xs font-semibold text-gray-600 mb-2">Program *</label>
        <div className="flex gap-3">
          {(['DNP_PSYCHIATRY', 'COLLEGE_OF_MEDICINE'] as const).map((prog) => (
            <button
              key={prog}
              type="button"
              onClick={() => {
                update('program', prog)
                if (!form.scoringRubric || JSON.stringify(form.scoringRubric) === JSON.stringify(DEFAULT_RUBRICS[form.program ?? 'DNP_PSYCHIATRY'])) {
                  update('scoringRubric', DEFAULT_RUBRICS[prog])
                }
              }}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                form.program === prog
                  ? prog === 'DNP_PSYCHIATRY'
                    ? 'border-purple-400 bg-purple-50 text-purple-700'
                    : 'border-teal-400 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              {prog === 'DNP_PSYCHIATRY' ? 'DNP Psychiatry' : 'College of Medicine'}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Identity */}
      <Section title="Patient Identity" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Name *</label>
            <input value={form.patientName} onChange={(e) => update('patientName', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Age *</label>
            <input type="number" min={0} value={form.patientAge || ''} onChange={(e) => update('patientAge', parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sex *</label>
            <select value={form.patientSex} onChange={(e) => update('patientSex', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Pronouns</label>
            <select value={form.patientPronouns ?? ''} onChange={(e) => update('patientPronouns', e.target.value || null)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select...</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Personality Notes</label>
          <textarea value={form.personalityNotes ?? ''} onChange={(e) => update('personalityNotes', e.target.value || null)} rows={2} placeholder="e.g. Anxious, tends to minimize symptoms" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </Section>

      {/* Chief Complaint & Metadata */}
      <Section title="Chief Complaint & Metadata" defaultOpen>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Case Title *</label>
          <input value={form.title} onChange={(e) => update('title', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Chest Pain in 55-Year-Old Male" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Chief Complaint *</label>
          <input value={form.chiefComplaint} onChange={(e) => update('chiefComplaint', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Patient's primary complaint" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => update('difficulty', e.target.value as Difficulty)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Target Year</label>
            <select value={form.targetYear ?? ''} onChange={(e) => update('targetYear', e.target.value ? parseInt(e.target.value) : null)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Any year</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Scaffolding Level</label>
          <select value={form.scaffoldingLevel ?? 'none'} onChange={(e) => update('scaffoldingLevel', e.target.value as ScaffoldingLevel)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="none">None (summative — no hints)</option>
            <option value="light">Light (metacognitive prompts after 8+ exchanges)</option>
            <option value="full">Full (domain checklist visible during history)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Controls whether students receive scaffolding during history-taking.</p>
        </div>
        <TagInput label="Organ Systems" value={form.organSystems} onChange={(v) => update('organSystems', v)} placeholder="e.g. Cardiovascular" />
        <ListInput label="Learning Objectives" value={form.learningObjectives} onChange={(v) => update('learningObjectives', v)} placeholder="Add a learning objective" />
        <TagInput label="Tags" value={form.tags} onChange={(v) => update('tags', v)} placeholder="Add a tag" />
      </Section>

      {/* History of Present Illness */}
      <Section title="History of Present Illness">
        <JsonTextarea label="HPI (JSON)" value={form.historyOfPresentIllness} onChange={(v) => update('historyOfPresentIllness', v)} rows={8} />
      </Section>

      {/* Past History */}
      <Section title="Past History">
        <JsonTextarea label="Past Medical History" value={form.pastMedicalHistory} onChange={(v) => update('pastMedicalHistory', v)} />
        <JsonTextarea label="Medications" value={form.medications} onChange={(v) => update('medications', v)} />
        <JsonTextarea label="Allergies" value={form.allergies} onChange={(v) => update('allergies', v)} />
        <JsonTextarea label="Social History" value={form.socialHistory} onChange={(v) => update('socialHistory', v)} />
        <JsonTextarea label="Family History" value={form.familyHistory} onChange={(v) => update('familyHistory', v)} />
        <JsonTextarea label="Review of Systems" value={form.reviewOfSystems} onChange={(v) => update('reviewOfSystems', v)} rows={6} />
      </Section>

      {/* Physical Exam */}
      <Section title="Physical Exam">
        <KeyValuePairs
          label="Physical Exam Findings (by maneuver)"
          value={(form.physicalExamFindings ?? {}) as Record<string, unknown>}
          onChange={(v) => update('physicalExamFindings', v)}
        />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['heartRate', 'bloodPressure', 'respiratoryRate', 'temperature', 'oxygenSaturation'] as const).map((key) => {
            const labels: Record<string, string> = {
              heartRate: 'HR (bpm)',
              bloodPressure: 'BP (sys/dia)',
              respiratoryRate: 'RR (/min)',
              temperature: 'Temp (°F)',
              oxygenSaturation: 'SpO2 (%)',
            }
            const vs = (form.vitalSigns ?? {}) as Record<string, unknown>
            return (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{labels[key]}</label>
                <input
                  value={String(vs[key] ?? '')}
                  onChange={(e) => update('vitalSigns', { ...vs, [key]: key === 'bloodPressure' ? e.target.value : (parseFloat(e.target.value) || 0) })}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            )
          })}
        </div>
        <JsonTextarea label="Default Normal Findings" value={form.defaultNormalFindings ?? {}} onChange={(v) => update('defaultNormalFindings', v)} rows={2} />
      </Section>

      {/* Diagnostics */}
      <Section title="Diagnostics">
        <JsonTextarea label="Available Labs" value={form.availableLabs} onChange={(v) => update('availableLabs', v)} rows={6} />
        <JsonTextarea label="Available Imaging" value={form.availableImaging} onChange={(v) => update('availableImaging', v)} rows={4} />
      </Section>

      {/* Answer Key */}
      <Section title="Answer Key">
        <JsonTextarea label="Correct Differentials (ranked)" value={form.correctDifferentials} onChange={(v) => update('correctDifferentials', v)} rows={8} />
        <JsonTextarea label="Key History Questions" value={form.keyHistoryQuestions} onChange={(v) => update('keyHistoryQuestions', v)} rows={6} />
        <JsonTextarea label="Key Exam Maneuvers" value={form.keyExamManeuvers} onChange={(v) => update('keyExamManeuvers', v)} rows={4} />
        <JsonTextarea label="Critical Actions" value={form.criticalActions} onChange={(v) => update('criticalActions', v)} rows={4} />
      </Section>

      {/* Scoring Rubric */}
      <Section title="Scoring Rubric" defaultOpen>
        <RubricEditor value={form.scoringRubric} onChange={(r) => update('scoringRubric', r)} />
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} loading={saving} icon={<Save className="size-4" />}>
          {savedId ? 'Update Case' : 'Save Draft'}
        </Button>
        {savedId && !form.published && (
          <Button
            variant="secondary"
            onClick={handlePublish}
            loading={publishing}
            icon={<Send className="size-4" />}
          >
            Publish
          </Button>
        )}
        {form.published && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            Published
          </span>
        )}
      </div>
    </div>
  )
}
