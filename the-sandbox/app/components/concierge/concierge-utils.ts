import { extractAssistantActions, type AssistantAction } from '../assistant/AssistantActionRenderer'

import type { ChatMessage, CourseContext } from '../../lib/types'
export type { CourseContext }
export type Message = ChatMessage

export interface Action {
  type: 'navigate' | 'launch' | 'switch-user'
  href?: string
  toolId?: string
  label: string
  inject?: string
  email?: string
}

export interface ProactiveConfig {
  message: string
  trigger: 'auto-open' | 'badge' | 'silent'
  sessionKey: string
  condition?: () => boolean
  requiresEnrollment?: string[]
  delayMs?: number
}

export interface PrereqMarker {
  concept: string
  courseId: string
}

const ACTION_REGEX = /<!--ACTION:([\s\S]*?)-->/g
const SAVE_NOTE_REGEX = /<!--SAVE_NOTE:[\s\S]*?-->/g
const PREREQ_UNPACK_REGEX = /\[PREREQ_UNPACK:([^:\]]+):([^\]]+)\]/g

export function extractActions(text: string): { clean: string; actions: Action[]; prereqMarkers: PrereqMarker[]; assistantActions: AssistantAction[] } {
  const actions: Action[] = []
  const prereqMarkers: PrereqMarker[] = []

  // First extract assistant actions
  const { clean: afterAssistant, actions: assistantActions } = extractAssistantActions(text)

  const clean = afterAssistant
    .replace(ACTION_REGEX, (_, json) => {
      try {
        actions.push(JSON.parse(json) as Action)
      } catch {
        // Ignore malformed action tags in partial streams.
      }
      return ''
    })
    .replace(SAVE_NOTE_REGEX, '') // strip note-saving signal — handled server-side
    .replace(PREREQ_UNPACK_REGEX, (_, concept, courseId) => {
      prereqMarkers.push({ concept, courseId })
      return ''
    })
    .trim()

  return { clean, actions, prereqMarkers, assistantActions }
}

export function readCourseContext(): CourseContext | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem('uky-course-context')
    return raw ? (JSON.parse(raw) as CourseContext) : null
  } catch {
    return null
  }
}

export function getPageStarters(pathname: string, role?: string): string[] {
  const isStudent = role === 'STUDENT'
  const isEducator = role === 'EDUCATOR' || role === 'ADMIN'

  // ─── Home — briefing chips override these for faculty ──
  if (pathname === '/today' || pathname === '/') return isStudent
    ? [
        'What should I tackle first today?',
        'Quiz me on my weakest topics',
        'Compose an email to my professor',
        'Any assignments I should start early?',
      ]
    : [
        'Draft replies to my urgent emails',
        'Compose a new email',
        'Prep me for my next meeting',
        'Catch me up on what changed this week',
      ]

  // ─── Build — Sandy offers to do the hard part ─────────
  if (pathname.startsWith('/agents/browse')) {
    return [
      'What agents are available?',
      'Help me find a study agent',
      'How do I create my own agent?',
      'What are the most popular agents?',
    ]
  }

  if (pathname.startsWith('/agents/build')) {
    return [
      'I want to build a study helper',
      'Create an agent for email triage',
      'Help me make a tutoring agent',
      'What tools can my agent use?',
    ]
  }

  if (pathname.startsWith('/studio') || pathname.startsWith('/builder') || pathname.startsWith('/build')) {
    return isStudent
      ? [
          'I have an idea — build it with me',
          'Make me a study tool for my hardest class',
          'Start from a template',
          'Turn my notes into a practice quiz',
        ]
      : [
          'Describe what you want — I\'ll draft it',
          'Suggest objectives from my syllabus',
          'Turn my rubric into an AI grading tool',
          'Start from a template that fits my course',
        ]
  }

  // ─── Courses — Sandy anticipates the check-in ────────
  if (pathname.startsWith('/courses')) {
    return isStudent
      ? [
          'What\'s coming up on my timeline?',
          'Show me what\'s due this week',
          'Quiz me on what I\'m weakest on',
          'Email my instructor about this course',
        ]
      : [
          'Show me who\'s falling behind',
          'Email a student in this course',
          'Which concepts need reteaching?',
          'Draft an announcement for my class',
        ]
  }

  // ─── Hub — Sandy steers toward action ─────────────────
  if (pathname === '/hub' || pathname.startsWith('/hub')) {
    return isStudent
      ? [
          'Find a tool for what I\'m studying',
          'What\'s popular with students in my major?',
          'I need help with writing',
          'Surprise me — something I haven\'t tried',
        ]
      : [
          'What are my students using most?',
          'Find tools that match my course objectives',
          'Try the Write Room — quick email polish',
          'Browse the Data Desk for reports',
        ]
  }

  // ─── Messages ─────────────────────────────────────────
  if (pathname.startsWith('/messages')) {
    return [
      'Compose a new email',
      'Start a new conversation',
      'Catch me up on unread threads',
      'Check my inbox for anything urgent',
    ]
  }

  // ─── Faculty Intelligence — three-panel course analytics ──
  if (pathname === '/analytics/faculty-intelligence') {
    return [
      'Summarize my morning briefing',
      'Which assignments need attention?',
      'Explain the scorecard for my course',
      'What should I do first today?',
    ]
  }

  // ─── Teaching Intelligence — concept difficulty, interventions, pulse ──
  if (pathname === '/analytics/teaching/interventions') {
    return [
      'Which interventions had the biggest impact?',
      'Log a new teaching adjustment',
      'Compare outcomes before and after my changes',
      'Show me interventions that need follow-up',
    ]
  }
  if (pathname === '/analytics/teaching/cross-section') {
    return [
      'How do my sections compare this week?',
      'Which section has the lowest concept mastery?',
      'Any outlier patterns across sections?',
      'What can I learn from my best-performing section?',
    ]
  }
  if (pathname.startsWith('/analytics/teaching')) {
    return [
      'Which concepts are students struggling with?',
      'Show me this week\'s Teaching Pulse',
      'What interventions have been most effective?',
      'Any critical concept alerts?',
    ]
  }

  // ─── Analytics — Sandy highlights what changed ────────
  if (pathname.startsWith('/analytics')) {
    return isEducator
      ? [
          'Highlight what changed since last week',
          'Which students went from active to silent?',
          'Compare my courses side by side',
          'What should I reteach based on the data?',
        ]
      : [
          'Show me where I\'m improving',
          'What topics need more study time?',
          'How do I compare to my own goals?',
          'Recommend a study plan from my data',
        ]
  }

  // ─── Write Room ───────────────────────────────────────
  if (pathname.startsWith('/write-room')) {
    return [
      'Polish my resume for a specific role',
      'Write a cover letter from my experience',
      'Make this email sound more professional',
      'Optimize my LinkedIn profile',
    ]
  }

  // ─── Data Desk ────────────────────────────────────────
  if (pathname.startsWith('/data-desk')) {
    return [
      'Explain this chart to me',
      'Analyze my survey results',
      'Summarize this report in 3 bullet points',
      'Outline a presentation from this data',
    ]
  }

  // ─── Meeting Machine ─────────────────────────────────
  if (pathname.startsWith('/meeting-machine')) {
    return [
      'Build an agenda from my meeting topic',
      'Turn my notes into formatted minutes',
      'Extract every action item from this meeting',
      'Draft the follow-up email right now',
    ]
  }

  // ─── Wellness Hub ─────────────────────────────────────
  if (pathname.startsWith('/wellness-hub')) {
    return [
      'Check in on how I\'m feeling',
      'Log last night\'s sleep',
      'Review my habits this week',
      'Show me my mood patterns',
    ]
  }

  // ─── Research Hub ─────────────────────────────────────
  if (pathname.startsWith('/research-hub')) {
    return [
      'Find recent papers on my topic',
      'Format my citations in APA',
      'Review my methodology section',
      'Help me start a grant proposal',
    ]
  }

  // ─── Playground & My Apps ─────────────────────────────
  if (pathname.startsWith('/playground') || pathname === '/my-apps') {
    return [
      'Start from a template',
      'Help me debug this code',
      'Add an AI tutor to my app',
      'How do I publish this to My Apps?',
    ]
  }

  // ─── Campus Navigator ────────────────────────────────
  if (pathname.startsWith('/campus-navigator') || pathname.startsWith('/campus')) {
    return [
      'Find me a quiet study spot nearby',
      'Walk me to the registrar\'s office',
      'What\'s open for food right now?',
      'Show me campus events this week',
    ]
  }

  // ─── Registrar — Sandy triages the queue ──────────────
  if (pathname.startsWith('/registrar')) {
    return [
      'What\'s the most urgent petition today?',
      'Show me the oldest unresolved cases',
      'How many students are cleared to graduate?',
      'Triage today\'s incoming requests',
    ]
  }

  // ─── Staff — Committee pages ──────────────────────────
  if (pathname.match(/^\/staff\/committees\/[^/]+/)) {
    return [
      'Review the agenda for this meeting',
      'What happened at the last meeting?',
      'Draft a follow-up email for this committee',
      'Help me write minutes from my notes',
    ]
  }
  if (pathname === '/staff/committees') {
    return [
      'What are my open action items?',
      'Which committee meets next?',
      'Summarize recent decisions across committees',
      'Help me prep for my next meeting',
    ]
  }

  // ─── Staff — Sandy as operations partner ──────────────
  if (pathname.startsWith('/staff')) {
    return [
      'What\'s on my action queue today?',
      'Look up a policy for me',
      'Draft an announcement',
      'Summarize my last committee meeting',
    ]
  }

  // ─── Curriculum Intelligence Network ───────────────────
  if (pathname === '/admin/curriculum-intelligence') {
    return [
      'Where are the biggest curriculum gaps?',
      'Show me concept prerequisite chains',
      'Which departments have the most redundancy?',
      'How is Bloom\'s taxonomy distributed across programs?',
    ]
  }

  // ─── Campus Pulse Early Warning ───────────────────────
  if (pathname === '/admin/campus-pulse') {
    return [
      'Are there any critical pulse events right now?',
      'Which signals are converging this week?',
      'Show me the highest-severity alerts',
      'What themes are emerging across data streams?',
    ]
  }

  // ─── Policy Blast Radius ──────────────────────────────
  if (pathname === '/admin/policy-blast') {
    return [
      'Run a blast radius analysis on a policy change',
      'Which policies have unresolved impact reports?',
      'Show me the most affected courses',
      'What conflicts were found in the latest report?',
    ]
  }

  // ─── Admin ────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    return [
      'Show me this week\'s adoption trends',
      'Any tools waiting for approval?',
      'What are the top cost drivers?',
      'Flag anything unusual in the data',
    ]
  }

  // ─── Sandcastle Live ─────────────────────────────────
  if (pathname.startsWith('/sandcastle')) {
    return [
      'Create a live poll for my class',
      'Start a quiz game',
      'How does the collaborative canvas work?',
      'Show me activity templates',
    ]
  }

  // ─── Exam Forge ───────────────────────────────────────
  if (pathname.startsWith('/exam-forge')) {
    return [
      'Generate a practice exam for my weakest topics',
      'Focus on application-level questions',
      'Make it harder than last time',
      'Quiz me on everything from the last two weeks',
    ]
  }

  // ─── Lecture Debrief ──────────────────────────────────
  if (pathname.startsWith('/lecture-debrief')) {
    return isEducator
      ? [
          'Generate a study guide from my lecture notes',
          'Create flashcards for today\'s lecture',
          'What Bloom\'s levels did my lecture cover?',
          'Draft check-your-understanding questions',
        ]
      : [
          'Summarize this lecture for me',
          'Generate flashcards from this material',
          'What are the key concepts I should know?',
          'Quiz me on this lecture',
        ]
  }

  // ─── Office Hours ─────────────────────────────────────
  if (pathname.startsWith('/office-hours')) {
    return isEducator
      ? [
          'What questions are students asking?',
          'Show me clustered questions by topic',
          'Draft a batch response to similar questions',
          'What should I cover in office hours today?',
        ]
      : [
          'I have a question about this week\'s assignment',
          'Can you explain this concept differently?',
          'Is my approach to this problem correct?',
          'What topics are other students confused about?',
        ]
  }

  // ─── Library ──────────────────────────────────────────
  if (pathname === '/library') {
    return [
      'What have I bookmarked recently?',
      'Find resources related to my courses',
      'Show me my saved tools',
      'Suggest something new based on my interests',
    ]
  }

  // ─── Notifications ────────────────────────────────────
  if (pathname === '/notifications') {
    return [
      'What\'s most urgent?',
      'Clear all read notifications',
      'Show me only assignment reminders',
      'What did I miss this week?',
    ]
  }

  // ─── Notes ────────────────────────────────────────────
  if (pathname === '/notes') {
    return [
      'Show me notes from this week',
      'Find notes about a specific topic',
      'Summarize my recent notes',
      'What notes are linked to my courses?',
    ]
  }

  // ─── Settings ─────────────────────────────────────────
  if (pathname.startsWith('/settings')) {
    return [
      'How do I change my notification preferences?',
      'What data does the platform store about me?',
      'Help me update my privacy settings',
      'What integrations are available?',
    ]
  }

  // ─── Portfolio ────────────────────────────────────────
  if (pathname.startsWith('/portfolio')) {
    return [
      'What competencies have I demonstrated?',
      'Help me write a reflection for this artifact',
      'Map my work to program outcomes',
      'Generate a shareable portfolio link',
    ]
  }

  // ─── Individual tool pages ────────────────────────────
  if (pathname.startsWith('/tools/')) {
    return [
      'How do I get the most out of this tool?',
      'Find similar tools to this one',
      'What have other students said?',
      'Launch this tool with a specific scenario',
    ]
  }

  // ─── Bounties ─────────────────────────────────────────
  if (pathname.startsWith('/bounties')) {
    return [
      'What bounties match my skills?',
      'Help me write a good bounty request',
      'Which bounties are most popular?',
      'Show me open bounties in my department',
    ]
  }

  // ─── Profile ──────────────────────────────────────────
  if (pathname.startsWith('/profile')) {
    return [
      'Find new tools relevant to my interests',
      'What tools have my peers been using?',
      'Show me my learning history',
      'What should I try next based on my goals?',
    ]
  }

  // ─── Community Pulse ─────────────────────────────────
  if (pathname === '/community') {
    return [
      'Who\'s studying right now?',
      'Start a study room on my weakest topic',
      'Show me trending challenge topics',
      'How\'s my study streak?',
    ]
  }

  // ─── AI Literacy — Starter Packs ────────────────────
  if (pathname === '/ai-literacy/starter-packs' || pathname === '/ai-literacy/starter-packs/builder') {
    return [
      'Build me a starter pack for my course',
      'How far along is my current pack?',
      'Suggest my next assignment to implement',
      'What are starter packs?',
    ]
  }
  if (pathname === '/ai-literacy/starter-packs/browse') {
    return [
      'Show me templates for my discipline',
      'What are the AI tier levels?',
      'Find low-risk assignments to start with',
      'Which templates are most popular?',
    ]
  }

  // ─── AI Literacy — Prompt Lab & Output Eval ────────
  if (pathname === '/ai-literacy/prompt-lab') {
    return [
      'Which level should I start with?',
      'What makes a good prompt?',
      'Show my Prompt Lab progress',
      'Try a challenge from my weakest level',
    ]
  }
  if (pathname === '/ai-literacy/output-eval') {
    return [
      'How do I spot AI hallucinations?',
      'What tier should I try?',
      'Show my Output Eval progress',
      'Give me a practice scenario',
    ]
  }

  // ─── AI Literacy ────────────────────────────────────
  if (pathname.startsWith('/ai-literacy')) {
    return isEducator
      ? [
          'Which module should I start with?',
          'Help me build a course AI policy',
          'Scan my assignments for AI vulnerability',
          'What\'s my AI stance?',
        ]
      : [
          'What should I know about using AI?',
          'Help me understand when AI is appropriate',
          'What\'s the difference between good and bad AI use?',
          'Take the AI literacy quiz',
        ]
  }

  // ─── University Systems ─────────────────────────────
  if (pathname.startsWith('/university-systems')) {
    return [
      'Book a room for my meeting',
      'Check attendance for my class',
      'Submit grades to SIS',
      'Find travel grant opportunities',
    ]
  }

  // ─── UKNow ──────────────────────────────────────────
  if (pathname.startsWith('/uknow')) {
    return [
      'What\'s the latest campus news?',
      'Any news about my department?',
      'Set up an alert for a topic I care about',
      'Summarize this week\'s top stories',
    ]
  }

  // ─── Campus Map ─────────────────────────────────────
  if (pathname === '/campus-map') {
    return [
      'Where is my next class?',
      'Find the nearest dining hall',
      'Show me study spots with outlets',
      'What buildings have computer labs?',
    ]
  }

  // ─── Advising ───────────────────────────────────────
  if (pathname === '/advising') {
    return [
      'Show me my advisees with holds',
      'Who needs a degree-audit review?',
      'Any students at risk of not graduating?',
      'Draft an advising email',
    ]
  }

  // ─── Philanthropy Assistant ─────────────────────────
  if (pathname === '/philanthropy-assistant') {
    return [
      'Give me a cold call tip',
      'Show my past campaigns',
      'How do I handle objections?',
      'What makes a good donation email?',
    ]
  }

  // ─── Crisis Command Center ─────────────────────────
  if (pathname === '/crisis-comms/command-center') {
    return [
      'Start a crisis incident for me',
      'Show me my recent incidents',
      'What demo scenarios are available?',
      'How does the command center work?',
    ]
  }

  // ─── Crisis Comms ───────────────────────────────────
  if (pathname.startsWith('/crisis-comms')) {
    return [
      'What\'s the current sentiment about UK?',
      'Are any posts flagged as AI-generated?',
      'Give me the crisis brief',
      'What themes are trending in the last 7 days?',
    ]
  }

  // ─── Innovation Lab ─────────────────────────────────
  if (pathname.startsWith('/innovation-lab')) {
    return [
      'I have an idea — walk me through it',
      'Help me assess IP potential',
      'What\'s the commercialization process?',
      'Draft a pitch deck outline',
    ]
  }

  // ─── Degree Plan ────────────────────────────────────
  if (pathname === '/degree-plan') {
    return [
      'Generate a plan based on my major',
      'What should I take next semester?',
      'How many credits do I have left?',
      'What if I add a minor?',
    ]
  }

  // ─── Constellation ──────────────────────────────────
  if (pathname.startsWith('/constellation')) {
    return [
      'Show me my strongest knowledge areas',
      'Where are my knowledge gaps?',
      'How do my courses connect to each other?',
      'What skills transfer between classes?',
    ]
  }

  // ─── Explore Majors ───────────────────────────────────
  if (pathname === '/explore-majors') {
    return [
      'What if I switch to Computer Science?',
      'How many of my credits would transfer?',
      'Compare graduation timelines for two majors',
      'Which majors match my strongest courses?',
    ]
  }

  // ─── Debate ───────────────────────────────────────────
  if (pathname.startsWith('/debate')) {
    return [
      'Start a debate on a controversial topic',
      'Help me build my argument',
      'What makes a strong counterargument?',
      'Score my reasoning so far',
    ]
  }

  // ─── Bracket ──────────────────────────────────────────
  if (pathname.startsWith('/bracket')) {
    return [
      'Create a new bracket tournament',
      'How do I invite participants?',
      'Show me the current standings',
      'What contests are open to join?',
    ]
  }

  // ─── Pitch ────────────────────────────────────────────
  if (pathname.startsWith('/pitch')) {
    return [
      'Help me practice my elevator pitch',
      'What makes a compelling opening?',
      'Rate my pitch on clarity and persuasion',
      'Give me feedback on my delivery',
    ]
  }

  // ─── Quiz Bowl ────────────────────────────────────────
  if (pathname.startsWith('/quiz-bowl')) {
    return [
      'Start a quiz on my weakest topics',
      'Create a quiz for my study group',
      'What categories can I choose from?',
      'Challenge me on something hard',
    ]
  }

  // ─── Virtual Clinic ────────────────────────────────────
  if (pathname.startsWith('/virtual-clinic/encounter/')) {
    return isStudent
      ? [
          'What should I ask the patient next?',
          'Help me build my differential',
          'Am I missing any key history questions?',
          'How do I write a good problem representation?',
        ]
      : [
          'How is this student performing?',
          'What domains need attention?',
          'Show me the scoring rubric for this case',
          'Compare this encounter to the class average',
        ]
  }
  if (pathname.startsWith('/virtual-clinic')) {
    return isEducator
      ? [
          'Author a new clinical case',
          'Import cases from a text file',
          'Which cases have the most encounters?',
          'Help me design a case for my curriculum',
        ]
      : [
          'Start a clinical case',
          'Show me cases for my level',
          'How did I do on my last encounter?',
          'What organ systems should I practice?',
        ]
  }

  // ─── Clinical Trial Matcher ───────────────────────────
  if (pathname === '/clinical-trial-matcher') {
    return [
      'Find trials matching a patient profile',
      'Search for oncology trials in Kentucky',
      'What are the eligibility criteria?',
      'Show me recruiting trials near campus',
    ]
  }

  // ─── Practice ──────────────────────────────────────
  if (pathname === '/practice') {
    return [
      'Which simulation should I try first?',
      'Help me prepare for a job interview',
      'How did I do in my last simulation?',
      'Can my professor create a custom simulation?',
    ]
  }

  // ─── Together ───────────────────────────────────────
  if (pathname === '/together') {
    return [
      'Help me find a study group for my hardest topic',
      'Who could mentor me in this subject?',
      'What concepts connect my courses?',
      'Share a study guide with the community',
    ]
  }

  // ─── Reflect ────────────────────────────────────────
  if (pathname === '/reflect') {
    return [
      'Help me reflect on what I learned this week',
      'How accurate is my self-assessment?',
      'Which concepts have I grown the most in?',
      'Start a confidence check before I study',
    ]
  }

  // ─── My Path ────────────────────────────────────────
  if (pathname === '/my-path') {
    return [
      'Help me define a new learning goal',
      'Break my goal into milestones',
      'What courses or tools match my goals?',
      'How am I doing on my learning path?',
    ]
  }

  // ─── Study Buddy ─────────────────────────────────────
  if (pathname === '/study') {
    return [
      'Quiz me on my weakest topics',
      'Start a flashcard session for my hardest class',
      'Help me prepare for my upcoming exam',
      'Show me my mastery trends and study insights',
    ]
  }

  // ─── Study Match ──────────────────────────────────────
  if (pathname === '/study-match') {
    return [
      'Find study partners for my hardest class',
      'Match me with someone in my major',
      'Who\'s studying the same topics as me?',
      'Start a study group for finals prep',
    ]
  }

  // ─── Portfolio Mapper ─────────────────────────────────
  if (pathname === '/portfolio-mapper') {
    return [
      'Map my work to program competencies',
      'Help me write a reflection for this artifact',
      'What competencies am I missing?',
      'Generate a shareable portfolio',
    ]
  }

  // ─── Rooms ────────────────────────────────────────────
  if (pathname === '/rooms') {
    return [
      'Find a room with a projector for Thursday',
      'I need a study room for 4 people',
      'What\'s available near Whitehall right now?',
      'Book a conference room for my team',
    ]
  }

  // ─── Showcase ─────────────────────────────────────────
  if (pathname === '/showcase') {
    return [
      'What are the most popular tools?',
      'Show me standout student projects',
      'Find something creative I haven\'t seen',
      'How do I get my tool featured?',
    ]
  }

  // ─── Student Services ─────────────────────────────────
  if (pathname.startsWith('/student-services')) {
    return [
      'Help me with financial aid questions',
      'I need academic advising guidance',
      'Connect me with disability services',
      'What career resources are available?',
    ]
  }

  // ─── Campus Life ──────────────────────────────────────
  if (pathname === '/campus-life') {
    return [
      'Find clubs related to my interests',
      'What events have free food this week?',
      'Show me service organizations',
      'Any events with credit opportunities?',
    ]
  }

  // ─── Documents ────────────────────────────────────────
  if (pathname === '/documents') {
    return [
      'Help me organize my files',
      'Find documents from my courses',
      'Upload and categorize a new file',
      'What documents did I save recently?',
    ]
  }

  // ─── Tasks ────────────────────────────────────────────
  if (pathname === '/tasks') {
    return [
      'What\'s most urgent on my list?',
      'Help me prioritize my tasks',
      'What did Sandy flag for me today?',
      'Show me overdue items',
    ]
  }

  // ─── Assignments ──────────────────────────────────────
  if (pathname.startsWith('/assignments')) {
    return isStudent
      ? [
          'Help me understand this assignment',
          'When is this due?',
          'What does the rubric expect?',
          'How should I approach this?',
        ]
      : [
          'Show me pending submissions',
          'Who hasn\'t submitted yet?',
          'Help me design the rubric',
          'Draft feedback for this student',
        ]
  }

  // ─── FERPA Training ───────────────────────────────────
  if (pathname === '/ferpa-training') {
    return [
      'What is FERPA and why does it matter?',
      'Quiz me on student data privacy',
      'What can I share about a student?',
      'When do I need written consent?',
    ]
  }

  // ─── Petitions ────────────────────────────────────────
  if (pathname.startsWith('/petitions')) {
    return isStudent
      ? [
          'Help me draft a petition',
          'What type of petition do I need?',
          'Check the status of my petition',
          'What documentation should I include?',
        ]
      : [
          'Show me pending petitions',
          'What\'s the oldest unresolved case?',
          'Help me draft a response',
          'Triage today\'s incoming petitions',
        ]
  }

  // ─── Timeline ─────────────────────────────────────────
  if (pathname === '/timeline') {
    return [
      'Show me my recent milestones',
      'What have I accomplished this semester?',
      'When was my most productive week?',
      'Summarize my platform journey',
    ]
  }

  // ─── Compliance ───────────────────────────────────────
  if (pathname.startsWith('/compliance') || pathname.startsWith('/admin/compliance')) {
    return [
      'What compliance deadlines are coming up?',
      'Show me our FERPA status',
      'What action items need attention?',
      'Generate a compliance report',
    ]
  }

  // ─── Contribute ────────────────────────────────────────
  if (pathname.startsWith('/contribute')) {
    if (isStudent) {
      return [
        'Show me my contribution impact',
        'What tools could use feedback?',
        'Help me create a collection for my major',
        'What campus tips are popular right now?',
      ]
    }
    return [
      'What feedback have students given on my tools?',
      'Show me top improvement suggestions',
      'What are the most popular student collections?',
      'What campus tips are trending?',
    ]
  }

  // ─── Evaluate ─────────────────────────────────────────
  if (pathname.startsWith('/evaluate')) {
    return [
      'Walk me through what the platform does',
      'Show me the ROI calculator',
      'What makes this different from other platforms?',
      'How does this scale to 70,000 users?',
    ]
  }

  // ─── ADA Compliance ────────────────────────────────────
  if (pathname === '/ada-tool') {
    return [
      'What does WCAG 2.1 AA require?',
      'What\'s our overall compliance rate?',
      'How do I improve my readability score?',
      'Scan all materials in my course',
    ]
  }

  // ─── Audio Experience Platform ────────────────────────
  if (pathname === '/audio' || pathname.startsWith('/audio')) return [
    'What should I listen to?',
    'Quiz me verbally on my weakest course',
    'Make a podcast from my notes',
    'Start a practice interview',
  ]

  // ─── Fallback ─────────────────────────────────────────
  return [
    'Show me tools for my department',
    "What's in my courses this week?",
    'What should I try next?',
    'What can you help me with on this page?',
  ]
}
