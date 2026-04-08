'use client'

import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import {
  Users, TrendingUp, TrendingDown, AlertTriangle,
  MessageSquare, Star, ChevronDown, ChevronUp,
  Brain, BarChart2, FileText, Activity, Filter, Info
} from 'lucide-react'

// ─── Simulated Data ───────────────────────────────────────────────────────────

const STUDENTS = [
  {
    id: 's1', name: 'Ian McClure', avatar: 'IM', email: 'ian.mcclure.student@uky.edu',
    course: 'LAW 756', status: 'on_track',
    baseline: 82, current: 85, trend: +3,
    sessions: 24, avgMinutes: 18, lastActive: '2 hours ago',
    grades: [78, 80, 82, 84, 83, 85],
    engagement: [4, 5, 3, 5, 4, 5],
    skills: { 'Legal Reasoning': 88, 'Case Analysis': 82, 'Evidence Rules': 79, 'Oral Argument': 85, 'Research': 90 },
    recentInsight: 'Strong improvement in hearsay exception identification. Consistently applies FRE 803 correctly.',
    flags: [],
  },
  {
    id: 's2', name: 'Devon Carter', avatar: 'DC', email: 'devon.carter@uky.edu',
    course: 'LAW 756', status: 'at_risk',
    baseline: 79, current: 68, trend: -11,
    sessions: 8, avgMinutes: 6, lastActive: '5 days ago',
    grades: [80, 79, 77, 72, 69, 68],
    engagement: [4, 3, 3, 2, 2, 1],
    skills: { 'Legal Reasoning': 62, 'Case Analysis': 70, 'Evidence Rules': 58, 'Oral Argument': 65, 'Research': 71 },
    recentInsight: 'Significant drop in engagement and performance over past 3 weeks. Struggling with character evidence rules (FRE 404-405). Sessions ending abruptly — average 6 min vs. 18 min class baseline.',
    flags: ['grade_drop', 'disengagement', 'short_sessions'],
  },
  {
    id: 's3', name: 'Priya Nair', avatar: 'PN', email: 'priya.nair@uky.edu',
    course: 'LAW 756', status: 'exceeding',
    baseline: 88, current: 94, trend: +6,
    sessions: 31, avgMinutes: 24, lastActive: '1 hour ago',
    grades: [87, 89, 90, 92, 93, 94],
    engagement: [5, 5, 5, 5, 5, 5],
    skills: { 'Legal Reasoning': 96, 'Case Analysis': 94, 'Evidence Rules': 92, 'Oral Argument': 90, 'Research': 97 },
    recentInsight: 'Exceptional performance across all rubric dimensions. Demonstrates sophisticated analysis of impeachment evidence. Recommend advanced module.',
    flags: [],
  },
  {
    id: 's4', name: 'Marcus Webb', avatar: 'MW', email: 'marcus.webb@uky.edu',
    course: 'LAW 756', status: 'on_track',
    baseline: 75, current: 77, trend: +2,
    sessions: 19, avgMinutes: 15, lastActive: '1 day ago',
    grades: [74, 74, 75, 76, 76, 77],
    engagement: [3, 3, 4, 3, 4, 4],
    skills: { 'Legal Reasoning': 75, 'Case Analysis': 78, 'Evidence Rules': 74, 'Oral Argument': 72, 'Research': 80 },
    recentInsight: 'Steady incremental progress. Most confident with documentary evidence; still developing comfort with expert witness rules.',
    flags: [],
  },
  {
    id: 's5', name: 'Aisha Thompson', avatar: 'AT', email: 'aisha.t@uky.edu',
    course: 'LAW 756', status: 'at_risk',
    baseline: 83, current: 74, trend: -9,
    sessions: 11, avgMinutes: 10, lastActive: '3 days ago',
    grades: [84, 83, 81, 78, 75, 74],
    engagement: [4, 4, 3, 3, 2, 2],
    skills: { 'Legal Reasoning': 72, 'Case Analysis': 76, 'Evidence Rules': 70, 'Oral Argument': 68, 'Research': 78 },
    recentInsight: 'Declining trend over past 4 weeks — 1.2 SD below personal baseline (Superby et al. threshold). Engagement drop precedes grade drop by ~10 days, suggesting early intervention window may have passed.',
    flags: ['grade_drop', 'disengagement'],
  },
  {
    id: 's6', name: 'Jordan Lee', avatar: 'JL', email: 'jordan.lee@uky.edu',
    course: 'LAW 756', status: 'on_track',
    baseline: 81, current: 82, trend: +1,
    sessions: 21, avgMinutes: 16, lastActive: '4 hours ago',
    grades: [80, 81, 80, 82, 81, 82],
    engagement: [4, 4, 4, 4, 4, 4],
    skills: { 'Legal Reasoning': 83, 'Case Analysis': 80, 'Evidence Rules': 82, 'Oral Argument': 79, 'Research': 84 },
    recentInsight: 'Consistent and reliable performance. Engagement slightly below class average but quality of responses is high. Thorough in written analysis.',
    flags: [],
  },
]

const WEEKLY_ENGAGEMENT = [
  { week: 'Jan 13', sessions: 38, avgScore: 80, flagged: 0 },
  { week: 'Jan 20', sessions: 42, avgScore: 81, flagged: 1 },
  { week: 'Jan 27', sessions: 39, avgScore: 81, flagged: 1 },
  { week: 'Feb 3',  sessions: 45, avgScore: 82, flagged: 2 },
  { week: 'Feb 10', sessions: 41, avgScore: 80, flagged: 2 },
  { week: 'Feb 17', sessions: 47, avgScore: 81, flagged: 2 },
  { week: 'Feb 24', sessions: 44, avgScore: 79, flagged: 3 },
  { week: 'Mar 3',  sessions: 40, avgScore: 78, flagged: 3 },
  { week: 'Mar 10', sessions: 43, avgScore: 80, flagged: 2 },
]

const TOOL_BREAKDOWN = [
  { name: 'Evidence Rules Sim', sessions: 112, avgScore: 79, completion: 84 },
  { name: 'Cross-Exam Simulator', sessions: 87, avgScore: 83, completion: 91 },
  { name: 'Case Analysis Coach', sessions: 64, avgScore: 81, completion: 78 },
  { name: 'Oral Argument Prep', sessions: 48, avgScore: 77, completion: 72 },
]

const DOMAIN_BREAKDOWN = [
  { domain: 'Hearsay & Exceptions', avgScore: 76, sessions: 89 },
  { domain: 'Character Evidence', avgScore: 71, sessions: 67 },
  { domain: 'Expert Witnesses', avgScore: 80, sessions: 54 },
  { domain: 'Documentary Evidence', avgScore: 85, sessions: 78 },
  { domain: 'Privileges', avgScore: 74, sessions: 43 },
]

const STATUS_CONFIG = {
  exceeding: { label: 'Exceeding', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  on_track:  { label: 'On Track',  color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' },
  at_risk:   { label: 'At Risk',   color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
}

const WEEKS = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6']

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ElementType, label: string, value: string, sub?: string, color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function StudentRow({ student, expanded, onToggle }: {
  student: typeof STUDENTS[0], expanded: boolean, onToggle: () => void
}) {
  const cfg = STATUS_CONFIG[student.status as keyof typeof STATUS_CONFIG]
  const gradeData = WEEKS.map((w, i) => ({ week: w, score: student.grades[i] }))
  const skillData = Object.entries(student.skills).map(([skill, score]) => ({ skill, score }))

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${
      student.flags.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
    }`}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onToggle}
      >
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
          student.status === 'at_risk' ? 'bg-red-500' :
          student.status === 'exceeding' ? 'bg-blue-500' : 'bg-[#0033A0]'
        }`}>
          {student.avatar}
        </div>

        {/* Name & meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{student.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}
              title={student.status === 'at_risk' ? 'Flagged: score dropped >1 SD below this student\'s 4-week personal baseline' : undefined}
            >
              {cfg.label}
            </span>
            {student.flags.includes('grade_drop') && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> Grade drop
              </span>
            )}
            {student.flags.includes('disengagement') && (
              <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                <Activity className="w-3 h-3" /> Disengaging
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{student.lastActive} · {student.sessions} sessions · avg {student.avgMinutes} min</p>
        </div>

        {/* Score */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-xl font-bold text-gray-900">{student.current}</p>
          <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${
            student.trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {student.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {student.trend >= 0 ? '+' : ''}{student.trend} vs baseline
          </p>
        </div>

        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-5 bg-white">
          {/* AI Insight */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Brain className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">AI Learning Analysis</p>
                <p className="text-sm text-blue-800 leading-relaxed">{student.recentInsight}</p>
                {student.flags.length > 0 && (
                  <p className="text-xs text-blue-500 mt-2 italic">
                    Warning threshold: &gt;1 SD below personal 4-week rolling average — Superby et al. (2006)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Grade trend */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Grade Trend</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={gradeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone" dataKey="score"
                    stroke={student.trend < 0 ? '#ef4444' : '#0033A0'}
                    strokeWidth={2} dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Skill radar */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skill Breakdown</p>
              <ResponsiveContainer width="100%" height={120}>
                <RadarChart data={skillData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 8 }} />
                  <Radar dataKey="score" stroke="#0033A0" fill="#0033A0" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Skill scores */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Domain Scores</p>
            <div className="space-y-2">
              {Object.entries(student.skills).map(([skill, score]) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-36 flex-shrink-0">{skill}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${score >= 85 ? 'bg-blue-500' : score >= 75 ? 'bg-green-500' : score >= 65 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {student.flags.length > 0 && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  const msg = `Hi ${student.name},\n\nI noticed your recent performance and wanted to check in. Please feel free to reach out or stop by office hours.\n\nBest,\nYour Instructor`
                  alert(`Intervention message drafted for ${student.name}:\n\n${msg}\n\n[In production, this opens a compose modal or sends via LMS messaging.]`)
                }}
                className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send Intervention Message
              </button>
              <button className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <FileText className="w-3.5 h-3.5" />
                View Full Transcript
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FacultyAnalyticsPage() {
  const [expandedStudent, setExpandedStudent] = useState<string | null>('s2')
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'tools' | 'domains'>('overview')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const atRisk = STUDENTS.filter(s => s.status === 'at_risk')
  const filtered = filterStatus === 'all' ? STUDENTS : STUDENTS.filter(s => s.status === filterStatus)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0033A0] to-[#1a4db5] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-5 h-5 text-blue-300" />
                <span className="text-blue-200 text-sm font-medium">Faculty Analytics</span>
              </div>
              <h1 className="text-2xl font-bold">LAW 756: Evidence Rules</h1>
              <p className="text-blue-200 text-sm mt-1">Dr. James Rivera · Spring 2026 · 6 students enrolled</p>
            </div>
            {atRisk.length > 0 && (
              <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">{atRisk.length} students need attention</p>
                  <p className="text-xs text-red-200">{atRisk.map(s => s.name.split(' ')[0]).join(', ')} are trending down</p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-white/20">
            {(['overview', 'students', 'tools', 'domains'] as const).map(tab => (
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Students Enrolled" value="6" sub="2 at risk" color="blue" />
              <StatCard icon={Activity} label="Sessions This Week" value="43" sub="+7% vs last week" color="green" />
              <StatCard icon={Star} label="Class Avg Score" value="80.2" sub="↑ 0.4 pts this week" color="blue" />
              <StatCard icon={AlertTriangle} label="At-Risk Students" value="2" sub="Devon & Aisha" color="red" />
            </div>

            {/* Engagement trend */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Class Engagement Over Time</h3>
              <p className="text-xs text-gray-400 mb-4">Weekly sessions and average score across all tools</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={WEEKLY_ENGAGEMENT}>
                  <defs>
                    <linearGradient id="sessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0033A0" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0033A0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[70, 90]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area yAxisId="left" type="monotone" dataKey="sessions" stroke="#0033A0" fill="url(#sessions)" strokeWidth={2} name="Sessions" />
                  <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* At-risk highlight */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-800">Students Requiring Intervention</h3>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-auto flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Threshold: &gt;1 SD below personal baseline
                </span>
              </div>
              <div className="space-y-3">
                {atRisk.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-red-200 p-4 flex items-center gap-4">
                    <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {s.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500 truncate">{s.recentInsight.slice(0, 100)}…</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-red-600">{s.current}</p>
                      <p className="text-xs text-red-500">{s.trend} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STUDENTS TAB ── */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              {['all', 'at_risk', 'on_track', 'exceeding'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === f ? 'bg-[#0033A0] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'All Students' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
            {filtered.map(student => (
              <StudentRow
                key={student.id}
                student={student}
                expanded={expandedStudent === student.id}
                onToggle={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
              />
            ))}
          </div>
        )}

        {/* ── TOOLS TAB ── */}
        {activeTab === 'tools' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOOL_BREAKDOWN.map(tool => (
                <div key={tool.name} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                      <p className="text-xs text-gray-400">{tool.sessions} sessions total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{tool.avgScore}</p>
                      <p className="text-xs text-gray-400">avg score</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Completion rate</span>
                      <span className="font-medium">{tool.completion}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-[#0033A0] h-2 rounded-full" style={{ width: `${tool.completion}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Sessions by Tool</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={TOOL_BREAKDOWN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="#0033A0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── DOMAINS TAB ── */}
        {activeTab === 'domains' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start gap-2 mb-1">
                <Brain className="w-5 h-5 text-[#0033A0]" />
                <div>
                  <h3 className="font-semibold text-gray-900">AI Rubric Analysis by Domain</h3>
                  <p className="text-xs text-gray-400 mb-4">Scored against Federal Rules of Evidence grading criteria. Powered by Claude Sonnet.</p>
                </div>
              </div>
              <div className="space-y-4">
                {DOMAIN_BREAKDOWN.map(d => (
                  <div key={d.domain}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{d.domain}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{d.sessions} sessions</span>
                        <span className={`font-bold ${d.avgScore >= 80 ? 'text-green-600' : d.avgScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {d.avgScore}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${d.avgScore >= 80 ? 'bg-green-500' : d.avgScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${d.avgScore}%` }}
                      />
                    </div>
                    {d.avgScore < 75 && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Class average below threshold — consider additional review session
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">Class-Wide AI Insight</p>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Character evidence (FRE 404–405) is the weakest domain across the class at 71 average.
                    3 of 6 students show confusion between propensity and non-propensity uses.
                    Recommend a targeted review session on <strong>prior bad acts</strong> and the{' '}
                    <strong>Huddleston balancing test</strong> before the next assessment.
                  </p>
                  <p className="text-xs text-blue-400 mt-2">Generated by Claude Sonnet · Based on 67 session transcripts</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
