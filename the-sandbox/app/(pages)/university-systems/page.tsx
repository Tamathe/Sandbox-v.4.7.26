'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import PageHeader from '../../components/PageHeader'
import {
  Building2, MapPin, DollarSign, Globe, FileText,
  Users, GraduationCap, Search, Send,
  Plus, AlertTriangle, Loader2, Plane, BookOpen,
  Check, X, Clock, Heart, ArrowRight, LifeBuoy,
  Accessibility, Stethoscope, Home, Activity, Briefcase,
  Utensils, Car, Award, Star, Shield, ClipboardList,
  ArrowLeftRight, ShieldCheck, Scale, DoorOpen, Compass,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { STUDENT_SERVICES_TOOLS } from '../../lib/student-services'
import type { StudentServiceTool } from '../../lib/student-services'
import { CAMPUS_TOOLS } from '../../lib/campus-navigator'

type SectionKey = 'guidance' | 'planning' | 'systems'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabKey = 'attendance' | 'rooms' | 'grades' | 'travel' | 'paper-review' | 'website' | 'enrollment'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'attendance', label: 'Attendance', icon: <Users className="size-4" /> },
  { key: 'rooms', label: 'Rooms', icon: <MapPin className="size-4" /> },
  { key: 'grades', label: 'Grades', icon: <GraduationCap className="size-4" /> },
  { key: 'travel', label: 'Travel', icon: <DollarSign className="size-4" /> },
  { key: 'paper-review', label: 'Reviews', icon: <FileText className="size-4" /> },
  { key: 'website', label: 'Website', icon: <Globe className="size-4" /> },
  { key: 'enrollment', label: 'Enrollment', icon: <BookOpen className="size-4" /> },
]

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function Badge({ label, variant }: { label: string; variant: 'amber' | 'green' | 'red' | 'blue' | 'gray' }) {
  const colors = {
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-600',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[variant]}`}>{label}</span>
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border rounded-2xl bg-white p-6 shadow-sm ${className}`}>{children}</div>
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#0033A0' }}>
      {children}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 py-4 text-center">{message}</p>
}

/** Auto-clearing flash message (disappears after 4s) */
function useFlash() {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flash = useCallback((m: string) => {
    clearTimeout(timer.current)
    setMsg(m)
    timer.current = setTimeout(() => setMsg(null), 4000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [msg, flash] as const
}

function formatAmenity(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

function formatCurrency(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function deadlineUrgency(d: string | null | undefined): 'red' | 'amber' | 'gray' {
  if (!d) return 'gray'
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'red'
  if (days <= 14) return 'amber'
  return 'gray'
}

let _coursesCache: { id: string; courseCode: string; title: string }[] | null = null
let _coursesPromise: Promise<{ id: string; courseCode: string; title: string }[]> | null = null

function useCourses() {
  const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>(_coursesCache ?? [])
  useEffect(() => {
    if (_coursesCache) { setCourses(_coursesCache); return }
    if (!_coursesPromise) {
      _coursesPromise = fetch('/api/courses').then(r => r.json()).then(data => {
        const list = (data.courses ?? data ?? []).slice(0, 10)
        _coursesCache = list
        return list
      }).catch(() => [])
    }
    _coursesPromise.then(setCourses)
  }, [])
  return courses
}

/* ------------------------------------------------------------------ */
/*  Tab: Attendance                                                    */
/* ------------------------------------------------------------------ */

function AttendanceTab() {
  const courses = useCourses()
  const [courseId, setCourseId] = useState('')
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([])
  const [records, setRecords] = useState<Record<string, string>>({})
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [result, flash] = useFlash()
  const [summary, setSummary] = useState<any>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  useEffect(() => { if (courses.length > 0 && !courseId) setCourseId(courses[0].id) }, [courses, courseId])

  useEffect(() => {
    if (!courseId) return
    fetch(`/api/courses/${courseId}/roster`).then(r => r.json()).then(data => {
      const roster = data.students ?? data.roster ?? data ?? []
      setStudents(roster.slice(0, 30))
      setRecords(Object.fromEntries(roster.slice(0, 30).map((s: any) => [s.id, 'PRESENT'])))
    }).catch(() => { setStudents([]); setRecords({}) })
  }, [courseId])

  const loadSummary = useCallback(async () => {
    if (!courseId) return
    setLoadingSummary(true)
    try {
      const res = await fetch(`/api/university-systems/attendance?courseId=${courseId}`)
      setSummary(await res.json())
    } catch { setSummary(null) }
    setLoadingSummary(false)
  }, [courseId])
  useEffect(() => { loadSummary() }, [loadSummary])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/university-systems/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, date, records: students.map(s => ({ studentId: s.id, status: records[s.id] ?? 'PRESENT' })) }),
      })
      flash(res.ok ? `Saved for ${students.length} students.` : 'Error saving attendance.')
      if (res.ok) loadSummary()
    } catch { flash('Network error.') }
    setSubmitting(false)
  }

  const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'P', icon: <Check className="size-3.5" />, color: 'bg-green-600 text-white', inactive: 'bg-green-50 text-green-700 hover:bg-green-100' },
    { value: 'LATE', label: 'L', icon: <Clock className="size-3.5" />, color: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { value: 'ABSENT', label: 'A', icon: <X className="size-3.5" />, color: 'bg-red-600 text-white', inactive: 'bg-red-50 text-red-700 hover:bg-red-100' },
    { value: 'EXCUSED', label: 'E', icon: <AlertTriangle className="size-3.5" />, color: 'bg-gray-600 text-white', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  ]

  // Live counts
  const counts = students.reduce((acc, s) => {
    const st = records[s.id] ?? 'PRESENT'
    acc[st] = (acc[st] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  function setAll(status: string) {
    setRecords(Object.fromEntries(students.map(s => [s.id, status])))
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select value={courseId} onChange={e => setCourseId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm max-w-sm">
            {courses.length === 0 && <option value="">Loading courses...</option>}
            {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          {students.length > 0 && <span className="text-xs text-gray-400">{students.length} students</span>}
        </div>

        {students.length > 0 ? (
          <>
            {/* Bulk actions + live count strip */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div className="flex gap-1.5">
                <button onClick={() => setAll('PRESENT')} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100">All Present</button>
                <button onClick={() => setAll('ABSENT')} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100">All Absent</button>
              </div>
              <div className="flex gap-3 text-xs font-medium">
                <span className="text-green-700">{counts.PRESENT ?? 0} present</span>
                <span className="text-amber-600">{counts.LATE ?? 0} late</span>
                <span className="text-red-600">{counts.ABSENT ?? 0} absent</span>
                <span className="text-gray-500">{counts.EXCUSED ?? 0} excused</span>
              </div>
            </div>

            <div className="divide-y">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-800">{s.name}</span>
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRecords(r => ({ ...r, [s.id]: opt.value }))}
                        className={`size-8 rounded-lg flex items-center justify-center transition-colors ${
                          records[s.id] === opt.value ? opt.color : opt.inactive
                        }`}
                        aria-label={`${s.name}: ${opt.value}`}
                        title={opt.value}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <PrimaryBtn onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin inline mr-1" /> : <Send className="size-4 inline mr-1" />}
                Save Attendance
              </PrimaryBtn>
              {result && <span className="text-sm text-green-700 animate-fade-in">{result}</span>}
            </div>
          </>
        ) : (
          <EmptyState message={courses.length === 0 ? 'Loading courses...' : 'No students enrolled in this course.'} />
        )}
      </Card>

      {summary && !summary.error && (summary.students?.length > 0 || summary.records?.length > 0) && (
        <Card>
          <h3 className="text-sm font-extrabold text-gray-900 mb-3">Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500"><th className="py-2 pr-4">Student</th><th className="py-2 pr-3">Present</th><th className="py-2 pr-3">Absent</th><th className="py-2 pr-3">Late</th><th className="py-2 pr-3">Excused</th><th className="py-2">Risk</th></tr></thead>
              <tbody>
                {(summary.students ?? summary.records ?? []).map((s: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-800">{s.studentName ?? s.name ?? s.studentId}</td>
                    <td className="py-2 pr-3 text-green-700 font-medium">{s.present ?? 0}</td>
                    <td className="py-2 pr-3 text-red-600 font-medium">{s.absent ?? 0}</td>
                    <td className="py-2 pr-3 text-amber-600 font-medium">{s.late ?? 0}</td>
                    <td className="py-2 pr-3 text-gray-500 font-medium">{s.excused ?? 0}</td>
                    <td className="py-2">{s.riskFlag ? <Badge label="At Risk" variant="red" /> : <span className="text-gray-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Room Booking                                                  */
/* ------------------------------------------------------------------ */

function RoomBookingTab() {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), startTime: '09:00', endTime: '10:00', capacity: '', building: '' })
  const [rooms, setRooms] = useState<any[]>([])
  const [searching, setSearching] = useState(true) // start true to suppress empty state
  const [bookResult, flashBook] = useFlash()
  const [bookingId, setBookingId] = useState<string | null>(null)

  const search = useCallback(async () => {
    setSearching(true)
    const params = new URLSearchParams({ date: form.date, startTime: form.startTime, endTime: form.endTime })
    if (form.capacity) params.set('capacity', form.capacity)
    if (form.building) params.set('building', form.building)
    try {
      const res = await fetch(`/api/university-systems/rooms/search?${params}`)
      const data = await res.json()
      setRooms(data.rooms ?? data ?? [])
    } catch { setRooms([]) }
    setSearching(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-search on mount
  useEffect(() => { search() }, [search])

  async function book(roomId: string, roomName: string) {
    setBookingId(roomId)
    try {
      const res = await fetch('/api/university-systems/rooms/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, date: form.date, startTime: form.startTime, endTime: form.endTime, eventTitle: `Booking — ${roomName}` }),
      })
      flashBook(res.ok ? `Booked ${roomName}` : 'Booking failed.')
    } catch { flashBook('Network error.') }
    setBookingId(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={e => { e.preventDefault(); search() }}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Capacity</label>
              <input type="number" placeholder="Any" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Building</label>
              <input type="text" placeholder="Any" value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {form.startTime >= form.endTime && <p className="text-xs text-red-600 mb-2">End time must be after start time.</p>}
          <PrimaryBtn onClick={search} disabled={searching || form.startTime >= form.endTime}>
            {searching ? <Loader2 className="size-4 animate-spin inline mr-1" /> : <Search className="size-4 inline mr-1" />}
            Search
          </PrimaryBtn>
        </form>
      </Card>

      {bookResult && <div className="text-sm text-green-700 font-medium">{bookResult}</div>}

      {rooms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rooms.map((r: any) => (
            <div key={r.id ?? r.roomId} className="border rounded-xl bg-white p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-900">{r.name ?? r.id}</p>
                <p className="text-xs text-gray-500">{r.building ?? 'Campus'} · {r.capacity ?? '—'} seats{r.amenities?.length > 0 ? ` · ${r.amenities.slice(0, 3).map(formatAmenity).join(', ')}` : ''}</p>
              </div>
              <PrimaryBtn onClick={() => book(r.id ?? r.roomId, r.name ?? r.id)} disabled={bookingId === (r.id ?? r.roomId)}>
                {bookingId === (r.id ?? r.roomId) ? '...' : 'Book'}
              </PrimaryBtn>
            </div>
          ))}
        </div>
      )}

      {!searching && rooms.length === 0 && <EmptyState message="No rooms found. Adjust your search." />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Grade Submission                                              */
/* ------------------------------------------------------------------ */

function GradeSubmissionTab() {
  const courses = useCourses()
  const [courseId, setCourseId] = useState('')
  const [grades, setGrades] = useState<{ studentId: string; name: string; grade: string }[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, flash] = useFlash()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { if (courses.length > 0 && !courseId) setCourseId(courses[0].id) }, [courses, courseId])

  useEffect(() => {
    if (!courseId) return
    setLoadingRoster(true)
    fetch(`/api/courses/${courseId}/roster`).then(r => r.json()).then(data => {
      const roster = data.students ?? data.roster ?? data ?? []
      setGrades(roster.slice(0, 30).map((s: any) => ({ studentId: s.id, name: s.name, grade: 'A' })))
    }).catch(() => setGrades([]))
      .finally(() => setLoadingRoster(false))
  }, [courseId])

  const GRADE_OPTIONS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E', 'I', 'W']

  async function submit() {
    setSubmitting(true)
    setConfirming(false)
    try {
      const res = await fetch('/api/university-systems/sis/submit-grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, grades: grades.map(g => ({ studentId: g.studentId, grade: g.grade })) }),
      })
      const data = await res.json()
      flash(res.ok ? `${grades.length} grades submitted to Banner.` : (data.error ?? 'Submission failed.'))
    } catch { flash('Network error.') }
    setSubmitting(false)
  }

  const courseName = courses.find(c => c.id === courseId)?.courseCode ?? 'this course'

  return (
    <Card>
      <select value={courseId} onChange={e => { setCourseId(e.target.value); setConfirming(false) }} className="border rounded-lg px-3 py-2 text-sm mb-4">
        {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>)}
      </select>

      {loadingRoster ? (
        <div className="flex items-center gap-2 py-4 justify-center text-gray-400"><Loader2 className="size-4 animate-spin" /> Loading roster...</div>
      ) : grades.length > 0 ? (
        <>
          <table className="w-full text-sm mb-4">
            <thead><tr className="border-b text-left text-gray-500"><th className="py-2 pr-4">Student</th><th className="py-2">Grade</th></tr></thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={g.studentId} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-gray-800">{g.name}</td>
                  <td className="py-2">
                    <select
                      value={g.grade}
                      onChange={e => { setGrades(gs => gs.map((gg, j) => j === i ? { ...gg, grade: e.target.value } : gg)); setConfirming(false) }}
                      className="border rounded-lg px-2 py-1 text-sm"
                    >
                      {GRADE_OPTIONS.map(go => <option key={go} value={go}>{go}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {confirming ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="size-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">Submit <span className="font-semibold">{grades.length} grades</span> for {courseName} to Banner? This cannot be undone.</p>
              <PrimaryBtn onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin inline mr-1" /> : null}
                Confirm
              </PrimaryBtn>
              <button onClick={() => setConfirming(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <PrimaryBtn onClick={() => setConfirming(true)}>
                <Send className="size-4 inline mr-1" />
                Submit to Banner
              </PrimaryBtn>
              {result && <span className="text-sm text-green-700">{result}</span>}
            </div>
          )}
        </>
      ) : (
        <EmptyState message={courses.length === 0 ? 'Loading courses...' : 'No students found.'} />
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Travel & Grants                                               */
/* ------------------------------------------------------------------ */

type TravelSubTab = 'reimbursements' | 'grants'

function TravelTab() {
  const [subTab, setSubTab] = useState<TravelSubTab>('reimbursements')
  const [reimbForm, setReimbForm] = useState({ destination: '', tripPurpose: 'conference', startDate: '', endDate: '', expenseDesc: '', expenseAmount: '' })
  const [reimbursements, setReimbursements] = useState<any[]>([])
  const [submittingReimb, setSubmittingReimb] = useState(false)
  const [reimbResult, flashReimb] = useFlash()
  const [grants, setGrants] = useState<any[]>([])
  const [loadingGrants, setLoadingGrants] = useState(false)

  // Auto-load reimbursements
  const loadReimbursements = useCallback(async () => {
    try {
      const res = await fetch('/api/university-systems/travel/reimbursements')
      const data = await res.json()
      setReimbursements(data.reimbursements ?? data ?? [])
    } catch { setReimbursements([]) }
  }, [])

  useEffect(() => { loadReimbursements() }, [loadReimbursements])

  // Auto-load grants (once)
  const grantsFetched = useRef(false)
  useEffect(() => {
    if (subTab === 'grants' && !grantsFetched.current) {
      grantsFetched.current = true
      setLoadingGrants(true)
      fetch('/api/university-systems/travel/grants').then(r => r.json()).then(data => {
        setGrants(data.grants ?? data ?? [])
      }).catch(() => {}).finally(() => setLoadingGrants(false))
    }
  }, [subTab])

  async function submitReimbursement() {
    setSubmittingReimb(true)
    const amount = parseFloat(reimbForm.expenseAmount) || 0
    try {
      const res = await fetch('/api/university-systems/travel/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripPurpose: reimbForm.tripPurpose,
          destination: reimbForm.destination,
          startDate: reimbForm.startDate,
          endDate: reimbForm.endDate,
          expenses: [{ category: 'general', description: reimbForm.expenseDesc || reimbForm.tripPurpose, amount }],
        }),
      })
      flashReimb(res.ok ? 'Reimbursement submitted.' : 'Error submitting.')
      if (res.ok) {
        setReimbForm({ destination: '', tripPurpose: 'conference', startDate: '', endDate: '', expenseDesc: '', expenseAmount: '' })
        loadReimbursements()
      }
    } catch { flashReimb('Network error.') }
    setSubmittingReimb(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['reimbursements', 'grants'] as TravelSubTab[]).map(t => (
          <button key={t} onClick={() => setSubTab(t)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${subTab === t ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={subTab === t ? { backgroundColor: '#0033A0' } : undefined}>
            {t === 'reimbursements' ? 'Reimbursements' : 'Grants'}
          </button>
        ))}
      </div>

      {subTab === 'reimbursements' && (
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Destination</label>
                <input type="text" value={reimbForm.destination} onChange={e => setReimbForm(f => ({ ...f, destination: e.target.value }))} placeholder="Nashville, TN" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Purpose</label>
                <select value={reimbForm.tripPurpose} onChange={e => setReimbForm(f => ({ ...f, tripPurpose: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="conference">Conference</option>
                  <option value="research">Research</option>
                  <option value="workshop">Workshop</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start</label>
                <input type="date" value={reimbForm.startDate} onChange={e => setReimbForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End</label>
                <input type="date" value={reimbForm.endDate} onChange={e => setReimbForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Expense Description</label>
                <input type="text" value={reimbForm.expenseDesc} onChange={e => setReimbForm(f => ({ ...f, expenseDesc: e.target.value }))} placeholder="Airfare, hotel, etc." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount ($)</label>
                <input type="number" value={reimbForm.expenseAmount} onChange={e => setReimbForm(f => ({ ...f, expenseAmount: e.target.value }))} placeholder="0.00" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {reimbForm.startDate && reimbForm.endDate && reimbForm.startDate > reimbForm.endDate && <p className="text-xs text-red-600 mb-2">End date must be after start date.</p>}
              <PrimaryBtn onClick={submitReimbursement} disabled={submittingReimb || !reimbForm.destination || !reimbForm.startDate || !reimbForm.endDate || reimbForm.startDate > reimbForm.endDate}>
                {submittingReimb ? <Loader2 className="size-4 animate-spin inline mr-1" /> : <Plane className="size-4 inline mr-1" />}
                Submit
              </PrimaryBtn>
              {reimbResult && <span className="text-sm text-green-700">{reimbResult}</span>}
            </div>
          </Card>

          {reimbursements.length > 0 && (
            <Card>
              <h3 className="text-sm font-extrabold text-gray-900 mb-3">Past Reimbursements</h3>
              <div className="divide-y">
                {reimbursements.map((r: any, i: number) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.destination ?? 'Trip'}</p>
                      <p className="text-xs text-gray-500">{r.tripPurpose ?? ''} · ${formatCurrency(r.totalAmount ?? r.amount)}{r.startDate ? ` · ${formatDate(r.startDate)}–${formatDate(r.endDate)}` : ''}</p>
                    </div>
                    <Badge label={r.status?.replace('REIMBURSEMENT_', '') ?? 'DRAFT'} variant={r.status?.includes('APPROVED') || r.status?.includes('PAID') ? 'green' : r.status?.includes('REJECTED') ? 'red' : 'amber'} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {subTab === 'grants' && (
        <Card>
          {loadingGrants ? (
            <div className="flex items-center gap-2 py-4 justify-center text-gray-400"><Loader2 className="size-4 animate-spin" /> Loading grants...</div>
          ) : grants.length > 0 ? (
            <div className="divide-y">
              {grants.map((g: any, i: number) => (
                <div key={i} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{g.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {g.provider}
                        {g.deadline && (() => {
                          const urg = deadlineUrgency(g.deadline)
                          const label = `Deadline: ${new Date(g.deadline).toLocaleDateString()}`
                          return <> · <span className={urg === 'red' ? 'text-red-600 font-medium' : urg === 'amber' ? 'text-amber-600 font-medium' : ''}>{label}</span></>
                        })()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-700 shrink-0">${(g.maxAmount ?? g.amount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No grants available." />
          )}
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Paper Review                                                  */
/* ------------------------------------------------------------------ */

function PaperReviewTab() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', authors: '', source: 'journal', venue: '', dueDate: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, flash] = useFlash()

  const loadReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/university-systems/paper-review')
      const data = await res.json()
      setReviews(data.reviews ?? data ?? [])
    } catch { setReviews([]) }
    setLoading(false)
  }, [])

  useEffect(() => { loadReviews() }, [loadReviews])

  async function createReview() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/university-systems/paper-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      flash(res.ok ? 'Review created.' : 'Error.')
      if (res.ok) { setForm({ title: '', authors: '', source: 'journal', venue: '', dueDate: '' }); setShowForm(false); loadReviews() }
    } catch { flash('Network error.') }
    setSubmitting(false)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-gray-900">Paper Reviews</h3>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 text-sm font-medium text-white rounded-lg flex items-center gap-1" style={{ backgroundColor: '#0033A0' }}>
          <Plus className="size-3.5" /> New
        </button>
      </div>

      {showForm && (
        <div className="border rounded-xl p-4 mb-4 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title</label>
              <input autoFocus type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Authors</label>
              <input type="text" value={form.authors} onChange={e => setForm(f => ({ ...f, authors: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Venue</label>
              <input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Journal or conference" className="w-full border rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PrimaryBtn onClick={createReview} disabled={submitting || !form.title || !form.authors}>
              {submitting ? 'Saving...' : 'Create Review'}
            </PrimaryBtn>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            {result && <span className="text-sm text-green-700">{result}</span>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 justify-center text-gray-400"><Loader2 className="size-4 animate-spin" /> Loading...</div>
      ) : reviews.length > 0 ? (
        <div className="divide-y">
          {reviews.map((r: any, i: number) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                <p className="text-xs text-gray-500">
                  {r.authors ?? ''}
                  {r.venue ? ` · ${r.venue}` : ''}
                  {r.dueDate && (() => {
                    const urg = deadlineUrgency(r.dueDate)
                    return <> · <span className={urg === 'red' ? 'text-red-600 font-medium' : urg === 'amber' ? 'text-amber-600 font-medium' : ''}>Due {formatDate(r.dueDate)}</span></>
                  })()}
                </p>
              </div>
              <Badge label={r.status ?? 'PENDING'} variant={r.status === 'COMPLETED' || r.status === 'SUBMITTED' ? 'green' : r.status === 'IN_PROGRESS' ? 'blue' : 'amber'} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No paper reviews yet." />
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Website Updates                                               */
/* ------------------------------------------------------------------ */

function WebsiteTab() {
  const [form, setForm] = useState({ section: 'office_hours', pageUrl: '', newContent: '' })
  const [requests, setRequests] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, flash] = useFlash()

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/university-systems/website/changes')
      const data = await res.json()
      setRequests(data.requests ?? data ?? [])
    } catch { setRequests([]) }
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  async function submitRequest() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/university-systems/website/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      flash(res.ok ? 'Change request submitted.' : 'Error.')
      if (res.ok) { setForm({ section: 'office_hours', pageUrl: '', newContent: '' }); loadRequests() }
    } catch { flash('Network error.') }
    setSubmitting(false)
  }

  const SECTION_LABELS: Record<string, string> = {
    office_hours: 'Office Hours',
    bio: 'Bio',
    publications: 'Publications',
    research: 'Research',
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Section</label>
            <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="office_hours">Office Hours</option>
              <option value="bio">Bio</option>
              <option value="publications">Publications</option>
              <option value="research">Research Interests</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Page URL (optional)</label>
            <input type="text" value={form.pageUrl} onChange={e => setForm(f => ({ ...f, pageUrl: e.target.value }))} placeholder="https://cs.uky.edu/people/..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">New Content</label>
          <textarea value={form.newContent} onChange={e => setForm(f => ({ ...f, newContent: e.target.value }))} rows={3} placeholder="What should this section say?" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <PrimaryBtn onClick={submitRequest} disabled={submitting || !form.newContent.trim()}>
            {submitting ? <Loader2 className="size-4 animate-spin inline mr-1" /> : <Send className="size-4 inline mr-1" />}
            Submit Request
          </PrimaryBtn>
          {result && <span className="text-sm text-green-700">{result}</span>}
        </div>
      </Card>

      {requests.length > 0 && (
        <Card>
          <h3 className="text-sm font-extrabold text-gray-900 mb-3">Past Requests</h3>
          <div className="divide-y">
            {requests.map((r: any, i: number) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-900">{SECTION_LABELS[r.section] ?? r.section}</p>
                  <p className="text-xs text-gray-500 truncate">{r.newContent?.slice(0, 60) ?? ''}{r.submittedAt ? ` · ${formatDate(r.submittedAt)}` : ''}</p>
                </div>
                <Badge label={r.status?.replace('CHANGE_', '') ?? 'DRAFT'} variant={r.status === 'PUBLISHED' || r.status === 'CHANGE_APPROVED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'amber'} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Enrollment Changes                                            */
/* ------------------------------------------------------------------ */

function EnrollmentTab() {
  const courses = useCourses()
  const [courseId, setCourseId] = useState('')
  const [changes, setChanges] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (courses.length > 0 && !courseId) setCourseId(courses[0].id) }, [courses, courseId])

  // Auto-load on course change
  useEffect(() => {
    if (!courseId) return
    setLoading(true)
    fetch(`/api/university-systems/sis/enrollment-changes?courseId=${courseId}`)
      .then(r => r.json())
      .then(data => setChanges(data))
      .catch(() => setChanges(null))
      .finally(() => setLoading(false))
  }, [courseId])

  const dropped = changes?.dropped ?? []
  const added = changes?.added ?? []
  const allChanges = [
    ...dropped.map((d: any) => ({ ...d, type: 'dropped' })),
    ...added.map((a: any) => ({ ...a, type: 'added' })),
  ]

  return (
    <Card>
      <select value={courseId} onChange={e => setCourseId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm mb-4">
        {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>)}
      </select>

      {loading ? (
        <div className="flex items-center gap-2 py-4 justify-center text-gray-400"><Loader2 className="size-4 animate-spin" /> Checking...</div>
      ) : allChanges.length > 0 ? (
        <div className="divide-y">
          {allChanges.map((c: any, i: number) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.studentName ?? c.name ?? 'Student'}</p>
                <p className="text-xs text-gray-500">{formatDate(c.droppedAt ?? c.addedAt)}</p>
              </div>
              <Badge label={c.type.charAt(0).toUpperCase() + c.type.slice(1)} variant={c.type === 'added' ? 'green' : 'red'} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No recent enrollment changes for this course." />
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Guidance Section — Student Services cards                          */
/* ------------------------------------------------------------------ */

const SERVICE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Plane, Accessibility, DollarSign, Stethoscope, Heart, Home, Activity,
  Briefcase, Utensils, Car, Award, Star, Shield, ClipboardList,
  ArrowLeftRight, Globe, GraduationCap, BookOpen, ShieldCheck, Scale,
}

function GuidanceServiceCard({ tool }: { tool: StudentServiceTool }) {
  const Icon = (tool.icon && SERVICE_ICON_MAP[tool.icon]) ? SERVICE_ICON_MAP[tool.icon] : LifeBuoy
  return (
    <Link
      href={`/student-services/${tool.slug}`}
      className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-[#0033A0] overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="size-12 rounded-xl bg-[#0033A0]/10 flex items-center justify-center group-hover:bg-[#0033A0]/20 transition-colors">
            <Icon className="size-6 text-[#0033A0]" />
          </div>
          {tool.crisisLineEnabled && (
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Crisis Support
            </span>
          )}
          {tool.sensitiveSession && !tool.crisisLineEnabled && (
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Confidential
            </span>
          )}
        </div>
        <h2 className="text-base font-extrabold text-gray-900 mb-1 group-hover:text-[#0033A0] transition-colors">
          {tool.title}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">{tool.subtitle}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{tool.escalationEmail}</span>
          <span className="flex items-center gap-1 text-sm font-semibold text-[#0033A0] group-hover:gap-2 transition-all">
            Open <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function GuidanceSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
        <AlertTriangle className="size-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">These tools are powered by AI.</span>{' '}
          Always confirm critical decisions with the relevant UK office before taking action.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {STUDENT_SERVICES_TOOLS.map((tool) => (
          <GuidanceServiceCard key={tool.slug} tool={tool} />
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-4 max-w-xl mx-auto leading-relaxed">
        Student Services provides AI-powered guidance only — official determinations come from the relevant UK office. For emergencies call 911 or UK Police at 859-257-8573.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Planning Section — Campus Navigator tools                          */
/* ------------------------------------------------------------------ */

function PlanningSection() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CAMPUS_TOOLS.map(tool => {
          const isLive = tool.status === 'live'
          return (
            <div
              key={tool.slug}
              className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                isLive ? `${tool.border} hover:shadow-lg hover:-translate-y-0.5` : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{tool.emoji}</span>
                  {tool.status === 'coming-soon' && (
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">{tool.title}</h2>
                <p className={`text-sm font-semibold mb-3 ${tool.color}`}>{tool.tagline}</p>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{tool.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {tool.starterQuestions.slice(0, 2).map((q, i) => (
                    <span key={i} className={`text-xs px-2.5 py-1 rounded-full border ${tool.bg} ${tool.color} border-current opacity-70 font-medium`}>
                      {q}
                    </span>
                  ))}
                </div>
                {isLive ? (
                  <Link
                    href={`/campus-navigator/${tool.slug}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white text-sm font-semibold transition-colors"
                  >
                    Open <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-gray-100 text-center text-sm font-medium text-gray-400">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-center text-xs text-gray-400 mt-4 max-w-xl mx-auto leading-relaxed">
        Planning tools provide AI-powered guidance. Always verify critical decisions with your academic advisor and the official UK Bulletin.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Systems Section — existing 7 integration tabs                      */
/* ------------------------------------------------------------------ */

const TAB_COMPONENTS: Record<TabKey, () => React.JSX.Element> = {
  attendance: AttendanceTab,
  rooms: RoomBookingTab,
  grades: GradeSubmissionTab,
  travel: TravelTab,
  'paper-review': PaperReviewTab,
  website: WebsiteTab,
  enrollment: EnrollmentTab,
}

function SystemsSection() {
  const [activeTab, setActiveTabRaw] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'attendance'
    const hash = window.location.hash.slice(1)
    const valid: TabKey[] = ['attendance', 'rooms', 'grades', 'travel', 'paper-review', 'website', 'enrollment']
    return valid.includes(hash as TabKey) ? (hash as TabKey) : 'attendance'
  })
  const ActiveComponent = TAB_COMPONENTS[activeTab]

  function setActiveTab(key: TabKey) {
    setActiveTabRaw(key)
    window.history.replaceState(null, '', `#${key}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
        <AlertTriangle className="size-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800">
          Running in <span className="font-semibold">simulated mode</span>. Real systems can be connected from Admin → Integrations.
        </p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.key ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={activeTab === tab.key ? { backgroundColor: '#0033A0' } : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

const SECTION_TABS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'guidance', label: 'Guidance', icon: <Heart className="size-4" /> },
  { key: 'planning', label: 'Planning', icon: <Compass className="size-4" /> },
  { key: 'systems', label: 'Systems', icon: <Building2 className="size-4" /> },
]

const SECTION_COMPONENTS: Record<SectionKey, () => React.JSX.Element> = {
  guidance: GuidanceSection,
  planning: PlanningSection,
  systems: SystemsSection,
}

function getDefaultSection(role: string): SectionKey {
  if (role === 'STUDENT') return 'guidance'
  if (role === 'STAFF' || role === 'ADMIN') return 'systems'
  return 'guidance'
}

export default function UniversitySystemsPage() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as SectionKey | null
  const validSections: SectionKey[] = ['guidance', 'planning', 'systems']
  const initialSection = (tabParam && validSections.includes(tabParam)) ? tabParam : getDefaultSection(currentUser.role)

  const [activeSection, setActiveSection] = useState<SectionKey>(initialSection)
  const ActiveSection = SECTION_COMPONENTS[activeSection]

  return (
    <>
      <PageHeader
        title="Campus Services"
        subtitle="AI-powered guidance, planning tools, and institutional integrations — all in one place"
        action={<Building2 className="size-6" style={{ color: '#0033A0' }} />}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top-level section tabs */}
        <div className="flex gap-1 border-b border-gray-200 pb-0">
          {SECTION_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                activeSection === tab.key
                  ? 'border-[#0033A0] text-[#0033A0] bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <ActiveSection />
      </div>
    </>
  )
}
