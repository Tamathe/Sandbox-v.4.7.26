'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Lock,
  Loader2,
  MessageSquare,
  Pin,
  Plus,
  Pencil,
  Reply,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { CourseMagicButton } from '../components/CourseMagicButton'
import { PrivacyFooter } from '../components/PrivacyFooter'
import StudyGuideCard from '../components/StudyGuideCard'

type TabId = 'materials' | 'tools' | 'discussion' | 'submissions' | 'pulse' | 'settings'

type Course = {
  id: string
  courseCode: string
  title: string
  description: string | null
  isPublic: boolean
  instructor: { name: string; email: string }
  _count: { materials: number }
}

type CourseMaterial = {
  id: string
  title: string
  content: string
  materialType: string
  moduleNumber: number | null
  isVisible: boolean
  createdAt: string
}

type LinkedTool = {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
  thumbnailUrl: string | null
  estimatedMinutes: number | null
  syllabusContext: string | null
  weekLabel: string | null
  topScore?: number | null
  _count: { sessions: number }
}

type CatalogTool = {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
}

type ToolSuggestion = {
  title: string
  description: string
  toolType: string
  rationale: string
}

type DiscussionThreadSummary = {
  id: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; role: string }
  _count: { posts: number }
}

type DiscussionReply = {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; role: string }
}

type DiscussionPost = {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; role: string }
  replies: DiscussionReply[]
}

type DiscussionThreadDetail = {
  id: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; role: string }
  posts: DiscussionPost[]
}

type PulseModule = {
  label: string
  pct: number
  students: number
  warn: boolean
}

type PulseQuestion = {
  question: string
  count: number
}

type SubmissionMetric = {
  label: string
  value: string
  tone: 'neutral' | 'good' | 'warn'
}

type AssignmentSubmissionSnapshot = {
  assignment: string
  submitted: string
  average: string
  flagged: string
}

type SubmissionSample = {
  studentName: string
  assignment: string
  status: 'Strong' | 'On Track' | 'Needs Review' | 'Missing'
  score: string
  submittedAt: string | null
  feedback: string
}

type CourseSubmissionSnapshot = {
  summary: SubmissionMetric[]
  assignments: AssignmentSubmissionSnapshot[]
  recentSubmissions: SubmissionSample[]
}

type CourseContextPayload = {
  courseId: string
  courseCode: string
  title: string
  description: string | null
  materialsCount: number
}

const TYPE_COLORS: Record<string, string> = {
  lecture: 'bg-blue-100 text-blue-700',
  assignment: 'bg-orange-100 text-orange-700',
  reading: 'bg-purple-100 text-purple-700',
  case: 'bg-amber-100 text-amber-700',
  rubric: 'bg-red-100 text-red-700',
  syllabus: 'bg-green-100 text-green-700',
  quiz: 'bg-indigo-100 text-indigo-700',
}

const TOOL_TYPE_COLORS: Record<string, string> = {
  CHATBOT: 'bg-violet-100 text-violet-700',
  STUDY_BUDDY: 'bg-cyan-100 text-cyan-700',
  SIMULATION: 'bg-orange-100 text-orange-700',
  QUIZ: 'bg-indigo-100 text-indigo-700',
  DEBATE: 'bg-rose-100 text-rose-700',
  AI_INTERVIEW: 'bg-emerald-100 text-emerald-700',
  EXTERNAL: 'bg-gray-100 text-gray-700',
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

const SUBMISSION_METRIC_COLORS: Record<SubmissionMetric['tone'], string> = {
  neutral: 'bg-gray-100 text-gray-700',
  good: 'bg-green-100 text-green-700',
  warn: 'bg-amber-100 text-amber-700',
}

const SUBMISSION_STATUS_COLORS: Record<SubmissionSample['status'], string> = {
  Strong: 'bg-green-100 text-green-700',
  'On Track': 'bg-blue-100 text-blue-700',
  'Needs Review': 'bg-amber-100 text-amber-700',
  Missing: 'bg-gray-100 text-gray-600',
}

const MATERIAL_TYPES = ['lecture', 'assignment', 'reading', 'case', 'rubric', 'syllabus', 'quiz']

const PULSE_DATA: Record<
  string,
  {
    modules: PulseModule[]
    commonQuestions: PulseQuestion[]
  }
> = {
  'TEK-100': {
    modules: [
      { label: 'Module 2', pct: 86, students: 18, warn: false },
      { label: 'Module 4', pct: 73, students: 15, warn: false },
      { label: 'Module 6', pct: 54, students: 11, warn: false },
      { label: 'Module 9', pct: 39, students: 8, warn: true },
    ],
    commonQuestions: [
      { question: 'How detailed does my AI disclosure need to be on the Prompt Iteration Lab?', count: 7 },
      { question: 'What is the difference between using AI as a co-pilot and letting it make the decision?', count: 6 },
      { question: 'How narrow does the Innovation Proposal problem statement need to be?', count: 5 },
    ],
  },
  'CS-215': {
    modules: [
      { label: 'Module 1', pct: 91, students: 21, warn: false },
      { label: 'Module 2', pct: 79, students: 18, warn: false },
      { label: 'Module 3', pct: 61, students: 13, warn: false },
      { label: 'Module 4', pct: 44, students: 9, warn: true },
    ],
    commonQuestions: [
      { question: 'Why does my running average reset inside the loop?', count: 8 },
      { question: 'When should I use an instance variable instead of a local variable?', count: 6 },
      { question: 'How small should my debugging test case be?', count: 5 },
    ],
  },
  'BIO-201': {
    modules: [
      { label: 'Module 1', pct: 84, students: 19, warn: false },
      { label: 'Module 2', pct: 76, students: 17, warn: false },
      { label: 'Module 3', pct: 57, students: 12, warn: false },
      { label: 'Module 4', pct: 43, students: 8, warn: true },
    ],
    commonQuestions: [
      { question: 'What makes an interview question truly open-ended?', count: 7 },
      { question: 'Why does exertional chest pain point us toward cardiovascular causes first?', count: 6 },
      { question: 'How do I explain homeostasis without sounding too technical?', count: 4 },
    ],
  },
}

const SUBMISSION_SNAPSHOTS: Record<string, CourseSubmissionSnapshot> = {
  'TEK-100': {
    summary: [
      { label: 'Average Score', value: '87%', tone: 'good' },
      { label: 'On-Time Rate', value: '91%', tone: 'good' },
      { label: 'Needs Review', value: '3 submissions', tone: 'warn' },
      { label: 'Missing Work', value: '2 students', tone: 'neutral' },
    ],
    assignments: [
      { assignment: 'AI Observation Journal', submitted: '19/21', average: '89%', flagged: '2 follow-ups' },
      { assignment: 'Prompt Iteration Lab', submitted: '21/21', average: '86%', flagged: '1 follow-up' },
      { assignment: 'Red Team Proposal Memo', submitted: '18/21', average: '84%', flagged: '3 follow-ups' },
      { assignment: 'Innovation Proposal Milestone', submitted: '16/21', average: '88%', flagged: '2 follow-ups' },
    ],
    recentSubmissions: [
      {
        studentName: 'Maya Bennett',
        assignment: 'Prompt Iteration Lab',
        status: 'Strong',
        score: '94%',
        submittedAt: '2026-03-15T18:10:00.000Z',
        feedback: 'Clear improvement across all five prompt revisions. Strong use of context and format constraints in the final version.',
      },
      {
        studentName: 'Ian McClure Jr.',
        assignment: 'Red Team Proposal Memo',
        status: 'Needs Review',
        score: '78%',
        submittedAt: '2026-03-14T21:05:00.000Z',
        feedback: 'Good concept, but the stakeholder critique section stays too generic. Needs one more round of concrete pushback.',
      },
      {
        studentName: 'Zoe Kim',
        assignment: 'Innovation Proposal Milestone',
        status: 'On Track',
        score: '88%',
        submittedAt: '2026-03-13T16:42:00.000Z',
        feedback: 'Problem framing is focused and feasible. Next step is tightening the risk section with clearer equity concerns.',
      },
      {
        studentName: 'Noah Carter',
        assignment: 'AI Observation Journal',
        status: 'Missing',
        score: 'Not submitted',
        submittedAt: null,
        feedback: 'Student has not submitted yet. Recommend a reminder plus office-hours outreach if still missing after 48 hours.',
      },
    ],
  },
  'CS-215': {
    summary: [
      { label: 'Average Score', value: '83%', tone: 'good' },
      { label: 'On-Time Rate', value: '88%', tone: 'good' },
      { label: 'Needs Review', value: '4 submissions', tone: 'warn' },
      { label: 'Missing Work', value: '1 student', tone: 'neutral' },
    ],
    assignments: [
      { assignment: 'Quiz Tracker CLI', submitted: '22/23', average: '85%', flagged: '2 follow-ups' },
      { assignment: 'GradeTracker Class', submitted: '21/23', average: '82%', flagged: '3 follow-ups' },
      { assignment: 'Debugging Clinic Reflection', submitted: '20/23', average: '81%', flagged: '4 follow-ups' },
    ],
    recentSubmissions: [
      {
        studentName: 'Sofia Nguyen',
        assignment: 'GradeTracker Class',
        status: 'Strong',
        score: '92%',
        submittedAt: '2026-03-15T19:22:00.000Z',
        feedback: 'Clean method design and readable naming. Reflection also explains debugging decisions clearly.',
      },
      {
        studentName: 'Tiana The',
        assignment: 'Debugging Clinic Reflection',
        status: 'Needs Review',
        score: '74%',
        submittedAt: '2026-03-14T23:11:00.000Z',
        feedback: 'The fix works, but the debugging log jumps from symptom to solution without showing the evidence trail.',
      },
      {
        studentName: 'Maya Bennett',
        assignment: 'Quiz Tracker CLI',
        status: 'On Track',
        score: '84%',
        submittedAt: '2026-03-13T14:15:00.000Z',
        feedback: 'Meets the requirements. Encourage the student to validate bad input a little earlier in the loop.',
      },
      {
        studentName: 'Leo Alvarez',
        assignment: 'Debugging Clinic Reflection',
        status: 'Missing',
        score: 'Not submitted',
        submittedAt: null,
        feedback: 'No file uploaded yet. Consider flagging this student for a quick check-in before the next lab.',
      },
    ],
  },
  'BIO-201': {
    summary: [
      { label: 'Average Score', value: '86%', tone: 'good' },
      { label: 'On-Time Rate', value: '93%', tone: 'good' },
      { label: 'Needs Review', value: '2 submissions', tone: 'warn' },
      { label: 'Missing Work', value: '1 student', tone: 'neutral' },
    ],
    assignments: [
      { assignment: 'Body Systems Concept Map', submitted: '18/19', average: '88%', flagged: '1 follow-up' },
      { assignment: 'Patient Interview Reflection', submitted: '19/19', average: '85%', flagged: '2 follow-ups' },
      { assignment: 'Cardiovascular Case Response', submitted: '17/19', average: '84%', flagged: '2 follow-ups' },
    ],
    recentSubmissions: [
      {
        studentName: 'Ian McClure',
        assignment: 'Patient Interview Reflection',
        status: 'Strong',
        score: '91%',
        submittedAt: '2026-03-15T17:02:00.000Z',
        feedback: 'Excellent attention to empathy and sequencing. Reflection shows clear improvement in question design.',
      },
      {
        studentName: 'Zoe Kim',
        assignment: 'Cardiovascular Case Response',
        status: 'On Track',
        score: '86%',
        submittedAt: '2026-03-14T20:48:00.000Z',
        feedback: 'Solid clinical reasoning. Would be even stronger with a tighter explanation of why exertion changes the differential.',
      },
      {
        studentName: 'Noah Carter',
        assignment: 'Body Systems Concept Map',
        status: 'Needs Review',
        score: '76%',
        submittedAt: '2026-03-13T11:35:00.000Z',
        feedback: 'The map lists systems accurately, but the relationships between structure and function stay too vague.',
      },
      {
        studentName: 'Sofia Nguyen',
        assignment: 'Cardiovascular Case Response',
        status: 'Missing',
        score: 'Not submitted',
        submittedAt: null,
        feedback: 'No case response yet. Recommend a quick reminder before the next physiology quiz closes.',
      },
    ],
  },
}

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'Request failed'
    throw new Error(message)
  }

  return payload as T
}

function courseHeaders(email: string, includeJson = false) {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'x-demo-user-email': email,
  }
}

function getModuleKey(moduleNumber: number | null) {
  return moduleNumber ? `Module ${moduleNumber}` : 'General'
}

function parseModuleNumber(moduleKey: string) {
  const match = moduleKey.match(/^Module\s+(\d+)$/)
  return match ? Number.parseInt(match[1], 10) : null
}

function sortModuleKeys(keys: string[]) {
  return [...keys].sort((left, right) => {
    if (left === 'General') return -1
    if (right === 'General') return 1
    return (parseModuleNumber(left) ?? 0) - (parseModuleNumber(right) ?? 0)
  })
}

function formatToolType(toolType: string) {
  return toolType.replace(/_/g, ' ')
}

function materialPreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 140) return normalized
  return `${normalized.slice(0, 137)}...`
}

function buildSuggestionHref(courseCode: string, suggestion: ToolSuggestion, moduleKey: string) {
  const params = new URLSearchParams({
    course: courseCode,
    toolName: suggestion.title,
    toolType: suggestion.toolType,
  })

  const moduleNumber = parseModuleNumber(moduleKey)
  if (moduleNumber) params.set('moduleNumber', String(moduleNumber))

  return `/builder?${params.toString()}`
}

function getPulseSnapshot(courseCode: string | undefined, materials: CourseMaterial[]) {
  if (courseCode && PULSE_DATA[courseCode]) return PULSE_DATA[courseCode]

  const moduleNumbers = Array.from(
    new Set(
      materials
        .map((material) => material.moduleNumber)
        .filter((moduleNumber): moduleNumber is number => moduleNumber !== null)
    )
  ).sort((left, right) => left - right)

  const fallbackModules = (moduleNumbers.length > 0 ? moduleNumbers : [1, 2, 3]).map((moduleNumber, index) => {
    const pct = Math.max(28, 74 - index * 16)
    return {
      label: `Module ${moduleNumber}`,
      pct,
      students: Math.max(3, 14 - index * 3),
      warn: pct < 50,
    }
  })

  return {
    modules: fallbackModules,
    commonQuestions: [
      { question: 'Which material should students review first?', count: 5 },
      { question: 'What does this module expect us to master?', count: 4 },
      { question: 'Is there a practice tool tied to this topic?', count: 3 },
    ],
  }
}

function getSubmissionSnapshot(courseCode: string | undefined) {
  if (!courseCode) return null
  return SUBMISSION_SNAPSHOTS[courseCode] ?? null
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: typeof BookOpen
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <div className="py-12 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-gray-200" />
      <h3 className="mb-1 text-sm font-semibold text-gray-600">{title}</h3>
      <p className="mb-4 text-xs text-gray-400">{description}</p>
      {actions}
    </div>
  )
}

function CourseSidebar({
  courses,
  selectedCourseId,
  onSelect,
  isEducator,
  showNewCourseForm,
  onOpenNewCourse,
  onCancelNewCourse,
  onCreateCourse,
  newCourseForm,
  onCourseFieldChange,
  creatingCourse,
}: {
  courses: Course[]
  selectedCourseId: string | null
  onSelect: (courseId: string) => void
  isEducator: boolean
  showNewCourseForm: boolean
  onOpenNewCourse: () => void
  onCancelNewCourse: () => void
  onCreateCourse: (event: React.FormEvent<HTMLFormElement>) => void
  newCourseForm: { courseCode: string; title: string; description: string; isPublic: boolean }
  onCourseFieldChange: (field: 'courseCode' | 'title' | 'description' | 'isPublic', value: string | boolean) => void
  creatingCourse: boolean
}) {
  return (
    <aside className="hidden lg:flex lg:flex-col">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {isEducator ? 'My courses' : 'Courses'}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {courses.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {isEducator ? 'Create your first course to get started.' : 'No public courses available yet.'}
            </div>
          ) : (
            courses.map((course) => {
              const isSelected = course.id === selectedCourseId

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelect(course.id)}
                  className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                      : 'border-transparent text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-bold">{course.courseCode}</div>
                  <div className="truncate text-sm">{course.title}</div>
                  <div className="text-[10px] text-gray-400">{course._count.materials} materials</div>
                </button>
              )
            })
          )}
        </div>

        {isEducator && (
          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={onOpenNewCourse}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              <Plus className="h-4 w-4" />
              New Course
            </button>

            {showNewCourseForm && (
              <form onSubmit={onCreateCourse} className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Course Code
                  </label>
                  <input
                    value={newCourseForm.courseCode}
                    onChange={(event) => onCourseFieldChange('courseCode', event.target.value)}
                    placeholder="TEK-100"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Title
                  </label>
                  <input
                    value={newCourseForm.title}
                    onChange={(event) => onCourseFieldChange('title', event.target.value)}
                    placeholder="Technology & Society"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Description
                  </label>
                  <textarea
                    value={newCourseForm.description}
                    onChange={(event) => onCourseFieldChange('description', event.target.value)}
                    rows={3}
                    placeholder="What is this course about?"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={newCourseForm.isPublic}
                    onChange={(event) => onCourseFieldChange('isPublic', event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                  />
                  Public course
                </label>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onCancelNewCourse}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCourse}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                  >
                    {creatingCourse && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Course
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

function LinkToolModal({
  open,
  tools,
  linkedToolIds,
  search,
  onSearchChange,
  onClose,
  onLink,
  loading,
  linkingToolId,
}: {
  open: boolean
  tools: CatalogTool[]
  linkedToolIds: Set<string>
  search: string
  onSearchChange: (value: string) => void
  onClose: () => void
  onLink: (toolId: string) => void
  loading: boolean
  linkingToolId: string | null
}) {
  if (!open) return null

  const filteredTools = tools.filter((tool) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return [tool.name, tool.category, tool.toolType, tool.shortDescription]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Link a published tool</h3>
            <p className="text-sm text-gray-500">Choose from tools already in the Sandbox catalog.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close tool linking modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-5 py-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by tool name, category, or type"
              className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0033A0]"
            />
          </label>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading published tools...
            </div>
          ) : filteredTools.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No matching tools"
              description="Try a different search or publish a new tool first."
            />
          ) : (
            <div className="space-y-3">
              {filteredTools.map((tool) => {
                const alreadyLinked = linkedToolIds.has(tool.id)
                const isLinking = linkingToolId === tool.id

                return (
                  <div key={tool.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{tool.name}</h4>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            {tool.category}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              TOOL_TYPE_COLORS[tool.toolType] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {formatToolType(tool.toolType)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{tool.shortDescription}</p>
                      </div>

                      <button
                        type="button"
                        disabled={alreadyLinked || isLinking}
                        onClick={() => onLink(tool.id)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                          alreadyLinked
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                            : 'bg-[#0033A0] text-white hover:bg-[#002580]'
                        }`}
                      >
                        {isLinking && <Loader2 className="h-4 w-4 animate-spin" />}
                        {alreadyLinked ? 'Already linked' : 'Link tool'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CoursesPage() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const courseParam = searchParams.get('course')
  const isStudent = currentUser.role === 'STUDENT'
  const isAdmin = currentUser.role === 'ADMIN'
  const isEducator = currentUser.role !== 'STUDENT'

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [autoPromptedCourseIds, setAutoPromptedCourseIds] = useState<string[]>([])
  const [linkedTools, setLinkedTools] = useState<LinkedTool[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('materials')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [coursesError, setCoursesError] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const [showNewCourseForm, setShowNewCourseForm] = useState(false)
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [newCourseForm, setNewCourseForm] = useState({
    courseCode: '',
    title: '',
    description: '',
    isPublic: true,
  })

  const [moduleFormTarget, setModuleFormTarget] = useState<string | null>(null)
  const [savingMaterial, setSavingMaterial] = useState(false)
  const [materialForm, setMaterialForm] = useState({
    title: '',
    content: '',
    materialType: 'lecture',
    moduleNumber: '',
    isVisible: true,
  })

  const [expandedMaterials, setExpandedMaterials] = useState<Record<string, boolean>>({})
  const [suggestionsByModule, setSuggestionsByModule] = useState<Record<string, ToolSuggestion[] | null | undefined>>({})

  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [catalogTools, setCatalogTools] = useState<CatalogTool[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  const [linkingToolId, setLinkingToolId] = useState<string | null>(null)
  const [editingContextToolId, setEditingContextToolId] = useState<string | null>(null)
  const [contextForm, setContextForm] = useState({ weekLabel: '', syllabusContext: '' })
  const [savingContextToolId, setSavingContextToolId] = useState<string | null>(null)

  const [discussionThreads, setDiscussionThreads] = useState<DiscussionThreadSummary[]>([])
  const [discussionLoading, setDiscussionLoading] = useState(false)
  const [discussionError, setDiscussionError] = useState<string | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<DiscussionThreadDetail | null>(null)
  const [showNewThreadForm, setShowNewThreadForm] = useState(false)
  const [newThreadForm, setNewThreadForm] = useState({ title: '', content: '' })
  const [creatingThread, setCreatingThread] = useState(false)
  const [replyTarget, setReplyTarget] = useState<'thread' | string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [postingReplyTarget, setPostingReplyTarget] = useState<string | null>(null)
  const [moderatingThreadId, setModeratingThreadId] = useState<string | null>(null)

  const [settingsForm, setSettingsForm] = useState({
    title: '',
    description: '',
    isPublic: true,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null)

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  )

  const canManageSelectedCourse = !!selectedCourse && (isAdmin || selectedCourse.instructor.email === currentUser.email)

  const visibleTabs = useMemo(
    () =>
      [
        { id: 'materials' as const, label: 'Materials', icon: BookOpen, visible: true },
        { id: 'tools' as const, label: 'Tools', icon: Compass, visible: true },
        { id: 'discussion' as const, label: 'Discussion', icon: MessageSquare, visible: true },
        { id: 'submissions' as const, label: 'Submissions', icon: FileText, visible: !isStudent },
        { id: 'pulse' as const, label: 'Pulse', icon: BarChart3, visible: !isStudent },
        { id: 'settings' as const, label: 'Settings', icon: Settings, visible: canManageSelectedCourse },
      ].filter((tab) => tab.visible),
    [canManageSelectedCourse, isStudent]
  )

  const groupedMaterials = useMemo(() => {
    return materials.reduce<Record<string, CourseMaterial[]>>((accumulator, material) => {
      const key = getModuleKey(material.moduleNumber)
      if (!accumulator[key]) accumulator[key] = []
      accumulator[key].push(material)
      return accumulator
    }, {})
  }, [materials])

  const sortedModuleKeys = useMemo(() => sortModuleKeys(Object.keys(groupedMaterials)), [groupedMaterials])
  const linkedToolIds = useMemo(() => new Set(linkedTools.map((tool) => tool.id)), [linkedTools])
  const pulseSnapshot = useMemo(
    () => getPulseSnapshot(selectedCourse?.courseCode, materials),
    [materials, selectedCourse?.courseCode]
  )
  const submissionSnapshot = useMemo(
    () => getSubmissionSnapshot(selectedCourse?.courseCode),
    [selectedCourse?.courseCode]
  )

  useEffect(() => {
    let cancelled = false

    async function loadCourses() {
      setLoading(true)
      setCoursesError(null)

      try {
        const data = await readJson<Course[]>('/api/courses', {
          headers: courseHeaders(currentUser.email),
        })

        if (cancelled) return

        setCourses(data)
        setSelectedCourseId((previous) => {
          if (previous && data.some((course) => course.id === previous)) return previous
          if (courseParam) {
            const matched = data.find(
              (course) => course.courseCode.toLowerCase() === courseParam.toLowerCase()
            )
            if (matched) return matched.id
          }
          return data[0]?.id ?? null
        })
      } catch (error) {
        if (cancelled) return
        setCourses([])
        setSelectedCourseId(null)
        setCoursesError(error instanceof Error ? error.message : 'Failed to load courses')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCourses()

    return () => {
      cancelled = true
    }
  }, [currentUser.email])

  useEffect(() => {
    if (!selectedCourseId) {
      setMaterials([])
      setLinkedTools([])
      return
    }

    let cancelled = false

    async function loadDetails() {
      setDetailLoading(true)
      setDetailsError(null)

      try {
        const [materialsData, toolsData] = await Promise.all([
          readJson<CourseMaterial[]>(`/api/courses/${selectedCourseId}/materials`, {
            headers: courseHeaders(currentUser.email),
          }),
          readJson<LinkedTool[]>(`/api/courses/${selectedCourseId}/tools`, {
            headers: courseHeaders(currentUser.email),
          }),
        ])

        if (cancelled) return

        setMaterials(materialsData)
        setLinkedTools(toolsData)
      } catch (error) {
        if (cancelled) return
        setMaterials([])
        setLinkedTools([])
        setDetailsError(error instanceof Error ? error.message : 'Failed to load course data')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void loadDetails()

    return () => {
      cancelled = true
    }
  }, [currentUser.email, selectedCourseId])

  useEffect(() => {
    setExpandedMaterials({})
    setSuggestionsByModule({})
    setModuleFormTarget(null)
    setToolSearch('')
    setDiscussionThreads([])
    setDiscussionError(null)
    setSelectedThread(null)
    setSelectedThreadId(null)
    setShowNewThreadForm(false)
    setReplyTarget(null)
    setReplyDrafts({})
    setSettingsNotice(null)
  }, [selectedCourseId])

  useEffect(() => {
    if (selectedCourse) {
      setSettingsForm({
        title: selectedCourse.title,
        description: selectedCourse.description ?? '',
        isPublic: selectedCourse.isPublic,
      })
    }
  }, [selectedCourse])

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('materials')
    }
  }, [activeTab, visibleTabs])

  useEffect(() => {
    try {
      if (!selectedCourse) {
        localStorage.removeItem('sandbox-course-context')
        window.dispatchEvent(new CustomEvent('sandbox-course-context-changed', { detail: null }))
        return
      }

      const payload: CourseContextPayload = {
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        title: selectedCourse.title,
        description: selectedCourse.description,
        materialsCount: materials.length,
      }

      localStorage.setItem('sandbox-course-context', JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('sandbox-course-context-changed', { detail: payload }))
    } catch {
      // Ignore storage failures in demo mode.
    }
  }, [materials.length, selectedCourse])

  useEffect(() => {
    if (!isEducator || !selectedCourse || detailLoading || materials.length > 0) return
    if (autoPromptedCourseIds.includes(selectedCourse.id)) return

    window.dispatchEvent(
      new CustomEvent('sandy-prefill', {
        detail: {
          message: 'Tell me how to get started with this course.',
          autoSend: true,
        },
      })
    )
    setAutoPromptedCourseIds((previous) => [...previous, selectedCourse.id])
  }, [autoPromptedCourseIds, detailLoading, isEducator, materials.length, selectedCourse])

  async function refreshSelectedCourse() {
    if (!selectedCourseId) return

    const [materialsData, toolsData] = await Promise.all([
      readJson<CourseMaterial[]>(`/api/courses/${selectedCourseId}/materials`, {
        headers: courseHeaders(currentUser.email),
      }),
      readJson<LinkedTool[]>(`/api/courses/${selectedCourseId}/tools`, {
        headers: courseHeaders(currentUser.email),
      }),
    ])

    setMaterials(materialsData)
    setLinkedTools(toolsData)
  }

  async function fetchDiscussionThreads() {
    if (!selectedCourseId) return

    setDiscussionLoading(true)
    setDiscussionError(null)

    try {
      const threads = await readJson<DiscussionThreadSummary[]>(`/api/courses/${selectedCourseId}/discussions`, {
        headers: courseHeaders(currentUser.email),
      })

      setDiscussionThreads(threads)

      if (selectedThreadId && !threads.some((thread) => thread.id === selectedThreadId)) {
        setSelectedThreadId(null)
        setSelectedThread(null)
      }
    } catch (error) {
      setDiscussionError(error instanceof Error ? error.message : 'Failed to load discussions')
    } finally {
      setDiscussionLoading(false)
    }
  }

  async function fetchDiscussionThreadDetail(threadId: string, showSpinner = true) {
    if (!selectedCourseId) return

    if (showSpinner) setDiscussionLoading(true)
    setDiscussionError(null)

    try {
      const payload = await readJson<{ thread: DiscussionThreadDetail }>(
        `/api/courses/${selectedCourseId}/discussions/${threadId}`,
        {
          headers: courseHeaders(currentUser.email),
        }
      )

      setSelectedThreadId(threadId)
      setSelectedThread(payload.thread)
    } catch (error) {
      setDiscussionError(error instanceof Error ? error.message : 'Failed to load discussion thread')
    } finally {
      if (showSpinner) setDiscussionLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'discussion' || !selectedCourseId) return
    void fetchDiscussionThreads()
  }, [activeTab, currentUser.email, selectedCourseId])

  async function fetchCatalogTools() {
    setCatalogLoading(true)
    try {
      const payload = await readJson<{ tools: CatalogTool[] }>('/api/tools?limit=100', {
        headers: courseHeaders(currentUser.email),
      })
      setCatalogTools(payload.tools)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load tools')
    } finally {
      setCatalogLoading(false)
    }
  }

  function openMaterialForm(moduleKey: string) {
    setModuleFormTarget(moduleKey)
    setMaterialForm({
      title: '',
      content: '',
      materialType: 'lecture',
      moduleNumber: parseModuleNumber(moduleKey)?.toString() ?? '',
      isVisible: true,
    })
  }

  async function handleCreateThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourseId) return
    if (!newThreadForm.title.trim() || !newThreadForm.content.trim()) {
      alert('Thread title and content are required.')
      return
    }

    setCreatingThread(true)

    try {
      const thread = await readJson<DiscussionThreadSummary>(`/api/courses/${selectedCourseId}/discussions`, {
        method: 'POST',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({
          title: newThreadForm.title.trim(),
          content: newThreadForm.content.trim(),
        }),
      })

      setNewThreadForm({ title: '', content: '' })
      setShowNewThreadForm(false)
      await fetchDiscussionThreads()
      await fetchDiscussionThreadDetail(thread.id)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create thread')
    } finally {
      setCreatingThread(false)
    }
  }

  async function handleCreateCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newCourseForm.courseCode.trim() || !newCourseForm.title.trim()) {
      alert('Course code and title are required.')
      return
    }

    setCreatingCourse(true)

    try {
      const course = await readJson<Course>('/api/courses', {
        method: 'POST',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({
          courseCode: newCourseForm.courseCode.trim(),
          title: newCourseForm.title.trim(),
          description: newCourseForm.description.trim() || null,
          isPublic: newCourseForm.isPublic,
        }),
      })

      setCourses((previous) => [course, ...previous])
      setSelectedCourseId(course.id)
      setShowNewCourseForm(false)
      setNewCourseForm({ courseCode: '', title: '', description: '', isPublic: true })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create course')
    } finally {
      setCreatingCourse(false)
    }
  }

  async function handleSaveMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourseId) return
    if (!materialForm.title.trim() || !materialForm.content.trim()) {
      alert('Material title and content are required.')
      return
    }

    setSavingMaterial(true)

    try {
      await readJson<CourseMaterial>(`/api/courses/${selectedCourseId}/materials`, {
        method: 'POST',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({
          title: materialForm.title.trim(),
          content: materialForm.content.trim(),
          materialType: materialForm.materialType,
          moduleNumber: materialForm.moduleNumber ? Number.parseInt(materialForm.moduleNumber, 10) : null,
          isVisible: materialForm.isVisible,
        }),
      })

      await refreshSelectedCourse()
      setModuleFormTarget(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add material')
    } finally {
      setSavingMaterial(false)
    }
  }

  async function handleToggleVisibility(material: CourseMaterial) {
    if (!selectedCourseId) return

    try {
      const updated = await readJson<CourseMaterial>(`/api/courses/${selectedCourseId}/materials`, {
        method: 'PATCH',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({
          materialId: material.id,
          isVisible: !material.isVisible,
        }),
      })

      setMaterials((previous) =>
        previous.map((item) => (item.id === updated.id ? { ...item, isVisible: updated.isVisible } : item))
      )
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update material visibility')
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    if (!selectedCourseId) return
    if (!window.confirm('Delete this material? This cannot be undone.')) return

    try {
      await readJson<{ ok: boolean }>(`/api/courses/${selectedCourseId}/materials?materialId=${materialId}`, {
        method: 'DELETE',
        headers: courseHeaders(currentUser.email),
      })
      setMaterials((previous) => previous.filter((material) => material.id !== materialId))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete material')
    }
  }

  async function handleSuggestTools(moduleKey: string) {
    if (!selectedCourseId) return

    setSuggestionsByModule((previous) => ({ ...previous, [moduleKey]: null }))

    try {
      const payload = await readJson<{ suggestions: ToolSuggestion[] }>(
        `/api/courses/${selectedCourseId}/suggest-tools`,
        {
          method: 'POST',
          headers: courseHeaders(currentUser.email, true),
          body: JSON.stringify({
            moduleNumber: parseModuleNumber(moduleKey),
          }),
        }
      )

      setSuggestionsByModule((previous) => ({ ...previous, [moduleKey]: payload.suggestions }))
    } catch (error) {
      setSuggestionsByModule((previous) => ({ ...previous, [moduleKey]: [] }))
      alert(error instanceof Error ? error.message : 'Failed to generate tool suggestions')
    }
  }

  async function handleLinkTool(toolId: string) {
    if (!selectedCourseId) return

    setLinkingToolId(toolId)
    try {
      await readJson<{ ok: boolean }>(`/api/courses/${selectedCourseId}/tools`, {
        method: 'POST',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({ toolId }),
      })
      await refreshSelectedCourse()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to link tool')
    } finally {
      setLinkingToolId(null)
    }
  }

  async function handleUnlinkTool(toolId: string) {
    if (!selectedCourseId) return
    if (!window.confirm('Remove this tool from the course?')) return

    try {
      await readJson<{ ok: boolean }>(`/api/courses/${selectedCourseId}/tools?toolId=${toolId}`, {
        method: 'DELETE',
        headers: courseHeaders(currentUser.email),
      })
      setLinkedTools((previous) => previous.filter((tool) => tool.id !== toolId))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to unlink tool')
    }
  }

  function handleEditToolContext(tool: LinkedTool) {
    setEditingContextToolId(tool.id)
    setContextForm({
      weekLabel: tool.weekLabel ?? '',
      syllabusContext: tool.syllabusContext ?? '',
    })
  }

  async function handleSaveToolContext(toolId: string) {
    if (!selectedCourseId) return

    setSavingContextToolId(toolId)
    try {
      const updated = await readJson<{ weekLabel: string | null; syllabusContext: string | null }>(
        `/api/courses/${selectedCourseId}/tools/${toolId}`,
        {
          method: 'PUT',
          headers: courseHeaders(currentUser.email, true),
          body: JSON.stringify(contextForm),
        }
      )

      setLinkedTools((previous) =>
        previous.map((tool) =>
          tool.id === toolId
            ? {
                ...tool,
                weekLabel: updated.weekLabel,
                syllabusContext: updated.syllabusContext,
              }
            : tool
        )
      )
      setEditingContextToolId(null)
      setContextForm({ weekLabel: '', syllabusContext: '' })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save syllabus context')
    } finally {
      setSavingContextToolId(null)
    }
  }

  async function handleReplySubmit(parentId?: string) {
    if (!selectedCourseId || !selectedThreadId) return

    const draftKey = parentId ?? 'thread'
    const content = replyDrafts[draftKey]?.trim()
    if (!content) return

    setPostingReplyTarget(draftKey)

    try {
      await readJson<DiscussionPost>(`/api/courses/${selectedCourseId}/discussions/${selectedThreadId}/posts`, {
        method: 'POST',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({
          content,
          ...(parentId ? { parentId } : {}),
        }),
      })

      setReplyDrafts((previous) => ({ ...previous, [draftKey]: '' }))
      setReplyTarget(null)
      await fetchDiscussionThreads()
      await fetchDiscussionThreadDetail(selectedThreadId, false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to post reply')
    } finally {
      setPostingReplyTarget(null)
    }
  }

  async function handleToggleThreadState(threadId: string, updates: { isPinned?: boolean; isLocked?: boolean }) {
    if (!selectedCourseId) return

    setModeratingThreadId(threadId)

    try {
      const updatedThread = await readJson<DiscussionThreadSummary>(`/api/courses/${selectedCourseId}/discussions/${threadId}`, {
        method: 'PATCH',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify(updates),
      })

      setDiscussionThreads((previous) => {
        const next = previous.map((thread) => (
          thread.id === updatedThread.id
            ? { ...thread, isPinned: updatedThread.isPinned, isLocked: updatedThread.isLocked }
            : thread
        ))

        return [...next].sort((left, right) => {
          if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        })
      })

      setSelectedThread((previous) => (
        previous && previous.id === updatedThread.id
          ? { ...previous, isPinned: updatedThread.isPinned, isLocked: updatedThread.isLocked }
          : previous
      ))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update thread')
    } finally {
      setModeratingThreadId(null)
    }
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourseId) return

    setSavingSettings(true)
    setSettingsNotice(null)

    try {
      const updated = await readJson<Course>(`/api/courses/${selectedCourseId}`, {
        method: 'PATCH',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({
          title: settingsForm.title.trim(),
          description: settingsForm.description.trim() || null,
          isPublic: settingsForm.isPublic,
        }),
      })

      setCourses((previous) =>
        previous.map((course) =>
          course.id === updated.id
            ? {
                ...course,
                title: updated.title,
                description: updated.description,
                isPublic: updated.isPublic,
              }
            : course
        )
      )
      setSettingsNotice('Course settings saved.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  function renderSuggestionPanel(moduleKey: string) {
    const suggestions = suggestionsByModule[moduleKey]
    if (suggestions === undefined) return null

    if (suggestions === null) {
      return (
        <div className="border-t border-blue-200 bg-blue-50 px-4 py-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking through tool ideas for {moduleKey}...
          </div>
        </div>
      )
    }

    if (suggestions.length === 0) return null

    return (
      <div className="border-t border-blue-200 bg-blue-50 px-4 py-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0033A0]">
          <Sparkles className="h-4 w-4" />
          AI-generated tool ideas for {moduleKey}
        </div>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div key={`${suggestion.title}-${index}`} className="rounded-2xl border border-blue-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {index + 1}. {suggestion.title}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        TOOL_TYPE_COLORS[suggestion.toolType] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {formatToolType(suggestion.toolType)}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-gray-600">{suggestion.description}</p>
                  <p className="text-xs leading-relaxed text-blue-800">
                    <span className="font-semibold">Why:</span> {suggestion.rationale}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSuggestionsByModule((previous) => ({
                      ...previous,
                      [moduleKey]: (previous[moduleKey] ?? []).filter((_, suggestionIndex) => suggestionIndex !== index),
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {selectedCourse && (
                  <Link
                    href={buildSuggestionHref(selectedCourse.courseCode, suggestion, moduleKey)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Build this tool
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#0033A0]" />
          Loading course command center...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#0033A0] via-[#1141ad] to-[#2c66cf] p-6 text-white shadow-lg">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                  Faculty Course Command Center
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {selectedCourse ? `${selectedCourse.courseCode}: ${selectedCourse.title}` : 'Course workspace'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
                  Upload materials, connect AI tools, monitor module engagement, and keep Sandy grounded in the course context.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100">Courses</div>
                  <div className="mt-1 text-2xl font-semibold">{courses.length}</div>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100">Linked tools</div>
                  <div className="mt-1 text-2xl font-semibold">{linkedTools.length}</div>
                </div>
              </div>
            </div>

          </div>

          {showNewCourseForm && isEducator && (
            <div className={`mb-6 ${courses.length > 0 ? 'lg:hidden' : ''}`}>
              <form onSubmit={handleCreateCourse} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Create a new course</h3>
                    <p className="text-sm text-gray-500">Start a course space for materials, tools, and Sandy context.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCourseForm(false)}
                    className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Close new course form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Course Code
                    </label>
                    <input
                      value={newCourseForm.courseCode}
                      onChange={(event) =>
                        setNewCourseForm((previous) => ({ ...previous, courseCode: event.target.value }))
                      }
                      placeholder="TEK-100"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Title
                    </label>
                    <input
                      value={newCourseForm.title}
                      onChange={(event) => setNewCourseForm((previous) => ({ ...previous, title: event.target.value }))}
                      placeholder="Technology & Society"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Description
                  </label>
                  <textarea
                    value={newCourseForm.description}
                    onChange={(event) => setNewCourseForm((previous) => ({ ...previous, description: event.target.value }))}
                    rows={4}
                    placeholder="What is this course about?"
                    className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={newCourseForm.isPublic}
                      onChange={(event) =>
                        setNewCourseForm((previous) => ({ ...previous, isPublic: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                    />
                    Public course
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewCourseForm(false)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCourse}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                    >
                      {creatingCourse && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create course
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {coursesError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {coursesError}
            </div>
          )}

          {courses.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <EmptyState
                icon={GraduationCap}
                title={isEducator ? 'No courses yet' : 'No public courses available'}
                description={
                  isEducator
                    ? 'Create a course to start organizing materials, linking tools, and tracking engagement.'
                    : 'Check back soon for published course spaces from your instructors.'
                }
                actions={
                  isEducator ? (
                    <button
                      type="button"
                      onClick={() => setShowNewCourseForm(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                    >
                      <Plus className="h-4 w-4" />
                      Create your first course
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
              <CourseSidebar
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelect={setSelectedCourseId}
                isEducator={isEducator}
                showNewCourseForm={showNewCourseForm}
                onOpenNewCourse={() => setShowNewCourseForm((previous) => !previous)}
                onCancelNewCourse={() => setShowNewCourseForm(false)}
                onCreateCourse={handleCreateCourse}
                newCourseForm={newCourseForm}
                onCourseFieldChange={(field, value) =>
                  setNewCourseForm((previous) => ({
                    ...previous,
                    [field]: value,
                  }))
                }
                creatingCourse={creatingCourse}
              />

              <section className="min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                {/* Mobile course selector */}
                {selectedCourse && (
                  <div className="lg:hidden mb-4 px-6 pt-6">
                    <select
                      value={selectedCourse.id}
                      onChange={(e) => {
                        const course = courses.find(c => c.id === e.target.value)
                        if (course) setSelectedCourseId(course.id)
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.courseCode} — {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedCourse ? (
                  <>
                    <div className="border-b border-gray-200 px-6 py-6">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-semibold text-[#0033A0]">
                              {selectedCourse.courseCode}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                selectedCourse.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {selectedCourse.isPublic ? 'Public' : 'Private'}
                            </span>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              Instructor: {selectedCourse.instructor.name}
                            </span>
                          </div>
                          <h2 className="text-2xl font-semibold text-gray-900">{selectedCourse.title}</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
                            {selectedCourse.description || 'No course description yet. Add one in Settings to help students and collaborators orient quickly.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isEducator && (
                            <>
                              <CourseMagicButton
                                courseId={selectedCourse.id}
                                disabled={materials.length === 0}
                                disabledReason="Upload course materials first"
                              />
                              <Link
                                href={`/builder?course=${encodeURIComponent(selectedCourse.courseCode)}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                              >
                                <Sparkles className="h-4 w-4" />
                                Build with AI
                              </Link>
                              <Link
                                href={`/publish?course=${encodeURIComponent(selectedCourse.courseCode)}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                              >
                                Use form
                              </Link>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-6 overflow-x-auto">
                        {visibleTabs.map((tab) => {
                          const Icon = tab.icon

                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveTab(tab.id)}
                              className={`inline-flex items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
                                activeTab === tab.id
                                  ? 'border-[#0033A0] font-semibold text-[#0033A0]'
                                  : 'border-transparent text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {tab.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {detailsError && (
                      <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                        {detailsError}
                      </div>
                    )}

                    <div className="px-6 py-6">
                      {isStudent && (
                        <div className="mb-6">
                          <StudyGuideCard courseId={selectedCourse.id} title={`${selectedCourse.courseCode} Study Guide`} />
                        </div>
                      )}

                      {detailLoading ? (
                        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Refreshing course data...
                        </div>
                      ) : activeTab === 'materials' ? (
                        sortedModuleKeys.length === 0 ? (
                          <EmptyState
                            icon={FileText}
                            title="No materials yet"
                            description={
                              canManageSelectedCourse
                                ? 'Upload readings, lecture notes, rubrics, or cases so students and Sandy have something to work with.'
                                : 'This course does not have any visible materials yet.'
                            }
                            actions={
                              canManageSelectedCourse ? (
                                <div className="space-y-3">
                                  <button
                                    type="button"
                                    onClick={() => openMaterialForm('General')}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add first material
                                  </button>
                                  <PrivacyFooter />
                                </div>
                              ) : null
                            }
                          />
                        ) : (
                          <div className="space-y-5">
                            {sortedModuleKeys.map((moduleKey) => {
                              const moduleMaterials = groupedMaterials[moduleKey] ?? []

                              return (
                                <div key={moduleKey} className="overflow-hidden rounded-3xl border border-gray-200">
                                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{moduleKey}</h3>
                                        <p className="text-sm text-gray-500">
                                          {moduleMaterials.length} material{moduleMaterials.length === 1 ? '' : 's'}
                                        </p>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                        {isEducator && (
                                          <button
                                            type="button"
                                            onClick={() => handleSuggestTools(moduleKey)}
                                            disabled={suggestionsByModule[moduleKey] === null || moduleMaterials.length === 0}
                                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-100 disabled:opacity-60"
                                          >
                                            {suggestionsByModule[moduleKey] === null ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Sparkles className="h-4 w-4" />
                                            )}
                                            Suggest tools
                                          </button>
                                        )}

                                        {canManageSelectedCourse && (
                                          <button
                                            type="button"
                                            onClick={() => openMaterialForm(moduleKey)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                                          >
                                            <Plus className="h-4 w-4" />
                                            Add to {moduleKey}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="divide-y divide-gray-100">
                                    {moduleMaterials.map((material) => {
                                      const isExpanded = !!expandedMaterials[material.id]

                                      return (
                                        <div
                                          key={material.id}
                                          className={`bg-white ${!material.isVisible ? 'opacity-60' : ''}`}
                                        >
                                          <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedMaterials((previous) => ({
                                                  ...previous,
                                                  [material.id]: !previous[material.id],
                                                }))
                                              }
                                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                                            >
                                              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                                                <FileText className="h-4 w-4" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                                  <span className="text-sm font-semibold text-gray-900">{material.title}</span>
                                                  <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                      TYPE_COLORS[material.materialType] || 'bg-gray-100 text-gray-600'
                                                    }`}
                                                  >
                                                    {material.materialType}
                                                  </span>
                                                  {!material.isVisible && (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                      Hidden from students
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-sm leading-relaxed text-gray-500">
                                                  {materialPreview(material.content)}
                                                </p>
                                              </div>
                                              {isExpanded ? (
                                                <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                                              ) : (
                                                <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                                              )}
                                            </button>

                                            <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                                              {canManageSelectedCourse && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleVisibility(material)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                                                    title={material.isVisible ? 'Hide from students' : 'Show to students'}
                                                  >
                                                    {material.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                    {material.isVisible ? 'Hide' : 'Show'}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteMaterial(material.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          {isExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                                              <div className="prose prose-sm max-w-none text-gray-700">
                                                <ReactMarkdown>{material.content}</ReactMarkdown>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>

                                  {canManageSelectedCourse && moduleFormTarget === moduleKey && (
                                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                                      <form onSubmit={handleSaveMaterial} className="space-y-4">
                                        <div className="grid gap-4 lg:grid-cols-[1.2fr_180px_140px]">
                                          <div>
                                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                              Title
                                            </label>
                                            <input
                                              value={materialForm.title}
                                              onChange={(event) =>
                                                setMaterialForm((previous) => ({ ...previous, title: event.target.value }))
                                              }
                                              placeholder="Week 3 lecture notes"
                                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                                            />
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                              Material Type
                                            </label>
                                            <select
                                              value={materialForm.materialType}
                                              onChange={(event) =>
                                                setMaterialForm((previous) => ({ ...previous, materialType: event.target.value }))
                                              }
                                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                                            >
                                              {MATERIAL_TYPES.map((type) => (
                                                <option key={type} value={type}>
                                                  {type}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                              Module
                                            </label>
                                            <input
                                              type="number"
                                              min="1"
                                              max="99"
                                              value={materialForm.moduleNumber}
                                              onChange={(event) =>
                                                setMaterialForm((previous) => ({ ...previous, moduleNumber: event.target.value }))
                                              }
                                              placeholder="Optional"
                                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                                            />
                                          </div>
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                            Content
                                          </label>
                                          <textarea
                                            value={materialForm.content}
                                            onChange={(event) =>
                                              setMaterialForm((previous) => ({ ...previous, content: event.target.value }))
                                            }
                                            rows={8}
                                            placeholder="Paste markdown, lecture notes, rubric details, or reading summaries here."
                                            className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                                          />
                                        </div>

                                        <PrivacyFooter />

                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                                            <input
                                              type="checkbox"
                                              checked={materialForm.isVisible}
                                              onChange={(event) =>
                                                setMaterialForm((previous) => ({ ...previous, isVisible: event.target.checked }))
                                              }
                                              className="h-4 w-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                                            />
                                            Visible to students
                                          </label>

                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setModuleFormTarget(null)}
                                              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="submit"
                                              disabled={savingMaterial}
                                              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                                            >
                                              {savingMaterial && <Loader2 className="h-4 w-4 animate-spin" />}
                                              Save material
                                            </button>
                                          </div>
                                        </div>
                                      </form>
                                    </div>
                                  )}

                                  {renderSuggestionPanel(moduleKey)}
                                </div>
                              )
                            })}
                          </div>
                        )
                      ) : activeTab === 'tools' ? (
                        <div>
                          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Tools for {selectedCourse.courseCode}</h3>
                              <p className="text-sm text-gray-500">
                                Launch published tools connected to this course, or curate the list from the catalog.
                              </p>
                            </div>

                            {canManageSelectedCourse && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkModalOpen(true)
                                  void fetchCatalogTools()
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                              >
                                <Plus className="h-4 w-4" />
                                Link a Tool
                              </button>
                            )}
                          </div>

                          {linkedTools.length === 0 ? (
                            <EmptyState
                              icon={Compass}
                              title={isEducator ? `No tools linked to ${selectedCourse.courseCode} yet` : 'No tools linked to this course yet'}
                              description={
                                isEducator
                                  ? 'Build a new course-aligned tool or link one from the published catalog.'
                                  : 'Ask your instructor to add AI tools for practice and review.'
                              }
                              actions={
                                isEducator ? (
                                  <div className="flex flex-wrap items-center justify-center gap-3">
                                    <Link
                                      href={`/builder?course=${encodeURIComponent(selectedCourse.courseCode)}`}
                                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                                    >
                                      <Sparkles className="h-4 w-4" />
                                      Build with AI
                                    </Link>
                                    <Link
                                      href={`/publish?course=${encodeURIComponent(selectedCourse.courseCode)}`}
                                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                                    >
                                      Use form
                                    </Link>
                                  </div>
                                ) : null
                              }
                            />
                          ) : (
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                              {linkedTools.map((tool) => (
                                <div key={tool.id} className="rounded-3xl border border-gray-200 p-5">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <h4 className="text-base font-semibold text-gray-900">{tool.name}</h4>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                          {tool.category}
                                        </span>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            TOOL_TYPE_COLORS[tool.toolType] || 'bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          {formatToolType(tool.toolType)}
                                        </span>
                                        {tool.weekLabel && (
                                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                                            {tool.weekLabel}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm leading-relaxed text-gray-500">{tool.shortDescription}</p>
                                      {tool.syllabusContext && (
                                        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
                                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                                            Syllabus context
                                          </div>
                                          <p className="mt-1 text-xs leading-relaxed text-blue-800">
                                            {tool.syllabusContext}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    <div className="rounded-2xl bg-gray-50 px-3 py-2 text-right">
                                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                        Sessions
                                      </div>
                                      <div className="text-lg font-semibold text-gray-900">{tool._count.sessions}</div>
                                      {tool.estimatedMinutes && (
                                        <div className="mt-1 text-xs font-medium text-gray-500">{tool.estimatedMinutes} min</div>
                                      )}
                                      {tool.topScore !== null && tool.topScore !== undefined && (
                                        <div className="mt-1 text-xs font-semibold text-[#0033A0]">
                                          Top score: {Math.round(tool.topScore)}%
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Link
                                      href={`/tools/${tool.id}?courseId=${encodeURIComponent(selectedCourse.id)}&launch=true`}
                                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                                    >
                                      Launch
                                    </Link>

                                    {canManageSelectedCourse && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleEditToolContext(tool)}
                                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          Edit Context
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUnlinkTool(tool.id)}
                                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                                        >
                                          Unlink
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {editingContextToolId === tool.id && (
                                    <div className="mt-4 space-y-3 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                                      <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                                          Week label
                                        </label>
                                        <input
                                          value={contextForm.weekLabel}
                                          onChange={(event) =>
                                            setContextForm((previous) => ({
                                              ...previous,
                                              weekLabel: event.target.value,
                                            }))
                                          }
                                          placeholder="Week 5: Cardiovascular Cases"
                                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                                          Syllabus context for students
                                        </label>
                                        <textarea
                                          value={contextForm.syllabusContext}
                                          onChange={(event) =>
                                            setContextForm((previous) => ({
                                              ...previous,
                                              syllabusContext: event.target.value,
                                            }))
                                          }
                                          rows={4}
                                          placeholder="Focus on this week's lecture themes, the casebook pages students should rely on, and how the AI should frame its questioning."
                                          className="w-full resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                                        />
                                      </div>
                                      <div className="flex flex-wrap items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingContextToolId(null)
                                            setContextForm({ weekLabel: '', syllabusContext: '' })
                                          }}
                                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-white"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleSaveToolContext(tool.id)}
                                          disabled={savingContextToolId === tool.id}
                                          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                                        >
                                          {savingContextToolId === tool.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                          Save context
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : activeTab === 'discussion' ? (
                        <div className="space-y-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Discussion for {selectedCourse.courseCode}</h3>
                              <p className="text-sm text-gray-500">
                                Ask questions, share insights, and keep course conversations in one place.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowNewThreadForm((previous) => !previous)}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                            >
                              <Plus className="h-4 w-4" />
                              New Thread
                            </button>
                          </div>

                          {discussionError && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {discussionError}
                            </div>
                          )}

                          {showNewThreadForm && (
                            <form onSubmit={handleCreateThread} className="rounded-3xl border border-gray-200 bg-gray-50 p-5 space-y-4">
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                  Thread Title
                                </label>
                                <input
                                  value={newThreadForm.title}
                                  onChange={(event) =>
                                    setNewThreadForm((previous) => ({ ...previous, title: event.target.value }))
                                  }
                                  placeholder="What should we discuss?"
                                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                  Content
                                </label>
                                <textarea
                                  value={newThreadForm.content}
                                  onChange={(event) =>
                                    setNewThreadForm((previous) => ({ ...previous, content: event.target.value }))
                                  }
                                  rows={5}
                                  placeholder="Share a question, prompt, or observation for the course."
                                  className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                                />
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowNewThreadForm(false)
                                    setNewThreadForm({ title: '', content: '' })
                                  }}
                                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={creatingThread}
                                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                                >
                                  {creatingThread && <Loader2 className="h-4 w-4 animate-spin" />}
                                  Post Thread
                                </button>
                              </div>
                            </form>
                          )}

                          {discussionLoading ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading discussions...
                            </div>
                          ) : selectedThread ? (
                            <div className="space-y-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThread(null)
                                  setSelectedThreadId(null)
                                  setReplyTarget(null)
                                }}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#002580]"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                Back to thread list
                              </button>

                              <div className={`rounded-3xl border p-5 ${
                                selectedThread.isPinned
                                  ? 'border-blue-200 bg-blue-50'
                                  : 'border-gray-200 bg-white'
                              }`}>
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <h4 className="text-xl font-semibold text-gray-900">{selectedThread.title}</h4>
                                      {selectedThread.isPinned && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                                          <Pin className="h-3 w-3" />
                                          Pinned
                                        </span>
                                      )}
                                      {selectedThread.isLocked && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                                          <Lock className="h-3 w-3" />
                                          Locked
                                        </span>
                                      )}
                                    </div>
                                    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                      <span className="font-medium text-gray-700">{selectedThread.author.name}</span>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[selectedThread.author.role] || 'bg-gray-100 text-gray-600'}`}>
                                        {selectedThread.author.role}
                                      </span>
                                      <span>{formatDistanceToNow(new Date(selectedThread.updatedAt), { addSuffix: true })}</span>
                                    </div>
                                  </div>

                                  {canManageSelectedCourse && (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => void handleToggleThreadState(selectedThread.id, { isPinned: !selectedThread.isPinned })}
                                        disabled={moderatingThreadId === selectedThread.id}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        <Pin className="h-3.5 w-3.5" />
                                        {selectedThread.isPinned ? 'Unpin' : 'Pin'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleToggleThreadState(selectedThread.id, { isLocked: !selectedThread.isLocked })}
                                        disabled={moderatingThreadId === selectedThread.id}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        <Lock className="h-3.5 w-3.5" />
                                        {selectedThread.isLocked ? 'Unlock' : 'Lock'}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-relaxed text-gray-700 shadow-sm">
                                  {selectedThread.content}
                                </div>

                                <div className="mt-4">
                                  <button
                                    type="button"
                                    disabled={selectedThread.isLocked && !canManageSelectedCourse}
                                    onClick={() => setReplyTarget((previous) => previous === 'thread' ? null : 'thread')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Reply className="h-3.5 w-3.5" />
                                    Reply
                                  </button>

                                  {replyTarget === 'thread' && (
                                    <div className="mt-3 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                      <textarea
                                        value={replyDrafts.thread ?? ''}
                                        onChange={(event) =>
                                          setReplyDrafts((previous) => ({ ...previous, thread: event.target.value }))
                                        }
                                        rows={3}
                                        placeholder="Add a reply to this thread..."
                                        className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                                      />
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setReplyTarget(null)}
                                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          disabled={postingReplyTarget === 'thread' || !replyDrafts.thread?.trim()}
                                          onClick={() => void handleReplySubmit()}
                                          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                                        >
                                          {postingReplyTarget === 'thread' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                          Post reply
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                {selectedThread.posts.length === 0 ? (
                                  <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
                                    <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                                    <p className="text-sm font-semibold text-gray-600">No replies yet.</p>
                                    <p className="mt-1 text-sm text-gray-400">Start the conversation by adding the first reply.</p>
                                  </div>
                                ) : (
                                  selectedThread.posts.map((post) => (
                                    <div key={post.id} className="rounded-3xl border border-gray-200 bg-white p-5">
                                      <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0033A0] text-sm font-semibold text-white">
                                          {post.author.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900">{post.author.name}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[post.author.role] || 'bg-gray-100 text-gray-600'}`}>
                                              {post.author.role}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                            </span>
                                          </div>
                                          <div className="text-sm leading-relaxed text-gray-700">{post.content}</div>

                                          <div className="mt-3">
                                            <button
                                              type="button"
                                              disabled={selectedThread.isLocked && !canManageSelectedCourse}
                                              onClick={() => setReplyTarget((previous) => previous === post.id ? null : post.id)}
                                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-[#0033A0] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              <Reply className="h-3.5 w-3.5" />
                                              Reply
                                            </button>
                                          </div>

                                          {replyTarget === post.id && (
                                            <div className="mt-3 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                              <textarea
                                                value={replyDrafts[post.id] ?? ''}
                                                onChange={(event) =>
                                                  setReplyDrafts((previous) => ({ ...previous, [post.id]: event.target.value }))
                                                }
                                                rows={3}
                                                placeholder={`Reply to ${post.author.name}...`}
                                                className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                                              />
                                              <div className="flex items-center justify-end gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => setReplyTarget(null)}
                                                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={postingReplyTarget === post.id || !replyDrafts[post.id]?.trim()}
                                                  onClick={() => void handleReplySubmit(post.id)}
                                                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                                                >
                                                  {postingReplyTarget === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                  Post reply
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {post.replies.length > 0 && (
                                            <div className="mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
                                              {post.replies.map((reply) => (
                                                <div key={reply.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                                                  <div className="mb-1 flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-900">{reply.author.name}</span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[reply.author.role] || 'bg-gray-100 text-gray-600'}`}>
                                                      {reply.author.role}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm leading-relaxed text-gray-700">{reply.content}</div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : discussionThreads.length === 0 ? (
                            <EmptyState
                              icon={MessageSquare}
                              title="No discussions yet"
                              description="Be the first to start a thread."
                            />
                          ) : (
                            <div className="space-y-4">
                              {discussionThreads.map((thread) => (
                                <div
                                  key={thread.id}
                                  className={`rounded-3xl border p-5 transition-colors ${
                                    thread.isPinned
                                      ? 'border-blue-200 bg-blue-50'
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <button
                                      type="button"
                                      onClick={() => void fetchDiscussionThreadDetail(thread.id)}
                                      className="min-w-0 flex-1 text-left"
                                    >
                                      <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <h4 className="text-base font-semibold text-gray-900">{thread.title}</h4>
                                        {thread.isPinned && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                                            <Pin className="h-3 w-3" />
                                            Pinned
                                          </span>
                                        )}
                                        {thread.isLocked && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                                            <Lock className="h-3 w-3" />
                                            Locked
                                          </span>
                                        )}
                                      </div>
                                      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                        <span className="font-medium text-gray-700">{thread.author.name}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[thread.author.role] || 'bg-gray-100 text-gray-600'}`}>
                                          {thread.author.role}
                                        </span>
                                        <span>{formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}</span>
                                        <span>{thread._count.posts} post{thread._count.posts === 1 ? '' : 's'}</span>
                                      </div>
                                      <p className="text-sm leading-relaxed text-gray-600">{thread.content}</p>
                                    </button>

                                    {canManageSelectedCourse && (
                                      <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => void handleToggleThreadState(thread.id, { isPinned: !thread.isPinned })}
                                          disabled={moderatingThreadId === thread.id}
                                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                        >
                                          <Pin className="h-3.5 w-3.5" />
                                          {thread.isPinned ? 'Unpin' : 'Pin'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleToggleThreadState(thread.id, { isLocked: !thread.isLocked })}
                                          disabled={moderatingThreadId === thread.id}
                                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                        >
                                          <Lock className="h-3.5 w-3.5" />
                                          {thread.isLocked ? 'Unlock' : 'Lock'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : activeTab === 'submissions' ? (
                        submissionSnapshot ? (
                          <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              {submissionSnapshot.summary.map((metric) => (
                                <div
                                  key={metric.label}
                                  className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                                >
                                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                    {metric.label}
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-2xl font-semibold text-gray-900">{metric.value}</div>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        SUBMISSION_METRIC_COLORS[metric.tone]
                                      }`}
                                    >
                                      {metric.tone === 'good'
                                        ? 'Healthy'
                                        : metric.tone === 'warn'
                                          ? 'Watch'
                                          : 'Info'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="rounded-3xl border border-gray-200 bg-white p-5">
                              <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <FileText className="h-5 w-5 text-[#0033A0]" />
                                Assignment Snapshot
                              </div>
                              <div className="space-y-3">
                                {submissionSnapshot.assignments.map((assignment) => (
                                  <div
                                    key={assignment.assignment}
                                    className="grid gap-3 rounded-2xl border border-gray-200 px-4 py-4 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))] md:items-center"
                                  >
                                    <div>
                                      <div className="font-semibold text-gray-900">{assignment.assignment}</div>
                                      <div className="text-sm text-gray-500">
                                        Synthetic submission summary for the current module sequence
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                                        Submitted
                                      </div>
                                      <div className="mt-1 text-sm font-medium text-gray-700">{assignment.submitted}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                                        Average
                                      </div>
                                      <div className="mt-1 text-sm font-medium text-gray-700">{assignment.average}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                                        Follow-up
                                      </div>
                                      <div className="mt-1 text-sm font-medium text-gray-700">{assignment.flagged}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-3xl border border-gray-200 bg-white p-5">
                              <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <CheckCircle className="h-5 w-5 text-[#0033A0]" />
                                Recent Submission Signals
                              </div>
                              <div className="space-y-4">
                                {submissionSnapshot.recentSubmissions.map((submission) => (
                                  <div
                                    key={`${submission.studentName}-${submission.assignment}`}
                                    className="rounded-2xl border border-gray-200 px-4 py-4"
                                  >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="font-semibold text-gray-900">{submission.studentName}</div>
                                          <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                              SUBMISSION_STATUS_COLORS[submission.status]
                                            }`}
                                          >
                                            {submission.status}
                                          </span>
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600">{submission.assignment}</div>
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {submission.submittedAt
                                          ? `Submitted ${formatDistanceToNow(new Date(submission.submittedAt), {
                                              addSuffix: true,
                                            })}`
                                          : 'Not submitted'}
                                      </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                                      <div className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                                        {submission.score}
                                      </div>
                                      <div className="text-gray-600">{submission.feedback}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
                              Submission and grading signals are synthetic demo data for the MVP. They are meant to show how an educator-facing review workflow could feel before a full submissions backend ships.
                            </div>
                          </div>
                        ) : (
                          <EmptyState
                            icon={FileText}
                            title="No submission snapshot yet"
                            description="This course does not have demo grading data yet. Seed a course snapshot to preview educator review workflows."
                          />
                        )
                      ) : activeTab === 'pulse' ? (
                        <div className="space-y-6">
                          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                              <BarChart3 className="h-5 w-5 text-[#0033A0]" />
                              Module Engagement
                            </div>
                            <div className="space-y-4">
                              {pulseSnapshot.modules.map((module) => (
                                <div key={module.label}>
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                      <span>{module.label}</span>
                                      {module.warn && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {module.pct}% ({module.students} students)
                                    </div>
                                  </div>
                                  <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                                    <div
                                      className={`h-full rounded-full ${
                                        module.warn ? 'bg-amber-500' : 'bg-[#0033A0]'
                                      }`}
                                      style={{ width: `${module.pct}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-gray-200 bg-white p-5">
                            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                              <BookOpen className="h-5 w-5 text-[#0033A0]" />
                              Common Questions This Week
                            </div>
                            <div className="space-y-3">
                              {pulseSnapshot.commonQuestions.map((question) => (
                                <div
                                  key={question.question}
                                  className="flex items-start justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3"
                                >
                                  <div className="text-sm text-gray-700">{question.question}</div>
                                  <div className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                                    {question.count} students
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {pulseSnapshot.modules.some((module) => module.warn) && (
                            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                              <div className="mb-2 flex items-center gap-2 font-semibold">
                                <AlertTriangle className="h-4 w-4" />
                                Attention recommended
                              </div>
                              Modules with lower engagement may need clearer materials, more guided practice, or a new course tool to reactivate momentum.
                            </div>
                          )}

                          <div className="text-xs text-gray-400">
                            Engagement data is simulated for demo purposes. Live analytics require real session tracking.
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSaveSettings} className="max-w-3xl space-y-5">
                          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                            <div className="grid gap-5">
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                  Course Code
                                </label>
                                <input
                                  value={selectedCourse.courseCode}
                                  readOnly
                                  className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                  Title
                                </label>
                                <input
                                  value={settingsForm.title}
                                  onChange={(event) =>
                                    setSettingsForm((previous) => ({ ...previous, title: event.target.value }))
                                  }
                                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                  Description
                                </label>
                                <textarea
                                  value={settingsForm.description}
                                  onChange={(event) =>
                                    setSettingsForm((previous) => ({ ...previous, description: event.target.value }))
                                  }
                                  rows={5}
                                  className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
                                />
                              </div>

                              <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                  Visibility
                                </div>
                                <div className="space-y-3">
                                  <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                                    <input
                                      type="radio"
                                      name="visibility"
                                      checked={settingsForm.isPublic}
                                      onChange={() => setSettingsForm((previous) => ({ ...previous, isPublic: true }))}
                                      className="mt-1 h-4 w-4 border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                                    />
                                    <div>
                                      <div className="text-sm font-semibold text-gray-800">Public</div>
                                      <div className="text-sm text-gray-500">Visible to students across the platform.</div>
                                    </div>
                                  </label>
                                  <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                                    <input
                                      type="radio"
                                      name="visibility"
                                      checked={!settingsForm.isPublic}
                                      onChange={() => setSettingsForm((previous) => ({ ...previous, isPublic: false }))}
                                      className="mt-1 h-4 w-4 border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                                    />
                                    <div>
                                      <div className="text-sm font-semibold text-gray-800">Private</div>
                                      <div className="text-sm text-gray-500">Only the course owner and admins can access it.</div>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {settingsNotice ? (
                              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                                <CheckCircle className="h-4 w-4" />
                                {settingsNotice}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">Changes update this course immediately.</div>
                            )}

                            <button
                              type="submit"
                              disabled={savingSettings}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                            >
                              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                              Save changes
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    title="Select a course"
                    description="Choose a course from the sidebar to view materials, tools, pulse, and settings."
                  />
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <LinkToolModal
        open={linkModalOpen}
        tools={catalogTools}
        linkedToolIds={linkedToolIds}
        search={toolSearch}
        onSearchChange={setToolSearch}
        onClose={() => setLinkModalOpen(false)}
        onLink={(toolId) => void handleLinkTool(toolId)}
        loading={catalogLoading}
        linkingToolId={linkingToolId}
      />
    </>
  )
}
