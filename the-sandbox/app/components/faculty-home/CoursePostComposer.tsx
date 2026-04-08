'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Send,
  Calendar,
  Mail,
  Monitor,
  Users,
  AlertTriangle,
  UserCheck,
  Bot,
  Megaphone,
  MessageCircle,
  Clock,
  BookOpen,
  Search,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

type PostType = 'ANNOUNCEMENT' | 'NUDGE' | 'REMINDER' | 'RESOURCE'
type Audience = 'ALL' | 'AT_RISK' | 'SPECIFIC'

interface CourseOption {
  id: string
  courseCode: string
  title: string
}

interface StudentOption {
  id: string
  name: string
  email: string
}

interface CoursePostComposerProps {
  open: boolean
  onClose: () => void
  courses: CourseOption[]
  prefill?: {
    courseId?: string
    type?: PostType
    audience?: Audience
    targetStudentIds?: string[]
    targetStudentNames?: string[]
    body?: string
    title?: string
    lockCourse?: boolean
  }
}

const TYPE_CONFIG: Record<PostType, { label: string; icon: typeof Megaphone; color: string }> = {
  ANNOUNCEMENT: { label: 'Announcement', icon: Megaphone, color: 'text-blue-600' },
  NUDGE: { label: 'Nudge', icon: MessageCircle, color: 'text-amber-600' },
  REMINDER: { label: 'Reminder', icon: Clock, color: 'text-purple-600' },
  RESOURCE: { label: 'Resource', icon: BookOpen, color: 'text-emerald-600' },
}

export default function CoursePostComposer({ open, onClose, courses, prefill }: CoursePostComposerProps) {
  const { currentUser } = useAuth()

  const [courseId, setCourseId] = useState(prefill?.courseId || courses[0]?.id || '')
  const [type, setType] = useState<PostType>(prefill?.type || 'ANNOUNCEMENT')
  const [title, setTitle] = useState(prefill?.title || '')
  const [body, setBody] = useState(prefill?.body || '')
  const [audience, setAudience] = useState<Audience>(prefill?.audience || 'ALL')
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>(prefill?.targetStudentIds || [])
  const [channelPlatform, setChannelPlatform] = useState(true)
  const [channelEmail, setChannelEmail] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledFor, setScheduledFor] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Student picker data
  const [students, setStudents] = useState<StudentOption[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<StudentOption[]>([])
  const [atRiskCount, setAtRiskCount] = useState(0)
  const [studentSearch, setStudentSearch] = useState('')

  // Reset on open/prefill change
  useEffect(() => {
    if (open) {
      setCourseId(prefill?.courseId || courses[0]?.id || '')
      setType(prefill?.type || 'ANNOUNCEMENT')
      setTitle(prefill?.title || '')
      setBody(prefill?.body || '')
      setAudience(prefill?.audience || 'ALL')
      setTargetStudentIds(prefill?.targetStudentIds || [])
      setChannelPlatform(true)
      setChannelEmail(false)
      setScheduleMode('now')
      setScheduledFor('')
      setSending(false)
      setSent(false)
    }
  }, [open, prefill, courses])

  // Fetch students when course changes
  useEffect(() => {
    if (!courseId || !open) return
    const headers = { 'x-demo-user-email': currentUser?.email || '' }

    fetch(`/api/courses/${courseId}/posts?include=at-risk&limit=0`, { headers })
      .then(r => r.ok ? r.json() : { atRiskStudents: [] })
      .then(data => {
        const ar = data.atRiskStudents || []
        setAtRiskStudents(ar)
        setAtRiskCount(ar.length)
      })
      .catch(() => {})

    fetch(`/api/courses/${courseId}/posts?include=students&limit=0`, { headers })
      .then(r => r.ok ? r.json() : { students: [] })
      .then(data => setStudents(data.students || []))
      .catch(() => {})
  }, [courseId, open, currentUser?.email])

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || !courseId) return
    setSending(true)

    try {
      const res = await fetch(`/api/courses/${courseId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser?.email || '',
        },
        body: JSON.stringify({
          title: title.trim() || undefined,
          body: body.trim(),
          type,
          audience,
          targetStudentIds: audience === 'SPECIFIC' ? targetStudentIds : undefined,
          channelPlatform,
          channelEmail,
          scheduledFor: scheduleMode === 'later' && scheduledFor ? scheduledFor : undefined,
        }),
      })

      if (res.ok) {
        setSent(true)
        setTimeout(() => onClose(), 1200)
      }
    } catch {
      // Error handled by api-utils
    } finally {
      setSending(false)
    }
  }, [body, courseId, title, type, audience, targetStudentIds, channelPlatform, channelEmail, scheduleMode, scheduledFor, currentUser?.email, onClose])

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const toggleStudent = (id: string) => {
    setTargetStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  if (!open) return null

  const selectedCourse = courses.find(c => c.id === courseId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-extrabold text-gray-900">New Course Post</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100">
              <Send className="size-5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">
              {scheduleMode === 'later' ? 'Post scheduled!' : 'Post sent!'}
            </p>
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
            {/* Course selector */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</label>
              {prefill?.lockCourse ? (
                <p className="text-sm font-semibold text-gray-900">{selectedCourse?.courseCode} — {selectedCourse?.title}</p>
              ) : (
                <select
                  value={courseId}
                  onChange={e => setCourseId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Type selector */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</label>
              <div className="flex gap-2">
                {(Object.entries(TYPE_CONFIG) as [PostType, typeof TYPE_CONFIG[PostType]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  const active = type === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setType(key)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#0033A0] bg-[#0033A0]/5 text-[#0033A0]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Auto-generated if left blank"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={4}
                placeholder="Write your message..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
              />
            </div>

            {/* Audience */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Audience</label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50">
                  <input type="radio" name="audience" checked={audience === 'ALL'} onChange={() => setAudience('ALL')} className="accent-[#0033A0]" />
                  <Users className="size-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">All students</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50">
                  <input type="radio" name="audience" checked={audience === 'AT_RISK'} onChange={() => setAudience('AT_RISK')} className="accent-[#0033A0]" />
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700">At-risk students</span>
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{atRiskCount}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50">
                  <input type="radio" name="audience" checked={audience === 'SPECIFIC'} onChange={() => setAudience('SPECIFIC')} className="accent-[#0033A0]" />
                  <UserCheck className="size-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Specific students</span>
                  {targetStudentIds.length > 0 && (
                    <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{targetStudentIds.length}</span>
                  )}
                </label>
              </div>

              {/* Student picker (only when SPECIFIC) */}
              {audience === 'SPECIFIC' && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 size-4 text-gray-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Search students..."
                      className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-[#0033A0] focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {filteredStudents.map(s => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-white">
                        <input
                          type="checkbox"
                          checked={targetStudentIds.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="accent-[#0033A0]"
                        />
                        <span className="text-sm text-gray-700">{s.name}</span>
                        <span className="text-xs text-gray-400">{s.email}</span>
                      </label>
                    ))}
                    {filteredStudents.length === 0 && (
                      <p className="px-2 py-1 text-xs text-gray-400">No students found</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Channels */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</label>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50">
                  <input type="checkbox" checked={channelPlatform} onChange={e => setChannelPlatform(e.target.checked)} className="accent-[#0033A0]" />
                  <Monitor className="size-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Platform</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50">
                  <input type="checkbox" checked={channelEmail} onChange={e => setChannelEmail(e.target.checked)} className="accent-[#0033A0]" />
                  <Mail className="size-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Email</span>
                </label>
              </div>
            </div>

            {/* Timing */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wider">Timing</label>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="timing" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="accent-[#0033A0]" />
                  <span className="text-sm font-medium text-gray-700">Send now</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="timing" checked={scheduleMode === 'later'} onChange={() => setScheduleMode('later')} className="accent-[#0033A0]" />
                  <Calendar className="size-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Schedule</span>
                </label>
              </div>
              {scheduleMode === 'later' && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none"
                />
              )}
            </div>

            {/* Sandy badge */}
            {prefill?.body && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Bot className="size-3.5" />
                Sandy drafted this message — review and edit as needed
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!sent && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!body.trim() || sending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00277A] disabled:opacity-50"
            >
              <Send className="size-4" />
              {sending ? 'Sending...' : scheduleMode === 'later' ? 'Schedule' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
