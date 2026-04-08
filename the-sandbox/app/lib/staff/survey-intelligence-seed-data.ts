/**
 * Survey Intelligence — Seed Data
 *
 * Creates a demo survey project with vault documents for Morgan Rivera (STAFF).
 * Run via: npx tsx scripts/seed-survey-intelligence.ts
 */

import { prisma } from '../prisma'
import { getTemplate } from './survey-intelligence-templates'

const MORGAN_EMAIL = 'morgan.rivera@uky.edu'

/** Sample vault documents representing institutional evidence. */
const VAULT_DOCUMENTS = [
  {
    title: 'FY2025 Budget Book — Employee Benefits Summary',
    sourceType: 'pdf' as const,
    category: 'compensation-benefits',
    fullText: `University of Kentucky Employee Benefits Overview FY2025

The University of Kentucky provides a comprehensive benefits package valued at an average of $32,400 per employee annually.

Tuition Assistance Program
UK employees who have completed one year of continuous service may enroll in up to 18 credit hours per academic year at no tuition cost. Dependents of employees with 5+ years of service receive a 50% tuition discount. In FY2025, 2,847 employees and 1,203 dependents utilized this benefit, representing a total investment of $18.2 million.

Retirement Benefits
UK contributes 10% of eligible salary to the Kentucky Teachers' Retirement System (KTRS) for faculty and 5% employer match to the 403(b) plan for staff. Total retirement contributions in FY2025: $142.7 million.

Health Insurance
UK covers 80% of health insurance premiums for employees, with plans starting at $42/month for individual coverage. The UK HealthCare Employee Wellness Program provides free annual biometric screenings, flu shots, and wellness coaching to all benefit-eligible employees.

Employee Emergency Fund
Established in 2019, the UK Employee Emergency Fund has distributed $487,000 to 312 employees facing unexpected financial hardship. The fund is sustained by voluntary payroll deductions and university matching.

Flexible Work Arrangements
Administrative Regulation 2:9 establishes UK's Flexible Work Policy, allowing eligible employees to work remotely up to 3 days per week. As of January 2025, 4,218 employees (26% of benefit-eligible staff) have approved flexible work arrangements.`,
    pageCount: 12,
  },
  {
    title: 'UKWell — Workplace Wellness Programs Annual Report',
    sourceType: 'pdf' as const,
    category: 'stress-relief',
    fullText: `UKWell Workplace Wellness Programs — Annual Report 2024-2025

Recharge Breaks Program
Launched in Fall 2022, Recharge Breaks are 30-minute guided wellness sessions held every Wednesday at noon in the Student Center Grand Ballroom. Activities rotate between yoga, meditation, art therapy, and dance fitness. FY2025 participation: 14 sessions, average 85 attendees per session. Post-session surveys show 94% of participants report reduced stress levels.

Wildcat Wellness Challenge
An annual 8-week team wellness competition held each spring. Teams of 4-6 employees track physical activity, nutrition, sleep, and mindfulness minutes. FY2025 participation: 187 teams (823 employees). Grand prize: extra vacation day for winning team. The Challenge has run for 7 consecutive years.

Pet Therapy Visits
UK's Human-Animal Bond Program brings certified therapy dogs to 12 campus locations during finals week and midterms. In FY2025, therapy dog visits expanded to staff-only sessions during the December budget close and March performance review periods. 340 staff participated across 8 sessions.

Employee Recreation
All UK employees receive free access to the Johnson Center fitness facilities ($600/year value), including pool, weight room, group fitness classes, and indoor track. Employees may also join the UK Golf Course at a 60% discount.

Mental Health First Aid Training
208 supervisors completed Mental Health First Aid certification in FY2025, a 45% increase from FY2024. UK Counseling Center provides 6 free EAP sessions per employee per year.`,
    pageCount: 8,
  },
  {
    title: 'UK Community Engagement Report FY2025',
    sourceType: 'text' as const,
    category: 'community-service',
    fullText: `University of Kentucky Community Engagement Annual Report — Fiscal Year 2025

As Kentucky's flagship land-grant university, community service isn't merely encouraged — it is foundational to our constitutional mission established in the Morrill Act of 1862.

United Way Campaign
UK's 2024-2025 United Way of the Bluegrass campaign raised $2.1 million, making UK the #1 workplace campaign in Central Kentucky for the 19th consecutive year. Employee participation rate: 34% (5,400+ donors). The campaign is led by a committee of 50+ volunteer captains across all colleges and units.

Big Blue Give Day
UK's annual day of giving on March 4, 2025 generated $8.7 million from 12,400 donors across all 50 states. Community-focused projects funded included: the Robinson Center for Appalachian Resource Sustainability ($340K), UK HealthCare Mobile Health Clinic ($275K), and the MLK Center Community Leadership Pipeline ($180K).

CARES Corps (Community Action & Resource Engagement Service)
UK CARES Corps deployed 2,300 student, faculty, and staff volunteers who logged 47,000 service hours across 180 community partner organizations in FY2025. Key partnerships include: Lexington Rescue Mission, God's Pantry Food Bank, Habitat for Humanity of Lexington, and Fayette County Public Schools mentoring program.

Cooperative Extension
UK Cooperative Extension maintains offices in all 120 Kentucky counties, reaching 2.8 million Kentuckians annually. In FY2025, Extension programs generated $89 million in documented economic impact, including agricultural productivity gains, nutrition education, and 4-H youth development (145,000 youth participants).

UK HealthCare Community Health Programs
UK HealthCare provided $423 million in uncompensated and community benefit care in FY2025. The Markey Cancer Center's Community Outreach program conducted 12,400 cancer screenings in underserved Eastern Kentucky communities.`,
    pageCount: 0,
  },
  {
    title: 'Staff Senate Resolution on Shared Governance — March 2025',
    sourceType: 'text' as const,
    category: 'governance',
    fullText: `Staff Senate Resolution SR-2025-003: Reaffirming Shared Governance at the University of Kentucky

The University Senate (est. 1917) and Staff Senate (est. 2002) provide formal shared governance structures ensuring all employee voices are represented in institutional decision-making.

University Senate: 120 members representing all academic units. Meets monthly September through May. Standing committees include: Academic Programs, Admissions & Retention, UK Core Education, Research & Graduate Education.

Staff Senate: 65 elected representatives from all staff employment categories. Meets monthly. Standing committees: Benefits, Workplace Environment, Staff Morale, Diversity & Inclusion.

Joint Advisory Committee: Created in 2018, the Joint Advisory Committee brings together 6 members from each senate to advise the President and Provost on matters affecting both faculty and staff. The JAC meets quarterly and has been credited with influencing the 2023 parental leave expansion, the 2024 flexible work policy revision, and the 2025 staff compensation equity study.

In FY2025, 23 resolutions were passed across both senates, with 18 (78%) resulting in policy changes or administrative action within 6 months. President Capilouto holds an annual open forum with each senate, and the Provost attends at least 3 University Senate meetings per year.`,
    pageCount: 0,
  },
  {
    title: 'UK Professional Development Programs Overview',
    sourceType: 'text' as const,
    category: 'professional-development',
    fullText: `Professional Development at the University of Kentucky — Programs & Participation

LEAD UK (Leadership Education & Advancement Development)
UK's premier leadership development program for staff, now in its 12th year. The 9-month cohort program develops emerging leaders through workshops, mentoring, and a capstone project. FY2025 cohort: 32 participants. 78% of LEAD UK alumni have been promoted within 3 years of completion. Total alumni: 340+.

Supervisor Certificate Program
A 6-module training program required for all new supervisors, covering performance management, conflict resolution, Title IX, and inclusive leadership. 186 supervisors completed the certificate in FY2025.

Conference & Professional Development Fund
Each department receives an annual professional development allocation averaging $1,200 per employee. In FY2025, 4,100 employees used these funds for conferences, certifications, and workshops. Total institutional investment: $4.9 million.

Educational Incentive Program
Beyond tuition assistance, UK provides paid release time (up to 6 hours/week) for employees pursuing degrees aligned with their career development plan. 412 employees utilized release time in FY2025.

Center for the Enhancement of Learning and Teaching (CELT)
CELT served 1,840 faculty in FY2025 through workshops, course design consultations, and teaching observations. The Provost's Teaching Award recognizes 5 outstanding instructors annually with a $5,000 prize and course release.`,
    pageCount: 0,
  },
]

export async function seedSurveyIntelligence() {
  console.log('[seed] Starting Survey Intelligence seed...')

  // Find Morgan Rivera
  const morgan = await prisma.user.findUnique({ where: { email: MORGAN_EMAIL } })
  if (!morgan) {
    console.error('[seed] Morgan Rivera not found — run seed-staff.ts first')
    return
  }

  // Check if already seeded
  const existing = await prisma.surveyProject.findFirst({ where: { creatorId: morgan.id } })
  if (existing) {
    console.log('[seed] Survey Intelligence already seeded — skipping')
    return
  }

  // Create project from Great Colleges template
  const template = getTemplate('great-colleges-2026')
  if (!template) {
    console.error('[seed] Template not found')
    return
  }

  const project = await prisma.surveyProject.create({
    data: {
      creatorId: morgan.id,
      title: template.title,
      surveyOrg: template.organization,
      templateKey: template.key,
      status: 'active',
      notes: 'Annual submission for ModernThink Great Colleges to Work For recognition program.',
    },
  })
  console.log(`[seed] Created project: ${project.title}`)

  // Create questions from template
  for (const q of template.questions) {
    await prisma.surveyQuestion.create({
      data: {
        projectId: project.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        category: q.category,
        wordLimit: q.wordLimit,
        writingTips: q.writingTips,
      },
    })
  }
  console.log(`[seed] Created ${template.questions.length} questions`)

  // Create vault documents (without embeddings — those require OpenAI)
  for (const doc of VAULT_DOCUMENTS) {
    await prisma.surveyVaultDocument.create({
      data: {
        uploadedById: morgan.id,
        projectId: project.id,
        title: doc.title,
        sourceType: doc.sourceType,
        category: doc.category,
        fullText: doc.fullText,
        pageCount: doc.pageCount,
      },
    })
  }
  console.log(`[seed] Created ${VAULT_DOCUMENTS.length} vault documents`)

  console.log('[seed] Survey Intelligence seed complete!')
}
