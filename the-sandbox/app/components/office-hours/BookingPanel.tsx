'use client'

// ── Office Hours Booking Panel ──────────────────────────────────
// Student-facing: shows available faculty slots and lets students
// book 15-min appointments with a stated topic.
// Faculty-facing: shows booked appointments and lets faculty manage
// their availability windows.

import { useState } from 'react'
import {
  Calendar,
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  User,
  X,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────

interface TimeSlot {
  id: string
  start: string // ISO
  end: string   // ISO
  booked: boolean
  studentName?: string
  topic?: string
}

interface BookingPanelProps {
  mode: 'student' | 'faculty'
  courseId?: string
  courseCode?: string
}

// ── Synthetic slots for demo ─────────────────────────────────────

function generateDemoSlots(): TimeSlot[] {
  const today = new Date()
  const slots: TimeSlot[] = []
  // Generate 2 days of 15-min slots between 2-4 PM
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() + dayOffset)
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue

    for (let hour = 14; hour < 16; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const start = new Date(date)
        start.setHours(hour, min, 0, 0)
        const end = new Date(start)
        end.setMinutes(end.getMinutes() + 15)

        const isPast = start.getTime() < Date.now()
        const isBooked = !isPast && Math.random() < 0.25

        slots.push({
          id: `slot-${dayOffset}-${hour}-${min}`,
          start: start.toISOString(),
          end: end.toISOString(),
          booked: isBooked || isPast,
          ...(isBooked ? {
            studentName: ['Sarah Kim', 'Javier Martinez', 'Alice Chen'][Math.floor(Math.random() * 3)],
            topic: ['Midterm review', 'Essay feedback', 'Grade question', 'Career advice'][Math.floor(Math.random() * 4)],
          } : {}),
        })
      }
    }
  }
  return slots.filter(s => new Date(s.start).getTime() > Date.now() - 3600000)
}

// ── Student Booking View ─────────────────────────────────────────

function StudentBookingView() {
  const [slots] = useState(() => generateDemoSlots())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState<string | null>(null)

  const available = slots.filter(s => !s.booked)
  const grouped = groupByDate(available)

  async function handleBook() {
    if (!selectedSlot || !topic.trim()) return
    setBooking(true)
    // Simulate booking
    await new Promise(r => setTimeout(r, 800))
    setBooked(selectedSlot)
    setBooking(false)
  }

  if (booked) {
    const slot = slots.find(s => s.id === booked)
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 mb-3">
          <Check className="size-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-extrabold text-gray-900">Booked!</h3>
        <p className="mt-1 text-sm text-gray-600">
          {slot ? `${formatTime(slot.start)} – ${formatTime(slot.end)} on ${formatDate(slot.start)}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">Topic: {topic}</p>
        <button type="button" onClick={() => { setBooked(null); setSelectedSlot(null); setTopic('') }} className="mt-4 text-sm font-semibold text-[#0033A0] hover:underline">
          Book another
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-extrabold text-gray-900 mb-1">Available Slots</h3>
        <p className="text-xs text-gray-500 mb-4">{available.length} slots available — pick one and tell your instructor what you need help with.</p>

        {Object.entries(grouped).map(([dateKey, daySlots]) => (
          <div key={dateKey} className="mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{dateKey}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map(slot => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedSlot === slot.id
                      ? 'border-[#0033A0] bg-blue-50 text-[#0033A0] ring-1 ring-[#0033A0]/20'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clock className="inline size-3 mr-1" />
                  {formatTime(slot.start)}
                </button>
              ))}
            </div>
          </div>
        ))}

        {available.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No available slots right now. Check back later or ask your instructor.</p>
        )}
      </div>

      {/* Booking form */}
      {selectedSlot && (
        <div className="rounded-2xl border border-[#0033A0]/20 bg-blue-50/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="size-4 text-[#0033A0]" />
            <span className="text-sm font-semibold text-gray-900">
              {(() => { const s = slots.find(x => x.id === selectedSlot); return s ? `${formatTime(s.start)} – ${formatTime(s.end)}, ${formatDate(s.start)}` : '' })()}
            </span>
          </div>
          <div className="mb-3">
            <label className="text-xs font-bold text-gray-700">What do you need help with?</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Midterm review, Essay feedback..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleBook}
            disabled={booking || !topic.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#002880] disabled:opacity-40 transition-colors"
          >
            {booking ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {booking ? 'Booking...' : 'Book Slot'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Faculty Booking Management View ──────────────────────────────

function FacultyBookingView() {
  const [slots] = useState(() => generateDemoSlots())
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('14:00')
  const [newSlotEnd, setNewSlotEnd] = useState('16:00')

  const booked = slots.filter(s => s.booked && s.studentName)
  const upcoming = booked
    .filter(s => new Date(s.start).getTime() > Date.now())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  return (
    <div className="space-y-4">
      {/* Upcoming bookings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Upcoming Appointments</h3>
            <p className="text-xs text-gray-500">{upcoming.length} booked</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddSlot(!showAddSlot)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="size-3.5" /> Add availability
          </button>
        </div>

        {showAddSlot && (
          <div className="mb-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-700 mb-2">Add available time window</p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={newSlotDate}
                onChange={e => setNewSlotDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
              <input
                type="time"
                value={newSlotStart}
                onChange={e => setNewSlotStart(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="time"
                value={newSlotEnd}
                onChange={e => setNewSlotEnd(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowAddSlot(false)}
                className="rounded-lg bg-[#0033A0] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#002880] transition-colors"
              >
                Add
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">Students will see 15-minute slots within this window.</p>
          </div>
        )}

        {upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map(slot => (
              <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#0033A0]/10 text-[#0033A0]">
                  <User className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{slot.studentName}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {formatTime(slot.start)} – {formatTime(slot.end)}</span>
                    <span>{formatDate(slot.start)}</span>
                  </div>
                  {slot.topic && (
                    <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                      <MessageSquare className="size-3" /> {slot.topic}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No appointments booked yet.</p>
        )}
      </div>
    </div>
  )
}

// ── Exported Panel ───────────────────────────────────────────────

export default function BookingPanel({ mode }: BookingPanelProps) {
  return mode === 'student' ? <StudentBookingView /> : <FacultyBookingView />
}

// ── Helpers ──────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupByDate(slots: TimeSlot[]): Record<string, TimeSlot[]> {
  const groups: Record<string, TimeSlot[]> = {}
  for (const slot of slots) {
    const key = formatDate(slot.start)
    if (!groups[key]) groups[key] = []
    groups[key].push(slot)
  }
  return groups
}
