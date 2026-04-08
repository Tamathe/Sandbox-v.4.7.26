// Static demo data for Pulse and Submissions tabs
import type { CourseSubmissionSnapshot, PulseModule, PulseQuestion, CourseMaterial } from './course-types'

export const PULSE_DATA: Record<
  string,
  { modules: PulseModule[]; commonQuestions: PulseQuestion[] }
> = {
  'TEK-100': {
    modules: [
      { label: 'Module 2', pct: 86, students: 18, warn: false },
      { label: 'Module 4', pct: 73, students: 15, warn: false },
      { label: 'Module 6', pct: 54, students: 11, warn: false },
      { label: 'Module 9', pct: 39, students: 8, warn: true },
    ],
    commonQuestions: [
      { question: 'How detailed does my AI disclosure need to be on the Prompt Iteration Lab?', count: 7 },
      { question: 'What is the difference between using AI as a co-pilot and letting it make the decision?', count: 6 },
      { question: 'How narrow does the Innovation Proposal problem statement need to be?', count: 5 },
    ],
  },
  'CS-215': {
    modules: [
      { label: 'Module 1', pct: 91, students: 21, warn: false },
      { label: 'Module 2', pct: 79, students: 18, warn: false },
      { label: 'Module 3', pct: 61, students: 13, warn: false },
      { label: 'Module 4', pct: 44, students: 9, warn: true },
    ],
    commonQuestions: [
      { question: 'Why does my running average reset inside the loop?', count: 8 },
      { question: 'When should I use an instance variable instead of a local variable?', count: 6 },
      { question: 'How small should my debugging test case be?', count: 5 },
    ],
  },
  'BIO-201': {
    modules: [
      { label: 'Module 1', pct: 84, students: 19, warn: false },
      { label: 'Module 2', pct: 76, students: 17, warn: false },
      { label: 'Module 3', pct: 57, students: 12, warn: false },
      { label: 'Module 4', pct: 43, students: 8, warn: true },
    ],
    commonQuestions: [
      { question: 'What makes an interview question truly open-ended?', count: 7 },
      { question: 'Why does exertional chest pain point us toward cardiovascular causes first?', count: 6 },
      { question: 'How do I explain homeostasis without sounding too technical?', count: 4 },
    ],
  },
}

export const SUBMISSION_SNAPSHOTS: Record<string, CourseSubmissionSnapshot> = {
  'TEK-100': {
    summary: [
      { label: 'Average Score', value: '87%', tone: 'good' },
      { label: 'On-Time Rate', value: '91%', tone: 'good' },
      { label: 'Needs Review', value: '3 submissions', tone: 'warn' },
      { label: 'Missing Work', value: '2 students', tone: 'neutral' },
    ],
    assignments: [
      { assignment: 'AI Observation Journal', submitted: '19/21', average: '89%', flagged: '2 follow-ups' },
      { assignment: 'Prompt Iteration Lab', submitted: '21/21', average: '86%', flagged: '1 follow-up' },
      { assignment: 'Red Team Proposal Memo', submitted: '18/21', average: '84%', flagged: '3 follow-ups' },
      { assignment: 'Innovation Proposal Milestone', submitted: '16/21', average: '88%', flagged: '2 follow-ups' },
    ],
    recentSubmissions: [
      {
        studentName: 'Maya Bennett',
        assignment: 'Prompt Iteration Lab',
        status: 'Strong',
        score: '94%',
        submittedAt: '2026-03-15T18:10:00.000Z',
        feedback: 'Clear improvement across all five prompt revisions. Strong use of context and format constraints in the final version.',
      },
      {
        studentName: 'Ian McClure Jr.',
        assignment: 'Red Team Proposal Memo',
        status: 'Needs Review',
        score: '78%',
        submittedAt: '2026-03-14T21:05:00.000Z',
        feedback: 'Good concept, but the stakeholder critique section stays too generic. Needs one more round of concrete pushback.',
      },
      {
        studentName: 'Zoe Kim',
        assignment: 'Innovation Proposal Milestone',
        status: 'On Track',
        score: '88%',
        submittedAt: '2026-03-13T16:42:00.000Z',
        feedback: 'Problem framing is focused and feasible. Next step is tightening the risk section with clearer equity concerns.',
      },
      {
        studentName: 'Noah Carter',
        assignment: 'AI Observation Journal',
        status: 'Missing',
        score: 'Not submitted',
        submittedAt: null,
        feedback: 'Student has not submitted yet. Recommend a reminder plus office-hours outreach if still missing after 48 hours.',
      },
    ],
  },
  'CS-215': {
    summary: [
      { label: 'Average Score', value: '83%', tone: 'good' },
      { label: 'On-Time Rate', value: '88%', tone: 'good' },
      { label: 'Needs Review', value: '4 submissions', tone: 'warn' },
      { label: 'Missing Work', value: '1 student', tone: 'neutral' },
    ],
    assignments: [
      { assignment: 'Quiz Tracker CLI', submitted: '22/23', average: '85%', flagged: '2 follow-ups' },
      { assignment: 'GradeTracker Class', submitted: '21/23', average: '82%', flagged: '3 follow-ups' },
      { assignment: 'Debugging Clinic Reflection', submitted: '20/23', average: '81%', flagged: '4 follow-ups' },
    ],
    recentSubmissions: [
      {
        studentName: 'Sofia Nguyen',
        assignment: 'GradeTracker Class',
        status: 'Strong',
        score: '92%',
        submittedAt: '2026-03-15T19:22:00.000Z',
        feedback: 'Clean method design and readable naming. Reflection also explains debugging decisions clearly.',
      },
      {
        studentName: 'Tiana The',
        assignment: 'Debugging Clinic Reflection',
        status: 'Needs Review',
        score: '74%',
        submittedAt: '2026-03-14T23:11:00.000Z',
        feedback: 'The fix works, but the debugging log jumps from symptom to solution without showing the evidence trail.',
      },
      {
        studentName: 'Maya Bennett',
        assignment: 'Quiz Tracker CLI',
        status: 'On Track',
        score: '84%',
        submittedAt: '2026-03-13T14:15:00.000Z',
        feedback: 'Meets the requirements. Encourage the student to validate bad input a little earlier in the loop.',
      },
      {
        studentName: 'Leo Alvarez',
        assignment: 'Debugging Clinic Reflection',
        status: 'Missing',
        score: 'Not submitted',
        submittedAt: null,
        feedback: 'No file uploaded yet. Consider flagging this student for a quick check-in before the next lab.',
      },
    ],
  },
  'BIO-201': {
    summary: [
      { label: 'Average Score', value: '86%', tone: 'good' },
      { label: 'On-Time Rate', value: '93%', tone: 'good' },
      { label: 'Needs Review', value: '2 submissions', tone: 'warn' },
      { label: 'Missing Work', value: '1 student', tone: 'neutral' },
    ],
    assignments: [
      { assignment: 'Body Systems Concept Map', submitted: '18/19', average: '88%', flagged: '1 follow-up' },
      { assignment: 'Patient Interview Reflection', submitted: '19/19', average: '85%', flagged: '2 follow-ups' },
      { assignment: 'Cardiovascular Case Response', submitted: '17/19', average: '84%', flagged: '2 follow-ups' },
    ],
    recentSubmissions: [
      {
        studentName: 'Ian McClure',
        assignment: 'Patient Interview Reflection',
        status: 'Strong',
        score: '91%',
        submittedAt: '2026-03-15T17:02:00.000Z',
        feedback: 'Excellent attention to empathy and sequencing. Reflection shows clear improvement in question design.',
      },
      {
        studentName: 'Zoe Kim',
        assignment: 'Cardiovascular Case Response',
        status: 'On Track',
        score: '86%',
        submittedAt: '2026-03-14T20:48:00.000Z',
        feedback: 'Solid clinical reasoning. Would be even stronger with a tighter explanation of why exertion changes the differential.',
      },
      {
        studentName: 'Noah Carter',
        assignment: 'Body Systems Concept Map',
        status: 'Needs Review',
        score: '76%',
        submittedAt: '2026-03-13T11:35:00.000Z',
        feedback: 'The map lists systems accurately, but the relationships between structure and function stay too vague.',
      },
      {
        studentName: 'Sofia Nguyen',
        assignment: 'Cardiovascular Case Response',
        status: 'Missing',
        score: 'Not submitted',
        submittedAt: null,
        feedback: 'No case response yet. Recommend a quick reminder before the next physiology quiz closes.',
      },
    ],
  },
}

export function getPulseSnapshot(courseCode: string | undefined, materials: CourseMaterial[]) {
  if (courseCode && PULSE_DATA[courseCode]) return PULSE_DATA[courseCode]

  const moduleNumbers = Array.from(
    new Set(
      materials
        .map((m) => m.moduleNumber)
        .filter((n): n is number => n !== null)
    )
  ).sort((a, b) => a - b)

  const fallbackModules = (moduleNumbers.length > 0 ? moduleNumbers : [1, 2, 3]).map((n, i) => {
    const pct = Math.max(28, 74 - i * 16)
    return { label: `Module ${n}`, pct, students: Math.max(3, 14 - i * 3), warn: pct < 50 }
  })

  return {
    modules: fallbackModules,
    commonQuestions: [
      { question: 'Which material should students review first?', count: 5 },
      { question: 'What does this module expect us to master?', count: 4 },
      { question: 'Is there a practice tool tied to this topic?', count: 3 },
    ],
  }
}

export function getSubmissionSnapshot(courseCode: string | undefined) {
  if (!courseCode) return null
  return SUBMISSION_SNAPSHOTS[courseCode] ?? null
}

export const SEEDED_COURSE_CODES = new Set(Object.keys(SUBMISSION_SNAPSHOTS))
