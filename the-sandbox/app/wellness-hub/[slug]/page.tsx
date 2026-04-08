'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
} from '../../components/DynamicChart'
import {
  ArrowLeft, Loader2, Lightbulb, Save, Check, Wrench,
  Brain, CheckSquare, Moon, HeartPulse,
  type LucideIcon,
} from 'lucide-react'
import { getWellnessHubTool } from '../../lib/wellness-hub'
import type { WellnessField, WellnessChartConfig } from '../../lib/wellness-hub'
import { useAuth } from '../../lib/auth-context'

const ICON_MAP: Record<string, LucideIcon> = {
  Brain, CheckSquare, Moon, HeartPulse, Wrench,
}

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Wrench
}

// ── Types ───────────────────────────────────────────────────────────────────
interface WellnessEntry {
  id: string
  date: string
  data: Record<string, unknown>
  aiInsight: string | null
}

// ── Calendar strip ──────────────────────────────────────────────────────────
function CalendarStrip({
  selectedDate,
  onSelect,
  entryDates,
}: {
  selectedDate: string
  onSelect: (date: string) => void
  entryDates: Set<string>
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    return d
  })

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
      {days.map(d => {
        const iso = d.toISOString().split('T')[0]
        const isToday = d.getTime() === today.getTime()
        const isSelected = iso === selectedDate
        const hasEntry = entryDates.has(iso)
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
        const dayNum = d.getDate()

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            className={`flex flex-col items-center min-w-[52px] py-2 px-1.5 rounded-xl text-xs font-medium transition-colors ${
              isSelected
                ? 'bg-uk-blue text-white'
                : isToday
                ? 'bg-blue-50 text-uk-blue border border-uk-blue/30'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className={isSelected ? 'text-white/70' : 'text-gray-400'}>{dayName}</span>
            <span className="text-base font-bold mt-0.5">{dayNum}</span>
            {hasEntry && (
              <div className={`size-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Slider field ────────────────────────────────────────────────────────────
function SliderField({
  field,
  value,
  onChange,
}: {
  field: WellnessField
  value: number
  onChange: (v: number) => void
}) {
  const min = field.min ?? 1
  const max = field.max ?? 10
  const step = field.step ?? 1

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-700">{field.label}</label>
        <span className="text-sm font-bold text-uk-blue">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-uk-blue"
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

// ── Checklist field ─────────────────────────────────────────────────────────
function ChecklistField({
  field,
  value,
  onChange,
}: {
  field: WellnessField
  value: { name: string; completed: boolean }[]
  onChange: (v: { name: string; completed: boolean }[]) => void
}) {
  const items = value.length > 0 ? value : (field.defaults ?? []).map(name => ({ name, completed: false }))

  const toggle = (idx: number) => {
    const next = [...items]
    next[idx] = { ...next[idx], completed: !next[idx].completed }
    onChange(next)
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
              item.completed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className={`flex items-center justify-center size-5 rounded border-2 flex-shrink-0 ${
              item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
            }`}>
              {item.completed && <Check className="size-3 text-white" />}
            </div>
            {item.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Tags field ──────────────────────────────────────────────────────────────
function TagsField({
  field,
  value,
  onChange,
}: {
  field: WellnessField
  value: string[]
  onChange: (v: string[]) => void
}) {
  const suggestions = field.suggestions ?? []

  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter(t => t !== tag) : [...value, tag])
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              value.includes(tag)
                ? 'bg-uk-blue text-white border-uk-blue'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Dynamic entry form ──────────────────────────────────────────────────────
function EntryForm({
  fields,
  formData,
  setFormData,
  onSave,
  saving,
  saved,
}: {
  fields: readonly WellnessField[]
  formData: Record<string, unknown>
  setFormData: (data: Record<string, unknown>) => void
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  const setValue = (name: string, val: unknown) => {
    setFormData({ ...formData, [name]: val })
  }

  return (
    <div className="space-y-5">
      {fields.map(field => {
        switch (field.type) {
          case 'slider':
            return (
              <SliderField
                key={field.name}
                field={field}
                value={(formData[field.name] as number) ?? field.min ?? 5}
                onChange={v => setValue(field.name, v)}
              />
            )
          case 'select':
            return (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label}</label>
                <select
                  value={(formData[field.name] as string) ?? ''}
                  onChange={e => setValue(field.name, e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-uk-blue focus:ring-1 focus:ring-uk-blue"
                >
                  <option value="">Select...</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )
          case 'textarea':
            return (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label}</label>
                <textarea
                  value={(formData[field.name] as string) ?? ''}
                  onChange={e => setValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-uk-blue focus:ring-1 focus:ring-uk-blue resize-none"
                />
              </div>
            )
          case 'time':
            return (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label}</label>
                <input
                  type="time"
                  value={(formData[field.name] as string) ?? ''}
                  onChange={e => setValue(field.name, e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-uk-blue focus:ring-1 focus:ring-uk-blue"
                />
              </div>
            )
          case 'checklist':
            return (
              <ChecklistField
                key={field.name}
                field={field}
                value={(formData[field.name] as { name: string; completed: boolean }[]) ?? []}
                onChange={v => setValue(field.name, v)}
              />
            )
          case 'tags':
            return (
              <TagsField
                key={field.name}
                field={field}
                value={(formData[field.name] as string[]) ?? []}
                onChange={v => setValue(field.name, v)}
              />
            )
          default:
            return null
        }
      })}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-uk-blue hover:bg-[#002580] text-white disabled:opacity-50'
        }`}
      >
        {saving ? (
          <><Loader2 className="size-4 animate-spin" /> Saving...</>
        ) : saved ? (
          <><Check className="size-4" /> Saved</>
        ) : (
          <><Save className="size-4" /> Save Entry</>
        )}
      </button>
    </div>
  )
}

// ── Trend chart ─────────────────────────────────────────────────────────────
function TrendChart({
  entries,
  config,
  slug,
}: {
  entries: WellnessEntry[]
  config: WellnessChartConfig
  slug: string
}) {
  if (entries.length < 2) return null

  const chartData = entries.map(e => {
    const data = e.data as Record<string, unknown>
    const date = new Date(e.date)
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (slug === 'habits') {
      const habits = (data.habits as { completed: boolean }[]) ?? []
      const total = habits.length || 1
      const completed = habits.filter(h => h.completed).length
      return { date: label, completionRate: Math.round((completed / total) * 100) }
    }

    return { date: label, ...data }
  })

  const commonProps = {
    data: chartData,
    margin: { top: 5, right: 5, left: -20, bottom: 5 },
  }

  const renderChart = () => {
    switch (config.type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0033A0" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0033A0" stopOpacity={0} />
              </linearGradient>
              {config.secondary && (
                <linearGradient id="secondaryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 10]} />
            <Tooltip />
            <Area type="monotone" dataKey={config.primary} stroke="#0033A0" fill="url(#primaryGrad)" strokeWidth={2} />
            {config.secondary && (
              <Area type="monotone" dataKey={config.secondary} stroke="#059669" fill="url(#secondaryGrad)" strokeWidth={2} />
            )}
          </AreaChart>
        )
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey={config.primary} fill="#0033A0" radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey={config.primary} stroke="#0033A0" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        )
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis dataKey={config.primary} tick={{ fontSize: 11 }} domain={[0, 10]} />
            <Tooltip />
            <Scatter dataKey={config.primary} fill="#0033A0" />
          </ScatterChart>
        )
    }
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
      <h3 className="font-bold text-gray-900 mb-4">Trends</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {config.secondary && (
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-uk-blue" />{config.primary}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" />{config.secondary}</span>
        </div>
      )}
    </div>
  )
}

// ── Markdown components ─────────────────────────────────────────────────────
const mdComponents = {
  p:      ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em:     ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul:     ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  li:     ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function WellnessHubToolPage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string
  const tool = getWellnessHubTool(slug)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString().split('T')[0]

  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [entries, setEntries] = useState<WellnessEntry[]>([])
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [storedInsight, setStoredInsight] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  // Fetch entries on mount
  useEffect(() => {
    if (!tool || fetchedRef.current) return
    fetchedRef.current = true

    const from = new Date(today)
    from.setDate(from.getDate() - 14)

    fetch(`/api/wellness-hub/entries?slug=${slug}&from=${from.toISOString()}&to=${today.toISOString()}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then((data: WellnessEntry[]) => {
        setEntries(data)
        // Check for stored insight
        const withInsight = data.find(e => e.aiInsight)
        if (withInsight) setStoredInsight(withInsight.aiInsight)
      })
      .catch(console.error)
      .finally(() => setLoadingEntries(false))
  }, [tool, slug, currentUser.email, today])

  // Pre-populate form when selecting a day with existing entry
  useEffect(() => {
    const entry = entries.find(e => e.date.split('T')[0] === selectedDate)
    if (entry) {
      setFormData(entry.data as Record<string, unknown>)
    } else {
      // Default values for new entry
      const defaults: Record<string, unknown> = {}
      tool?.entryFields.forEach(f => {
        if (f.type === 'slider') defaults[f.name] = Math.round(((f.min ?? 1) + (f.max ?? 10)) / 2)
        if (f.type === 'checklist') defaults[f.name] = (f.defaults ?? []).map(name => ({ name, completed: false }))
        if (f.type === 'tags') defaults[f.name] = []
      })
      setFormData(defaults)
    }
    setSaved(false)
  }, [selectedDate, entries, tool])

  const entryDates = new Set(entries.map(e => e.date.split('T')[0]))

  const handleSave = useCallback(async () => {
    if (!tool || saving) return
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/wellness-hub/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ slug, date: selectedDate, data: formData }),
      })

      if (!res.ok) throw new Error('Failed to save')
      const entry = await res.json() as WellnessEntry

      // Update local entries
      setEntries(prev => {
        const idx = prev.findIndex(e => e.date.split('T')[0] === selectedDate)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = entry
          return next
        }
        return [...prev, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }, [tool, saving, slug, selectedDate, formData, currentUser.email])

  const handleAnalyze = useCallback(async () => {
    if (!tool || loadingInsight) return
    setLoadingInsight(true)
    setInsight('')

    try {
      const res = await fetch('/api/wellness-hub/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ slug }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        setInsight(`_${err.error}_`)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value)
        setInsight(accumulated)
      }

      setStoredInsight(accumulated)
    } catch (err) {
      console.error('Insight error:', err)
      setInsight('_Failed to generate insights. Please try again._')
    } finally {
      setLoadingInsight(false)
    }
  }, [tool, loadingInsight, slug, currentUser.email])

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tool not found</h1>
        <p className="text-gray-500 mb-6">This Wellness Hub tool doesn&apos;t exist yet.</p>
        <Link
          href="/wellness-hub"
          className="inline-flex items-center gap-2 bg-uk-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Wellness Hub
        </Link>
      </div>
    )
  }

  const Icon = getIcon(tool.icon)
  const displayInsight = insight || storedInsight
  const hasEnoughForInsights = entries.length >= 3

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Link
            href="/wellness-hub"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-uk-blue mb-3 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Wellness Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-50">
              <Icon className="size-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">{tool.title}</h1>
              <p className="text-sm text-gray-500">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Calendar strip */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
          <CalendarStrip
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            entryDates={entryDates}
          />
        </div>

        {/* Entry form */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <EntryForm
            fields={tool.entryFields}
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            saving={saving}
            saved={saved}
          />
        </div>

        {/* Trends */}
        {!loadingEntries && (
          <TrendChart entries={entries} config={tool.chartConfig} slug={slug} />
        )}

        {/* AI Insights */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="size-5 text-amber-500" />
            <h3 className="font-bold text-gray-900">AI Insights</h3>
          </div>

          {displayInsight ? (
            <div className="prose prose-sm max-w-none text-gray-700 bg-amber-50 rounded-xl p-4">
              <DynamicMarkdown components={mdComponents}>{displayInsight}</DynamicMarkdown>
            </div>
          ) : !hasEnoughForInsights ? (
            <p className="text-sm text-gray-400">
              Start tracking today. Your AI-powered insights will appear after a few entries.
            </p>
          ) : null}

          {hasEnoughForInsights && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loadingInsight}
              className="mt-4 w-full py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingInsight ? (
                <><Loader2 className="size-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Lightbulb className="size-4" /> Analyze My Trends</>
              )}
            </button>
          )}
        </div>

        {/* Privacy */}
        <p className="text-center text-xs text-gray-400">
          Wellness Hub data is private to you. AI insights are suggestions, not medical advice.
        </p>
      </div>
    </div>
  )
}
