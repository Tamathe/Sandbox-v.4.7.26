// Canonical interest taxonomy — used for department mapping, suggestions, and autocomplete

export const DEPARTMENT_INTERESTS: Record<string, string[]> = {
  TEK: ['Entrepreneurship', 'Innovation', 'Technology Commercialization', 'Startup Culture', 'Business Development'],
  'Computer Science': ['Programming', 'Algorithms', 'Software Engineering', 'AI/ML', 'Data Structures', 'Cybersecurity'],
  Law: ['Legal Research', 'Contracts', 'Constitutional Law', 'Legal Writing', 'Case Analysis', 'Litigation'],
  English: ['Writing', 'Literature', 'Rhetoric', 'Composition', 'Literary Analysis', 'Creative Writing'],
  Biology: ['Life Sciences', 'Research Methods', 'Lab Skills', 'Genetics', 'Ecology'],
  Psychology: ['Behavioral Science', 'Research Methods', 'Counseling', 'Cognitive Science', 'Statistics'],
  Mathematics: ['Statistics', 'Applied Math', 'Calculus', 'Proof Writing', 'Quantitative Methods'],
  History: ['Historical Analysis', 'Research Methods', 'Primary Sources', 'Writing', 'Critical Thinking'],
  Chemistry: ['Lab Skills', 'Research Methods', 'Organic Chemistry', 'Analytical Chemistry'],
  Physics: ['Research Methods', 'Problem Solving', 'Mathematical Modeling', 'Lab Skills'],
  Nursing: ['Patient Care', 'Clinical Skills', 'Healthcare', 'Evidence-Based Practice', 'Communication'],
  Education: ['Pedagogy', 'Curriculum Design', 'Assessment Design', 'Classroom Management', 'Differentiated Instruction'],
  'Business Administration': ['Management', 'Finance', 'Marketing', 'Strategy', 'Organizational Behavior'],
  Economics: ['Microeconomics', 'Macroeconomics', 'Quantitative Analysis', 'Policy', 'Research Methods'],
  'Social Work': ['Community Engagement', 'Counseling', 'Policy', 'Advocacy', 'Case Management'],
  Art: ['Visual Communication', 'Design Principles', 'Creative Process', 'Critique'],
  Music: ['Music Theory', 'Performance', 'Composition', 'Ear Training'],
  Philosophy: ['Critical Thinking', 'Logic', 'Ethics', 'Argumentation', 'Writing'],
  Sociology: ['Research Methods', 'Social Theory', 'Qualitative Research', 'Statistics'],
  'Political Science': ['Policy Analysis', 'Research Methods', 'Writing', 'Comparative Politics'],
  Engineering: ['Problem Solving', 'Design', 'Lab Skills', 'Technical Writing', 'Systems Thinking'],
}

export const TITLE_INTERESTS: Record<string, string[]> = {
  professor: ['Teaching', 'Research', 'Academic Writing', 'Mentoring'],
  instructor: ['Teaching', 'Curriculum Design', 'Student Engagement'],
  librarian: ['Research Methods', 'Information Literacy', 'Citation', 'Database Search'],
  counselor: ['Student Support', 'Advising', 'Mental Health'],
  advisor: ['Student Support', 'Advising', 'Career Development'],
  director: ['Leadership', 'Program Development', 'Strategic Planning'],
  coordinator: ['Program Management', 'Collaboration', 'Event Planning'],
  dean: ['Higher Education Administration', 'Strategic Planning', 'Leadership'],
  researcher: ['Research Methods', 'Academic Writing', 'Data Analysis', 'Grant Writing'],
  'teaching assistant': ['Teaching', 'Tutoring', 'Subject Expertise'],
}

export const POPULAR_EDUCATOR_INTERESTS = [
  'Assessment Design',
  'Course Design',
  'Active Learning',
  'EdTech',
  'Student Engagement',
  'Flipped Classroom',
  'Universal Design for Learning',
  'Project-Based Learning',
  'Online Teaching',
  'Collaborative Learning',
  'AI in Education',
  'Inclusive Teaching',
  'Feedback & Grading',
  'Rubric Design',
  'Discussion Facilitation',
]

export const POPULAR_STUDENT_INTERESTS = [
  'Study Skills',
  'Time Management',
  'Research Methods',
  'Writing',
  'Critical Thinking',
  'Test Preparation',
  'Career Development',
  'Collaborative Learning',
  'Note Taking',
  'Active Reading',
]

/** All canonical tags as a flat sorted list — used for autocomplete */
export const ALL_INTEREST_TAGS: string[] = Array.from(
  new Set([
    ...Object.values(DEPARTMENT_INTERESTS).flat(),
    ...Object.values(TITLE_INTERESTS).flat(),
    ...POPULAR_EDUCATOR_INTERESTS,
    ...POPULAR_STUDENT_INTERESTS,
  ])
).sort()

/**
 * Derive suggestions for a user based on department + role.
 * Returns tags not already in `exclude`, ranked by relevance.
 */
export function getSuggestions(opts: {
  department?: string | null
  title?: string | null
  role: 'EDUCATOR' | 'STUDENT' | 'ADMIN'
  exclude: string[]
  limit?: number
}): string[] {
  const { department, title, role, exclude, limit = 5 } = opts
  const excluded = new Set(exclude.map((t) => t.toLowerCase()))

  const candidates: string[] = []

  // 1. Department match (fuzzy — check if any key is contained in department string)
  if (department) {
    const deptLower = department.toLowerCase()
    for (const [key, tags] of Object.entries(DEPARTMENT_INTERESTS)) {
      if (deptLower.includes(key.toLowerCase()) || key.toLowerCase().includes(deptLower.split(' ')[0])) {
        candidates.push(...tags)
      }
    }
  }

  // 2. Title match
  if (title) {
    const titleLower = title.toLowerCase()
    for (const [key, tags] of Object.entries(TITLE_INTERESTS)) {
      if (titleLower.includes(key)) {
        candidates.push(...tags)
      }
    }
  }

  // 3. Role-based popular interests as fill
  const popularPool = role === 'STUDENT' ? POPULAR_STUDENT_INTERESTS : POPULAR_EDUCATOR_INTERESTS
  candidates.push(...popularPool)

  // Deduplicate, filter excluded, take limit
  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of candidates) {
    if (!seen.has(tag) && !excluded.has(tag.toLowerCase())) {
      seen.add(tag)
      result.push(tag)
      if (result.length >= limit) break
    }
  }

  return result
}
