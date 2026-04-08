/**
 * University Systems Integration Hub — Service Layer
 *
 * Business logic for 7 university system integrations, all running in
 * SIMULATED mode with realistic demo data. Each integration mirrors
 * the real-world UK system it will eventually connect to (Banner/SIS,
 * 25Live, iClicker, SAP Concur, etc.).
 */

import { prisma } from './prisma'
import Anthropic from '@anthropic-ai/sdk'
import type {
  AttendanceRecord,
  PaperReview,
  WebsiteChangeRequest,
  TravelReimbursement,
  TravelGrant,
  CampusRoom,
} from '../generated/prisma'

// ---------------------------------------------------------------------------
// Anthropic client (lazy singleton)
// ---------------------------------------------------------------------------
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return _anthropic
}

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// ---------------------------------------------------------------------------
// Synthetic fallback data
// ---------------------------------------------------------------------------

interface SyntheticRoom {
  id: string
  name: string
  building: string
  floor: number
  capacity: number
  amenities: string[]
  imageUrl: string | null
  isAvailable: boolean
}

const SYNTHETIC_ROOMS: SyntheticRoom[] = [
  { id: 'room-wh-101', name: 'WH 101', building: 'Whitehall Classroom Building', floor: 1, capacity: 40, amenities: ['projector', 'whiteboard', 'outlets'], imageUrl: null, isAvailable: true },
  { id: 'room-wh-205', name: 'WH 205', building: 'Whitehall Classroom Building', floor: 2, capacity: 80, amenities: ['projector', 'whiteboard', 'video-conf', 'outlets'], imageUrl: null, isAvailable: true },
  { id: 'room-jsb-120', name: 'JSB 120', building: 'Jacobs Science Building', floor: 1, capacity: 60, amenities: ['projector', 'whiteboard', 'lab-stations', 'outlets'], imageUrl: null, isAvailable: true },
  { id: 'room-wty-a110', name: 'WTY A110', building: 'William T. Young Library', floor: 1, capacity: 20, amenities: ['projector', 'whiteboard', 'video-conf'], imageUrl: null, isAvailable: true },
  { id: 'room-wty-b200', name: 'WTY B200', building: 'William T. Young Library', floor: 2, capacity: 12, amenities: ['whiteboard', 'video-conf', 'outlets'], imageUrl: null, isAvailable: true },
  { id: 'room-gcb-350', name: 'GCB 350', building: 'Gatton College of Business', floor: 3, capacity: 100, amenities: ['projector', 'whiteboard', 'video-conf', 'outlets', 'tiered-seating'], imageUrl: null, isAvailable: true },
  { id: 'room-coe-115', name: 'COE 115', building: 'College of Education', floor: 1, capacity: 35, amenities: ['projector', 'whiteboard', 'outlets'], imageUrl: null, isAvailable: true },
  { id: 'room-fh-209', name: 'FH 209', building: 'Funkhouser Building', floor: 2, capacity: 50, amenities: ['projector', 'whiteboard'], imageUrl: null, isAvailable: true },
  { id: 'room-cp-155', name: 'CP 155', building: 'Chemistry-Physics Building', floor: 1, capacity: 200, amenities: ['projector', 'whiteboard', 'tiered-seating', 'outlets'], imageUrl: null, isAvailable: true },
  { id: 'room-pot-1700', name: 'POT 1700', building: 'Patterson Office Tower', floor: 17, capacity: 30, amenities: ['projector', 'whiteboard', 'video-conf'], imageUrl: null, isAvailable: true },
  { id: 'room-teb-225', name: 'TEB 225', building: 'Taylor Education Building', floor: 2, capacity: 45, amenities: ['projector', 'whiteboard', 'outlets'], imageUrl: null, isAvailable: true },
  { id: 'room-mmrb-110', name: 'MMRB 110', building: 'Mining & Minerals Resources Building', floor: 1, capacity: 55, amenities: ['projector', 'whiteboard', 'video-conf', 'outlets'], imageUrl: null, isAvailable: true },
]

interface SyntheticGrant {
  id: string
  name: string
  provider: string
  description: string
  maxAmount: number
  eligibility: string
  deadline: string | null
  applicationUrl: string | null
  categories: string[]
  isActive: boolean
}

const SYNTHETIC_GRANTS: SyntheticGrant[] = [
  { id: 'grant-gs-travel', name: 'Graduate School Travel Award', provider: 'Graduate School', description: 'Supports graduate student travel to present research at national or international conferences. Up to $800 per academic year.', maxAmount: 800, eligibility: 'Full-time graduate students in good academic standing who are presenting research at a conference.', deadline: '2026-04-15T23:59:59.000Z', applicationUrl: 'https://gradschool.uky.edu/travel-awards', categories: ['conference', 'research'], isActive: true },
  { id: 'grant-pd-fund', name: 'Professional Development Fund', provider: 'Office of the Provost', description: 'Provides funding for faculty professional development activities including conference attendance, workshop participation, and collaborative research visits.', maxAmount: 2000, eligibility: 'Full-time faculty members with at least one year of service.', deadline: '2026-05-01T23:59:59.000Z', applicationUrl: 'https://provost.uky.edu/pd-fund', categories: ['conference', 'professional-development', 'workshop'], isActive: true },
  { id: 'grant-rctg', name: 'Research Conference Travel Grant', provider: 'Office of Research', description: 'Supports faculty and postdoctoral researchers traveling to present peer-reviewed research at national or international conferences.', maxAmount: 1500, eligibility: 'Faculty, postdocs, or research staff presenting peer-reviewed work.', deadline: '2026-03-31T23:59:59.000Z', applicationUrl: 'https://research.uky.edu/travel-grants', categories: ['conference', 'research'], isActive: true },
  { id: 'grant-dea', name: 'Dissertation Enhancement Award', provider: 'Graduate School', description: 'Provides funding for doctoral students to conduct dissertation research that requires travel, including archival research, fieldwork, or laboratory access at other institutions.', maxAmount: 3000, eligibility: 'Doctoral candidates who have advanced to candidacy and need travel for dissertation research.', deadline: '2026-04-01T23:59:59.000Z', applicationUrl: 'https://gradschool.uky.edu/dissertation-enhancement', categories: ['research', 'fieldwork'], isActive: true },
  { id: 'grant-intl', name: 'International Travel Grant', provider: 'International Center', description: 'Supports faculty and graduate students traveling internationally for research collaboration, conference participation, or scholarly exchange.', maxAmount: 2500, eligibility: 'Full-time faculty or graduate students traveling internationally for academic purposes.', deadline: '2026-06-01T23:59:59.000Z', applicationUrl: 'https://international.uky.edu/travel-grants', categories: ['conference', 'research', 'international'], isActive: true },
  { id: 'grant-fda', name: 'Faculty Development Award', provider: 'Office of the Provost', description: 'Competitive awards for tenured and tenure-track faculty to pursue professional development opportunities that enhance teaching and research.', maxAmount: 5000, eligibility: 'Tenured or tenure-track faculty with demonstrated need for professional development.', deadline: '2026-09-15T23:59:59.000Z', applicationUrl: 'https://provost.uky.edu/faculty-development', categories: ['professional-development', 'research', 'workshop'], isActive: true },
  { id: 'grant-stem', name: 'STEM Conference Support', provider: 'College of Engineering', description: 'Dedicated funding for STEM students and faculty presenting at engineering, computing, or natural sciences conferences.', maxAmount: 1200, eligibility: 'Students or faculty in STEM disciplines presenting original research.', deadline: '2026-04-30T23:59:59.000Z', applicationUrl: 'https://engr.uky.edu/conference-support', categories: ['conference', 'research', 'STEM'], isActive: true },
  { id: 'grant-arts-hum', name: 'Arts & Humanities Travel Fund', provider: 'College of Arts & Sciences', description: 'Supports travel for faculty and graduate students in arts and humanities disciplines for conference presentation, archival research, or performances.', maxAmount: 1000, eligibility: 'Faculty or graduate students in arts and humanities departments.', deadline: '2026-05-15T23:59:59.000Z', applicationUrl: 'https://as.uky.edu/arts-humanities-travel', categories: ['conference', 'research', 'arts', 'humanities'], isActive: true },
  { id: 'grant-health', name: 'Health Sciences Travel Award', provider: 'College of Medicine', description: 'Funds travel for health sciences faculty and trainees to present clinical research, attend specialized training, or participate in medical education conferences.', maxAmount: 1800, eligibility: 'Faculty, residents, or fellows in health sciences colleges.', deadline: '2026-04-15T23:59:59.000Z', applicationUrl: 'https://med.uky.edu/travel-awards', categories: ['conference', 'research', 'health-sciences'], isActive: true },
  { id: 'grant-uga-research', name: 'Undergraduate Research Travel Award', provider: 'Office of Undergraduate Research', description: 'Supports undergraduate students traveling to present research at regional or national conferences. Requires faculty mentor endorsement.', maxAmount: 600, eligibility: 'Undergraduate students presenting faculty-mentored research at a conference.', deadline: '2026-03-15T23:59:59.000Z', applicationUrl: 'https://uky.edu/ugresearch/travel', categories: ['conference', 'research'], isActive: true },
  { id: 'grant-ag-ext', name: 'Agricultural Extension Travel Fund', provider: 'College of Agriculture', description: 'Supports extension agents and agricultural faculty traveling for field research, extension conferences, or cooperative programs.', maxAmount: 1000, eligibility: 'Faculty or extension agents in the College of Agriculture, Food & Environment.', deadline: null, applicationUrl: 'https://cafe.uky.edu/travel', categories: ['conference', 'research', 'fieldwork'], isActive: true },
  { id: 'grant-edu-innovation', name: 'Teaching Innovation Travel Grant', provider: 'Center for the Enhancement of Learning & Teaching', description: 'Funds travel to teaching-focused conferences and workshops where faculty will learn innovative pedagogical techniques to bring back to UK classrooms.', maxAmount: 1500, eligibility: 'Any full-time faculty member focused on improving teaching practices.', deadline: '2026-07-01T23:59:59.000Z', applicationUrl: 'https://celt.uky.edu/travel-grants', categories: ['professional-development', 'workshop', 'teaching'], isActive: true },
]

// ---------------------------------------------------------------------------
// Helper — CampusRoom result type for search
// ---------------------------------------------------------------------------
export interface CampusRoomResult {
  id: string
  name: string
  building: string
  floor: number
  capacity: number
  amenities: string[]
  imageUrl: string | null
  isAvailable: boolean
}

// =========================================================================
// 1. Banner / SIS Grade Submission
// =========================================================================

/**
 * Simulated grade submission to Banner/SIS.
 * Returns success with a mock confirmation number.
 */
export async function submitGradesToSIS(
  courseId: string,
  grades: { studentId: string; grade: string; lastAttendDate?: string | null }[]
): Promise<{ success: boolean; confirmationId: string; submittedCount: number }> {
  const confirmationId = `SIS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  // In a real integration this would POST to Banner's grade-submission API.
  // For now we just acknowledge.
  console.log(`[university-systems] Simulated SIS grade submission for course ${courseId}: ${grades.length} grades`)

  return {
    success: true,
    confirmationId,
    submittedCount: grades.length,
  }
}

/**
 * Check enrollment changes — returns simulated dropped/added students.
 */
export async function checkEnrollmentChanges(courseId: string): Promise<{
  dropped: { studentId: string; studentName: string; droppedAt: string }[]
  added: { studentId: string; studentName: string; addedAt: string }[]
}> {
  // Simulated data — in production this would query Banner's enrollment API
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()

  return {
    dropped: [
      { studentId: 'sim-drop-001', studentName: 'Jordan Ellis', droppedAt: twoDaysAgo },
    ],
    added: [
      { studentId: 'sim-add-001', studentName: 'Priya Nair', addedAt: oneDayAgo },
      { studentId: 'sim-add-002', studentName: 'Marcus Williams', addedAt: oneDayAgo },
    ],
  }
}

// =========================================================================
// 2. Room Booking (25Live)
// =========================================================================

/**
 * Search available rooms. Falls back to SYNTHETIC_ROOMS if no CampusRoom
 * records exist in the database.
 */
export async function searchAvailableRooms(params: {
  date: string
  startTime: string
  endTime: string
  capacity?: number
  building?: string
}): Promise<CampusRoomResult[]> {
  // Try the database first
  let rooms: CampusRoomResult[] = []

  try {
    const dbRooms = await prisma.campusRoom.findMany({
      where: {
        isAvailable: true,
        ...(params.capacity ? { capacity: { gte: params.capacity } } : {}),
        ...(params.building ? { building: { contains: params.building, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { capacity: 'asc' },
    })

    if (dbRooms.length > 0) {
      rooms = dbRooms.map((r: CampusRoom) => ({
        id: r.id,
        name: r.name,
        building: r.building,
        floor: r.floor,
        capacity: r.capacity,
        amenities: r.amenities,
        imageUrl: r.imageUrl,
        isAvailable: r.isAvailable,
      }))
    }
  } catch {
    // Fall through to synthetic
  }

  // Fall back to synthetic rooms
  if (rooms.length === 0) {
    rooms = SYNTHETIC_ROOMS.filter((r) => {
      if (params.capacity && r.capacity < params.capacity) return false
      if (params.building && !r.building.toLowerCase().includes(params.building.toLowerCase())) return false
      return true
    })
  }

  return rooms
}

/**
 * Book a room — simulated, returns confirmation.
 */
export async function bookRoom(
  roomId: string,
  params: {
    date: string
    startTime: string
    endTime: string
    eventTitle: string
    requesterId: string
  }
): Promise<{ success: boolean; confirmationId: string; room: string }> {
  const confirmationId = `25L-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  // Look up room name from DB or synthetic
  let roomName = roomId
  try {
    const dbRoom = await prisma.campusRoom.findUnique({ where: { id: roomId } })
    if (dbRoom) {
      roomName = `${dbRoom.name} (${dbRoom.building})`
    }
  } catch {
    // Try synthetic
    const synth = SYNTHETIC_ROOMS.find((r) => r.id === roomId)
    if (synth) roomName = `${synth.name} (${synth.building})`
  }

  console.log(`[university-systems] Simulated room booking: ${roomName} on ${params.date} ${params.startTime}-${params.endTime} for "${params.eventTitle}"`)

  return {
    success: true,
    confirmationId,
    room: roomName,
  }
}

// =========================================================================
// 3. Attendance
// =========================================================================

/**
 * Log attendance for a course session.
 */
export async function logAttendance(
  courseId: string,
  loggedById: string,
  records: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' }[],
  date?: string
): Promise<{ saved: number }> {
  const sessionDate = date ? new Date(date) : new Date()
  // Normalize to start of day
  sessionDate.setHours(0, 0, 0, 0)

  let saved = 0
  for (const record of records) {
    try {
      await prisma.attendanceRecord.upsert({
        where: {
          courseId_studentId_date: {
            courseId,
            studentId: record.studentId,
            date: sessionDate,
          },
        },
        update: {
          status: record.status,
          loggedById,
          source: 'manual',
        },
        create: {
          courseId,
          studentId: record.studentId,
          loggedById,
          date: sessionDate,
          status: record.status,
          source: 'manual',
        },
      })
      saved++
    } catch (err) {
      console.error(`[university-systems] Failed to log attendance for student ${record.studentId}:`, err)
    }
  }

  return { saved }
}

/**
 * Import attendance from CSV (iClicker-style format).
 * Expected format: one header row, then "StudentEmail,Status" per line.
 * Status values: PRESENT, ABSENT, EXCUSED, LATE (case-insensitive).
 */
export async function importAttendanceCSV(
  courseId: string,
  loggedById: string,
  csvContent: string
): Promise<{ imported: number; errors: string[] }> {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    return { imported: 0, errors: ['CSV must contain a header row and at least one data row.'] }
  }

  // Skip header
  const dataLines = lines.slice(1)
  const errors: string[] = []
  const validStatuses = new Set(['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'])
  const records: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' }[] = []

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim()
    if (!line) continue

    const parts = line.split(',').map((p) => p.trim())
    if (parts.length < 2) {
      errors.push(`Row ${i + 2}: Expected "StudentEmail,Status" but got "${line}"`)
      continue
    }

    const email = parts[0]
    const statusRaw = parts[1].toUpperCase()

    if (!validStatuses.has(statusRaw)) {
      errors.push(`Row ${i + 2}: Invalid status "${parts[1]}". Expected PRESENT, ABSENT, EXCUSED, or LATE.`)
      continue
    }

    // Look up student by email
    try {
      const student = await prisma.user.findUnique({ where: { email } })
      if (!student) {
        errors.push(`Row ${i + 2}: No student found with email "${email}"`)
        continue
      }
      records.push({
        studentId: student.id,
        status: statusRaw as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE',
      })
    } catch {
      errors.push(`Row ${i + 2}: Database error looking up "${email}"`)
    }
  }

  if (records.length > 0) {
    const result = await logAttendance(courseId, loggedById, records)
    return { imported: result.saved, errors }
  }

  return { imported: 0, errors }
}

/**
 * Get attendance summary for a course — aggregated by student.
 */
export async function getAttendanceSummary(courseId: string): Promise<{
  students: {
    studentId: string
    studentName: string
    present: number
    absent: number
    excused: number
    late: number
    total: number
    riskFlag: boolean
  }[]
}> {
  const records = await prisma.attendanceRecord.findMany({
    where: { courseId },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { date: 'asc' },
  })

  // Aggregate per student
  const map = new Map<string, {
    studentId: string
    studentName: string
    present: number
    absent: number
    excused: number
    late: number
    total: number
  }>()

  for (const r of records) {
    let entry = map.get(r.studentId)
    if (!entry) {
      entry = {
        studentId: r.studentId,
        studentName: r.student?.name ?? 'Unknown',
        present: 0,
        absent: 0,
        excused: 0,
        late: 0,
        total: 0,
      }
      map.set(r.studentId, entry)
    }

    entry.total++
    switch (r.status) {
      case 'PRESENT': entry.present++; break
      case 'ABSENT': entry.absent++; break
      case 'EXCUSED': entry.excused++; break
      case 'LATE': entry.late++; break
    }
  }

  const students = Array.from(map.values()).map((s) => ({
    ...s,
    // Flag students with >=3 absences or attendance rate below 75%
    riskFlag: s.absent >= 3 || (s.total > 0 && (s.present + s.excused) / s.total < 0.75),
  }))

  return { students }
}

/**
 * Get attendance records for a specific student in a course.
 */
export async function getStudentAttendance(
  courseId: string,
  studentId: string
): Promise<AttendanceRecord[]> {
  return prisma.attendanceRecord.findMany({
    where: { courseId, studentId },
    orderBy: { date: 'desc' },
  })
}

// =========================================================================
// 4. Travel Reimbursement
// =========================================================================

/**
 * Create a travel reimbursement request.
 */
export async function createTravelReimbursement(
  requesterId: string,
  data: {
    tripPurpose: string
    destination: string
    startDate: string
    endDate: string
    expenses: { category: string; description: string; amount: number }[]
    fundingSource?: string
    grantNumber?: string
  }
): Promise<TravelReimbursement> {
  const totalAmount = data.expenses.reduce((sum, e) => sum + e.amount, 0)

  return prisma.travelReimbursement.create({
    data: {
      requesterId,
      tripPurpose: data.tripPurpose,
      destination: data.destination,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      expenses: data.expenses,
      totalAmount,
      fundingSource: data.fundingSource ?? null,
      grantNumber: data.grantNumber ?? null,
      status: 'REIMBURSEMENT_DRAFT',
    },
  })
}

/**
 * Get a user's reimbursement requests.
 */
export async function getUserReimbursements(userId: string): Promise<TravelReimbursement[]> {
  return prisma.travelReimbursement.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Generate pre-filled reimbursement form content.
 * Returns structured text (not an actual PDF) for display/download.
 */
export async function generateReimbursementForm(reimbursementId: string): Promise<{
  formContent: string
  totalAmount: number
  summary: string
}> {
  const reimbursement = await prisma.travelReimbursement.findUniqueOrThrow({
    where: { id: reimbursementId },
    include: { requester: { select: { name: true, email: true } } },
  })

  const expenses = (reimbursement.expenses as { category: string; description: string; amount: number }[]) ?? []
  const totalAmount = reimbursement.totalAmount

  const expenseLines = expenses
    .map((e, i) => `  ${i + 1}. ${e.category} — ${e.description}: $${e.amount.toFixed(2)}`)
    .join('\n')

  const formContent = [
    '═══════════════════════════════════════════════════',
    '        UNIVERSITY OF KENTUCKY',
    '        TRAVEL REIMBURSEMENT REQUEST',
    '═══════════════════════════════════════════════════',
    '',
    `Requester:      ${reimbursement.requester?.name ?? 'N/A'}`,
    `Email:          ${reimbursement.requester?.email ?? 'N/A'}`,
    `Trip Purpose:   ${reimbursement.tripPurpose}`,
    `Destination:    ${reimbursement.destination}`,
    `Travel Dates:   ${reimbursement.startDate.toISOString().split('T')[0]} to ${reimbursement.endDate.toISOString().split('T')[0]}`,
    `Funding Source: ${reimbursement.fundingSource ?? 'Department'}`,
    ...(reimbursement.grantNumber ? [`Grant Number:   ${reimbursement.grantNumber}`] : []),
    '',
    '───────────────────────────────────────────────────',
    'EXPENSES',
    '───────────────────────────────────────────────────',
    expenseLines,
    '',
    `TOTAL: $${totalAmount.toFixed(2)}`,
    '',
    '───────────────────────────────────────────────────',
    `Status:         ${reimbursement.status}`,
    `Date Created:   ${reimbursement.createdAt.toISOString().split('T')[0]}`,
    '═══════════════════════════════════════════════════',
  ].join('\n')

  const summary = `Travel reimbursement for ${reimbursement.destination} (${reimbursement.tripPurpose}), ${expenses.length} expense(s) totaling $${totalAmount.toFixed(2)}.`

  return { formContent, totalAmount, summary }
}

// =========================================================================
// 5. Department Website
// =========================================================================

/**
 * Submit a website change request.
 */
export async function submitWebsiteChangeRequest(
  facultyId: string,
  data: {
    section: string
    pageUrl?: string
    currentContent?: string
    newContent: string
  }
): Promise<WebsiteChangeRequest> {
  return prisma.websiteChangeRequest.create({
    data: {
      facultyId,
      section: data.section,
      pageUrl: data.pageUrl ?? null,
      currentContent: data.currentContent ?? null,
      newContent: data.newContent,
      status: 'CHANGE_SUBMITTED',
      submittedAt: new Date(),
    },
  })
}

/**
 * Get a user's website change requests.
 */
export async function getUserChangeRequests(userId: string): Promise<WebsiteChangeRequest[]> {
  return prisma.websiteChangeRequest.findMany({
    where: { facultyId: userId },
    orderBy: { createdAt: 'desc' },
  })
}

// =========================================================================
// 6. Travel Grants
// =========================================================================

/**
 * Search eligible grants. Falls back to SYNTHETIC_GRANTS if no TravelGrant
 * records exist in the database.
 */
export async function searchTravelGrants(params?: { category?: string }): Promise<TravelGrant[]> {
  try {
    const dbGrants = await prisma.travelGrant.findMany({
      where: {
        isActive: true,
        ...(params?.category ? { categories: { has: params.category } } : {}),
      },
      orderBy: { deadline: 'asc' },
    })

    if (dbGrants.length > 0) {
      return dbGrants
    }
  } catch {
    // Fall through to synthetic
  }

  // Return synthetic grants, filtered by category if provided
  let filtered = SYNTHETIC_GRANTS
  if (params?.category) {
    filtered = SYNTHETIC_GRANTS.filter((g) =>
      g.categories.some((c) => c.toLowerCase().includes(params.category!.toLowerCase()))
    )
  }

  // Cast synthetic to match TravelGrant shape
  return filtered.map((g) => ({
    id: g.id,
    name: g.name,
    provider: g.provider,
    description: g.description,
    maxAmount: g.maxAmount,
    eligibility: g.eligibility,
    deadline: g.deadline ? new Date(g.deadline) : null,
    applicationUrl: g.applicationUrl,
    categories: g.categories,
    isActive: g.isActive,
    createdAt: new Date(),
  })) as TravelGrant[]
}

/**
 * Match grants to a specific conference/trip using keyword matching.
 */
export async function matchGrantsToTrip(tripDescription: string): Promise<{
  grants: TravelGrant[]
  matchReasons: string[]
}> {
  const allGrants = await searchTravelGrants()
  const descLower = tripDescription.toLowerCase()

  const keywords: Record<string, string[]> = {
    conference: ['conference', 'symposium', 'meeting', 'summit', 'present', 'presentation', 'poster'],
    research: ['research', 'study', 'investigate', 'lab', 'data', 'experiment', 'fieldwork', 'field work'],
    'professional-development': ['professional development', 'training', 'certification', 'skill', 'career'],
    workshop: ['workshop', 'seminar', 'bootcamp', 'tutorial'],
    teaching: ['teaching', 'pedagogy', 'instruction', 'curriculum', 'course design'],
    international: ['international', 'abroad', 'overseas', 'foreign', 'global'],
    STEM: ['stem', 'engineering', 'computer', 'science', 'math', 'physics', 'chemistry', 'biology', 'technology'],
    arts: ['arts', 'humanities', 'literature', 'philosophy', 'history', 'music', 'theater', 'creative'],
    humanities: ['humanities', 'literature', 'philosophy', 'history', 'language', 'cultural'],
    'health-sciences': ['health', 'medical', 'clinical', 'nursing', 'pharmacy', 'public health'],
    fieldwork: ['fieldwork', 'field work', 'site visit', 'archive', 'archival'],
  }

  // Detect which categories match the trip description
  const matchedCategories = new Set<string>()
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((w) => descLower.includes(w))) {
      matchedCategories.add(category)
    }
  }

  // Score each grant
  const scored = allGrants.map((grant) => {
    const grantCategories = (grant.categories ?? []) as string[]
    const overlap = grantCategories.filter((c) => matchedCategories.has(c))
    // Also check if the description keywords appear in the grant description
    const descWords = descLower.split(/\s+/)
    const grantDescLower = grant.description.toLowerCase()
    const nameMatch = descWords.some((w) => w.length > 4 && grant.name.toLowerCase().includes(w))
    const descMatch = descWords.filter((w) => w.length > 4 && grantDescLower.includes(w)).length

    return {
      grant,
      categoryOverlap: overlap,
      score: overlap.length * 3 + (nameMatch ? 2 : 0) + Math.min(descMatch, 3),
    }
  })

  // Filter to grants with at least some match, sort by score
  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  const grants = matched.map((m) => m.grant)
  const matchReasons = matched.map((m) => {
    const parts: string[] = []
    if (m.categoryOverlap.length > 0) {
      parts.push(`Matches categories: ${m.categoryOverlap.join(', ')}`)
    }
    parts.push(`Up to $${m.grant.maxAmount.toLocaleString()} from ${m.grant.provider}`)
    if (m.grant.deadline) {
      parts.push(`Deadline: ${new Date(m.grant.deadline).toISOString().split('T')[0]}`)
    }
    return `${m.grant.name}: ${parts.join('. ')}`
  })

  return { grants, matchReasons }
}

// =========================================================================
// 7. Paper Review
// =========================================================================

/**
 * Create a paper review entry.
 */
export async function createPaperReview(
  facultyId: string,
  data: {
    title: string
    authors: string
    source: string
    venue?: string
    dueDate?: string
  }
): Promise<PaperReview> {
  return prisma.paperReview.create({
    data: {
      facultyId,
      title: data.title,
      authors: data.authors,
      source: data.source,
      venue: data.venue ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: 'PENDING',
    },
  })
}

/**
 * Get a faculty member's paper reviews.
 */
export async function getFacultyPaperReviews(facultyId: string): Promise<PaperReview[]> {
  return prisma.paperReview.findMany({
    where: { facultyId },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })
}

/**
 * Generate structural analysis of paper content using Haiku.
 * Stores the analysis on the PaperReview record.
 */
export async function analyzePaperStructure(
  reviewId: string,
  paperContent: string
): Promise<{
  analysis: string
  suggestedComments: { section: string; comment: string; type: string }[]
}> {
  try {
    const anthropic = getAnthropic()

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a scholarly peer-review assistant. Analyze the following paper excerpt and provide:

1. A structural analysis (2-3 paragraphs) covering: methodology strength, argument structure, evidence quality, and writing clarity.
2. Section-specific comments as a JSON array with objects having "section" (e.g., "Abstract", "Methods", "Results", "Discussion", "References"), "comment" (constructive feedback), and "type" ("strength", "concern", or "suggestion").

Respond in this exact JSON format:
{
  "analysis": "Your structural analysis here...",
  "suggestedComments": [
    {"section": "...", "comment": "...", "type": "..."}
  ]
}

Paper content:
${paperContent.slice(0, 8000)}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const analysis = parsed.analysis ?? ''
      const suggestedComments = Array.isArray(parsed.suggestedComments)
        ? parsed.suggestedComments
        : []

      // Save to the review record
      await prisma.paperReview.update({
        where: { id: reviewId },
        data: {
          structuralAnalysis: analysis,
          status: 'IN_PROGRESS',
        },
      })

      return { analysis, suggestedComments }
    }

    // If parsing fails, use raw text
    await prisma.paperReview.update({
      where: { id: reviewId },
      data: { structuralAnalysis: text, status: 'IN_PROGRESS' },
    })

    return { analysis: text, suggestedComments: [] }
  } catch (err) {
    console.error('[university-systems] Paper analysis failed:', err)

    // Fallback analysis
    const fallbackAnalysis =
      'Automated structural analysis is temporarily unavailable. Please review the paper manually and add your comments below.'

    return {
      analysis: fallbackAnalysis,
      suggestedComments: [
        { section: 'General', comment: 'Review the methodology section for rigor and reproducibility.', type: 'suggestion' },
        { section: 'General', comment: 'Check that all claims are supported by evidence or citations.', type: 'suggestion' },
        { section: 'General', comment: 'Evaluate the clarity and organization of the argument.', type: 'suggestion' },
      ],
    }
  }
}

/**
 * Update a paper review with comments, assessment, or status.
 */
export async function updatePaperReview(
  reviewId: string,
  data: {
    comments?: unknown
    overallAssessment?: string
    status?: string
  }
): Promise<PaperReview> {
  return prisma.paperReview.update({
    where: { id: reviewId },
    data: {
      ...(data.comments !== undefined ? { comments: data.comments as object } : {}),
      ...(data.overallAssessment !== undefined ? { overallAssessment: data.overallAssessment } : {}),
      ...(data.status !== undefined ? { status: data.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' } : {}),
      updatedAt: new Date(),
    },
  })
}
