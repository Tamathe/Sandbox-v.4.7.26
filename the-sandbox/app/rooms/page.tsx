'use client'

import { useState, useCallback } from 'react'
import { Search, MapPin, Loader2, CalendarDays, Check, Send } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import RoomCard from '../components/rooms/RoomCard'

interface Room {
  id: string
  name: string
  building: string
  buildingCode: string
  floor: number
  capacity: number
  amenities: string[]
}

interface RoomSlot {
  startTime: string
  endTime: string
  available: boolean
}

interface SearchResult {
  room: Room
  availableSlots: RoomSlot[]
}

interface BookingConfirmation {
  roomName: string
  building: string
  date: string
  startTime: string
  endTime: string
}

export default function RoomsPage() {
  const { currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [sandyMessage, setSandyMessage] = useState('')
  const [searchParams, setSearchParams] = useState<{ date: string; startTime: string; endTime: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingConfirmation | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    setSandyMessage('')
    setBooking(null)

    try {
      const res = await fetch('/api/rooms/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results ?? [])
      setSandyMessage(data.sandyMessage ?? '')
      setSearchParams(data.searchParams ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }, [query, currentUser.email])

  const handleBook = useCallback(async (roomId: string, slot: RoomSlot) => {
    if (!searchParams) return
    setBookingLoading(true)

    try {
      const res = await fetch('/api/rooms/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          roomId,
          date: searchParams.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          purpose: query,
          attendees: 10,
        }),
      })
      if (!res.ok) throw new Error('Booking failed')
      const data = await res.json()
      setBooking({
        roomName: data.booking.roomName,
        building: data.booking.building,
        date: data.booking.date,
        startTime: data.booking.startTime,
        endTime: data.booking.endTime,
      })
    } catch (err) { console.error('Room booking error:', err) } finally { setBookingLoading(false) }
  }, [searchParams, query, currentUser.email])

  return (
    <div>
      <PageHeader title="Room Reservation" subtitle="Tell Sandy what you need — she'll find the perfect room" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search bar */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g., 'I need a room for 10 people with a projector next Thursday 2-4pm'"
                aria-label="Search for rooms"
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!query.trim() || loading}
              className="px-5 py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] disabled:bg-gray-300 text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Search
            </button>
          </div>

          {/* Quick searches */}
          <div className="flex flex-wrap gap-2 mt-3">
            {['Small meeting room tomorrow', 'Large lecture hall with AV', 'Study room at the library', 'Conference room with video conferencing'].map(q => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuery(q); }}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-[#0033A0]/30 hover:text-[#0033A0] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Booking confirmation */}
        {booking && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100">
              <Check className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-800">Room Booked!</p>
              <p className="text-sm text-emerald-700">{booking.roomName} in {booking.building} on {booking.date}, {booking.startTime}–{booking.endTime}</p>
            </div>
          </div>
        )}

        {/* Sandy's message */}
        {sandyMessage && (
          <div className="bg-[#0033A0]/5 border border-[#0033A0]/20 rounded-xl px-4 py-3">
            <p className="text-sm text-[#0033A0] font-medium">{sandyMessage}</p>
            {searchParams && (
              <div className="flex items-center gap-3 mt-2 text-xs text-[#0033A0]/70">
                <span className="flex items-center gap-1"><CalendarDays className="size-3" /> {searchParams.date}</span>
                <span>{searchParams.startTime}–{searchParams.endTime}</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">{results.length} Room{results.length !== 1 ? 's' : ''} Available</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map(r => (
                <RoomCard key={r.room.id} room={r.room} availableSlots={r.availableSlots} onBook={handleBook} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && sandyMessage && (
          <div className="text-center py-12">
            <MapPin className="size-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-600">No rooms match your criteria</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting the time, capacity, or building.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="size-8 text-[#0033A0] animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Sandy is searching for available rooms...</p>
          </div>
        )}

        <p className="text-center text-xs text-amber-600 font-medium">Demo mode — bookings are simulated. In production, this connects to Meet at Big Blue (EMS).</p>
      </div>
    </div>
  )
}
