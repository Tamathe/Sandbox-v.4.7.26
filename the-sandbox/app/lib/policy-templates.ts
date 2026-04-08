type PolicyCategory = 'late' | 'attendance' | 'grading' | 'academic_integrity' | 'communication' | 'other'

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: PolicyCategory
  policies: { category: PolicyCategory; title: string; content: string }[]
  gradingWeights: { category: string; weight: number; description: string | null }[]
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'standard',
    name: 'Standard University Course',
    description: 'Traditional lecture-based course with exams, assignments, and participation.',
    category: 'grading',
    policies: [
      {
        category: 'late',
        title: 'Late Submission Policy',
        content: 'Late submissions will be penalized 10% per day. Assignments more than 5 days late will not be accepted without prior arrangement.',
      },
      {
        category: 'attendance',
        title: 'Attendance Policy',
        content: 'Students are expected to attend all class sessions. After 3 unexcused absences, the final grade may be reduced by one letter grade.',
      },
      {
        category: 'academic_integrity',
        title: 'Academic Integrity',
        content: 'All work must comply with the University of Kentucky\'s Academic Integrity policy. Plagiarism, cheating, or other forms of academic dishonesty will result in a failing grade and referral to the Dean of Students.',
      },
    ],
    gradingWeights: [
      { category: 'Exams', weight: 0.40, description: 'Midterm and unit exams' },
      { category: 'Assignments', weight: 0.30, description: 'Homework and problem sets' },
      { category: 'Participation', weight: 0.15, description: 'In-class engagement' },
      { category: 'Final Exam', weight: 0.15, description: 'Comprehensive final' },
    ],
  },
  {
    id: 'lab',
    name: 'Lab / Studio Course',
    description: 'Hands-on lab or studio course with practical exams and safety requirements.',
    category: 'other',
    policies: [
      {
        category: 'late',
        title: 'Late Lab Reports',
        content: 'Late lab reports are not accepted. If you miss a lab session, you must contact the instructor within 24 hours to arrange a make-up session, subject to availability.',
      },
      {
        category: 'attendance',
        title: 'Mandatory Attendance',
        content: 'Attendance at all lab sessions is mandatory. Missing more than 2 sessions without an approved excuse will result in an automatic failing grade.',
      },
      {
        category: 'academic_integrity',
        title: 'Academic Integrity',
        content: 'Lab work must be your own. Sharing data, copying results, or fabricating data constitutes academic dishonesty and will be reported to the university.',
      },
      {
        category: 'other',
        title: 'Safety Policy',
        content: 'All students must complete the safety orientation before participating in lab activities. Appropriate PPE (lab coat, goggles, gloves) is required at all times. Violations may result in removal from the lab.',
      },
    ],
    gradingWeights: [
      { category: 'Lab Reports', weight: 0.40, description: 'Weekly lab write-ups' },
      { category: 'Practical Exams', weight: 0.25, description: 'Hands-on practical assessments' },
      { category: 'Written Exam', weight: 0.20, description: 'Theory and concepts exam' },
      { category: 'Participation', weight: 0.15, description: 'Lab engagement and preparation' },
    ],
  },
  {
    id: 'seminar',
    name: 'Seminar / Discussion',
    description: 'Discussion-heavy course emphasizing papers, peer review, and participation.',
    category: 'grading',
    policies: [
      {
        category: 'late',
        title: 'Late Submission Policy',
        content: 'A 48-hour grace period is provided for all written assignments. After the grace period, submissions will be penalized 5% per day. Discussion posts cannot be submitted late.',
      },
      {
        category: 'attendance',
        title: 'Active Participation Required',
        content: 'This is a discussion-based course. Students must attend and actively participate in every session. Participation is assessed on quality of contributions, not just presence.',
      },
      {
        category: 'academic_integrity',
        title: 'Academic Integrity',
        content: 'All papers and reviews must be original work. Proper citation following APA/MLA format is required. AI-generated content must be disclosed and is subject to instructor approval.',
      },
    ],
    gradingWeights: [
      { category: 'Discussion Leading', weight: 0.30, description: 'Leading class discussions on assigned readings' },
      { category: 'Papers', weight: 0.35, description: 'Research papers and response essays' },
      { category: 'Peer Reviews', weight: 0.15, description: 'Quality feedback on classmates\' work' },
      { category: 'Participation', weight: 0.20, description: 'In-class discussion engagement' },
    ],
  },
  {
    id: 'online',
    name: 'Online / Asynchronous',
    description: 'Fully online course with flexible deadlines and module-based progression.',
    category: 'communication',
    policies: [
      {
        category: 'late',
        title: 'Flexible Deadlines',
        content: 'Each module has a weekly deadline (Sunday 11:59 PM ET). You may submit up to 3 days late with a 5% penalty. After 3 days, submissions are closed for that module.',
      },
      {
        category: 'attendance',
        title: 'Login & Engagement Tracking',
        content: 'While there are no live sessions, students are expected to log in at least 3 times per week. Engagement is tracked through module completion, discussion posts, and quiz attempts.',
      },
      {
        category: 'communication',
        title: 'Communication & Response Times',
        content: 'The instructor will respond to messages within 24 hours on weekdays. Use the course discussion board for general questions. For urgent matters, email the instructor directly.',
      },
      {
        category: 'academic_integrity',
        title: 'Academic Integrity',
        content: 'Online assessments are subject to the same academic integrity standards as in-person courses. Proctoring software may be used for exams. Sharing quiz answers is prohibited.',
      },
    ],
    gradingWeights: [
      { category: 'Modules', weight: 0.40, description: 'Weekly module completion and activities' },
      { category: 'Discussions', weight: 0.25, description: 'Online discussion posts and replies' },
      { category: 'Projects', weight: 0.25, description: 'Individual or group projects' },
      { category: 'Quizzes', weight: 0.10, description: 'Module knowledge checks' },
    ],
  },
]
