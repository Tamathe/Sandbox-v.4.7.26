'use client'

import type { CourseContext } from './concierge-utils'

interface SandyGreetingProps {
  revealStep: number
  starters: string[]
  pathname: string
  userName: string
  userRole: string
  courseContext: CourseContext | null
  onStarterClick: (starter: string) => void
}

export default function SandyGreeting({
  revealStep,
  starters,
  pathname,
  userName,
  userRole,
  courseContext,
  onStarterClick,
}: SandyGreetingProps) {
  const firstName = userName.split(' ')[0]

  // Homepage greetings are handled by the briefing system (injected as a real message
  // via SandyAmbientContext). This greeting only shows when messages are empty AND no
  // briefing has loaded — i.e., non-home pages or brief loading delay.
  const greeting = getContextualGreeting(pathname, firstName, userRole, courseContext)

  return (
    <div className="space-y-3">
      {revealStep >= 1 && (
        <div className="flex items-start gap-2 animate-[fadeIn_0.3s_ease-out]">
          <div className="size-7 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
            S
          </div>
          <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm border border-gray-100 text-sm text-gray-800 max-w-[85%]">
            {greeting}
          </div>
        </div>
      )}
      {revealStep >= 2 && (
        <div className="pl-9 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 px-1 animate-[fadeIn_0.3s_ease-out]">
            Suggestions for this page
          </div>
          {starters.map((starter, i) => (
            revealStep >= 3 + i && (
              <button
                key={starter}
                onClick={() => onStarterClick(starter)}
                className="block w-full text-left text-xs text-[#0033A0] bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-3 py-2 transition-colors animate-[fadeIn_0.3s_ease-out]"
              >
                {starter}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Contextual Greetings ─────────────────────────────────────
// Sandy's opening line varies by page. She should sound like she already
// knows where you are and what you might need — not generic.

function getContextualGreeting(
  pathname: string,
  firstName: string,
  userRole: string,
  courseContext: CourseContext | null,
): string {
  const isStudent = userRole === 'STUDENT'
  const isEducator = userRole === 'EDUCATOR' || userRole === 'ADMIN'

  // Home — briefing loading fallback (real greeting comes from briefing system)
  if (pathname === '/')
    return `Hi ${firstName}! I'm Sandy, your assistant. Your briefing is loading — or ask me anything in the meantime.`

  // Courses
  if (pathname === '/courses' || pathname.startsWith('/courses/'))
    return `Hi ${firstName}! I'm your course concierge${courseContext ? ` for ${courseContext.courseCode}` : ''}. Ask me about materials, tools, or what to work on next.`

  // Build / Builder / Studio
  if (pathname.startsWith('/build') || pathname.startsWith('/builder') || pathname.startsWith('/studio'))
    return isStudent
      ? `Hey ${firstName}! Tell me your idea in one sentence and I'll help you build it. No coding needed.`
      : `Hi ${firstName}! Describe the learning experience you want to create and I'll build it with you.`

  // Hub
  if (pathname === '/hub' || pathname.startsWith('/hub'))
    return `Hi ${firstName}! I know every tool on this platform. Tell me what you're working on and I'll point you to the right one.`

  // Messages
  if (pathname.startsWith('/messages'))
    return `Hi ${firstName}! I can help you find conversations, start new ones, or catch up on what you missed.`

  // Analytics
  if (pathname.startsWith('/analytics'))
    return isEducator
      ? `Hi ${firstName}! I can walk you through these analytics. Ask me about trends, specific students, or what the data means.`
      : `Hi ${firstName}! Here's your learning data. Ask me what it means or where to focus next.`

  // Write Room
  if (pathname.startsWith('/write-room'))
    return `Hi ${firstName}! I'm your writing partner here. Whether it's a resume, cover letter, email, or LinkedIn profile — tell me what you need.`

  // Data Desk
  if (pathname.startsWith('/data-desk'))
    return `Hi ${firstName}! Upload a chart, paste survey results, or describe your presentation — I'll help you make sense of the data.`

  // Meeting Machine
  if (pathname.startsWith('/meeting-machine'))
    return `Hi ${firstName}! I can build agendas, take minutes, extract action items, and draft follow-ups. What meeting are we working on?`

  // Wellness Hub
  if (pathname.startsWith('/wellness-hub'))
    return `Hi ${firstName}! This is a quiet space for check-ins. Log your mood, habits, sleep, or symptoms — I'll help you spot patterns over time.`

  // Research Hub
  if (pathname.startsWith('/research-hub'))
    return `Hi ${firstName}! I can help with literature searches, citations, methodology review, and grant writing. What's your research focus?`

  // Playground / My Apps
  if (pathname.startsWith('/playground') || pathname === '/my-apps')
    return `Hi ${firstName}! This is the code playground — build interactive apps with live preview. Start from a template or describe what you want.`

  // Campus Navigator
  if (pathname.startsWith('/campus-navigator') || pathname.startsWith('/campus'))
    return `Hi ${firstName}! I know the entire UK campus. Ask me about buildings, services, events, or where to find what you need.`

  // Registrar
  if (pathname.startsWith('/registrar'))
    return `Hi ${firstName}! I can help you navigate petitions, transfer credits, degree audits, and the registrar workflow.`

  // Admin
  if (pathname.startsWith('/admin'))
    return `Hi ${firstName}! I can surface platform health, pending approvals, cost metrics, and user activity. What do you need?`

  // Exam Forge
  if (pathname.startsWith('/exam-forge'))
    return `Hi ${firstName}! I'll generate a practice exam personalized to your weak spots. Pick a course and assignment to get started.`

  // Lecture Debrief
  if (pathname.startsWith('/lecture-debrief'))
    return isEducator
      ? `Hi ${firstName}! Paste your lecture notes and I'll generate a study guide, flashcards, and comprehension questions.`
      : `Hi ${firstName}! I can summarize this lecture, create flashcards, or quiz you on the key concepts.`

  // Office Hours
  if (pathname.startsWith('/office-hours'))
    return isEducator
      ? `Hi ${firstName}! I've been watching the question queue. Ask me what students need help with today.`
      : `Hi ${firstName}! Ask me your question — I may be able to help instantly, or I'll queue it for your professor.`

  // Sandcastle Live
  if (pathname.startsWith('/sandcastle'))
    return `Hi ${firstName}! Sandcastle is for live classroom experiences — polls, quizzes, collaborative canvases, and game shows.`

  // Library
  if (pathname === '/library')
    return `Hi ${firstName}! Your library has your bookmarks, saved tools, and curated resources. Want me to find something specific?`

  // Notifications
  if (pathname === '/notifications')
    return `Hi ${firstName}! I can help you sort through your notifications and highlight what needs attention.`

  // Notes
  if (pathname === '/notes')
    return `Hi ${firstName}! These are notes I've saved for you from our conversations. Want me to find a specific one?`

  // Settings
  if (pathname.startsWith('/settings'))
    return `Hi ${firstName}! I can help you adjust your preferences, privacy settings, and notification controls.`

  // Portfolio
  if (pathname.startsWith('/portfolio'))
    return `Hi ${firstName}! I can help you curate artifacts, map competencies, and build a shareable portfolio.`

  // Constellation
  if (pathname === '/constellation')
    return `Hi ${firstName}! This is your knowledge constellation — a visual map of everything you've learned. Ask me about any cluster or concept.`

  // Bounties
  if (pathname.startsWith('/bounties'))
    return `Hi ${firstName}! Bounties are tool requests from the community. I can help you find one to claim or write a new request.`

  // Student Services
  if (pathname.startsWith('/student-services'))
    return `Hi ${firstName}! Tell me what you need help with — financial aid, advising, health, disability services, or anything else.`

  // Degree Plan
  if (pathname === '/degree-plan')
    return `Hi ${firstName}! I can help you plan your semester-by-semester path to graduation based on your major and completed courses.`

  // Study Match
  if (pathname === '/study-match')
    return `Hi ${firstName}! Describe what you're studying and I'll match you with compatible study partners.`

  // Quiz Bowl / Debate / Bracket / Pitch
  if (pathname.startsWith('/quiz-bowl') || pathname.startsWith('/debate') || pathname.startsWith('/bracket') || pathname.startsWith('/pitch'))
    return `Hi ${firstName}! Ready to compete? I can help you create or join a session.`

  // Workshop
  if (pathname.startsWith('/workshop'))
    return `Hi ${firstName}! These are specialized faculty tools. Tell me what you're working on and I'll guide you to the right one.`

  // Individual tool pages
  if (pathname.startsWith('/tools/'))
    return `Hi ${firstName}! I know this tool well. Ask me how to use it, what it's best for, or let me launch it with a specific scenario.`

  // Evaluator
  if (pathname.startsWith('/evaluate'))
    return `Welcome! I'm Sandy, the AI that powers this entire platform. I'll guide you through what the platform can do for your institution.`

  // Fallback
  return `Hi ${firstName}! I'm Sandy, your AI assistant. I can help you navigate this page and figure out the next useful step. What are you working on?`
}
