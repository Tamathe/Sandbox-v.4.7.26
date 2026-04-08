// Seed script for University Systems Integration Hub demo data
// Run: npx tsx scripts/seed-university-systems.ts

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

async function main() {
  console.log('Seeding University Systems Integration Hub demo data...')

  // ── Find Katie Thompson (EDUCATOR) ──────────────────────────
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  if (!katie) {
    console.error('Katie Thompson not found — run main seed first')
    process.exit(1)
  }

  // Find Katie's courses
  const courses = await prisma.course.findMany({ where: { instructorId: katie.id } })
  if (courses.length === 0) {
    console.error('No courses found for Katie — run main seed first')
    process.exit(1)
  }
  const course = courses[0]

  // Find enrolled students for attendance seeding
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId: course.id },
    include: { student: { select: { id: true, name: true } } },
    take: 10,
  })

  // ── 1. Seed CampusRoom records (12 rooms) ──────────────────
  const rooms = [
    { id: 'room-wh-101', name: 'White Hall 101', building: 'White Hall', floor: 1, capacity: 40, amenities: ['projector', 'whiteboard', 'outlets'], isAvailable: true },
    { id: 'room-wh-205', name: 'White Hall 205', building: 'White Hall', floor: 2, capacity: 30, amenities: ['projector', 'whiteboard', 'video-conf'], isAvailable: true },
    { id: 'room-cp-110', name: 'Chemistry-Physics 110', building: 'Chemistry-Physics Building', floor: 1, capacity: 200, amenities: ['projector', 'microphone', 'outlets', 'video-conf'], isAvailable: true },
    { id: 'room-fp-257', name: 'Funkhouser 257', building: 'Funkhouser Building', floor: 2, capacity: 25, amenities: ['whiteboard', 'outlets'], isAvailable: true },
    { id: 'room-kl-conf', name: 'King Library Conference Room', building: 'M.I. King Library', floor: 3, capacity: 12, amenities: ['video-conf', 'whiteboard', 'outlets'], isAvailable: true },
    { id: 'room-yl-a110', name: 'Young Library A110', building: 'William T. Young Library', floor: 1, capacity: 50, amenities: ['projector', 'microphone', 'video-conf', 'outlets'], isAvailable: true },
    { id: 'room-be-100', name: 'Bowman\'s Den 100', building: 'Student Center', floor: 1, capacity: 80, amenities: ['projector', 'microphone', 'outlets'], isAvailable: true },
    { id: 'room-jh-320', name: 'Jacobs Hall 320', building: 'Jacobs Science Building', floor: 3, capacity: 35, amenities: ['projector', 'whiteboard', 'lab-stations'], isAvailable: true },
    { id: 'room-tf-200', name: 'Taylor Education 200', building: 'Taylor Education Building', floor: 2, capacity: 60, amenities: ['projector', 'whiteboard', 'video-conf', 'outlets'], isAvailable: true },
    { id: 'room-mk-seminar', name: 'Marksbury Seminar Room', building: 'Marksbury Building', floor: 2, capacity: 20, amenities: ['video-conf', 'whiteboard', 'outlets'], isAvailable: true },
    { id: 'room-eg-140', name: 'Erickson Hall 140', building: 'Erickson Hall', floor: 1, capacity: 150, amenities: ['projector', 'microphone', 'outlets', 'video-conf'], isAvailable: true },
    { id: 'room-pk-board', name: 'Patterson Office Tower Boardroom', building: 'Patterson Office Tower', floor: 18, capacity: 16, amenities: ['video-conf', 'whiteboard', 'outlets', 'catering-available'], isAvailable: true },
  ]

  for (const room of rooms) {
    await prisma.campusRoom.upsert({
      where: { id: room.id },
      create: room,
      update: {
        name: room.name,
        building: room.building,
        floor: room.floor,
        capacity: room.capacity,
        amenities: room.amenities,
        isAvailable: room.isAvailable,
      },
    })
  }
  console.log(`  ✓ ${rooms.length} campus rooms`)

  // ── 2. Seed TravelGrant records (12 grants) ────────────────
  const grants = [
    {
      id: 'grant-gs-conference',
      name: 'Graduate School Conference Travel Award',
      provider: 'Graduate School',
      description: 'Supports graduate student travel to present research at national/international conferences. Priority given to students presenting papers or posters. Must be enrolled full-time.',
      maxAmount: 800,
      eligibility: 'Full-time graduate students in good standing who are presenting research at the conference.',
      deadline: new Date('2026-05-01'),
      applicationUrl: 'https://gradschool.uky.edu/travel-awards',
      categories: ['conference'],
      isActive: true,
    },
    {
      id: 'grant-gs-dissertation',
      name: 'Dissertation Enhancement Award',
      provider: 'Graduate School',
      description: 'Funds travel essential to completing dissertation research — archival visits, field work, data collection at external sites, or collaboration with researchers at other institutions.',
      maxAmount: 2000,
      eligibility: 'Doctoral candidates who have passed qualifying exams. Must demonstrate how travel directly supports dissertation research.',
      deadline: new Date('2026-04-15'),
      applicationUrl: 'https://gradschool.uky.edu/dissertation-enhancement',
      categories: ['research'],
      isActive: true,
    },
    {
      id: 'grant-provost-pd',
      name: 'Provost Professional Development Fund',
      provider: 'Provost Office',
      description: 'Faculty professional development grants for attending workshops, seminars, and training programs that enhance teaching effectiveness or research capacity.',
      maxAmount: 1500,
      eligibility: 'Full-time faculty members (tenure-track and non-tenure-track). Priority for early-career faculty within first 5 years.',
      deadline: new Date('2026-06-01'),
      applicationUrl: 'https://provost.uky.edu/pd-fund',
      categories: ['conference', 'professional-development'],
      isActive: true,
    },
    {
      id: 'grant-arts-sci-travel',
      name: 'A&S Faculty Research Travel',
      provider: 'Department',
      description: 'College of Arts & Sciences travel support for faculty presenting research at peer-reviewed conferences. Covers registration, airfare, and lodging.',
      maxAmount: 1200,
      eligibility: 'Arts & Sciences faculty presenting original research. One award per fiscal year.',
      deadline: null,
      applicationUrl: 'https://as.uky.edu/faculty-travel',
      categories: ['conference', 'research'],
      isActive: true,
    },
    {
      id: 'grant-undergrad-research',
      name: 'Undergraduate Research Travel Grant',
      provider: 'Office of Undergraduate Research',
      description: 'Supports undergraduate students traveling to present research at regional or national conferences. Includes poster and oral presentations.',
      maxAmount: 500,
      eligibility: 'Undergraduate students presenting faculty-mentored research. Must have faculty sponsor letter.',
      deadline: new Date('2026-04-01'),
      applicationUrl: 'https://www.uky.edu/our/travel-grants',
      categories: ['conference', 'research'],
      isActive: true,
    },
    {
      id: 'grant-engineering-conf',
      name: 'Engineering Faculty Conference Support',
      provider: 'Department',
      description: 'College of Engineering travel support for faculty attending top-tier engineering conferences (IEEE, ACM, ASME, etc.).',
      maxAmount: 2500,
      eligibility: 'Engineering faculty with accepted paper or invited talk. Priority for tenure-track assistant professors.',
      deadline: null,
      applicationUrl: 'https://engr.uky.edu/travel-support',
      categories: ['conference'],
      isActive: true,
    },
    {
      id: 'grant-intl-research',
      name: 'International Research Collaboration Grant',
      provider: 'International Center',
      description: 'Supports faculty and graduate students traveling internationally for collaborative research projects with partner institutions.',
      maxAmount: 3000,
      eligibility: 'Faculty or graduate students with an established international collaboration. Must provide letter from collaborating institution.',
      deadline: new Date('2026-03-31'),
      applicationUrl: 'https://international.uky.edu/research-grants',
      categories: ['research'],
      isActive: true,
    },
    {
      id: 'grant-celt-teaching',
      name: 'CELT Teaching Conference Award',
      provider: 'CELT',
      description: 'Center for the Enhancement of Learning & Teaching travel grants for faculty attending teaching-focused conferences (AAC&U, AAHE, POD, Lilly).',
      maxAmount: 1000,
      eligibility: 'Any UK faculty member attending a teaching and learning conference. Must share insights at a CELT session upon return.',
      deadline: new Date('2026-05-15'),
      applicationUrl: 'https://celt.uky.edu/travel',
      categories: ['conference', 'professional-development'],
      isActive: true,
    },
    {
      id: 'grant-sga-student',
      name: 'SGA Student Conference Fund',
      provider: 'Student Government',
      description: 'Student Government Association fund for undergraduate and graduate students attending academic or professional conferences.',
      maxAmount: 400,
      eligibility: 'Any enrolled UK student attending an academic or professional conference. Limited to one award per academic year.',
      deadline: null,
      applicationUrl: 'https://sga.uky.edu/conference-fund',
      categories: ['conference', 'professional-development'],
      isActive: true,
    },
    {
      id: 'grant-staff-pd',
      name: 'Staff Professional Development Award',
      provider: 'HR',
      description: 'Supports university staff attending professional development conferences, certification programs, or training workshops relevant to their position.',
      maxAmount: 750,
      eligibility: 'Full-time staff employees with supervisor approval. Must complete a development plan with supervisor.',
      deadline: new Date('2026-07-01'),
      applicationUrl: 'https://hr.uky.edu/staff-development',
      categories: ['professional-development'],
      isActive: true,
    },
    {
      id: 'grant-health-sciences',
      name: 'Health Sciences Research Travel',
      provider: 'Department',
      description: 'College of Health Sciences travel support for faculty and post-docs presenting at health sciences and biomedical conferences.',
      maxAmount: 2000,
      eligibility: 'Health Sciences faculty and post-doctoral researchers presenting original research.',
      deadline: new Date('2026-04-30'),
      applicationUrl: 'https://healthsciences.uky.edu/travel',
      categories: ['conference', 'research'],
      isActive: true,
    },
    {
      id: 'grant-sustainability',
      name: 'Sustainability Research Travel Fund',
      provider: 'External',
      description: 'Tracy Farmer Institute for Sustainability and the Environment travel support for interdisciplinary sustainability research presentations.',
      maxAmount: 1500,
      eligibility: 'Faculty or students whose research relates to sustainability, environment, or climate. Must describe sustainability connection.',
      deadline: new Date('2026-06-15'),
      applicationUrl: 'https://sustainability.uky.edu/grants',
      categories: ['conference', 'research'],
      isActive: true,
    },
  ]

  for (const grant of grants) {
    await prisma.travelGrant.upsert({
      where: { id: grant.id },
      create: grant,
      update: {
        name: grant.name,
        provider: grant.provider,
        description: grant.description,
        maxAmount: grant.maxAmount,
        eligibility: grant.eligibility,
        deadline: grant.deadline,
        applicationUrl: grant.applicationUrl,
        categories: grant.categories,
        isActive: grant.isActive,
      },
    })
  }
  console.log(`  ✓ ${grants.length} travel grants`)

  // ── 3. Seed AttendanceRecord data for Katie's course ────────
  if (enrollments.length > 0) {
    const attendanceDates = [
      '2026-03-17', '2026-03-19', '2026-03-21',
      '2026-03-24',
    ]
    const statuses: Array<'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'> = ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE']
    let attendanceCount = 0

    for (const dateStr of attendanceDates) {
      const date = new Date(`${dateStr}T10:00:00-04:00`)
      for (const enrollment of enrollments) {
        // Deterministic status: most students present, some patterns
        const hash = (enrollment.student.id.charCodeAt(0) + date.getDate()) % 10
        let status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'
        if (hash < 6) status = 'PRESENT'
        else if (hash < 8) status = 'LATE'
        else if (hash === 8) status = 'EXCUSED'
        else status = 'ABSENT'

        await prisma.attendanceRecord.upsert({
          where: {
            courseId_studentId_date: {
              courseId: course.id,
              studentId: enrollment.student.id,
              date,
            },
          },
          create: {
            courseId: course.id,
            studentId: enrollment.student.id,
            loggedById: katie.id,
            date,
            status,
            source: 'manual',
          },
          update: {
            status,
            loggedById: katie.id,
          },
        })
        attendanceCount++
      }
    }
    console.log(`  ✓ ${attendanceCount} attendance records (${attendanceDates.length} dates × ${enrollments.length} students)`)
  } else {
    console.log('  ⚠ No enrolled students found — skipping attendance records')
  }

  // ── 4. Seed PaperReview records for Katie (2) ──────────────
  const reviews = [
    {
      id: 'review-ai-education-2026',
      facultyId: katie.id,
      title: 'Generative AI in Higher Education: A Systematic Review of Pedagogical Frameworks',
      authors: 'Chen, L., Rodriguez, M., & Park, S.',
      source: 'journal',
      venue: 'Journal of Educational Technology & Society',
      dueDate: new Date('2026-04-15'),
      status: 'IN_PROGRESS' as const,
      structuralAnalysis: 'Well-structured systematic review following PRISMA guidelines. 147 papers screened, 38 included. Strong methodology section. Literature gap identified in discipline-specific AI integration frameworks. Recommendations section could be strengthened with concrete implementation examples.',
      comments: [
        { section: 'Introduction', comment: 'Strong framing of the research gap. Consider citing the 2025 UNESCO report on AI in education.' },
        { section: 'Methodology', comment: 'PRISMA flow diagram is clear. Inclusion criteria well-defined. Consider adding inter-rater reliability statistics.' },
        { section: 'Results', comment: 'Thematic analysis is solid. Table 3 effectively summarizes framework categories.' },
      ],
      overallAssessment: null,
    },
    {
      id: 'review-algo-bias-2026',
      facultyId: katie.id,
      title: 'Algorithmic Bias in Student Success Prediction Models: A Critical Examination',
      authors: 'Williams, T. & Johnson, R.',
      source: 'conference',
      venue: 'ACM Learning Analytics & Knowledge (LAK 2026)',
      dueDate: new Date('2026-04-01'),
      status: 'PENDING' as const,
      structuralAnalysis: null,
      comments: null,
      overallAssessment: null,
    },
  ]

  for (const review of reviews) {
    const { id, ...data } = review
    await prisma.paperReview.upsert({
      where: { id },
      create: { id, ...data, comments: data.comments ?? undefined },
      update: {
        title: data.title,
        authors: data.authors,
        source: data.source,
        venue: data.venue,
        dueDate: data.dueDate,
        status: data.status,
        structuralAnalysis: data.structuralAnalysis,
        comments: data.comments ?? undefined,
        overallAssessment: data.overallAssessment,
      },
    })
  }
  console.log(`  ✓ ${reviews.length} paper reviews`)

  // ── 5. Seed WebsiteChangeRequest for Katie (1) ─────────────
  const changeRequest = {
    id: 'wcr-katie-office-hours',
    facultyId: katie.id,
    section: 'office_hours',
    pageUrl: 'https://cs.uky.edu/people/katie-thompson',
    currentContent: 'Office Hours: MWF 2:00-3:00 PM, Davis Marksbury 319',
    newContent: 'Office Hours: MWF 2:00-3:30 PM, Davis Marksbury 319\nVirtual office hours available by appointment via Zoom.\nDrop-in hours: Thursday 10:00-11:00 AM (no appointment needed)',
    status: 'CHANGE_SUBMITTED' as const,
    submittedAt: new Date('2026-03-23T14:00:00-04:00'),
  }

  await prisma.websiteChangeRequest.upsert({
    where: { id: changeRequest.id },
    create: changeRequest,
    update: {
      section: changeRequest.section,
      pageUrl: changeRequest.pageUrl,
      currentContent: changeRequest.currentContent,
      newContent: changeRequest.newContent,
      status: changeRequest.status,
      submittedAt: changeRequest.submittedAt,
    },
  })
  console.log('  ✓ 1 website change request')

  // ── 6. Seed TravelReimbursement for Katie (1) ──────────────
  const reimbursement = {
    id: 'reimb-katie-sigcse-2026',
    requesterId: katie.id,
    tripPurpose: 'conference',
    destination: 'Portland, OR',
    startDate: new Date('2026-02-25'),
    endDate: new Date('2026-03-01'),
    expenses: [
      { category: 'airfare', description: 'Round-trip LEX → PDX', amount: 425.00 },
      { category: 'hotel', description: 'Hilton Portland (4 nights)', amount: 780.00 },
      { category: 'registration', description: 'SIGCSE 2026 registration', amount: 350.00 },
      { category: 'meals', description: 'Per diem meals (5 days)', amount: 275.00 },
      { category: 'ground-transport', description: 'Airport shuttle + Lyft', amount: 85.00 },
    ],
    totalAmount: 1915.00,
    fundingSource: 'department',
    grantNumber: null,
    status: 'REIMBURSEMENT_SUBMITTED' as const,
    submittedAt: new Date('2026-03-05T09:00:00-05:00'),
    resolvedAt: null,
    notes: 'Presented paper: "Integrating AI Literacy into Undergraduate CS Curriculum: Lessons from UK\'s AI Platform". Co-authored with Dr. Chen.',
  }

  await prisma.travelReimbursement.upsert({
    where: { id: reimbursement.id },
    create: reimbursement,
    update: {
      tripPurpose: reimbursement.tripPurpose,
      destination: reimbursement.destination,
      startDate: reimbursement.startDate,
      endDate: reimbursement.endDate,
      expenses: reimbursement.expenses,
      totalAmount: reimbursement.totalAmount,
      fundingSource: reimbursement.fundingSource,
      status: reimbursement.status,
      submittedAt: reimbursement.submittedAt,
      notes: reimbursement.notes,
    },
  })
  console.log('  ✓ 1 travel reimbursement')

  console.log('\nDone! University Systems Integration Hub data seeded.')
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
