// Student Services Hub — tool catalog
// Parallel to app/lib/campus-navigator.ts but for official UK service offices.
// These are definition-only records (not DB Tool records).
// TODO (2026-04-02): Migrate to isOfficialService:true Tool seed records so ToolSession tracking applies.

export interface CollegeAdvisorContact {
  collegeName?: string
  officeName: string
  email: string
  phone?: string
  location?: string
  appointmentUrl: string
  walkInHours?: string
}

export interface StudentServiceTool {
  slug: string        // required — URL key
  title: string       // required — display name
  serviceArea: string // required — unique slug used for RAG chunk scoping (e.g. "isss", "drc", "financial-aid", "title-ix", "conduct", "housing", "legal-aid")
  subtitle?: string
  escalationEmail?: string
  persona?: string           // name used in system prompt
  icon?: string              // lucide-react icon name
  ragEnabled?: boolean       // query ServiceChunk table on each turn
  sensitiveSession?: boolean // never surface in educator/admin analytics (FERPA)
  crisisLineEnabled?: boolean // prepend crisis resources if crisis keywords detected
  petitionEnabled?: boolean  // create Petition record when appeal flow completes
  requiresLegalDisclaimer?: boolean // render enhanced red disclaimer banner (legal-aid service)
  showCitationsInline?: boolean
  showAppointmentCard?: boolean
  advisorContactByCollege?: Record<string, CollegeAdvisorContact>
}

export const STUDENT_SERVICES_TOOLS: StudentServiceTool[] = [
  {
    slug: 'isss-navigator',
    title: 'Immigration & Visa Navigator',
    subtitle: 'F-1 / J-1 status, OPT/CPT, I-20, tax filing',
    serviceArea: 'isss',
    escalationEmail: 'isss@uky.edu',
    persona: 'ISSS Navigator',
    icon: 'Plane',
    ragEnabled: true,
  },
  {
    slug: 'drc-readiness',
    title: 'Disability Accommodations Guide',
    subtitle: 'Documentation requirements, affiliation, ESA requests',
    serviceArea: 'drc',
    escalationEmail: 'drc@uky.edu',
    persona: 'DRC Guide',
    icon: 'Accessibility',
    ragEnabled: false, // system-prompt driven; no RAG for MVP
    sensitiveSession: true,
  },
  {
    slug: 'financial-aid-appeal',
    title: 'Financial Aid Appeal Coach',
    subtitle: 'SAP, income reduction, unusual circumstances, COA budget',
    serviceArea: 'financial-aid',
    escalationEmail: 'financialaid@uky.edu',
    persona: 'Aid Navigator',
    icon: 'DollarSign',
    ragEnabled: false,
    petitionEnabled: true, // creates Petition record on completion
  },
  {
    slug: 'pre-professional-advisor',
    title: 'Pre-Professional Track Advisor',
    subtitle: 'Pre-med, pre-law, pre-dental, pre-vet, and 4 more tracks',
    serviceArea: 'pre-professional',
    escalationEmail: 'careercenter@uky.edu',
    persona: 'Pre-Prof Advisor',
    icon: 'Stethoscope',
    ragEnabled: true,
  },
  {
    slug: 'counseling-navigator',
    title: 'Counseling & Wellness Guide',
    subtitle: 'Understand your options and prepare for your intake call',
    serviceArea: 'counseling',
    escalationEmail: 'counseling@uky.edu',
    persona: 'Wellness Guide',
    icon: 'Heart',
    sensitiveSession: true,
    crisisLineEnabled: true,
  },
  // ── Wave 2 Phase 1 services ───────────────────────────────────────────────

  {
    slug: 'food-basic-needs',
    title: 'Food & Basic Needs Finder',
    subtitle: 'UK Food Pantry, SNAP eligibility, emergency aid funds, and campus resources',
    serviceArea: 'basic-needs',
    escalationEmail: 'basicneeds@uky.edu',
    persona: 'Basic Needs Guide',
    icon: 'Utensils',
    ragEnabled: true,
    sensitiveSession: true,
    crisisLineEnabled: true,
  },
  {
    slug: 'first-gen-guide',
    title: 'First-Generation Student Guide',
    subtitle: 'TRIO, McNair Scholars, scholarship renewal, and first-gen-specific resources',
    serviceArea: 'first-gen',
    escalationEmail: 'trio@uky.edu',
    persona: 'First-Gen Guide',
    icon: 'Star',
    ragEnabled: true,
    crisisLineEnabled: true,
  },
  {
    slug: 'veterans-benefits',
    title: 'Veterans & Military Benefits Guide',
    subtitle: 'GI Bill chapter selection, VA work-study, Yellow Ribbon, and UK veteran resources',
    serviceArea: 'veterans',
    escalationEmail: 'veterans@uky.edu',
    persona: 'Veterans Benefits Guide',
    icon: 'Shield',
    ragEnabled: true,
    crisisLineEnabled: true,
  },
  {
    slug: 'career-coach',
    title: 'Career & Internship Coach',
    subtitle: 'Resume feedback, cover letter drafts, interview prep, and internship search',
    serviceArea: 'career',
    escalationEmail: 'careercenter@uky.edu',
    persona: 'Career Coach',
    icon: 'Briefcase',
    ragEnabled: false,
  },
  {
    slug: 'health-insurance',
    title: 'Health Insurance & Student Health',
    subtitle: 'Student health plan waiver deadlines, coverage questions, and Student Health billing',
    serviceArea: 'health',
    escalationEmail: 'studenthealth@uky.edu',
    persona: 'Health Benefits Guide',
    icon: 'Activity',
    ragEnabled: true,
  },
  {
    slug: 'registrar-navigator',
    title: 'Registrar Navigation Assistant',
    subtitle: 'Late withdrawals, retroactive drops, grade appeals, and enrollment changes',
    serviceArea: 'registrar',
    escalationEmail: 'registrar@uky.edu',
    persona: 'Registrar Guide',
    icon: 'ClipboardList',
    ragEnabled: true,
    petitionEnabled: true,
  },
  {
    slug: 'transfer-credit',
    title: 'Transfer Credit & Degree Audit',
    subtitle: 'Credit equivalency, unassigned credits, articulation petitions, and degree audit reads',
    serviceArea: 'transfer',
    escalationEmail: 'registrar@uky.edu',
    persona: 'Transfer Credit Guide',
    icon: 'ArrowLeftRight',
    ragEnabled: true,
  },
  {
    slug: 'study-abroad',
    title: 'Study Abroad Advisor',
    subtitle: 'Program selection, credit pre-approval, aid portability, and passport/visa timing',
    serviceArea: 'study-abroad',
    escalationEmail: 'studyabroad@uky.edu',
    persona: 'Study Abroad Advisor',
    icon: 'Globe',
    ragEnabled: true,
  },
  {
    slug: 'grad-school-coach',
    title: 'Graduate School Application Coach',
    subtitle: 'Statement of purpose drafting, rec letter strategy, program selection, and timelines',
    serviceArea: 'grad-application',
    escalationEmail: 'gradschool@uky.edu',
    persona: 'Grad School Coach',
    icon: 'GraduationCap',
    ragEnabled: false,
  },
  {
    slug: 'grad-funding',
    title: 'Graduate Funding & Fellowships',
    subtitle: 'NSF GRFP, travel grants, internal fellowships, and stipend policy',
    serviceArea: 'grad-funding',
    escalationEmail: 'gradschool@uky.edu',
    persona: 'Grad Funding Advisor',
    icon: 'Award',
    ragEnabled: true,
  },
  {
    slug: 'parking-appeals',
    title: 'Parking & Transportation Guide',
    subtitle: 'Citation appeals, permit tiers, shuttle routes, and Transportation Services',
    serviceArea: 'parking',
    escalationEmail: 'parking@uky.edu',
    persona: 'Parking Guide',
    icon: 'Car',
    ragEnabled: false,
  },
  // ── Wave 2 Phase 2 services ───────────────────────────────────────────────

  {
    slug: 'title-ix-guide',
    title: 'Title IX & Campus Safety Guide',
    subtitle: 'Reporting options, mandatory vs. confidential reporters, and support resources',
    serviceArea: 'title-ix',
    escalationEmail: 'titleix@uky.edu',
    persona: 'Title IX Resource Guide',
    icon: 'ShieldCheck',
    ragEnabled: true,
    sensitiveSession: true,
    crisisLineEnabled: true,
    requiresLegalDisclaimer: false,
  },
  {
    slug: 'conduct-guide',
    title: 'Student Conduct & Integrity Guide',
    subtitle: 'Conduct hearing process, respondent rights, and academic integrity procedures',
    serviceArea: 'conduct',
    escalationEmail: 'studentconduct@uky.edu',
    persona: 'Conduct Guide',
    icon: 'BookOpen',
    ragEnabled: true,
    sensitiveSession: true,
    crisisLineEnabled: true,
    petitionEnabled: true,
  },
  {
    slug: 'housing-appeal',
    title: 'Housing Appeal Advisor',
    subtitle: 'Housing contract release, roommate conflict mediation requests, and appeal preparation',
    serviceArea: 'housing',
    escalationEmail: 'reslife@uky.edu',
    persona: 'Housing Guide',
    icon: 'Home',
    ragEnabled: true,
    sensitiveSession: true,
    crisisLineEnabled: true,
    petitionEnabled: true,
  },
  {
    slug: 'legal-aid',
    title: 'Student Legal Aid Navigator',
    subtitle: 'UK legal resources, tenant rights info, and conduct hearing process overview',
    serviceArea: 'legal-aid',
    escalationEmail: 'slc@uky.edu',
    persona: 'Legal Resource Guide',
    icon: 'Scale',
    ragEnabled: true,
    sensitiveSession: true,
    requiresLegalDisclaimer: true,
  },
  // ── Academic Advising ─────────────────────────────────────────────────────
  {
    slug: 'academic-advisor',
    title: 'Academic Advisor — Ask Sandy',
    subtitle: 'Degree requirements, course planning, policies, and academic navigation',
    serviceArea: 'academic-advisor',
    persona: 'Sandy',
    icon: 'GraduationCap',
    ragEnabled: true,
    showCitationsInline: true,
    showAppointmentCard: true,
    advisorContactByCollege: {
      'Arts and Sciences': {
        officeName: 'A&S Academic Advising Center',
        email: 'asadvisingcenter@uky.edu',
        phone: '(859) 257-8354',
        appointmentUrl: 'https://myuk.uky.edu/gps',
        walkInHours: 'Mon–Thu 1:00–4:00 PM',
      },
      'Engineering': {
        officeName: 'College of Engineering Student Services',
        email: 'engrstudentservices@uky.edu',
        appointmentUrl: 'https://myuk.uky.edu/gps',
      },
      'Business and Economics': {
        officeName: 'Gatton College Advising',
        email: 'gattonadvising@uky.edu',
        appointmentUrl: 'https://myuk.uky.edu/gps',
      },
      'Education': {
        officeName: 'College of Education Advising',
        email: 'edadvising@uky.edu',
        appointmentUrl: 'https://myuk.uky.edu/gps',
      },
      '_default': {
        officeName: 'University Advising',
        email: 'universityadvising@uky.edu',
        appointmentUrl: 'https://myuk.uky.edu/gps',
      },
    },
  },
]

export function getStudentServiceTool(slug: string): StudentServiceTool | undefined {
  return STUDENT_SERVICES_TOOLS.find((t) => t.slug === slug)
}
