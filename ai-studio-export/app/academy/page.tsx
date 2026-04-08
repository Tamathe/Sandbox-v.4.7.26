'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, BookOpen, BarChart3, FlaskConical, BookMarked,
  Brain, Target, TrendingUp, GraduationCap, Compass, Sparkles,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { addDays, differenceInDays, format } from 'date-fns'

const TODAY = new Date()

function buildDue(title: string, course: string, daysFromNow: number, type: string) {
  const dueDate = addDays(TODAY, daysFromNow)
  return {
    title, course, type,
    date: format(dueDate, 'MMM d'),
    urgent: differenceInDays(dueDate, TODAY) <= 3,
  }
}

const STUDENT_DUE: Record<string, ReturnType<typeof buildDue>[]> = {
  'ian.mcclure.student@uky.edu': [
    buildDue('Evidence Rules Exam', 'LAW 756', 3, 'Exam'),
    buildDue('Trial Advocacy Brief', 'LAW 820', 10, 'Brief'),
    buildDue('Constitutional Law Memo', 'LAW 601', 14, 'Memo'),
  ],
  'tiana.the@uky.edu': [
    buildDue('Romanticism Essay', 'ENG 201', 3, 'Essay'),
    buildDue('Short Story Draft', 'ENG 315', 5, 'Assignment'),
    buildDue('Post-Colonial Theory Paper', 'ENG 420', 9, 'Paper'),
  ],
}

const STUDY_TOOLS = [
  { href: '/tools', label: 'Tools Marketplace', description: 'Browse all academic AI tools', icon: Compass, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { href: '/research-hub', label: 'Research Hub', description: 'Literature search, methodology, grants', icon: FlaskConical, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', roles: ['EDUCATOR', 'ADMIN'] },
  { href: '/library', label: 'My Library', description: 'Saved tools and study sessions', icon: BookMarked, color: 'bg-amber-50 border-amber-200 text-amber-700', roles: ['STUDENT'] },
  { href: '/analytics/student', label: 'My Progress', description: 'Session history and scores', icon: BarChart3, color: 'bg-green-50 border-green-200 text-green-700', roles: ['STUDENT'] },
  { href: '/analytics/faculty', label: 'Analytics', description: 'Student engagement and outcomes', icon: TrendingUp, color: 'bg-green-50 border-green-200 text-green-700', roles: ['EDUCATOR', 'ADMIN'] },
  { href: '/avatar', label: 'My TA', description: 'Your AI teaching assistant', icon: Brain, color: 'bg-purple-50 border-purple-200 text-purple-700', roles: ['EDUCATOR', 'ADMIN'] },
]

function typeBadgeStyle(type: string) {
  const map: Record<string, string> = {
    Exam: 'bg-red-100 text-red-700',
    Brief: 'bg-blue-100 text-blue-700',
    Memo: 'bg-amber-100 text-amber-700',
    Essay: 'bg-indigo-100 text-indigo-700',
    Paper: 'bg-indigo-100 text-indigo-700',
    Assignment: 'bg-gray-100 text-gray-600',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600'
}

export default function AcademyPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const isStudent = currentUser.role === 'STUDENT'
  const isEducator = currentUser.role === 'EDUCATOR'
  const isAdmin = currentUser.role === 'ADMIN'

  const [courses, setCourses] = useState<{
    courseId: string; courseCode: string; title: string; instructorName: string;
    total: number; mastered: number; struggling: number; notStarted: number;
    completionPct: number;
    nextObjective: { id: string; title: string; moduleNumber: number } | null;
  }[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  useEffect(() => {
    if (!isStudent) { setCoursesLoading(false); return }
    fetch('/api/enrollment', { headers: { 'x-demo-user-email': currentUser.email } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.courses)) setCourses(d.courses) })
      .catch(() => {})
      .finally(() => setCoursesLoading(false))
  }, [currentUser.email, isStudent])

  const upcomingDue = isStudent ? (STUDENT_DUE[currentUser.email] ?? []) : []
  const urgentCount = upcomingDue.filter(i => i.urgent).length
  const visibleStudyTools = STUDY_TOOLS.filter(t =>
    !t.roles || t.roles.includes(currentUser.role)
  )

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-[#0033A0]">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 20%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-sm font-medium text-blue-100 mb-4">
            <GraduationCap className="w-4 h-4" />
            <span>Academy</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
            Your intellectual core.<br />
            <span className="text-blue-200">Every course. Every tool.</span>
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
            {isStudent
              ? 'Track coursework, drill concepts, and find the study tools your peers are using right now.'
              : 'Manage your courses, monitor student progress, and deploy AI tools directly into your curriculum.'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* Left — Primary: Courses */}
          <div className="space-y-6">

            {/* Courses section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest">
                  {isStudent ? 'My Courses' : 'Courses'}
                </h2>
                <Link href="/courses" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
                  {isStudent ? 'All courses' : 'Course management'}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {isStudent && (
                coursesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[0, 1].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />)}
                  </div>
                ) : courses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courses.map(course => {
                      const masteredPct = course.total > 0 ? Math.round((course.mastered / course.total) * 100) : 0
                      const strugglingPct = course.total > 0 ? Math.round((course.struggling / course.total) * 100) : 0
                      const notStartedPct = course.total > 0 ? Math.round((course.notStarted / course.total) * 100) : 100
                      return (
                        <div key={course.courseId} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-2.5 hover:border-[#0033A0]/30 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">{course.courseCode}</span>
                              <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5 line-clamp-1">{course.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{course.instructorName}</p>
                            </div>
                            <span className="text-lg font-extrabold text-[#0033A0] flex-shrink-0">{course.completionPct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden flex">
                            <div className="h-full bg-green-500 transition-all" style={{ width: `${masteredPct}%` }} />
                            <div className="h-full bg-yellow-400 transition-all" style={{ width: `${strugglingPct}%` }} />
                            <div className="h-full bg-gray-200 transition-all" style={{ width: `${notStartedPct}%` }} />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              {course.nextObjective ? (
                                <p className="text-xs text-gray-500 truncate">
                                  Next: <span className="font-medium text-gray-700">{course.nextObjective.title}</span>
                                </p>
                              ) : (
                                <p className="text-xs text-green-600 font-medium">All objectives complete</p>
                              )}
                            </div>
                            <Link href="/courses" className="flex-shrink-0 text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
                              Continue <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">No courses yet</p>
                      <p className="text-xs text-gray-500 mt-0.5">Browse courses and join one to track your progress.</p>
                    </div>
                    <Link href="/courses" className="text-sm font-semibold text-[#0033A0] hover:underline flex items-center gap-1 flex-shrink-0">
                      Browse courses <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )
              )}

              {(isEducator || isAdmin) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/courses" className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-[#0033A0]/30 hover:shadow-sm transition-all group">
                    <BookOpen className="w-6 h-6 text-[#0033A0] mb-3" />
                    <p className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0]">Course Management</p>
                    <p className="text-xs text-gray-500 mt-0.5">Upload materials, link tools, and track objectives</p>
                  </Link>
                  <Link href="/analytics/faculty" className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-[#0033A0]/30 hover:shadow-sm transition-all group">
                    <TrendingUp className="w-6 h-6 text-green-600 mb-3" />
                    <p className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0]">Student Analytics</p>
                    <p className="text-xs text-gray-500 mt-0.5">Engagement, session history, and performance signals</p>
                  </Link>
                </div>
              )}
            </div>

            {/* Study tools section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest">Study Tools</h2>
                <Link href="/tools" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
                  Browse all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleStudyTools.map(tool => {
                  const Icon = tool.icon
                  return (
                    <Link key={tool.href} href={tool.href} className={`flex items-start gap-3 rounded-2xl border p-4 transition-all hover:shadow-sm hover:-translate-y-0.5 ${tool.color}`}>
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">{tool.label}</p>
                        <p className="text-xs opacity-75 mt-0.5">{tool.description}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Right — Upcoming + quick CTA */}
          <div className="space-y-5">

            {isStudent && upcomingDue.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#0033A0]" />
                  <span className="font-bold text-gray-900 text-sm">Coming Up</span>
                  {urgentCount > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      <AlertCircle className="w-3 h-3" />
                      {urgentCount} urgent
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {upcomingDue.map((item, i) => (
                    <Link
                      key={i}
                      href={`/courses?course=${encodeURIComponent(item.course)}`}
                      className={`px-4 py-2.5 flex items-start gap-3 hover:bg-blue-50/50 transition-colors group ${item.urgent ? 'bg-red-50/40' : ''}`}
                    >
                      <div className={`text-xs font-extrabold mt-0.5 flex-shrink-0 w-10 text-center ${item.urgent ? 'text-red-600' : 'text-[#0033A0]'}`}>
                        {item.date}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 leading-tight group-hover:text-[#0033A0]">{item.title}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-gray-400">{item.course}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeBadgeStyle(item.type)}`}>{item.type}</span>
                        </div>
                      </div>
                      {item.urgent && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Build a study tool CTA */}
            <div className="bg-gradient-to-br from-[#0033A0]/5 to-blue-50 border border-[#0033A0]/20 rounded-2xl p-5 text-center">
              <Sparkles className="w-6 h-6 text-[#0033A0] mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-900 mb-1">Build a Study Tool</p>
              <p className="text-xs text-gray-500 mb-3">Create custom AI tools for your courses in the Studio.</p>
              <Link
                href="/studio"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:underline"
              >
                Open Studio <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
