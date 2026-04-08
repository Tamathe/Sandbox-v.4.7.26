import type { CourseMapWeek, CourseMapObjective, CourseMapMaterial, CourseMapAssignment, CourseMapToolSuggestion } from './course-map-service'

// ── Week template types (Task 34) ───────────────────────────────────────────

export type WeekTemplate = {
  id: string
  name: string
  description: string
  objectives: CourseMapObjective[]
  materials: CourseMapMaterial[]
  assignments: CourseMapAssignment[]
  toolSuggestions: CourseMapToolSuggestion[]
}

export const WEEK_TEMPLATES: WeekTemplate[] = [
  {
    id: 'midterm-review',
    name: 'Midterm Review',
    description: 'Review and exam prep week with study guide and practice assessment',
    objectives: [
      { title: 'Synthesize key concepts from the first half of the course', description: null, sourceDocument: '' },
      { title: 'Identify areas of strength and weakness through self-assessment', description: null, sourceDocument: '' },
    ],
    materials: [
      { title: 'Midterm Study Guide', materialType: 'reading', content: '', sourceDocument: '' },
      { title: 'Practice Exam', materialType: 'quiz', content: '', sourceDocument: '' },
    ],
    assignments: [
      { title: 'Midterm Exam', type: 'TEXT_SUBMISSION', description: 'Comprehensive midterm covering all content to date', dueDate: null, pointsPossible: 100 },
    ],
    toolSuggestions: [
      { title: 'Flashcard Forge', toolType: 'QUIZ', rationale: 'Help students review key terms and concepts' },
    ],
  },
  {
    id: 'lab-week',
    name: 'Lab Week',
    description: 'Hands-on laboratory or practical work session',
    objectives: [
      { title: 'Apply theoretical concepts in a practical lab setting', description: null, sourceDocument: '' },
      { title: 'Document observations and results using proper methodology', description: null, sourceDocument: '' },
    ],
    materials: [
      { title: 'Lab Instructions & Safety Protocol', materialType: 'assignment', content: '', sourceDocument: '' },
      { title: 'Data Collection Template', materialType: 'reading', content: '', sourceDocument: '' },
    ],
    assignments: [
      { title: 'Lab Report', type: 'FILE_UPLOAD', description: 'Submit completed lab report with data analysis', dueDate: null, pointsPossible: 50 },
    ],
    toolSuggestions: [
      { title: 'Lab Assistant AI', toolType: 'CHATBOT', rationale: 'Answer procedural questions during lab work' },
    ],
  },
  {
    id: 'project-sprint',
    name: 'Project Sprint',
    description: 'Focused project work with milestone deliverable and peer feedback',
    objectives: [
      { title: 'Make measurable progress on the course project', description: null, sourceDocument: '' },
      { title: 'Provide and incorporate constructive peer feedback', description: null, sourceDocument: '' },
    ],
    materials: [
      { title: 'Project Rubric & Milestone Checklist', materialType: 'rubric', content: '', sourceDocument: '' },
    ],
    assignments: [
      { title: 'Project Milestone Submission', type: 'FILE_UPLOAD', description: 'Submit current project progress for review', dueDate: null, pointsPossible: 30 },
      { title: 'Peer Review', type: 'TEXT_SUBMISSION', description: 'Review a classmate\'s project milestone and provide feedback', dueDate: null, pointsPossible: 10 },
    ],
    toolSuggestions: [
      { title: 'Peer Review Coach', toolType: 'CHATBOT', rationale: 'Guide students through constructive feedback' },
    ],
  },
  {
    id: 'discussion-week',
    name: 'Discussion Week',
    description: 'Reading-heavy week centered on discussion and debate',
    objectives: [
      { title: 'Analyze assigned readings from multiple perspectives', description: null, sourceDocument: '' },
      { title: 'Articulate and defend a position in a structured discussion', description: null, sourceDocument: '' },
    ],
    materials: [
      { title: 'Primary Reading', materialType: 'reading', content: '', sourceDocument: '' },
      { title: 'Discussion Prompts', materialType: 'lecture', content: '', sourceDocument: '' },
    ],
    assignments: [
      { title: 'Discussion Post', type: 'TEXT_SUBMISSION', description: 'Post your initial response and reply to at least two classmates', dueDate: null, pointsPossible: 20 },
    ],
    toolSuggestions: [
      { title: 'Devil\'s Advocate', toolType: 'DEBATE', rationale: 'Challenge students to consider opposing viewpoints' },
    ],
  },
  {
    id: 'assessment-week',
    name: 'Assessment Week',
    description: 'Final assessment with review, exam, and reflection',
    objectives: [
      { title: 'Demonstrate mastery of all major course concepts', description: null, sourceDocument: '' },
      { title: 'Reflect on learning growth across the term', description: null, sourceDocument: '' },
    ],
    materials: [
      { title: 'Final Review Sheet', materialType: 'reading', content: '', sourceDocument: '' },
      { title: 'Course Reflection Prompt', materialType: 'assignment', content: '', sourceDocument: '' },
    ],
    assignments: [
      { title: 'Final Exam', type: 'TEXT_SUBMISSION', description: 'Comprehensive final assessment', dueDate: null, pointsPossible: 150 },
      { title: 'Course Reflection Essay', type: 'TEXT_SUBMISSION', description: 'Reflect on what you learned and how you grew', dueDate: null, pointsPossible: 20 },
    ],
    toolSuggestions: [
      { title: 'Study Buddy', toolType: 'STUDY_BUDDY', rationale: 'AI-powered study partner for final exam prep' },
    ],
  },
]

// ── Course template types ───────────────────────────────────────────────────

export type CourseMapTemplate = {
  id: string
  name: string
  description: string
  weekCount: number
  discipline: string
  weeks: Omit<CourseMapWeek, 'toolSuggestions'>[]
}

export const COURSE_MAP_TEMPLATES: CourseMapTemplate[] = [
  {
    id: 'standard-15',
    name: 'Standard 15-Week Semester',
    description: 'Traditional semester structure with intro, 12 content weeks, review, and finals.',
    weekCount: 15,
    discipline: 'General',
    weeks: [
      { weekNumber: 1, title: 'Introduction & Course Overview', topic: 'Course orientation, expectations, and foundational concepts', startDate: null, endDate: null, objectives: [{ title: 'Identify course goals and expectations', description: null, sourceDocument: '' }, { title: 'Define key terminology for the discipline', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 2, title: 'Foundations', topic: 'Core principles and background knowledge', startDate: null, endDate: null, objectives: [{ title: 'Define key concepts from this week\'s readings', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 3, title: 'Core Concepts I', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Explain fundamental principles covered this week', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 4, title: 'Core Concepts II', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Apply concepts from weeks 2-3 to new scenarios', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 5, title: 'Core Concepts III', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Analyze relationships between key concepts', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 6, title: 'Midterm Preparation', topic: 'Review and synthesis of weeks 1-5', startDate: null, endDate: null, objectives: [{ title: 'Synthesize material from the first five weeks', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 7, title: 'Advanced Topics I', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Define key concepts from this week\'s readings', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 8, title: 'Advanced Topics II', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Evaluate different perspectives on the topic', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 9, title: 'Advanced Topics III', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Compare and contrast major frameworks', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 10, title: 'Applications I', topic: 'Applying theory to practice', startDate: null, endDate: null, objectives: [{ title: 'Apply theoretical knowledge to practical problems', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 11, title: 'Applications II', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Develop a solution using course concepts', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 12, title: 'Applications III', topic: null, startDate: null, endDate: null, objectives: [{ title: 'Evaluate the effectiveness of applied solutions', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 13, title: 'Integration & Synthesis', topic: 'Connecting all course themes', startDate: null, endDate: null, objectives: [{ title: 'Integrate concepts across all course modules', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 14, title: 'Review & Reflection', topic: 'Comprehensive review and course reflection', startDate: null, endDate: null, objectives: [{ title: 'Reflect on learning growth across the semester', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 15, title: 'Finals Week', topic: 'Final assessment', startDate: null, endDate: null, objectives: [{ title: 'Demonstrate mastery of all course objectives', description: null, sourceDocument: '' }], materials: [], assignments: [] },
    ],
  },
  {
    id: 'accelerated-8',
    name: '8-Week Accelerated',
    description: 'Compressed format with doubled content density per week.',
    weekCount: 8,
    discipline: 'General',
    weeks: [
      { weekNumber: 1, title: 'Intensive Foundations', topic: 'Course overview and foundational concepts (double pace)', startDate: null, endDate: null, objectives: [{ title: 'Identify course goals and core terminology', description: null, sourceDocument: '' }, { title: 'Define foundational principles of the discipline', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 2, title: 'Core Concepts — Block A', topic: 'First major content block (covers 2 standard weeks)', startDate: null, endDate: null, objectives: [{ title: 'Explain fundamental principles from Block A readings', description: null, sourceDocument: '' }, { title: 'Apply Block A concepts to case scenarios', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 3, title: 'Core Concepts — Block B', topic: 'Second major content block (covers 2 standard weeks)', startDate: null, endDate: null, objectives: [{ title: 'Analyze relationships between Block A and Block B concepts', description: null, sourceDocument: '' }, { title: 'Evaluate different perspectives on Block B topics', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 4, title: 'Midterm Assessment & Synthesis', topic: 'Midpoint review and assessment', startDate: null, endDate: null, objectives: [{ title: 'Synthesize material from weeks 1-3', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 5, title: 'Advanced Topics — Block C', topic: 'Third major content block (covers 2 standard weeks)', startDate: null, endDate: null, objectives: [{ title: 'Define key concepts from Block C readings', description: null, sourceDocument: '' }, { title: 'Compare frameworks from Blocks A-C', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 6, title: 'Advanced Topics — Block D', topic: 'Fourth major content block (covers 2 standard weeks)', startDate: null, endDate: null, objectives: [{ title: 'Apply theoretical knowledge to complex problems', description: null, sourceDocument: '' }, { title: 'Critique existing approaches using course frameworks', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 7, title: 'Integration & Application', topic: 'Capstone project work and integration', startDate: null, endDate: null, objectives: [{ title: 'Integrate concepts across all content blocks', description: null, sourceDocument: '' }, { title: 'Develop a comprehensive project applying course material', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 8, title: 'Final Assessment', topic: 'Final exam and project presentations', startDate: null, endDate: null, objectives: [{ title: 'Demonstrate mastery of all course objectives', description: null, sourceDocument: '' }], materials: [], assignments: [] },
    ],
  },
  {
    id: 'workshop-5',
    name: '5-Module Workshop',
    description: 'Project-based structure: Foundations, Exploration, Prototype, Iteration, Showcase.',
    weekCount: 5,
    discipline: 'General',
    weeks: [
      { weekNumber: 1, title: 'Foundations', topic: 'Problem space orientation, team formation, and skill baseline', startDate: null, endDate: null, objectives: [{ title: 'Identify the problem space and project scope', description: null, sourceDocument: '' }, { title: 'Assess baseline skills and knowledge gaps', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 2, title: 'Exploration', topic: 'Research, ideation, and concept development', startDate: null, endDate: null, objectives: [{ title: 'Research existing approaches and best practices', description: null, sourceDocument: '' }, { title: 'Generate and evaluate multiple solution concepts', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 3, title: 'Prototype', topic: 'Build first working version and gather initial feedback', startDate: null, endDate: null, objectives: [{ title: 'Build a minimum viable prototype', description: null, sourceDocument: '' }, { title: 'Collect and document peer feedback on the prototype', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 4, title: 'Iteration', topic: 'Refine based on feedback, test, and polish', startDate: null, endDate: null, objectives: [{ title: 'Revise the prototype based on feedback analysis', description: null, sourceDocument: '' }, { title: 'Conduct user testing and document results', description: null, sourceDocument: '' }], materials: [], assignments: [] },
      { weekNumber: 5, title: 'Showcase', topic: 'Final presentation, reflection, and peer review', startDate: null, endDate: null, objectives: [{ title: 'Present the final project to an audience', description: null, sourceDocument: '' }, { title: 'Reflect on the creative process and lessons learned', description: null, sourceDocument: '' }], materials: [], assignments: [] },
    ],
  },
]
