'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import {
  Target,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Trash2,
  Calendar,
  Pause,
  Play,
  Flag,
  Sparkles,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Milestone {
  id: string
  title: string
  description?: string
  sortOrder: number
  completed: boolean
  completedAt?: string
  linkedCourseId?: string
  linkedToolId?: string
}

interface PathStep {
  type: 'course' | 'tool' | 'flashcards' | 'practice' | 'custom'
  id?: string
  title: string
  reason: string
}

interface LearningGoal {
  id: string
  title: string
  description?: string
  category?: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
  progressPct: number
  targetDate?: string
  completedAt?: string
  pathJson?: PathStep[]
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

// ── Status helpers ───────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Active', color: 'text-blue-700', bg: 'bg-blue-100' },
  PAUSED: { label: 'Paused', color: 'text-amber-700', bg: 'bg-amber-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
  ABANDONED: { label: 'Abandoned', color: 'text-gray-500', bg: 'bg-gray-100' },
}

// ── New Goal Form ────────────────────────────────────────────────────────────

const categorySuggestions = [
  'Computer Science',
  'Data Science',
  'AI & Machine Learning',
  'Writing & Communication',
  'Research',
  'Career Development',
  'Leadership',
  'STEM',
  'Arts & Humanities',
]

function NewGoalForm({ onCreated, email }: { onCreated: () => void; email: string }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [coverEmoji, setCoverEmoji] = useState('🎯')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await apiFetch(email, '/api/my-path/goals', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description, category, targetDate, coverEmoji }),
      })
      setTitle('')
      setDescription('')
      setCategory('')
      setTargetDate('')
      setCoverEmoji('🎯')
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Plus className="size-5 text-[#0033A0]" />
        New Learning Goal
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Understand machine learning fundamentals"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What do you want to accomplish?"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input
            type="text"
            list="category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Computer Science"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
          <datalist id="category-suggestions">
            {categorySuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Emoji</label>
          <input
            type="text"
            value={coverEmoji}
            onChange={(e) => setCoverEmoji(e.target.value)}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-2xl text-center focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={!title.trim()}>
          Create Goal
        </Button>
      </div>
    </form>
  )
}

// ── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  email,
  onRefresh,
}: {
  goal: LearningGoal
  email: string
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [suggestingPath, setSuggestingPath] = useState(false)

  const status = statusConfig[goal.status] || statusConfig.ACTIVE
  const path = goal.pathJson as PathStep[] | null

  async function handleStatusChange(newStatus: string) {
    await apiFetch(email, '/api/my-path/goals', {
      method: 'PUT',
      body: JSON.stringify({ id: goal.id, status: newStatus }),
    })
    onRefresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this goal and all its milestones?')) return
    await apiFetch(email, `/api/my-path/goals?id=${goal.id}`, { method: 'DELETE' })
    onRefresh()
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newMilestone.trim()) return
    setAddingMilestone(true)
    try {
      await apiFetch(email, '/api/my-path/milestones', {
        method: 'POST',
        body: JSON.stringify({ goalId: goal.id, title: newMilestone.trim() }),
      })
      setNewMilestone('')
      onRefresh()
    } finally {
      setAddingMilestone(false)
    }
  }

  async function handleToggleMilestone(milestoneId: string) {
    await apiFetch(email, '/api/my-path/milestones', {
      method: 'PUT',
      body: JSON.stringify({ milestoneId }),
    })
    onRefresh()
  }

  async function handleDeleteMilestone(milestoneId: string) {
    await apiFetch(email, `/api/my-path/milestones?id=${milestoneId}`, { method: 'DELETE' })
    onRefresh()
  }

  async function handleSuggestPath() {
    setSuggestingPath(true)
    try {
      await apiFetch(email, '/api/my-path/suggest-path', {
        method: 'POST',
        body: JSON.stringify({ goalId: goal.id }),
      })
      onRefresh()
    } finally {
      setSuggestingPath(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-5 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="size-5 text-gray-400 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{goal.title}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
          {goal.description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{goal.description}</p>
          )}
          {goal.targetDate && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Calendar className="size-3" />
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-28 shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{goal.progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0033A0] rounded-full transition-all duration-500"
              style={{ width: `${goal.progressPct}%` }}
            />
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-5">
          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {goal.status === 'ACTIVE' && (
              <Button variant="secondary" size="sm" onClick={() => handleStatusChange('PAUSED')}>
                <Pause className="size-3.5" /> Pause
              </Button>
            )}
            {goal.status === 'PAUSED' && (
              <Button variant="secondary" size="sm" onClick={() => handleStatusChange('ACTIVE')}>
                <Play className="size-3.5" /> Resume
              </Button>
            )}
            {goal.status !== 'COMPLETED' && (
              <Button variant="secondary" size="sm" onClick={() => handleStatusChange('COMPLETED')}>
                <Flag className="size-3.5" /> Complete
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>

          {/* Milestones */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Milestones</h4>
            {goal.milestones.length === 0 && (
              <p className="text-sm text-gray-400 italic">No milestones yet. Add one below.</p>
            )}
            <ul className="space-y-1.5">
              {goal.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => handleToggleMilestone(m.id)}
                    className={`size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      m.completed
                        ? 'bg-[#0033A0] border-[#0033A0] text-white'
                        : 'border-gray-300 hover:border-[#0033A0]'
                    }`}
                  >
                    {m.completed && <Check className="size-3" />}
                  </button>
                  <span
                    className={`text-sm flex-1 ${
                      m.completed ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {m.title}
                  </span>
                  <button
                    onClick={() => handleDeleteMilestone(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Add milestone input */}
            <form onSubmit={handleAddMilestone} className="flex gap-2 mt-3">
              <input
                type="text"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                placeholder="Add a milestone..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
              />
              <Button type="submit" size="sm" loading={addingMilestone} disabled={!newMilestone.trim()}>
                <Plus className="size-3.5" /> Add
              </Button>
            </form>
          </div>

          {/* Sandy-generated path */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Learning Path</h4>
              <Button variant="secondary" size="sm" onClick={handleSuggestPath} loading={suggestingPath}>
                <Sparkles className="size-3.5" />
                {path ? 'Regenerate Path' : 'Ask Sandy to build a path'}
              </Button>
            </div>

            {path && path.length > 0 ? (
              <ol className="space-y-3">
                {path.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="size-7 rounded-full bg-blue-100 text-[#0033A0] flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      {i < path.length - 1 && <div className="w-px flex-1 bg-blue-200 mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{step.reason}</p>
                      <span className="inline-block text-[10px] uppercase tracking-wider font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1">
                        {step.type}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              !suggestingPath && (
                <p className="text-sm text-gray-400 italic">
                  No path generated yet. Let Sandy create a personalized learning path for this goal.
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MyPathPage() {
  const { currentUser } = useAuth()
  const [goals, setGoals] = useState<LearningGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const email = currentUser?.email ?? ''

  const fetchGoals = useCallback(async () => {
    if (!email) return
    try {
      const data = await apiFetch<LearningGoal[]>(email, '/api/my-path/goals')
      setGoals(data)
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // Stats
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE')
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED')
  const avgProgress =
    activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum, g) => sum + g.progressPct, 0) / activeGoals.length)
      : 0
  const totalMilestonesDone = goals.reduce(
    (sum, g) => sum + g.milestones.filter((m) => m.completed).length,
    0,
  )

  return (
    <>
      <PageHeader
        title="My Path"
        subtitle="Set learning goals, track milestones, and let Sandy build your personalized learning path."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="size-4" /> New Goal
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Goals', value: activeGoals.length, icon: Target },
            { label: 'Avg Progress', value: `${avgProgress}%`, icon: ChevronRight },
            { label: 'Milestones Done', value: totalMilestonesDone, icon: Check },
            { label: 'Goals Completed', value: completedGoals.length, icon: Flag },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <stat.icon className="size-5 text-[#0033A0]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* New goal form */}
        {showForm && (
          <NewGoalForm
            email={email}
            onCreated={() => {
              fetchGoals()
              setShowForm(false)
            }}
          />
        )}

        {/* Goal cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Target className="size-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-600">No learning goals yet</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Create your first goal to start tracking your learning journey. Sandy can help build a
              personalized path for each goal.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="size-4" /> Create Your First Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} email={email} onRefresh={fetchGoals} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
