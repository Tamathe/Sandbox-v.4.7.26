export type SandboxDataset = {
  id: string
  title: string
  summary: string
  owner: string
  coverage: string
  category: 'University' | 'Student Success' | 'Courseware'
  tags: string[]
  sampleUses: string[]
  builderPrompt: string
}

export type ParsedReference =
  | { type: 'dataset'; id: string; label: string }
  | { type: 'course'; courseCode: string; moduleNumber: number | null; label: string }
  | { type: 'external'; href: string; label: string }

export const SANDBOX_DATASETS: SandboxDataset[] = [
  {
    id: 'uk-financial-aid-docs',
    title: 'UK Financial Aid Docs',
    summary: 'Public University of Kentucky financial aid guidance covering FAFSA, scholarships, loans, work-study, and key deadlines.',
    owner: 'UK Financial Aid Office',
    coverage: 'FAFSA basics, KEES and institutional scholarships, verification, loans, work-study, appeals, and deadline readiness.',
    category: 'University',
    tags: ['financial aid', 'FAFSA', 'scholarships', 'KEES', 'deadlines'],
    sampleUses: [
      'Build a financial aid advisor that answers common questions and routes students to official next steps.',
      'Create a readiness assistant for aid applications, document collection, and deadlines.',
    ],
    builderPrompt: 'Build a University of Kentucky financial aid assistant that uses public aid guidance to answer common questions, explain deadlines, and direct account-specific issues to the official office.',
  },
  {
    id: 'uk-course-catalog-2026',
    title: 'UK Course Catalog 2026',
    summary: 'University of Kentucky catalog context for exploring majors, courses, prerequisites, and UK Core options.',
    owner: 'Academic Advising and Registrar',
    coverage: 'Course descriptions, prerequisite chains, majors and minors, UK Core discovery, and semester planning questions.',
    category: 'University',
    tags: ['course catalog', 'majors', 'minors', 'prerequisites', 'registration'],
    sampleUses: [
      'Build a catalog navigator that helps students explore majors and interesting electives.',
      'Create an advising chatbot that explains prerequisite chains before students meet with an advisor.',
    ],
    builderPrompt: 'Build a University of Kentucky course catalog assistant that helps students explore majors, find courses, understand prerequisites, and verify final decisions with the official catalog and human advisors.',
  },
  {
    id: 'uk-its-kb',
    title: 'UK ITS Knowledge Base',
    summary: 'Public UK ITS help content for common campus technology issues including Wi-Fi, accounts, email, VPN, and printing.',
    owner: 'Information Technology Services',
    coverage: 'eduroam setup, email on mobile devices, password and account routing, VPN access, software access, and PrintWise basics.',
    category: 'University',
    tags: ['it support', 'wifi', 'email', 'vpn', 'printing'],
    sampleUses: [
      'Build a first-line IT help assistant for common student tech issues.',
      'Create a step-by-step support bot for Wi-Fi, email, and printing setup.',
    ],
    builderPrompt: 'Build a UK technology support assistant that uses official ITS guidance to troubleshoot common issues, give step-by-step help, and route account-sensitive requests to the proper service.',
  },
  {
    id: 'uk-admissions-faq',
    title: 'UK Admissions FAQ',
    summary: 'Public admissions guidance for prospective students asking about applications, deadlines, visits, housing, and student life.',
    owner: 'Undergraduate Admissions',
    coverage: 'Application timelines, general requirements, campus tours, admitted-student questions, housing basics, and applicant next steps.',
    category: 'University',
    tags: ['admissions', 'applications', 'deadlines', 'campus life', 'prospective students'],
    sampleUses: [
      'Build an admissions chatbot for future Wildcats and their families.',
      'Create a prospective-student guide for campus visits, deadlines, and application basics.',
    ],
    builderPrompt: 'Build a University of Kentucky admissions guide that answers general application questions, highlights important deadlines, and routes status-specific questions to the official applicant portal.',
  },
  {
    id: 'uk-library-guides',
    title: 'UK Library Guides',
    summary: 'Library research support context covering subject databases, citation basics, source evaluation, and librarian referrals.',
    owner: 'UK Libraries',
    coverage: 'Database discovery, research-starting strategies, citation styles, scholarly versus popular sources, and meeting with a librarian.',
    category: 'University',
    tags: ['library', 'research', 'databases', 'citations', 'sources'],
    sampleUses: [
      'Build a research assistant that suggests databases and citation examples.',
      'Create a library concierge that helps students narrow topics and find human research help.',
    ],
    builderPrompt: 'Build a UK Libraries research assistant that helps students choose databases, understand citation basics, and connect with librarians for deeper support.',
  },
  {
    id: 'financial-aid-kb',
    title: 'Financial Aid Knowledge Base',
    summary: 'Policies, deadlines, FAFSA guidance, and common advising patterns for student support tools.',
    owner: 'University Services',
    coverage: 'Aid basics, application timelines, verification, and escalation paths.',
    category: 'University',
    tags: ['financial aid', 'advising', 'student services'],
    sampleUses: [
      'Build a financial aid concierge for incoming students.',
      'Create a quiz that checks deadline readiness.',
    ],
    builderPrompt: 'Build a university support assistant that uses the Financial Aid Knowledge Base to guide students through deadlines, terminology, and next steps.',
  },
  {
    id: 'major-and-career-pathways',
    title: 'Major and Career Pathways',
    summary: 'Program pathways, career exploration language, and advising scaffolds for helping students choose a direction.',
    owner: 'Academic Advising',
    coverage: 'Major comparison, skills mapping, career examples, and reflection prompts.',
    category: 'Student Success',
    tags: ['major selection', 'career exploration', 'advising'],
    sampleUses: [
      'Create a choose-your-major simulation.',
      'Build a reflective advising chatbot for undecided students.',
    ],
    builderPrompt: 'Create an advising tool that helps students compare majors and career pathways using reflective questions and concrete examples.',
  },
  {
    id: 'student-support-services',
    title: 'Student Support Services',
    summary: 'Public information about tutoring, writing support, coaching, accessibility, and care resources.',
    owner: 'Student Success',
    coverage: 'Referrals, support pathways, eligibility, and when to escalate to a human.',
    category: 'Student Success',
    tags: ['support', 'retention', 'referrals'],
    sampleUses: [
      'Build a concierge that routes students to the right campus service.',
      'Create a scenario-based practice tool for peer mentors.',
    ],
    builderPrompt: 'Build a student support concierge that helps learners identify the right campus resource and explains when human help is needed.',
  },
  {
    id: 'public-course-materials',
    title: 'Published Course Materials',
    summary: 'Publicly shared course modules, syllabi, and learning materials that educators have made build-ready.',
    owner: 'Faculty Contributors',
    coverage: 'Course content, module framing, and reusable instructional patterns.',
    category: 'Courseware',
    tags: ['course content', 'modules', 'learning design'],
    sampleUses: [
      'Create a study buddy grounded in published course modules.',
      'Build a debate or interview tool around course readings.',
    ],
    builderPrompt: 'Create a course-linked learning tool that uses published course materials as its source of examples, prompts, and explanations.',
  },
  {
    id: 'uky-campus-and-culture',
    title: 'UKY Campus and Culture',
    summary: 'Public campus knowledge, traditions, student organizations, and belonging-oriented resources.',
    owner: 'Campus Life',
    coverage: 'Orientation themes, campus touchpoints, and student community discovery.',
    category: 'University',
    tags: ['orientation', 'campus life', 'community'],
    sampleUses: [
      'Build a first-year onboarding guide.',
      'Create a campus discovery experience for new students.',
    ],
    builderPrompt: 'Build a campus onboarding assistant that introduces students to UKY resources, traditions, and communities in an encouraging way.',
  },
]

export function getDatasetById(id: string) {
  return SANDBOX_DATASETS.find(dataset => dataset.id === id) ?? null
}

export function encodeDatasetReference(id: string) {
  return `dataset://${id}`
}

export function encodeCourseReference(courseCode: string, moduleNumber?: number | null) {
  const normalized = courseCode.trim().toUpperCase()
  if (!moduleNumber) return `course://${normalized}`
  return `course://${normalized}?module=${moduleNumber}`
}

export function parseReference(reference: string): ParsedReference {
  if (reference.startsWith('dataset://')) {
    const id = reference.replace('dataset://', '')
    const dataset = getDatasetById(id)
    return {
      type: 'dataset',
      id,
      label: dataset ? dataset.title : id,
    }
  }

  if (reference.startsWith('course://')) {
    const raw = reference.replace('course://', '')
    const [courseCode, query = ''] = raw.split('?')
    const params = new URLSearchParams(query)
    const moduleNumber = params.get('module') ? Number(params.get('module')) : null
    return {
      type: 'course',
      courseCode,
      moduleNumber,
      label: moduleNumber ? `${courseCode} Module ${moduleNumber}` : courseCode,
    }
  }

  return {
    type: 'external',
    href: reference,
    label: reference,
  }
}
