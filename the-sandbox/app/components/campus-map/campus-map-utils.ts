import type { CampusBuildingType } from '../../generated/prisma'

// ── Map Constants ────────────────────────────────────────────────────────────

export const UK_CENTER: [number, number] = [38.0317, -84.5040]

export const UK_BOUNDS: [[number, number], [number, number]] = [
  [38.0150, -84.5200], // SW corner
  [38.0480, -84.4880], // NE corner
]

// ── Building Type Colors ─────────────────────────────────────────────────────

export const BUILDING_TYPE_COLORS: Record<CampusBuildingType, string> = {
  ACADEMIC: '#0033A0',
  DINING: '#F59E0B',
  RECREATION: '#10B981',
  LIBRARY: '#8B5CF6',
  RESIDENCE: '#EC4899',
  PARKING: '#6B7280',
  HEALTH: '#EF4444',
  ADMINISTRATION: '#6366F1',
  ATHLETICS: '#D97706',
  STUDENT_SERVICES: '#14B8A6',
}

export const BUILDING_TYPE_LABELS: Record<CampusBuildingType, string> = {
  ACADEMIC: 'Academic',
  DINING: 'Dining',
  RECREATION: 'Recreation',
  LIBRARY: 'Library',
  RESIDENCE: 'Residence',
  PARKING: 'Parking',
  HEALTH: 'Health',
  ADMINISTRATION: 'Administration',
  ATHLETICS: 'Athletics',
  STUDENT_SERVICES: 'Student Services',
}

export const ALL_BUILDING_TYPES: CampusBuildingType[] = [
  'ACADEMIC',
  'DINING',
  'RECREATION',
  'LIBRARY',
  'RESIDENCE',
  'PARKING',
  'HEALTH',
  'ADMINISTRATION',
  'ATHLETICS',
  'STUDENT_SERVICES',
]

// ── Types ────────────────────────────────────────────────────────────────────

export interface MapBuilding {
  id: string
  name: string
  shortName: string | null
  slug: string
  type: CampusBuildingType
  latitude: number
  longitude: number
  address: string | null
  description: string | null
  hours: string | null
  imageUrl: string | null
  amenities: string[]
  aliases: string[]
  floors: number | null
  departments: string[]
  accessibilityNotes: string | null
}

export interface MapEvent {
  id: string
  name: string
  location: string | null
  startsOn: string
  endsOn: string
  latitude: number | null
  longitude: number | null
  theme: string | null
  categoryNames: string[]
  organizationName: string
  imagePath: string | null
}

export interface MyBuilding {
  slug: string
  name: string
  latitude: number
  longitude: number
  courseCode?: string
  courseTitle?: string
  dayOfWeek?: string   // "MWF" | "TR" | "MW" | "WF"
  startTime?: string   // "09:00"
  endTime?: string     // "09:50"
}

export interface ScheduleTransition {
  from: string
  to: string
  distanceMiles: number
  walkingMinutes: number
  warning: boolean
}

// ── Amenity Labels ───────────────────────────────────────────────────────────

export const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  'study-rooms': 'Study Rooms',
  cafe: 'Café',
  printing: 'Printing',
  'group-rooms': 'Group Rooms',
  elevators: 'Elevators',
  labs: 'Labs',
  'computer-labs': 'Computer Labs',
  gym: 'Gym',
  pool: 'Pool',
  'climbing-wall': 'Climbing Wall',
  basketball: 'Basketball',
  racquetball: 'Racquetball',
  'locker-rooms': 'Locker Rooms',
  dining: 'Dining',
  'allergen-friendly': 'Allergen-Friendly',
  halal: 'Halal',
  'multiple-options': 'Multiple Options',
  'locally-sourced': 'Locally Sourced',
  vegetarian: 'Vegetarian',
  coffee: 'Coffee',
  snacks: 'Snacks',
  bookstore: 'Bookstore',
  'meeting-rooms': 'Meeting Rooms',
  atm: 'ATM',
  parking: 'Parking',
  pharmacy: 'Pharmacy',
  'mental-health': 'Mental Health',
  lab: 'Lab',
  immunizations: 'Immunizations',
  'crisis-support': 'Crisis Support',
  'group-therapy': 'Group Therapy',
  emergency: 'Emergency',
  'event-space': 'Event Space',
  catering: 'Catering',
  advising: 'Advising',
  'career-services': 'Career Services',
  laundry: 'Laundry',
  kitchen: 'Kitchen',
  concessions: 'Concessions',
  track: 'Track',
  diving: 'Diving',
  'listening-stations': 'Listening Stations',
  courtroom: 'Courtroom',
  library: 'Library',
  'concert-hall': 'Concert Hall',
  gallery: 'Gallery',
  'box-office': 'Box Office',
  'gift-shop': 'Gift Shop',
}
