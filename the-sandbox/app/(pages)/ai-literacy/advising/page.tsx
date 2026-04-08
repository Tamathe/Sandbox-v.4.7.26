'use client'

import { useState } from 'react'
import { ArrowLeft, MessageCircle, ChevronDown, AlertTriangle, Users, BookOpen, Play } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../../components/PageHeader'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'

interface AdvisingScenario {
  id: string
  title: string
  situation: string
  suggestedApproach: string[]
  doNots: string[]
  escalateTo: string | null
}

const SCENARIOS: AdvisingScenario[] = [
  {
    id: 'student-admits-ai',
    title: 'Student admits using AI against course policy',
    situation: 'During advising, a student mentions they used AI to complete an assignment in a course that prohibits it. They are seeking advice.',
    suggestedApproach: [
      'Listen without judgment — they came to you, which means they trust you',
      'Ask clarifying questions: Was this a one-time thing? Do they understand why the policy exists?',
      'Explain potential consequences honestly but calmly',
      'Help them understand the learning rationale behind the policy',
      'Encourage them to talk to the instructor directly — this often leads to better outcomes',
      'If appropriate, discuss academic integrity resources (Ombud\'s office)',
    ],
    doNots: [
      'Don\'t report them without discussing it first — they came to you in confidence',
      'Don\'t minimize it ("everyone does it") — that undermines the learning',
      'Don\'t catastrophize — help them see a path forward',
      'Don\'t advise them to hide it from the instructor',
    ],
    escalateTo: 'Academic Ombud\'s Office (if student wants formal guidance)',
  },
  {
    id: 'student-asks-about-tools',
    title: 'Student asks what AI tools they can use',
    situation: 'A student asks during advising whether they can use AI for their courses. They are genuinely confused about what is and isn\'t allowed.',
    suggestedApproach: [
      'Acknowledge that it IS confusing — policies vary across courses',
      'Direct them to check each course syllabus for AI-specific language',
      'Recommend the Student AI Literacy modules (/ai-literacy/student)',
      'Key message: "When in doubt, ask the instructor BEFORE using AI"',
      'Help them understand the difference between brainstorming help and having AI do the work',
    ],
    doNots: [
      'Don\'t give blanket advice ("AI is fine everywhere" or "never use AI")',
      'Don\'t assume all their courses have the same policy',
      'Don\'t dismiss their confusion — the inconsistency is real and frustrating',
    ],
    escalateTo: null,
  },
  {
    id: 'struggling-relied-on-ai',
    title: 'Student struggling because they relied on AI',
    situation: 'A student is failing or struggling in a course, and during conversation you realize they used AI for earlier assignments and now lack the foundational skills for more advanced work.',
    suggestedApproach: [
      'Name the pattern without judgment: "It sounds like the early assignments helped build skills you needed for these later ones"',
      'Help them create a catch-up plan: office hours, tutoring, study groups',
      'Recommend Study Buddy for targeted review of foundational concepts',
      'Discuss whether the course is still salvageable or if a withdrawal timeline applies',
      'Talk about what they learned from this experience for future courses',
    ],
    doNots: [
      'Don\'t lecture them about AI being bad — they already know it didn\'t work',
      'Don\'t focus on blame — focus on what to do now',
      'Don\'t promise the instructor will be lenient without knowing',
    ],
    escalateTo: 'Course instructor (for catch-up options); Academic support/tutoring center',
  },
  {
    id: 'student-wants-to-use-ai-ethically',
    title: 'Student wants to use AI ethically but doesn\'t know how',
    situation: 'A motivated student wants to use AI as a learning tool but is afraid of accidentally crossing a line.',
    suggestedApproach: [
      'Affirm that this is a great question — wanting to use AI well is a sign of maturity',
      'Teach the "disclosure first" principle: always disclose, even when you think it\'s fine',
      'Share the AI Usage Statement format (tool, purpose, what you changed)',
      'Suggest they talk to each instructor about their specific expectations',
      'Point them to the Student AI Literacy modules and the Citing AI Work module specifically',
    ],
    doNots: [
      'Don\'t discourage them from using AI entirely — channel the motivation',
      'Don\'t imply that all AI use is suspicious',
    ],
    escalateTo: null,
  },
  {
    id: 'faculty-colleague-frustrated',
    title: 'A faculty colleague is frustrated about AI cheating',
    situation: 'A colleague vents during a meeting about students using AI to cheat. They feel unsupported by the university.',
    suggestedApproach: [
      'Listen and validate — the frustration is legitimate and shared by 78% of DUS respondents',
      'Share that detection tools don\'t work reliably (this is documented)',
      'Suggest the Assignment Redesign Studio (/ai-literacy/assignments) for practical help',
      'Mention the Policy Framework Builder for structuring their course AI policy',
      'If they\'re interested in peer examples, point them to the Pedagogy Hub',
      'Acknowledge the institutional tension they may be feeling',
    ],
    doNots: [
      'Don\'t dismiss their concern or tell them to "just adapt"',
      'Don\'t promise that technology will solve the detection problem',
      'Don\'t push AI adoption on someone who isn\'t ready',
    ],
    escalateTo: 'CELT (for consultation); AI Literacy Hub (for self-service tools)',
  },
]

export default function AdvisingFrameworkPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <>
      <PageHeader
        title="AI-Assisted Advising Framework"
        subtitle="Conversation frameworks for navigating AI topics in advising — because 88% of programs have no guidance here"
        action={
          <Link href="/ai-literacy" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" />
            AI Literacy Hub
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Context + practice CTA */}
        <div className="flex items-center justify-between bg-teal-50 px-4 py-3 rounded-xl border border-teal-200">
          <p className="text-sm text-teal-700">
            88% of programs have no AI guidance for advising. These frameworks fill that gap.
          </p>
          <Link
            href="/ai-literacy/advising/practice"
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shrink-0 ml-4"
          >
            <Play className="size-3.5" />
            Practice with Sandy
          </Link>
        </div>

        {/* Scenarios */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900">Advising Scenarios</h2>
          {SCENARIOS.map(s => {
            const isExpanded = expanded === s.id
            return (
              <div key={s.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : s.id)}
                  className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                        <MessageCircle className="size-4 text-teal-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
                    </div>
                    <ChevronDown className={`size-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-11">{s.situation}</p>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4 ml-11">
                    {/* Suggested approach */}
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-green-700 tracking-wider mb-2">
                        <Users className="size-3" /> Suggested Approach
                      </h4>
                      <ul className="space-y-1.5">
                        {s.suggestedApproach.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 size-1.5 rounded-full bg-green-400 shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Do nots */}
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-red-700 tracking-wider mb-2">
                        <AlertTriangle className="size-3" /> Avoid
                      </h4>
                      <ul className="space-y-1.5">
                        {s.doNots.map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 size-1.5 rounded-full bg-red-400 shrink-0" /> {d}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Escalation */}
                    {s.escalateTo && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                          <BookOpen className="size-3" /> Escalate to
                        </h4>
                        <p className="text-sm text-gray-700">{s.escalateTo}</p>
                      </div>
                    )}

                    {/* Practice button */}
                    <Link
                      href={`/ai-literacy/advising/practice?scenario=${s.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors w-fit"
                    >
                      <Play className="size-3.5" />
                      Practice This Scenario with Sandy
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <PathwayNav />
      </div>
    </>
  )
}
