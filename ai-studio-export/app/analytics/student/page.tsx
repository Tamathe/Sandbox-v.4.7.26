'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import {
  TrendingUp, Brain, Flame,
  CheckCircle, ChevronRight, Award,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

// ─── Simulated Student Data ───────────────────────────────────────────────────

const STUDENT = {
  name: 'Tiana The',
  avatar: 'TT',
  course: 'ENGL 301',
  instructor: 'Dr. Diana Brooks',
  streak: 7,
  totalSessions: 24,
  totalMinutes: 432,
  avgScore: 85,
  rank: 2,
  classSize: 6,
}

const WEEKLY_PROGRESS = [
  { week: 'Jan 13', score: 78, minutes: 45 },
  { week: 'Jan 20', score: 80, minutes: 52 },
  { week: 'Jan 27', score: 82, minutes: 48 },
  { week: 'Feb 3',  score: 84, minutes: 61 },
  { week: 'Feb 10', score: 83, minutes: 55 },
  { week: 'Feb 17', score: 85, minutes: 58 },
  { week: 'Feb 24', score: 85, minutes: 62 },
  { week: 'Mar 3',  score: 85, minutes: 51 },
]

const SKILLS = [
  { skill: 'Legal Reasoning', score: 88 },
  { skill: 'Case Analysis', score: 82 },
  { skill: 'Evidence Rules', score: 79 },
  { skill: 'Oral Argument', score: 85 },
  { skill: 'Research', score: 90 },
]

const RECENT_SESSIONS = [
  {
    id: 1, tool: 'LAW 756: Evidence Rules Simulator', date: '2 hours ago',
    duration: 22, score: 87, topic: 'Hearsay Exceptions (FRE 803)',
    insight: 'You correctly identified 8/10 hearsay exceptions. Strong on business records — review excited utterance.',
    badge: null,
  },
  {
    id: 2, tool: 'Cross-Examination Simulator', date: 'Yesterday',
    duration: 18, score: 83, topic: 'Leading Questions & Impeachment',
    insight: 'Good control of witness — you stayed composed under redirect. Watch for overusing compound questions.',
    badge: 'Sharp Questioner',
  },
  {
    id: 3, tool: 'Socratic Philosophy Debate Partner', date: '3 days ago',
    duration: 31, score: 90, topic: 'Epistemic Standards in Law',
    insight: 'Exceptional session. Your argument connecting Bayesian reasoning to evidentiary standards was sophisticated.',
    badge: 'Deep Thinker',
  },
  {
    id: 4, tool: 'LAW 756: Evidence Rules Simulator', date: '4 days ago',
    duration: 15, score: 79, topic: 'Character Evidence (FRE 404)',
    insight: 'Character evidence is your most challenging area. You confused propensity with non-propensity uses twice.',
    badge: null,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

type ObjectiveProgressEntry = {
  objectiveId: string
  courseId: string
  attempts: number
  correct: number
  lastSeen: string
  objective?: {
    title: string
    courseId: string
    course?: { courseCode: string; title: string }
  }
}

export default function StudentAnalyticsPage() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'progress' | 'sessions' | 'portfolio'>('progress')
  const [analysisOptIn, setAnalysisOptIn] = useState(true)
  const [objectiveProgress, setObjectiveProgress] = useState<ObjectiveProgressEntry[]>([])

  useEffect(() => {
    fetch('/api/objectives/progress', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then((data: { progress?: ObjectiveProgressEntry[] }) => {
        if (data.progress) setObjectiveProgress(data.progress)
      })
      .catch(() => {})
  }, [currentUser.email])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0033A0] to-[#1a4db5] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-bold">
              {STUDENT.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{STUDENT.name}</h1>
              <p className="text-blue-200 text-sm">{STUDENT.course} · {STUDENT.instructor}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-orange-500/20 border border-orange-400/40 rounded-xl px-3 py-2">
              <Flame className="w-4 h-4 text-orange-300" />
              <span className="font-bold text-white">{STUDENT.streak}</span>
              <span className="text-orange-200 text-xs">day streak</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Sessions', value: STUDENT.totalSessions },
              { label: 'Minutes', value: STUDENT.totalMinutes },
              { label: 'Avg Score', value: STUDENT.avgScore },
              { label: `Rank`, value: `#${STUDENT.rank}/${STUDENT.classSize}` },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-blue-200">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-white/20">
            {(['progress', 'sessions', 'portfolio'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition-colors ${
                  activeTab === tab ? 'bg-white text-[#0033A0]' : 'text-blue-200 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── PROGRESS TAB ── */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Score trend */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Your Score Trend</h3>
                  <p className="text-xs text-gray-400">8-week performance history</p>
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  +7 pts since start
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={WEEKLY_PROGRESS}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0033A0" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0033A0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#0033A0" fill="url(#scoreGrad)" strokeWidth={2} dot={{ r: 3 }} name="Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Skill Profile radar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Skill Profile</h3>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={SKILLS}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#0033A0" fill="#0033A0" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Real learning objective progress */}
            {objectiveProgress.length > 0 && (() => {
              // Group by course
              const byCourse = objectiveProgress.reduce<Record<string, ObjectiveProgressEntry[]>>((acc, p) => {
                const key = p.objective?.course?.courseCode ?? p.courseId
                if (!acc[key]) acc[key] = []
                acc[key].push(p)
                return acc
              }, {})
              const weak = objectiveProgress.filter(p => p.attempts > 0 && p.correct / p.attempts < 0.65)
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Learning Objective Mastery</h3>
                      <p className="text-xs text-gray-400">{objectiveProgress.length} objective{objectiveProgress.length !== 1 ? 's' : ''} tracked from your course activity</p>
                    </div>
                    {weak.length > 0 && (
                      <a
                        href={`/playground?prompt=${encodeURIComponent(
                          `I need help with these learning objectives:\n${weak.map(p => `- ${p.objective?.title ?? p.objectiveId}`).join('\n')}\n\nPlease quiz me on these topics and adapt based on my answers.`
                        )}`}
                        className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-100 whitespace-nowrap"
                      >
                        Study my gaps →
                      </a>
                    )}
                  </div>
                  <div className="space-y-5">
                    {Object.entries(byCourse).map(([courseKey, entries]) => (
                      <div key={courseKey}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{courseKey}</p>
                        <div className="space-y-2">
                          {entries.map(p => {
                            const mastery = p.attempts > 0 ? Math.round((p.correct / p.attempts) * 100) : null
                            return (
                              <div key={p.objectiveId}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-600 truncate mr-2">{p.objective?.title ?? p.objectiveId}</span>
                                  <span className={`font-semibold flex-shrink-0 ${mastery === null ? 'text-gray-400' : mastery >= 80 ? 'text-green-600' : mastery >= 60 ? 'text-blue-600' : 'text-yellow-600'}`}>
                                    {mastery !== null ? `${mastery}%` : `${p.attempts} attempt${p.attempts !== 1 ? 's' : ''}`}
                                  </span>
                                </div>
                                {mastery !== null && (
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full ${mastery >= 80 ? 'bg-green-500' : mastery >= 60 ? 'bg-[#0033A0]' : 'bg-yellow-400'}`}
                                      style={{ width: `${mastery}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">AI analysis</span>
                <button
                  onClick={() => setAnalysisOptIn(!analysisOptIn)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${analysisOptIn ? 'bg-[#0033A0]' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${analysisOptIn ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {!analysisOptIn && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
                AI analysis is off. Session insights and rubric scoring are paused. Your instructor can still see engagement data.
              </div>
            )}

            {RECENT_SESSIONS.map(session => (
              <div key={session.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{session.tool}</h4>
                      {session.badge && (
                        <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {session.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{session.date} · {session.duration} min · {session.topic}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xl font-bold text-gray-900">{session.score}</p>
                    <p className="text-xs text-gray-400">score</p>
                  </div>
                </div>
                {analysisOptIn && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2">
                    <Brain className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">{session.insight}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PORTFOLIO TAB ── */}
        {activeTab === 'portfolio' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Learning Portfolio</h3>
                  <p className="text-xs text-gray-400">A record of your AI-assisted learning journey</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="text-xs text-[#0033A0] font-semibold border border-[#0033A0]/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Export PDF
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-l-4 border-[#0033A0] pl-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Course</p>
                  <p className="font-semibold text-gray-900">LAW 756: Evidence Rules</p>
                  <p className="text-sm text-gray-500">Spring 2026 · University of Kentucky College of Law</p>
                </div>

                <div className="border-l-4 border-green-400 pl-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Learning Outcomes Demonstrated</p>
                  <div className="space-y-1.5">
                    {[
                      'Application of Federal Rules of Evidence in simulated cross-examination',
                      'Identification and classification of hearsay exceptions under FRE 803',
                      'Analysis of character evidence admissibility under FRE 404-405',
                      'Construction of evidentiary arguments in written and oral formats',
                    ].map((outcome, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {outcome}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-l-4 border-yellow-400 pl-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Areas for Growth</p>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <ChevronRight className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    Character evidence (FRE 404-405): propensity vs. non-propensity use distinction
                  </div>
                </div>

                <div className="border-l-4 border-blue-400 pl-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">AI Tools Used</p>
                  <div className="flex flex-wrap gap-2">
                    {['Evidence Rules Simulator', 'Cross-Exam Simulator', 'Socratic Debate Partner'].map(tool => (
                      <span key={tool} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Sessions Completed', value: '24' },
                    { label: 'Hours Invested', value: '7.2' },
                    { label: 'Final Avg Score', value: '85' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
