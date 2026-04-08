/**
 * room-data.ts
 *
 * Synthetic room and building data for the Room Reservation demo.
 * In production, this would be scraped from or connected to Meet at Big Blue (EMS).
 */

export interface Room {
  id: string
  name: string
  building: string
  buildingCode: string
  floor: number
  capacity: number
  amenities: string[]
  imageUrl?: string
}

export interface RoomSlot {
  roomId: string
  date: string
  startTime: string
  endTime: string
  available: boolean
  bookedBy?: string
}

export interface Booking {
  id: string
  roomId: string
  userId: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  attendees: number
  amenitiesRequested: string[]
  status: 'confirmed' | 'pending' | 'cancelled'
  createdAt: string
}

export const BUILDINGS = [
  { code: 'WHT', name: 'Whitehall Classroom Building', address: '305 Rose St' },
  { code: 'CB', name: 'Chemistry-Physics Building', address: '505 Rose St' },
  { code: 'POT', name: 'Patterson Office Tower', address: '257 Rose Ln' },
  { code: 'WSY', name: 'William T. Young Library', address: '401 Hilltop Ave' },
  { code: 'GAT', name: 'Gatton College of Business', address: '255 Gatton Business' },
  { code: 'STU', name: 'Student Center', address: '160 Avenue of Champions' },
  { code: 'FUN', name: 'Funkhouser Building', address: '257 S Limestone' },
  { code: 'ADM', name: 'Main Building (Administration)', address: '101 Administration Dr' },
]

export const ROOMS: Room[] = [
  // Whitehall
  { id: 'wht-101', name: 'Room 101', building: 'Whitehall Classroom Building', buildingCode: 'WHT', floor: 1, capacity: 30, amenities: ['projector', 'whiteboard'] },
  { id: 'wht-205', name: 'Room 205', building: 'Whitehall Classroom Building', buildingCode: 'WHT', floor: 2, capacity: 50, amenities: ['projector', 'whiteboard', 'av-system'] },
  { id: 'wht-301', name: 'Room 301', building: 'Whitehall Classroom Building', buildingCode: 'WHT', floor: 3, capacity: 20, amenities: ['projector', 'video-conf'] },
  // Patterson Office Tower
  { id: 'pot-18', name: 'Room 18 (Conference)', building: 'Patterson Office Tower', buildingCode: 'POT', floor: 18, capacity: 12, amenities: ['projector', 'video-conf', 'whiteboard'] },
  { id: 'pot-9', name: 'Room 9 (Seminar)', building: 'Patterson Office Tower', buildingCode: 'POT', floor: 9, capacity: 25, amenities: ['projector', 'whiteboard'] },
  // Young Library
  { id: 'wsy-a200', name: 'Room A200 (Auditorium)', building: 'William T. Young Library', buildingCode: 'WSY', floor: 2, capacity: 200, amenities: ['projector', 'av-system', 'microphone', 'recording'] },
  { id: 'wsy-b108', name: 'Room B108 (Study)', building: 'William T. Young Library', buildingCode: 'WSY', floor: 1, capacity: 8, amenities: ['whiteboard'] },
  { id: 'wsy-b110', name: 'Room B110 (Study)', building: 'William T. Young Library', buildingCode: 'WSY', floor: 1, capacity: 8, amenities: ['whiteboard'] },
  // Gatton
  { id: 'gat-250', name: 'Room 250 (Boardroom)', building: 'Gatton College of Business', buildingCode: 'GAT', floor: 2, capacity: 16, amenities: ['projector', 'video-conf', 'whiteboard', 'av-system'] },
  { id: 'gat-310', name: 'Room 310 (Lecture Hall)', building: 'Gatton College of Business', buildingCode: 'GAT', floor: 3, capacity: 100, amenities: ['projector', 'av-system', 'microphone'] },
  // Student Center
  { id: 'stu-203', name: 'Room 203', building: 'Student Center', buildingCode: 'STU', floor: 2, capacity: 40, amenities: ['projector', 'av-system'] },
  { id: 'stu-grand', name: 'Grand Ballroom', building: 'Student Center', buildingCode: 'STU', floor: 1, capacity: 500, amenities: ['projector', 'av-system', 'microphone', 'stage', 'catering'] },
  // Funkhouser
  { id: 'fun-206', name: 'Room 206', building: 'Funkhouser Building', buildingCode: 'FUN', floor: 2, capacity: 15, amenities: ['whiteboard'] },
  // Admin
  { id: 'adm-conf', name: 'Conference Room A', building: 'Main Building (Administration)', buildingCode: 'ADM', floor: 1, capacity: 20, amenities: ['projector', 'video-conf', 'whiteboard'] },
  { id: 'adm-board', name: 'Board Room', building: 'Main Building (Administration)', buildingCode: 'ADM', floor: 2, capacity: 30, amenities: ['projector', 'video-conf', 'av-system', 'catering'] },
]

/**
 * Generate synthetic availability for a given date.
 * In production, this would query Meet at Big Blue.
 */
export function generateAvailability(date: string): RoomSlot[] {
  const slots: RoomSlot[] = []
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

  for (const room of ROOMS) {
    for (let i = 0; i < timeSlots.length - 1; i++) {
      // Seed-based pseudo-random availability (deterministic per room+date+time)
      const hash = `${room.id}-${date}-${timeSlots[i]}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const available = hash % 3 !== 0 // ~67% available

      slots.push({
        roomId: room.id,
        date,
        startTime: timeSlots[i],
        endTime: timeSlots[i + 1],
        available,
        bookedBy: available ? undefined : 'Other event',
      })
    }
  }

  return slots
}

/**
 * Search rooms by criteria.
 */
export function searchRooms(opts: {
  date: string
  startTime?: string
  endTime?: string
  minCapacity?: number
  amenities?: string[]
  building?: string
}): { room: Room; availableSlots: RoomSlot[] }[] {
  const allSlots = generateAvailability(opts.date)

  return ROOMS
    .filter(room => {
      if (opts.minCapacity && room.capacity < opts.minCapacity) return false
      if (opts.building && room.buildingCode !== opts.building && !room.building.toLowerCase().includes(opts.building.toLowerCase())) return false
      if (opts.amenities?.length) {
        if (!opts.amenities.every(a => room.amenities.includes(a))) return false
      }
      return true
    })
    .map(room => {
      const roomSlots = allSlots.filter(s => s.roomId === room.id)
      let availableSlots = roomSlots.filter(s => s.available)

      if (opts.startTime) {
        availableSlots = availableSlots.filter(s => s.startTime >= opts.startTime! && (!opts.endTime || s.endTime <= opts.endTime))
      }

      return { room, availableSlots }
    })
    .filter(r => r.availableSlots.length > 0)
    .sort((a, b) => b.availableSlots.length - a.availableSlots.length)
}

const AMENITY_LABELS: Record<string, string> = {
  projector: 'Projector',
  whiteboard: 'Whiteboard',
  'video-conf': 'Video Conferencing',
  'av-system': 'AV System',
  microphone: 'Microphone',
  recording: 'Recording',
  stage: 'Stage',
  catering: 'Catering Available',
}

export function getAmenityLabel(amenity: string): string {
  return AMENITY_LABELS[amenity] ?? amenity
}
