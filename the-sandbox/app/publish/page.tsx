'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import ReactMarkdown from 'react-markdown'
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Copy,
  Sparkles,
  FormInput,
  Database,
  GraduationCap,
} from 'lucide-react'
import ToolCard from '../components/ToolCard'
import ToolBuilderChat from '../components/ToolBuilderChat'
import { ToolWithDetails } from '../lib/types'
import { ParsedReference, SANDBOX_DATASETS, encodeCourseReference, encodeDatasetReference, parseReference } from '../lib/datasets'

const CATEGORIES = ['Law', 'History', 'STEM', 'Medicine', 'Business', 'Arts', 'University', 'General']
const DIFFICULTIES = ['Introductory', 'Intermediate', 'Advanced']
const METRIC_TYPES = ['COUNTER', 'DURATION', 'RATING', 'BOOLEAN', 'TEXT']
const METRIC_TYPE_LABELS: Record<string, string> = {
  COUNTER: 'Count',
  DURATION: 'Time',
  RATING: 'Rating',
  BOOLEAN: 'Yes/No',
  TEXT: 'Notes',
}

const STEP_LABELS = [
  'Basic Info',
  'How will this work?',
  'Set up your AI tutor',
  'Learning Goals',
  'Preview & Publish',
]

function getStarterSystemPrompt(requestedToolType: string): string {
  const templates: Record<string, string> = {
    SIMULATION:
      'You are a simulation facilitator. Guide the student through a realistic scenario step by step. Ask one question at a time. Do not give away the answer - use Socratic questioning.',
    QUIZ:
      'You are a quiz tutor. Present one question at a time, wait for the student to respond, and give brief feedback before moving on. Focus on helping the student learn, not just grading them.',
    AI_INTERVIEW:
      'You are a realistic role-play partner. Stay in character, ask one question at a time, and respond the way a real interviewer, client, or patient would. Give brief coaching after each response when appropriate.',
    DEBATE:
      'You are a discussion coach. Challenge the student thoughtfully, ask follow-up questions, and help them strengthen their reasoning without turning the conversation into a lecture.',
    STUDY_BUDDY:
      'You are a supportive tutor. Help the student think through the material step by step, ask guiding questions, and give hints instead of immediately giving the answer.',
    CHATBOT:
      'You are a helpful subject-matter tutor. Explain ideas clearly, ask thoughtful follow-up questions, and adjust your teaching style to the student\'s level of understanding.',
  }

  return templates[requestedToolType] ?? ''
}

interface CustomMetric {
  name: string
  type: string
  description: string
}

interface FormData {
  name: string
  shortDescription: string
  fullDescription: string
  category: string
  difficultyLevel: string
  estimatedMinutes: string
  toolType: 'EXTERNAL' | 'CHATBOT'
  externalUrl: string
  personaName: string
  systemPrompt: string
  welcomeMessage: string
  starterQuestions: string[]
  intendedAudience: string
  learningObjectives: string[]
  customMetrics: CustomMetric[]
  totalSteps: string
  stepLabel: string
  linkedCourseCode: string
  linkedModule: string
  linkedDatasetIds: string[]
}

interface CourseSummary {
  id: string
  courseCode: string
  title: string
}

export default function PublishPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCourseCode = searchParams.get('course') || ''
  const initialDatasetIds = searchParams.getAll('dataset')
  const initialPrefill = searchParams.get('prefill') || ''
  const requestedToolType = (searchParams.get('type') || '').toUpperCase()
  const editId = searchParams.get('edit')
  const initialToolType: 'EXTERNAL' | 'CHATBOT' = requestedToolType === 'EXTERNAL' ? 'EXTERNAL' : 'CHATBOT'
  const initialSystemPrompt = initialToolType === 'CHATBOT' ? getStarterSystemPrompt(requestedToolType) : ''
  const [buildMode, setBuildMode] = useState<'form' | 'ai'>('ai')
  const [step, setStep] = useState(1)
  const [previewMarkdown, setPreviewMarkdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [studentVerified, setStudentVerified] = useState(false)
  const [requestVerification, setRequestVerification] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [editingToolId, setEditingToolId] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    name: initialPrefill,
    shortDescription: '',
    fullDescription: '',
    category: 'General',
    difficultyLevel: 'Introductory',
    estimatedMinutes: '',
    toolType: initialToolType,
    externalUrl: '',
    personaName: 'Sandy',
    systemPrompt: initialSystemPrompt,
    welcomeMessage: '',
    starterQuestions: ['', '', '', ''],
    intendedAudience: '',
    learningObjectives: [''],
    customMetrics: [],
    totalSteps: '',
    stepLabel: '',
    linkedCourseCode: initialCourseCode,
    linkedModule: '',
    linkedDatasetIds: initialDatasetIds,
  })

  useEffect(() => {
    fetch('/api/courses', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then((data) => setCourses(data ?? []))
      .catch(() => {})
  }, [currentUser.email])

  useEffect(() => {
    if (!editId) return

    fetch(`/api/tools/${editId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((response) => response.json())
      .then((tool) => {
        const parsedReferences: ParsedReference[] = (tool.referenceDocUrls ?? []).map(parseReference)
        const linkedCourse = parsedReferences.find((reference) => reference.type === 'course')
        const linkedDatasets = parsedReferences
          .filter((reference) => reference.type === 'dataset')
          .map((reference) => reference.id)

        setEditingToolId(editId)
        setBuildMode('form')
        setForm({
          name: tool.name ?? '',
          shortDescription: tool.shortDescription ?? '',
          fullDescription: tool.fullDescription ?? '',
          category: tool.category ?? 'General',
          difficultyLevel: tool.difficultyLevel ?? 'Introductory',
          estimatedMinutes: tool.estimatedMinutes?.toString() ?? '',
          toolType: tool.toolType ?? 'CHATBOT',
          externalUrl: tool.externalUrl ?? '',
          personaName: tool.personaName ?? 'Sandy',
          systemPrompt: tool.systemPrompt ?? '',
          welcomeMessage: tool.welcomeMessage ?? '',
          starterQuestions: [...(tool.starterQuestions ?? []), '', '', ''].slice(0, 4),
          intendedAudience: tool.intendedAudience ?? '',
          learningObjectives: tool.learningObjectives?.length ? tool.learningObjectives : [''],
          customMetrics: tool.customMetrics ?? [],
          totalSteps: tool.totalSteps?.toString() ?? '',
          stepLabel: tool.stepLabel ?? '',
          linkedCourseCode: linkedCourse?.type === 'course' ? linkedCourse.courseCode : initialCourseCode,
          linkedModule: linkedCourse?.type === 'course' && linkedCourse.moduleNumber ? String(linkedCourse.moduleNumber) : '',
          linkedDatasetIds: linkedDatasets.length > 0 ? linkedDatasets : initialDatasetIds,
        })
      })
      .catch(() => {})
  }, [currentUser.email, editId, initialCourseCode, initialDatasetIds])

  if (['__blocked__'].includes(currentUser.role.toLowerCase())) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Educators Only</h2>
        <p className="text-gray-500">
          Only educators and admins can publish experiences. Switch to an educator account to continue.
        </p>
      </div>
    )
  }

  const update = (field: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateStarterQuestion = (i: number, val: string) => {
    const arr = [...form.starterQuestions]
    arr[i] = val
    update('starterQuestions', arr)
  }

  const addObjective = () => update('learningObjectives', [...form.learningObjectives, ''])
  const removeObjective = (i: number) =>
    update(
      'learningObjectives',
      form.learningObjectives.filter((_, idx) => idx !== i)
    )
  const updateObjective = (i: number, val: string) => {
    const arr = [...form.learningObjectives]
    arr[i] = val
    update('learningObjectives', arr)
  }

  const addMetric = () =>
    update('customMetrics', [...form.customMetrics, { name: '', type: 'COUNTER', description: '' }])
  const removeMetric = (i: number) =>
    update(
      'customMetrics',
      form.customMetrics.filter((_, idx) => idx !== i)
    )
  const updateMetric = (i: number, field: keyof CustomMetric, val: string) => {
    const arr = [...form.customMetrics]
    arr[i] = { ...arr[i], [field]: val }
    update('customMetrics', arr)
  }

  const toggleDataset = (datasetId: string) => {
    update(
      'linkedDatasetIds',
      form.linkedDatasetIds.includes(datasetId)
        ? form.linkedDatasetIds.filter((id) => id !== datasetId)
        : [...form.linkedDatasetIds, datasetId]
    )
  }

  const handleSubmit = async (publish: boolean) => {
    setSubmitting(true)
    setError('')
    try {
      const referenceDocUrls = [
        ...(form.linkedCourseCode
          ? [encodeCourseReference(form.linkedCourseCode, form.linkedModule ? parseInt(form.linkedModule) : null)]
          : []),
        ...form.linkedDatasetIds.map(encodeDatasetReference),
      ]

      const payload = {
        name: form.name,
        shortDescription: form.shortDescription,
        fullDescription: form.fullDescription,
        category: form.category,
        difficultyLevel: form.difficultyLevel,
        estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : null,
        toolType: form.toolType,
        externalUrl: form.toolType === 'EXTERNAL' ? form.externalUrl : null,
        personaName: form.toolType === 'CHATBOT' ? (form.personaName.trim() || 'Sandy') : null,
        systemPrompt: form.toolType === 'CHATBOT' ? form.systemPrompt : null,
        welcomeMessage: form.toolType === 'CHATBOT' ? form.welcomeMessage : null,
        starterQuestions:
          form.toolType === 'CHATBOT'
            ? form.starterQuestions.filter((q) => q.trim() !== '')
            : [],
        referenceDocUrls,
        intendedAudience: form.intendedAudience,
        learningObjectives: form.learningObjectives.filter((o) => o.trim() !== ''),
        published: publish,
        approvalStatus: currentUser.role === 'STUDENT' ? 'PENDING' : 'COMMUNITY',
        customMetrics: form.customMetrics.filter((m) => m.name.trim() !== ''),
        ...(form.toolType === 'CHATBOT' && form.totalSteps
          ? {
              gamificationConfig: {
                totalSteps: parseInt(form.totalSteps),
                stepLabel: form.stepLabel.trim() || 'Step',
              },
            }
          : {}),
      }

      const endpoint = editingToolId ? `/api/tools/${editingToolId}` : '/api/tools'
      const method = editingToolId ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to publish')
        return
      }

      const tool = await res.json()
      if (publish && requestVerification) {
        await fetch(`/api/admin/tools/${tool.id}/approval`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({ approvalStatus: 'PENDING' }),
        })
      }
      router.push(`/tools/${tool.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const previewTool: ToolWithDetails = {
    id: 'preview',
    name: form.name || 'Experience Name',
    shortDescription: form.shortDescription || 'A short description of this experience.',
    fullDescription: form.fullDescription,
    category: form.category,
    difficultyLevel: form.difficultyLevel,
    estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : null,
    thumbnailUrl: null,
    toolType: form.toolType,
    externalUrl: form.externalUrl || null,
    personaName: form.toolType === 'CHATBOT' ? (form.personaName.trim() || 'Sandy') : null,
    personaAvatar: null,
    systemPrompt: form.systemPrompt || null,
    welcomeMessage: form.welcomeMessage || null,
    starterQuestions: form.starterQuestions.filter((q) => q.trim()),
    referenceDocUrls: [
      ...(form.linkedCourseCode
        ? [encodeCourseReference(form.linkedCourseCode, form.linkedModule ? parseInt(form.linkedModule) : null)]
        : []),
      ...form.linkedDatasetIds.map(encodeDatasetReference),
    ],
    learningObjectives: form.learningObjectives.filter((o) => o.trim()),
    intendedAudience: form.intendedAudience || null,
    totalSteps: form.totalSteps ? parseInt(form.totalSteps) : null,
    stepLabel: form.stepLabel.trim() || null,
    published: false,
    featured: false,
    approvalStatus: currentUser.role === 'STUDENT' ? 'PENDING' : requestVerification ? 'PENDING' : 'COMMUNITY',
    webhookSecret: null,
    creatorId: 'preview',
    creator: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      department: currentUser.department,
      college: currentUser.college,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { upvotes: 0, favorites: 0, comments: 0, sessions: 0 },
    hasUpvoted: false,
    hasFavorited: false,
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/tools/[id]/metrics`
    : '/api/tools/[id]/metrics'

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setWebhookCopied(true)
      setTimeout(() => setWebhookCopied(false), 2000)
    })
  }

  // Handle AI builder confirming a spec — pre-fill the form and switch to form mode
  const handleBuilderConfirm = async (spec: {
    name: string; shortDescription: string; fullDescription: string; category: string;
    toolType: 'CHATBOT' | 'EXTERNAL'; systemPrompt: string; welcomeMessage: string;
    starterQuestions: string[]; learningObjectives: string[]; difficultyLevel: string; intendedAudience: string;
    persona?: { name?: string }
  }) => {
    setForm(prev => ({
      ...prev,
      name: spec.name || prev.name,
      shortDescription: spec.shortDescription || prev.shortDescription,
      fullDescription: spec.fullDescription || prev.fullDescription,
      category: spec.category || prev.category,
      toolType: spec.toolType || prev.toolType,
      personaName: spec.persona?.name || prev.personaName,
      systemPrompt: spec.systemPrompt || prev.systemPrompt,
      welcomeMessage: spec.welcomeMessage || prev.welcomeMessage,
      starterQuestions: spec.starterQuestions?.length ? [...spec.starterQuestions, '', '', ''].slice(0, 4) : prev.starterQuestions,
      learningObjectives: spec.learningObjectives?.length ? spec.learningObjectives : prev.learningObjectives,
      difficultyLevel: spec.difficultyLevel || prev.difficultyLevel,
      intendedAudience: spec.intendedAudience || prev.intendedAudience,
    }))
    setBuildMode('form')
    setStep(1)
  }

  return (
    <div className={`mx-auto px-4 sm:px-6 py-8 ${buildMode === 'ai' ? 'max-w-6xl' : 'max-w-3xl'}`}>
      {/* Page header */}
      <div className="mb-6">
        <Link href="/build" className="mb-3 inline-flex text-sm font-medium text-gray-500 hover:text-[#0033A0] hover:underline">
          &larr; Back to Build
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
          {editingToolId ? 'Edit Draft Experience' : 'Create an Experience'}
        </h1>
        <p className="text-gray-500 text-sm">
          {editingToolId
            ? 'Update your draft, refine the details, and publish when it is ready.'
            : currentUser.role === 'STUDENT'
              ? 'Describe your learning activity and submit it for review.'
              : 'Describe your learning activity and publish it to the UK community.'}
        </p>
      </div>

      {!!requestedToolType && requestedToolType !== 'CHATBOT' && requestedToolType !== 'EXTERNAL' && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Suggested format: <span className="font-semibold">{requestedToolType.replace(/_/g, ' ').toLowerCase()}</span>. This form will start you in the conversational AI setup.
        </div>
      )}

      {/* Build mode toggle */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setBuildMode('form')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            buildMode === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FormInput className="w-4 h-4" />
          Fill in manually
        </button>
        <button
          onClick={() => setBuildMode('ai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            buildMode === 'ai' ? 'bg-[#0033A0] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Describe it, AI fills the form
        </button>
      </div>

      {/* AI Builder mode */}
      {buildMode === 'ai' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#0033A0] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-[#0033A0] mb-0.5">Describe your experience - AI fills the form</div>
              <div className="text-xs text-blue-700 leading-relaxed">
                Tell me what you want to build, who it&apos;s for, and what students should learn. I&apos;ll assemble the full experience for you.
                <span className="italic ml-1 text-blue-500">
                  Example: &quot;Build a Socratic tutor for 1L Contracts students to practice offer and acceptance problems.&quot;
                </span>
              </div>
            </div>
          </div>
          <ToolBuilderChat onConfirm={handleBuilderConfirm} />
        </div>
      )}

      {buildMode === 'form' && (<><div className="flex items-center mb-8">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === step
          const isDone = stepNum < step
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-[#0033A0] text-white'
                      : isActive
                      ? 'bg-[#0033A0] text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <span
                  className={`text-[10px] font-medium mt-1 whitespace-nowrap ${
                    isActive ? 'text-[#0033A0]' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                    isDone ? 'bg-[#0033A0]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Step {step}: {STEP_LABELS[step - 1]}
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Experience Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g., Socratic Philosophy Debate Partner"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Short Description <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-400 ml-1">
                    ({form.shortDescription.length}/120)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(e) =>
                    e.target.value.length <= 120 && update('shortDescription', e.target.value)
                  }
                  placeholder="A one-line description of what this experience does..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Full Description <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreviewMarkdown(!previewMarkdown)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0033A0] transition-colors"
                  >
                    {previewMarkdown ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Edit
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </>
                    )}
                  </button>
                </div>
                {previewMarkdown ? (
                  <div className="prose max-w-none border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 min-h-[160px]">
                    {form.fullDescription ? (
                      <ReactMarkdown>{form.fullDescription}</ReactMarkdown>
                    ) : (
                      <p className="text-gray-400 italic">Start typing to preview...</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={form.fullDescription}
                    onChange={(e) => update('fullDescription', e.target.value)}
                    placeholder="Markdown supported. Describe what the experience does, how to use it, and what students will gain..."
                    rows={8}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-y font-mono"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">Markdown formatting supported (headers, bold, lists, etc.)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => update('category', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={form.difficultyLevel}
                    onChange={(e) => update('difficultyLevel', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] bg-white"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={form.estimatedMinutes}
                  onChange={(e) => update('estimatedMinutes', e.target.value)}
                  placeholder="e.g., 30"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                />
              </div>

            </>
          )}

          {/* Step 2: How will this work? */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How will this work? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(['EXTERNAL', 'CHATBOT'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => update('toolType', type)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        form.toolType === type
                          ? 'border-[#0033A0] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 mb-1">
                        {type === 'EXTERNAL'
                          ? 'Link to an outside website or app.'
                          : 'Conversational AI tutor (runs here, powered by Claude).'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {type === 'EXTERNAL'
                          ? 'Choose this if students should open another website, simulator, or app.'
                          : 'Choose this if the AI should teach, coach, or simulate the activity inside The Sandbox.'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form.toolType === 'EXTERNAL' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      External URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={form.externalUrl}
                      onChange={(e) => update('externalUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="font-medium text-blue-800 text-sm mb-2">
                      Webhook Analytics (Optional)
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      You can send custom metric data from your outside tool to The Sandbox using
                      this webhook. Use the endpoint below with your experience&apos;s webhook secret.
                    </p>
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-200">
                      <code className="text-xs text-gray-700 flex-1 truncate">{webhookUrl}</code>
                      <button
                        type="button"
                        onClick={copyWebhook}
                        className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                      >
                        {webhookCopied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </>
          )}

          {/* Step 3: Configure AI */}
          {step === 3 && (
            <>
              {form.toolType === 'CHATBOT' ? (
                <>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <div className="text-sm font-semibold text-[#0033A0]">Set up your AI tutor</div>
                    <p className="mt-1 text-xs text-blue-700 leading-relaxed">
                      Name the assistant students will meet, then describe how it should teach, question, and guide them.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      AI Name
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      What should students call this assistant? e.g., 'Alex', 'The Chemistry Coach'
                    </p>
                    <input
                      type="text"
                      value={form.personaName}
                      onChange={(e) => update('personaName', e.target.value)}
                      placeholder="e.g., BRIEFS, DEX, Sandy"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      How should the AI teach?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Describe the AI&apos;s personality, subject matter, and teaching approach. Students don&apos;t see this text.
                      Example: <span className="italic">"You are a biochemistry tutor helping pre-med students understand enzyme kinetics. Ask one question at a time. If a student is wrong, guide them with a Socratic follow-up rather than giving the answer."</span>
                    </p>
                    <textarea
                      value={form.systemPrompt}
                      onChange={(e) => update('systemPrompt', e.target.value)}
                      placeholder="Describe the AI's role, subject expertise, tone, and how it should guide students..."
                      rows={7}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-y"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Be specific about expertise, tone, how the AI should guide students, and what it should not do for them.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Welcome Message
                    </label>
                    <textarea
                      value={form.welcomeMessage}
                      onChange={(e) => update('welcomeMessage', e.target.value)}
                      placeholder="Welcome! I'm here to help you..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Starter Questions (up to 4)
                    </label>
                    <div className="space-y-2">
                      {form.starterQuestions.map((q, i) => (
                        <input
                          key={i}
                          type="text"
                          value={q}
                          onChange={(e) => updateStarterQuestion(i, e.target.value)}
                          placeholder={`Question ${i + 1}...`}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  Linked outside tools do not need an AI tutor setup. Continue to learning goals and optional tracking.
                </div>
              )}
            </>
          )}

          {/* Step 4: Learning & Metrics */}
          {step === 4 && (
            <>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Link to a course or dataset</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Link this experience to a course or shared dataset so it is easier to discover and deploy in context.
                    </p>
                  </div>
                  <Link href="/datasets" className="text-xs font-semibold text-[#0033A0] hover:underline">
                    Browse datasets
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1.3fr,0.7fr] gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Linked Course
                    </label>
                    <select
                      value={form.linkedCourseCode}
                      onChange={(e) => update('linkedCourseCode', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] bg-white"
                    >
                      <option value="">No linked course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.courseCode}>
                          {course.courseCode} - {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Module
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.linkedModule}
                      onChange={(e) => update('linkedModule', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Shared datasets</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SANDBOX_DATASETS.map((dataset) => {
                      const selected = form.linkedDatasetIds.includes(dataset.id)
                      return (
                        <button
                          key={dataset.id}
                          type="button"
                          onClick={() => toggleDataset(dataset.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                            selected
                              ? 'border-[#0033A0] bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selected ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {dataset.category === 'Courseware'
                                ? <GraduationCap className="w-5 h-5" />
                                : <Database className="w-5 h-5" />
                              }
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{dataset.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{dataset.summary}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intended Audience
                </label>
                <textarea
                  value={form.intendedAudience}
                  onChange={(e) => update('intendedAudience', e.target.value)}
                  placeholder="e.g., Undergraduate history students in World Civilizations..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-y"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Learning Objectives
                  </label>
                  <button
                    type="button"
                    onClick={addObjective}
                    className="flex items-center gap-1 text-xs text-[#0033A0] font-medium hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.learningObjectives.map((obj, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) => updateObjective(i, e.target.value)}
                        placeholder={`Objective ${i + 1}...`}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                      />
                      {form.learningObjectives.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeObjective(i)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Optional: Track what students do
                  </label>
                  <button
                    type="button"
                    onClick={addMetric}
                    className="flex items-center gap-1 text-xs text-[#0033A0] font-medium hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add Metric
                  </button>
                </div>

                {form.customMetrics.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-5 text-center text-sm text-gray-400">
                    No activity tracking yet. Add optional items if you want to measure what students do.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.customMetrics.map((metric, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">
                            Metric {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMetric(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={metric.name}
                            onChange={(e) => updateMetric(i, 'name', e.target.value)}
                            placeholder="Metric name (e.g., score)"
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                          />
                          <select
                            value={metric.type}
                            onChange={(e) => updateMetric(i, 'type', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] bg-white"
                          >
                            {METRIC_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {METRIC_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={metric.description}
                          onChange={(e) => updateMetric(i, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {form.toolType === 'EXTERNAL' && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="font-medium text-amber-800 text-sm mb-1">Webhook Payload Format</div>
                    <pre className="text-xs text-amber-700 bg-amber-100 rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(
                        {
                          sessionId: 'optional-session-id',
                          metrics: [
                            { name: 'score', value: 87 },
                            { name: 'completed', value: true },
                          ],
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>

              {form.toolType === 'CHATBOT' && (
                <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Number of rounds/steps
                      <span className="font-normal text-gray-400 ml-1">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={form.totalSteps}
                      onChange={(e) => update('totalSteps', e.target.value)}
                      placeholder="e.g., 5"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Step label
                      <span className="font-normal text-gray-400 ml-1">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.stepLabel}
                      onChange={(e) => update('stepLabel', e.target.value)}
                      placeholder="Round, Question, Case, Step..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      If you set a total step count, students will see a progress bar during chat.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
            <>
              <div>
                <h3 className="font-semibold text-gray-700 text-sm mb-3">Card Preview</h3>
                <div className="max-w-xs">
                  <ToolCard tool={previewTool} />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 text-sm mb-3">Detail Header Preview</h3>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-2">
                  <div className="font-bold text-xl text-gray-900">
                    {form.name || '(untitled)'}
                  </div>
                  <p className="text-gray-500 text-sm">
                    {form.shortDescription || '(no short description)'}
                  </p>
                  {form.toolType === 'CHATBOT' && (
                    <div className="text-sm font-medium text-[#0033A0]">
                      {form.personaName.trim() || 'Sandy'}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      {form.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      {form.difficultyLevel}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      {form.toolType === 'CHATBOT' ? 'Conversational AI tutor' : 'Outside tool link'}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {currentUser.role !== 'STUDENT' && (
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={requestVerification}
                    onChange={(event) => setRequestVerification(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Request admin review (gets a Verified badge)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      An admin will review this experience. Approved experiences appear in the main marketplace.
                    </div>
                  </div>
                </label>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className={`flex gap-2 ${step < STEP_LABELS.length ? 'items-center' : 'w-full max-w-sm flex-col items-stretch'}`}>
            {step < STEP_LABELS.length ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && (!form.name || !form.shortDescription || !form.fullDescription)) ||
                  (step === 2 && form.toolType === 'EXTERNAL' && !form.externalUrl)
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-xl text-sm font-medium hover:bg-[#002580] transition-colors disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                {currentUser.role === 'STUDENT' && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-2">
                    <input
                      type="checkbox"
                      id="student-verify"
                      checked={studentVerified}
                      onChange={(e) => setStudentVerified(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                    />
                    <label htmlFor="student-verify" className="text-sm text-amber-800 leading-relaxed cursor-pointer">
                      I confirm this experience is appropriate for educational use and does not contain harmful, misleading, or inappropriate content. Student submissions are reviewed before appearing in the Marketplace.
                    </label>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting || (currentUser.role === 'STUDENT' && !studentVerified)}
                    className="w-full rounded-xl bg-[#0033A0] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Publish Experience
                  </button>
                  <p className="text-xs text-center text-gray-500">
                    {currentUser.role === 'STUDENT'
                      ? 'Your experience will be submitted for review before it appears in the marketplace.'
                      : 'Your experience will be visible to the UK community immediately. You can unpublish it anytime.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
                  >
                    Save as Draft
                  </button>
                  <p className="text-xs text-center text-gray-500">
                    Only you can see drafts. Come back anytime to finish and publish.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div></>)}
    </div>
  )
}
