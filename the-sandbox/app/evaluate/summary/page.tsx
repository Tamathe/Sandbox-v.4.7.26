'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Clock, CheckCircle2, Circle, Printer, Mail,
  BarChart3, Wrench, Users, GraduationCap, Shield,
  Zap, TrendingUp, Building2, ArrowLeft, Send, Loader2,
  ArrowRight, Route, Download, MessageSquare, Calculator, Link2, Palette, Quote,
  ListChecks, Target, Info, LayoutGrid, CalendarDays, Trophy, XCircle,
  MinusCircle, Milestone, Lock, ShieldCheck, Database, FileCheck, ShieldAlert,
  HelpCircle, ChevronDown, MapPin, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { getEvaluatorLog, type EvaluatorLogEntry } from '../../lib/evaluator-session-log'

const EVALUATOR_START_KEY = 'uky-evaluator-start-time'
const EVALUATOR_PROGRESS_KEY = 'uky-evaluator-progress'
const EVALUATOR_ROI_KEY = 'uky-evaluator-roi'
const EVALUATOR_BRANDING_KEY = 'uky-evaluator-branding'
const EVALUATOR_VISITS_KEY = 'uky-evaluator-summary-visits'
const EVALUATOR_WISHLIST_KEY = 'uky-evaluator-wishlist'

const WISHLIST_FEATURES = [
  'Zero-code AI tool creation',
  'Real-time learning analytics',
  'AI concierge for students',
  'FERPA-compliant data handling',
  'Cross-department tool sharing',
  'Automated student progress reports',
  'Custom branding for your institution',
  'Integration with existing LMS',
]

const BRAND_PRESETS = [
  { label: 'UK Blue', color: '#0033A0' },
  { label: 'Cardinal Red', color: '#8C1D40' },
  { label: 'Forest Green', color: '#154734' },
]

interface EvaluatorProgress {
  landed: boolean
  builtTool: boolean
  sawStudentExperience: boolean
  exploredAnalytics: boolean
}

interface SharedData {
  timeSpent?: string
  stepsCompleted?: number
  totalSteps?: number
  npsScore?: number
  roi?: { students: number; faculty: number }
  metrics?: { toolCount: number | null; activeStudents: number | null; avgSessionScore: number | null }
}

const VALUE_PROPS = [
  {
    icon: Zap,
    title: 'Zero-Code AI Tool Creation',
    description: 'Faculty describe a learning experience in plain language. The platform builds a fully functional AI tool in minutes — no technical expertise required.',
  },
  {
    icon: TrendingUp,
    title: 'Real-Time Learning Analytics',
    description: 'Every student interaction generates measurable learning signals. Faculty see engagement, mastery, and at-risk indicators before grades are due.',
  },
  {
    icon: Shield,
    title: 'FERPA-Compliant by Design',
    description: 'Built with institutional compliance from day one. Sensitive sessions are excluded from analytics, and all data stays within university-controlled infrastructure.',
  },
  {
    icon: Building2,
    title: 'Scales Across the University',
    description: 'One platform serves every college and department. Tools created by one educator can be shared, adapted, and reused across the institution.',
  },
  {
    icon: GraduationCap,
    title: 'Pedagogy-First AI',
    description: 'AI is the substrate, not the product. Every tool is grounded in learning objectives, Bloom\'s taxonomy alignment, and evidence-based pedagogy.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'I built a Socratic tutor for my philosophy seminar in under 5 minutes. My students used it 200+ times before the midterm.',
    author: 'Dr. Sarah Chen',
    role: 'Philosophy Department',
  },
  {
    quote: 'The analytics showed me which students were struggling before they even came to office hours. That\u2019s never happened before.',
    author: 'Prof. James Rodriguez',
    role: 'College of Engineering',
  },
  {
    quote: 'My department adopted three tools I created. The whole process from idea to university-wide deployment took one afternoon.',
    author: 'Dr. Amara Okafor',
    role: 'School of Nursing',
  },
  {
    quote: 'For the first time, I can see exactly how students engage with course material outside of class. The data is transformative.',
    author: 'Prof. Michael Reeves',
    role: 'Business Analytics Program',
  },
]

function parseTimeToMinutes(str: string): number {
  let total = 0
  const h = str.match(/(\d+)h/)
  const m = str.match(/(\d+)m/)
  const s = str.match(/(\d+)s/)
  if (h) total += parseInt(h[1]) * 60
  if (m) total += parseInt(m[1])
  if (s) total += parseInt(s[1]) / 60
  return Math.round(total * 10) / 10
}

function formatDuration(startIso: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}h ${remMins}m ${secs}s`
  }
  return `${mins}m ${secs}s`
}

export default function EvaluatorSummaryPage() {
  const { currentUser } = useAuth()
  const [startTime, setStartTime] = useState<string | null>(null)
  const [progress, setProgress] = useState<EvaluatorProgress>({
    landed: true, builtTool: false, sawStudentExperience: false, exploredAnalytics: false,
  })
  const [metrics, setMetrics] = useState<{
    toolCount: number | null
    activeStudents: number | null
    avgSessionScore: number | null
  }>({ toolCount: null, activeStudents: null, avgSessionScore: null })
  const [elapsed, setElapsed] = useState('')
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailError, setEmailError] = useState('')
  const [sessionLog, setSessionLog] = useState<EvaluatorLogEntry[]>([])
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [npsComment, setNpsComment] = useState('')
  const [npsSubmitted, setNpsSubmitted] = useState(false)
  const [roiStudents, setRoiStudents] = useState(30000)
  const [roiFaculty, setRoiFaculty] = useState(2000)
  const [sharedData, setSharedData] = useState<SharedData | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [brandColor, setBrandColor] = useState('#0033A0')
  const [customColor, setCustomColor] = useState('')
  const [wishlist, setWishlist] = useState<string[]>([])
  const [summaryVisits, setSummaryVisits] = useState(1)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const testimonialPaused = useRef(false)
  const [followUpName, setFollowUpName] = useState('')
  const [followUpEmail, setFollowUpEmail] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpMessage, setFollowUpMessage] = useState('')
  const [followUpStatus, setFollowUpStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [followUpError, setFollowUpError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Load sessionStorage + detect shared view
  useEffect(() => {
    // Detect shared view from URL hash
    try {
      const hash = window.location.hash
      if (hash.startsWith('#share=')) {
        const data: SharedData = JSON.parse(atob(hash.slice(7)))
        setSharedData(data)
        return // Skip sessionStorage loading in shared mode
      }
    } catch {}

    try {
      const st = sessionStorage.getItem(EVALUATOR_START_KEY)
      if (st) setStartTime(st)
      const prog = sessionStorage.getItem(EVALUATOR_PROGRESS_KEY)
      if (prog) setProgress(JSON.parse(prog))
      const savedNps = sessionStorage.getItem('uky-evaluator-nps')
      if (savedNps) {
        const parsed = JSON.parse(savedNps)
        setNpsScore(parsed.score)
        if (parsed.comment) setNpsComment(parsed.comment)
        setNpsSubmitted(true)
      }
      const savedRoi = sessionStorage.getItem(EVALUATOR_ROI_KEY)
      if (savedRoi) {
        const parsed = JSON.parse(savedRoi)
        if (parsed.students) setRoiStudents(parsed.students)
        if (parsed.faculty) setRoiFaculty(parsed.faculty)
      }
      const savedWishlist = sessionStorage.getItem(EVALUATOR_WISHLIST_KEY)
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist)
        if (Array.isArray(parsed)) setWishlist(parsed)
      }
      const prevVisits = parseInt(sessionStorage.getItem(EVALUATOR_VISITS_KEY) || '0', 10)
      const newVisits = prevVisits + 1
      sessionStorage.setItem(EVALUATOR_VISITS_KEY, String(newVisits))
      setSummaryVisits(newVisits)
      const savedBranding = sessionStorage.getItem(EVALUATOR_BRANDING_KEY)
      if (savedBranding) {
        const parsed = JSON.parse(savedBranding)
        if (parsed.universityName) setBrandName(parsed.universityName)
        if (parsed.primaryColor) {
          setBrandColor(parsed.primaryColor)
          if (!BRAND_PRESETS.some(p => p.color === parsed.primaryColor)) {
            setCustomColor(parsed.primaryColor)
          }
        }
      }
    } catch {}
    setSessionLog(getEvaluatorLog())
  }, [])

  // Live timer (skip in shared mode)
  useEffect(() => {
    if (!startTime || sharedData) return
    setElapsed(formatDuration(startTime))
    const interval = setInterval(() => setElapsed(formatDuration(startTime)), 1000)
    return () => clearInterval(interval)
  }, [startTime, sharedData])

  // Fetch platform metrics (skip in shared mode)
  useEffect(() => {
    if (sharedData) return
    fetch('/api/dashboard', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setMetrics({
          toolCount: data.toolCount ?? null,
          activeStudents: data.studentCount ?? null,
          avgSessionScore: data.avgScore ?? null,
        })
      })
      .catch(() => {})
  }, [currentUser.email, sharedData])

  // Persist ROI to sessionStorage
  useEffect(() => {
    if (sharedData) return
    try {
      sessionStorage.setItem(EVALUATOR_ROI_KEY, JSON.stringify({ students: roiStudents, faculty: roiFaculty }))
    } catch {}
  }, [roiStudents, roiFaculty, sharedData])

  // Persist branding to sessionStorage
  useEffect(() => {
    if (sharedData) return
    try {
      sessionStorage.setItem(EVALUATOR_BRANDING_KEY, JSON.stringify({
        universityName: brandName,
        primaryColor: brandColor,
      }))
    } catch {}
  }, [brandName, brandColor, sharedData])

  // Persist wishlist to sessionStorage
  useEffect(() => {
    if (sharedData) return
    try {
      sessionStorage.setItem(EVALUATOR_WISHLIST_KEY, JSON.stringify(wishlist))
    } catch {}
  }, [wishlist, sharedData])

  // Sticky stats bar — show after scrolling past ~300px
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Testimonial carousel auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      if (!testimonialPaused.current) {
        setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const steps = [
    { label: 'Landed on the Platform', done: progress.landed },
    { label: 'Built your first AI tool', done: progress.builtTool },
    { label: 'Saw the student experience', done: progress.sawStudentExperience },
    { label: 'Explored analytics', done: progress.exploredAnalytics },
  ]

  const completedCount = steps.filter(s => s.done).length
  const isShared = !!sharedData

  // Display values — use shared data in shared view
  const displayElapsed = isShared ? (sharedData.timeSpent || '—') : (elapsed || (startTime ? formatDuration(startTime) : '—'))
  const displayCompleted = isShared ? (sharedData.stepsCompleted ?? 0) : completedCount
  const displayTotal = isShared ? (sharedData.totalSteps ?? steps.length) : steps.length
  const displayMetrics = isShared
    ? (sharedData.metrics ?? { toolCount: null, activeStudents: null, avgSessionScore: null })
    : metrics

  // ROI calculations
  const displayRoiStudents = isShared ? (sharedData?.roi?.students ?? 30000) : roiStudents
  const displayRoiFaculty = isShared ? (sharedData?.roi?.faculty ?? 2000) : roiFaculty
  const roiToolsCreated = displayRoiFaculty * 3
  const roiInteractions = displayRoiStudents * 8
  const roiFacultyHoursSaved = displayRoiFaculty * 12
  const roiAnnualSavings = roiFacultyHoursSaved * 2 * 75

  const roiOutputs = [
    { label: 'Tools Created', value: roiToolsCreated.toLocaleString() },
    { label: 'Interactions / Semester', value: roiInteractions.toLocaleString() },
    { label: 'Faculty Hours Saved / Semester', value: roiFacultyHoursSaved.toLocaleString() },
    { label: 'Cost per Interaction', value: '$0.03' },
    { label: 'Est. Annual Savings', value: `$${roiAnnualSavings.toLocaleString()}` },
  ]

  // Benchmark comparison data
  const displayElapsedMinutes = isShared
    ? parseTimeToMinutes(sharedData.timeSpent || '0m')
    : (startTime ? (Date.now() - new Date(startTime).getTime()) / 60000 : 0)
  const displayNpsScore = isShared ? (sharedData?.npsScore ?? null) : (npsSubmitted ? npsScore : null)
  const displayToolCount = displayMetrics.toolCount

  const benchmarkRows = [
    {
      label: 'Steps Completed',
      evalValue: displayCompleted,
      evalDisplay: `${displayCompleted}/${displayTotal}`,
      benchValue: 4,
      benchDisplay: '4/4',
      max: 4,
    },
    {
      label: 'Time Spent',
      evalValue: Math.min(Math.round(displayElapsedMinutes), 20),
      evalDisplay: `${Math.round(displayElapsedMinutes)} min`,
      benchValue: 8,
      benchDisplay: '8 min',
      max: 20,
    },
    ...(displayToolCount !== null ? [{
      label: 'Tools Explored',
      evalValue: displayToolCount,
      evalDisplay: `${displayToolCount}`,
      benchValue: 3,
      benchDisplay: '3',
      max: Math.max(displayToolCount, 5),
    }] : []),
    ...(displayNpsScore !== null ? [{
      label: 'NPS Score',
      evalValue: displayNpsScore,
      evalDisplay: `${displayNpsScore}/10`,
      benchValue: 8.5,
      benchDisplay: '8.5/10',
      max: 10,
    }] : []),
  ]

  function toggleWishlistItem(feature: string) {
    setWishlist(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    )
  }

  // Platform Fit Score
  let fitScore = 40
  if (displayCompleted >= displayTotal && displayTotal > 0) fitScore += 15
  if (displayElapsedMinutes > 5) fitScore += 10
  if (displayNpsScore !== null && displayNpsScore >= 7) fitScore += 10
  if (roiAnnualSavings > 100000) fitScore += 10
  if (wishlist.length >= 3) fitScore += 15
  fitScore = Math.min(fitScore, 100)

  const fitLabel = fitScore >= 90
    ? 'Excellent fit — the University of Kentucky platform aligns perfectly with your institution'
    : fitScore >= 70
    ? 'Strong fit — the University of Kentucky platform addresses most of your needs'
    : fitScore >= 50
    ? 'Good potential — Let\u2019s explore how the University of Kentucky platform can help'
    : 'Let\u2019s talk — We\u2019d love to understand your specific needs'

  function handleCopyShareLink() {
    const data: SharedData = {
      timeSpent: elapsed || (startTime ? formatDuration(startTime) : undefined),
      stepsCompleted: completedCount,
      totalSteps: steps.length,
      ...(npsSubmitted && npsScore !== null ? { npsScore } : {}),
      roi: { students: roiStudents, faculty: roiFaculty },
      ...(metrics.toolCount !== null || metrics.activeStudents !== null || metrics.avgSessionScore !== null
        ? { metrics }
        : {}),
    }
    const encoded = btoa(JSON.stringify(data))
    const url = `${window.location.origin}/evaluate/summary#share=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    }).catch(() => {})
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Sticky Quick Stats Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-all duration-300 print:hidden ${
          showStickyBar ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-gray-400" />
            <span className="font-bold text-gray-700">{displayElapsed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-uk-blue" />
            <span className="font-bold text-uk-blue">{displayCompleted}/{displayTotal}</span>
            <span className="text-gray-400 text-xs">steps</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calculator className="size-3.5 text-gray-400" />
            <span className="font-bold text-gray-700">${roiAnnualSavings.toLocaleString()}</span>
            <span className="text-gray-400 text-xs hidden sm:inline">savings/yr</span>
          </div>
          {displayNpsScore !== null && (
            <div className="flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-gray-400" />
              <span className={`font-bold ${displayNpsScore >= 9 ? 'text-green-600' : displayNpsScore >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                {displayNpsScore}/10
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Shared view banner */}
      {isShared && (
        <div className="bg-blue-50 border-2 border-uk-blue/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-uk-blue shrink-0" />
            <p className="text-sm font-medium text-gray-700">You&apos;re viewing a shared evaluation summary</p>
          </div>
          <Link
            href="/evaluate"
            className="inline-flex items-center gap-1.5 rounded-xl bg-uk-blue px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-[#002880]"
          >
            Start your own evaluation
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Print-only logo header */}
      <div className="hidden print:flex items-center gap-4 mb-6">
        <Image src="/uk-wildcat-mark.webp" alt="University of Kentucky" width={48} height={48} />
        <div>
          <h1 className="text-xl font-extrabold text-uk-blue">UNIVERSITY OF KENTUCKY</h1>
          <p className="text-sm text-gray-500">AI-Powered University Platform — Evaluator Summary</p>
        </div>
      </div>

      {/* Screen header */}
      <div className="print:hidden">
        {!isShared && (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-uk-blue mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to platform
          </Link>
        )}
        <h1 className="text-2xl font-extrabold text-gray-900">
          {isShared ? 'Evaluation Summary' : 'Your Evaluation Summary'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          A snapshot of {isShared ? 'an' : 'your'} time exploring the University of Kentucky platform
        </p>
      </div>

      {/* Session visit indicator */}
      {!isShared && summaryVisits > 1 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 print:hidden">
          <Info className="size-3.5 shrink-0" />
          <span>This is your {summaryVisits}{summaryVisits === 2 ? 'nd' : summaryVisits === 3 ? 'rd' : 'th'} time viewing this summary</span>
        </div>
      )}

      {/* Time + Progress card */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="size-5 text-uk-blue" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Time Exploring</p>
              <p className="text-2xl font-bold text-gray-900">{displayElapsed}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Steps Completed</p>
            <p className="text-2xl font-bold text-uk-blue">{displayCompleted}/{displayTotal}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-uk-blue transition-all duration-500"
            style={{ width: `${displayTotal > 0 ? (displayCompleted / displayTotal) * 100 : 0}%` }}
          />
        </div>

        {/* Steps checklist (hide in shared mode — we only have the count) */}
        {!isShared && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {steps.map(step => (
              <div key={step.label} className="flex items-center gap-2.5">
                {step.done ? (
                  <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="size-5 text-gray-300 shrink-0" />
                )}
                <span className={`text-sm ${step.done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Metrics Discovered */}
      {(displayMetrics.toolCount !== null || displayMetrics.activeStudents !== null || displayMetrics.avgSessionScore !== null) && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">Platform Metrics Discovered</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {displayMetrics.toolCount !== null && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Wrench className="size-5 text-uk-blue mx-auto mb-1" />
                <p className="text-3xl font-bold text-uk-blue">{displayMetrics.toolCount}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">AI Tools Published</p>
              </div>
            )}
            {displayMetrics.activeStudents !== null && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Users className="size-5 text-uk-blue mx-auto mb-1" />
                <p className="text-3xl font-bold text-uk-blue">{displayMetrics.activeStudents}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Active Students</p>
              </div>
            )}
            {displayMetrics.avgSessionScore !== null && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <TrendingUp className="size-5 text-uk-blue mx-auto mb-1" />
                <p className="text-3xl font-bold text-uk-blue">
                  {Math.round(displayMetrics.avgSessionScore * 100)}%
                </p>
                <p className="text-xs text-gray-500 font-medium mt-1">Avg Session Score</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Value Propositions */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-before-page print:break-inside-avoid">
        <h2 className="font-extrabold text-gray-900 mb-4">Why University of Kentucky</h2>
        <div className="space-y-4">
          {VALUE_PROPS.map(vp => (
            <div key={vp.title} className="flex gap-4">
              <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <vp.icon className="size-5 text-uk-blue" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{vp.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{vp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitive Positioning */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="size-5 text-uk-blue" />
          <h2 className="font-extrabold text-gray-900">How University of Kentucky Compares</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Feature comparison across solution categories</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 w-1/4">Feature</th>
                <th className="text-center py-2 px-2 font-bold text-uk-blue bg-blue-50 rounded-t-lg w-1/4">University of Kentucky</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500 w-1/4">Generic AI Chatbots</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500 w-1/4">Traditional LMS</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Zero-code tool creation', true, false, false],
                ['Pedagogy-first AI', true, false, false],
                ['Real-time learning analytics', true, 'partial', true],
                ['FERPA compliance built-in', true, false, true],
                ['AI-powered personalization', true, false, false],
                ['University-wide scalability', true, false, true],
              ] as const).map(([feature, sandbox, chatbot, lms], i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 text-gray-700">{feature}</td>
                  {[sandbox, chatbot, lms].map((val, j) => (
                    <td key={j} className={`py-2.5 px-2 text-center ${j === 0 ? 'bg-blue-50' : ''}`}>
                      {val === true ? (
                        <CheckCircle2 className="size-5 text-green-500 mx-auto" />
                      ) : val === 'partial' ? (
                        <MinusCircle className="size-5 text-amber-500 mx-auto" />
                      ) : (
                        <XCircle className="size-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Testimonial Carousel */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Quote className="size-5 text-uk-blue" />
          <h2 className="font-extrabold text-gray-900">What Faculty Are Saying</h2>
        </div>

        {/* Carousel — screen only */}
        <div
          className="relative min-h-[120px] print:hidden"
          onMouseEnter={() => { testimonialPaused.current = true }}
          onMouseLeave={() => { testimonialPaused.current = false }}
        >
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className={`transition-opacity duration-500 ${
                i === activeTestimonial ? 'opacity-100' : 'opacity-0 absolute inset-0'
              }`}
            >
              <blockquote className="text-gray-700 italic leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <p className="mt-3 text-sm font-bold text-uk-blue">
                {t.author}
                <span className="font-normal text-gray-400 ml-1.5">{t.role}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Dot navigation — screen only */}
        <div className="flex justify-center gap-2 mt-4 print:hidden">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveTestimonial(i)}
              className={`size-2 rounded-full transition cursor-pointer ${
                i === activeTestimonial ? 'bg-uk-blue' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Print view — all testimonials stacked */}
        <div className="hidden print:block space-y-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i}>
              <blockquote className="text-gray-700 italic leading-relaxed text-sm">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <p className="mt-1 text-xs font-bold text-uk-blue">
                {t.author}
                <span className="font-normal text-gray-400 ml-1.5">{t.role}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Wishlist — hidden in shared mode */}
      {!isShared && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">Features That Interest You</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Select the capabilities most relevant to your institution
          </p>

          {/* Interactive checkboxes — screen only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 print:hidden">
            {WISHLIST_FEATURES.map(feature => {
              const checked = wishlist.includes(feature)
              return (
                <button
                  key={feature}
                  onClick={() => toggleWishlistItem(feature)}
                  className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition cursor-pointer ${
                    checked
                      ? 'border-uk-blue bg-blue-50 text-gray-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className={`size-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
                    checked ? 'border-uk-blue bg-uk-blue' : 'border-gray-300'
                  }`}>
                    {checked && <CheckCircle2 className="size-3 text-white" />}
                  </div>
                  {feature}
                </button>
              )
            })}
          </div>

          {/* Print view — show checked items */}
          <div className="hidden print:block space-y-1">
            {WISHLIST_FEATURES.map(feature => {
              const checked = wishlist.includes(feature)
              return (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  {checked ? (
                    <CheckCircle2 className="size-4 text-uk-blue shrink-0" />
                  ) : (
                    <Circle className="size-4 text-gray-300 shrink-0" />
                  )}
                  <span className={checked ? 'text-gray-900 font-medium' : 'text-gray-400'}>{feature}</span>
                </div>
              )
            })}
          </div>

          {wishlist.length > 0 && (
            <p className="text-xs text-gray-400 mt-3 print:hidden">
              {wishlist.length} feature{wishlist.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {/* Your Journey — Session Timeline (not available in shared mode) */}
      {!isShared && sessionLog.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <Route className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">Your Journey</h2>
          </div>
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[9px] top-1 bottom-1 w-px bg-uk-blue/20" />
            <div className="space-y-3">
              {sessionLog.map((entry, i) => {
                const time = new Date(entry.timestamp)
                const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                const actionLabels: Record<string, string> = {
                  'page-visit': 'Visited',
                  'tool-built': 'Built an AI tool',
                  'sandy-opened': 'Opened Sandy concierge',
                  'analytics-viewed': 'Viewed analytics',
                  'tour-started': 'Started guided tour',
                  'tour-completed': 'Completed guided tour',
                  'evaluation-ended': 'Ended evaluation',
                }
                const label = actionLabels[entry.action] || entry.action
                return (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1 size-[7px] rounded-full bg-uk-blue ring-2 ring-white" />
                    <span className="text-[11px] text-gray-400 font-mono shrink-0 pt-0.5 w-16">
                      {timeStr}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm text-gray-700">{label}</span>
                      {entry.detail && (
                        <span className="text-sm text-gray-400 ml-1.5">{entry.detail}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Engagement Heatmap — hidden in shared mode */}
      {!isShared && sessionLog.length > 0 && (() => {
        const heatmapCells = [
          { label: 'Home', count: sessionLog.filter(e => e.action === 'page-visit' && (e.detail === '/' || e.detail === '/home')).length },
          { label: 'Build', count: sessionLog.filter(e => e.action === 'page-visit' && e.detail?.startsWith('/build')).length },
          { label: 'Hub', count: sessionLog.filter(e => e.action === 'page-visit' && e.detail?.startsWith('/hub')).length },
          { label: 'Analytics', count: sessionLog.filter(e => e.action === 'analytics-viewed').length },
          { label: 'Sandy', count: sessionLog.filter(e => e.action === 'sandy-opened').length },
          { label: 'Summary', count: sessionLog.filter(e => e.action === 'page-visit' && e.detail?.startsWith('/evaluate')).length },
        ]
        return (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="size-5 text-uk-blue" />
              <h2 className="font-extrabold text-gray-900">Your Exploration</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {heatmapCells.map(cell => {
                let bg = 'bg-gray-100'
                let text = 'text-gray-400'
                let weight = ''
                if (cell.count >= 6) { bg = 'bg-blue-200'; text = 'text-blue-800'; weight = 'font-bold' }
                else if (cell.count >= 3) { bg = 'bg-blue-100'; text = 'text-blue-700' }
                else if (cell.count >= 1) { bg = 'bg-blue-50'; text = 'text-blue-600' }
                return (
                  <div key={cell.label} className={`rounded-xl p-3 text-center ${bg}`}>
                    <p className={`text-2xl font-bold ${text} ${weight}`}>{cell.count}</p>
                    <p className={`text-[11px] mt-0.5 ${text}`}>{cell.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* NPS Micro-Survey */}
      {isShared ? (
        // Shared mode: read-only NPS display (only if score is present)
        sharedData.npsScore != null && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="size-5 text-uk-blue" />
              <h2 className="font-extrabold text-gray-900">Net Promoter Score</h2>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Score:</span>{' '}
              <span className={`text-lg font-bold ${sharedData.npsScore >= 9 ? 'text-green-600' : sharedData.npsScore >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                {sharedData.npsScore}/10
              </span>
              <span className="ml-2 text-xs text-gray-400">
                ({sharedData.npsScore >= 9 ? 'Promoter' : sharedData.npsScore >= 7 ? 'Passive' : 'Detractor'})
              </span>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">How likely are you to recommend the University of Kentucky platform?</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">0 = not at all likely, 10 = extremely likely</p>

          {npsSubmitted ? (
            <div>
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 print:bg-white print:border-gray-200">
                <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                <p className="text-sm font-medium text-green-700">Thank you for your feedback!</p>
              </div>
              {npsScore !== null && (
                <div className="mt-3 text-sm text-gray-500 print:text-gray-700">
                  <span className="font-medium">Your score:</span>{' '}
                  <span className={`font-bold ${npsScore >= 9 ? 'text-green-600' : npsScore >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                    {npsScore}/10
                  </span>
                  {npsComment && <p className="mt-1 text-gray-500 italic print:text-gray-600">&ldquo;{npsComment}&rdquo;</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="print:hidden">
              {/* Score buttons */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {Array.from({ length: 11 }, (_, i) => {
                  const isSelected = npsScore === i
                  let colorClass = 'border-gray-200 text-gray-500 hover:border-gray-300'
                  if (isSelected) {
                    if (i >= 9) colorClass = 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                    else if (i >= 7) colorClass = 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200'
                    else colorClass = 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200'
                  } else {
                    if (i >= 9) colorClass = 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
                    else if (i >= 7) colorClass = 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                    else colorClass = 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setNpsScore(i)}
                      className={`size-10 rounded-lg border-2 text-sm font-bold transition cursor-pointer ${colorClass}`}
                    >
                      {i}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 -mt-2 mb-4 px-0.5">
                <span>Detractor</span>
                <span>Passive</span>
                <span>Promoter</span>
              </div>

              {/* Comment + submit (appears after score selection) */}
              {npsScore !== null && (
                <div className="space-y-3">
                  <textarea
                    value={npsComment}
                    onChange={(e) => setNpsComment(e.target.value)}
                    placeholder="What would make this a 10?"
                    rows={2}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-uk-blue resize-none"
                  />
                  <button
                    onClick={() => {
                      const npsData = { score: npsScore, ...(npsComment.trim() ? { comment: npsComment.trim() } : {}) }
                      try { sessionStorage.setItem('uky-evaluator-nps', JSON.stringify(npsData)) } catch {}
                      setNpsSubmitted(true)
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-uk-blue px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#002880] cursor-pointer"
                  >
                    Submit Feedback
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ROI Calculator */}
      {(!isShared || sharedData?.roi) && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">ROI Calculator</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Estimate the impact of the University of Kentucky platform at your institution
          </p>

          {/* Inputs — hidden in shared mode and print */}
          {!isShared && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 print:hidden">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Students at your institution
                </label>
                <input
                  type="number"
                  value={roiStudents}
                  onChange={(e) => setRoiStudents(Number(e.target.value) || 0)}
                  onBlur={() => setRoiStudents(Math.max(100, Math.min(500000, roiStudents || 100)))}
                  min={100}
                  max={500000}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-uk-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faculty members
                </label>
                <input
                  type="number"
                  value={roiFaculty}
                  onChange={(e) => setRoiFaculty(Number(e.target.value) || 0)}
                  onBlur={() => setRoiFaculty(Math.max(10, Math.min(50000, roiFaculty || 10)))}
                  min={10}
                  max={50000}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-uk-blue"
                />
              </div>
            </div>
          )}

          {/* Print-only / shared-mode static input display */}
          <div className={`grid grid-cols-2 gap-4 mb-4 ${isShared ? '' : 'hidden print:grid'}`}>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Students:</span> {displayRoiStudents.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Faculty:</span> {displayRoiFaculty.toLocaleString()}
            </p>
          </div>

          {/* Output metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {roiOutputs.map(o => (
              <div key={o.label} className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-uk-blue">{o.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">{o.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Branding Preview — hidden in shared mode */}
      {!isShared && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
          <div className="flex items-center gap-2 mb-1">
            <Palette className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">Preview Your University</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            See what the University of Kentucky platform would look like branded for your institution
          </p>

          {/* Inputs — hidden in print */}
          <div className="space-y-4 mb-6 print:hidden">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                University Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., University of Kentucky"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-uk-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Brand Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {BRAND_PRESETS.map(s => (
                  <button
                    key={s.color}
                    onClick={() => setBrandColor(s.color)}
                    className={`size-8 rounded-lg border-2 transition cursor-pointer ${
                      brandColor === s.color
                        ? 'ring-2 ring-offset-1 ring-gray-400 border-white'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: s.color }}
                    title={s.label}
                  />
                ))}
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    const v = e.target.value
                    setCustomColor(v)
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) setBrandColor(v)
                  }}
                  placeholder="Custom #hex"
                  maxLength={7}
                  className={`w-24 rounded-lg border-2 px-2 py-1.5 text-xs outline-none transition ${
                    /^#[0-9A-Fa-f]{6}$/.test(customColor) && brandColor === customColor
                      ? 'ring-2 ring-offset-1 ring-gray-400 border-white'
                      : 'border-gray-200 focus:border-uk-blue'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Preview mockup */}
          <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5" style={{ backgroundColor: brandColor }}>
              <p className="text-white font-extrabold text-sm tracking-wide">THE SANDBOX</p>
              <p className="text-white/70 text-xs mt-0.5">
                Powered by {brandName || 'Your University'}
              </p>
            </div>
            <div className="p-4 bg-gray-50">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-6 rounded" style={{ backgroundColor: brandColor }} />
                  <span className="text-xs font-bold text-gray-700">Sample AI Tool</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2">Interactive learning experience</p>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full w-3/4" style={{ backgroundColor: brandColor }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison CTA */}
      <Link
        href="/evaluate/compare"
        className="flex items-center justify-between rounded-2xl border-2 border-uk-blue/20 bg-blue-50/50 px-6 py-4 transition hover:border-uk-blue/40 hover:bg-blue-50 print:hidden"
      >
        <div>
          <p className="text-sm font-bold text-gray-900">See the difference</p>
          <p className="text-xs text-gray-500 mt-0.5">Compare education without vs. with the University of Kentucky platform</p>
        </div>
        <ArrowRight className="size-5 text-uk-blue shrink-0" />
      </Link>

      {/* Benchmark Comparison */}
      {benchmarkRows.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">How You Compare</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            {isShared ? 'This session' : 'Your session'} vs. typical evaluator benchmarks
          </p>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-uk-blue" />
              <span className="text-gray-600 font-medium">{isShared ? 'This evaluator' : 'You'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-gray-300" />
              <span className="text-gray-600 font-medium">Typical evaluator</span>
            </div>
          </div>

          <div className="space-y-5">
            {benchmarkRows.map(b => {
              const evalPct = b.max > 0 ? Math.min((b.evalValue / b.max) * 100, 100) : 0
              const benchPct = b.max > 0 ? Math.min((b.benchValue / b.max) * 100, 100) : 0
              return (
                <div key={b.label}>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">{b.label}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-14 text-[11px] text-uk-blue font-bold text-right shrink-0">
                        {b.evalDisplay}
                      </div>
                      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-uk-blue transition-all duration-500"
                          style={{ width: `${evalPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-14 text-[11px] text-gray-400 font-medium text-right shrink-0">
                        {b.benchDisplay}
                      </div>
                      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gray-300 transition-all duration-500"
                          style={{ width: `${benchPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Platform Fit Score */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none">
        <div className="flex items-center gap-2 mb-1">
          <Target className="size-5 text-uk-blue" />
          <h2 className="font-extrabold text-gray-900">Platform Fit Score</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Based on your engagement and institution profile
        </p>

        <div className="flex flex-col items-center">
          {/* Radial progress SVG */}
          <div className="relative size-40">
            <svg className="size-40 -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80" cy="80" r="70"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="12"
              />
              <circle
                cx="80" cy="80" r="70"
                fill="none"
                stroke="#0033A0"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - fitScore / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-uk-blue">{fitScore}</span>
              <span className="text-xs text-gray-400 font-medium">/ 100</span>
            </div>
          </div>

          {/* Interpretation */}
          <p className="mt-4 text-sm text-gray-600 text-center max-w-sm leading-relaxed">
            {fitLabel}
          </p>
        </div>
      </div>

      {/* Implementation Roadmap */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-1">
          <Milestone className="size-5 text-uk-blue" />
          <h2 className="font-extrabold text-gray-900">Implementation Roadmap</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">A typical path from pilot to university-wide deployment</p>

        {/* Desktop: horizontal timeline */}
        <div className="hidden sm:block">
          <div className="relative flex justify-between">
            {/* Connecting line */}
            <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-blue-200" />
            {([
              { phase: 'Pilot', time: 'Month 1-2', desc: 'Launch with 5-10 faculty champions. Build first tools, gather initial feedback.', color: 'bg-blue-400' },
              { phase: 'Department', time: 'Month 3-4', desc: 'Expand to 2-3 departments. Train faculty leads, integrate with existing workflows.', color: 'bg-blue-500' },
              { phase: 'College', time: 'Month 5-8', desc: 'Roll out across colleges. Establish analytics dashboards, refine AI models with usage data.', color: 'bg-blue-600' },
              { phase: 'University-Wide', time: 'Month 9-12', desc: 'Full institutional deployment. Cross-department sharing, executive dashboards, continuous improvement.', color: 'bg-uk-blue' },
            ]).map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center w-1/4 px-2">
                <div className={`relative z-10 size-8 rounded-full ${step.color} flex items-center justify-center ring-4 ring-white`}>
                  <span className="text-white text-xs font-bold">{i + 1}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-gray-900">{step.phase}</p>
                <p className="text-[11px] text-uk-blue font-medium">{step.time}</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="sm:hidden relative pl-8">
          <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-blue-200" />
          <div className="space-y-6">
            {([
              { phase: 'Pilot', time: 'Month 1-2', desc: 'Launch with 5-10 faculty champions. Build first tools, gather initial feedback.', color: 'bg-blue-400' },
              { phase: 'Department', time: 'Month 3-4', desc: 'Expand to 2-3 departments. Train faculty leads, integrate with existing workflows.', color: 'bg-blue-500' },
              { phase: 'College', time: 'Month 5-8', desc: 'Roll out across colleges. Establish analytics dashboards, refine AI models with usage data.', color: 'bg-blue-600' },
              { phase: 'University-Wide', time: 'Month 9-12', desc: 'Full institutional deployment. Cross-department sharing, executive dashboards, continuous improvement.', color: 'bg-uk-blue' },
            ]).map((step, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-8 top-0 size-6 rounded-full ${step.color} flex items-center justify-center ring-4 ring-white`}>
                  <span className="text-white text-[10px] font-bold">{i + 1}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{step.phase}</p>
                <p className="text-[11px] text-uk-blue font-medium">{step.time}</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Security & Compliance */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="size-5 text-uk-blue" />
          <h2 className="font-extrabold text-gray-900">Data Security &amp; Compliance</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Enterprise-grade protection for institutional data</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { icon: Lock, title: 'Encryption', desc: 'All data encrypted at rest (AES-256) and in transit (TLS 1.3). No student data leaves university-controlled infrastructure.' },
            { icon: ShieldCheck, title: 'Access Controls', desc: 'Role-based permissions with audit logging. Faculty see only their courses, admins have full oversight.' },
            { icon: Database, title: 'Data Retention', desc: 'Configurable retention policies. Sensitive sessions excluded from analytics. Full data export available.' },
            { icon: FileCheck, title: 'Compliance', desc: 'FERPA, COPPA, and GDPR compliant by design. SACSCOC-aligned assessment data capture. Annual third-party audits.' },
          ] as const).map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="size-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <item.icon className="size-4.5 text-uk-blue" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projected 6-Month Outcomes */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="size-5 text-uk-blue" />
          <h2 className="font-extrabold text-gray-900">Projected 6-Month Outcomes</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">Based on your institution profile</p>
        <div className="space-y-4">
          {(() => {
            const toolsCreated6mo = Math.round(displayRoiFaculty * 1.5)
            const toolsMax = displayRoiFaculty * 3
            const savings6mo = Math.round(roiAnnualSavings / 2)
            const rows = [
              { label: 'Tools Created', value: `${toolsCreated6mo.toLocaleString()} tools in 6 months`, pct: toolsMax > 0 ? Math.min((toolsCreated6mo / toolsMax) * 100, 100) : 50 },
              { label: 'Student Engagement Rate', value: '73% of students actively engaged', pct: 73 },
              { label: 'Faculty Adoption Rate', value: '45% faculty adoption in first 6 months', pct: 45 },
              { label: 'Estimated Savings (6mo)', value: `$${savings6mo.toLocaleString()} saved in 6 months`, pct: 50 },
            ]
            return rows.map((row, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{row.label}</span>
                  <span className="text-xs text-uk-blue font-bold">{row.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-uk-blue transition-all duration-700"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:border print:shadow-none print:break-before-auto">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="size-5 text-uk-blue" />
          <h2 className="font-extrabold text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {([
            { q: 'How long does it take to create an AI tool?', a: 'Most faculty create their first tool in under 5 minutes. Simply describe the learning experience you want, and the AI generates it. No coding or technical expertise required.' },
            { q: 'What kind of AI tools can be created?', a: 'Anything from adaptive quizzes and Socratic tutors to clinical simulations and case study analyzers. If you can describe it, the platform can build it.' },
            { q: 'How does the University of Kentucky platform handle student data privacy?', a: 'All data is FERPA-compliant by design. Sensitive sessions are excluded from analytics, data stays within university-controlled infrastructure, and we conduct annual third-party security audits.' },
            { q: 'Can tools be shared across departments?', a: 'Yes. Tools created by one faculty member can be published to the university-wide marketplace, where colleagues can discover, adopt, and adapt them for their own courses.' },
            { q: 'What does implementation look like?', a: 'We recommend a phased approach: start with a small pilot (5-10 faculty), expand to departments, then scale university-wide over 9-12 months. Our team supports you at every stage.' },
            { q: 'What analytics are available?', a: 'Real-time dashboards show student engagement, session quality scores, at-risk indicators, and tool usage patterns. Faculty and administrators each get role-appropriate views.' },
            { q: 'What does it cost?', a: 'Pricing is based on institution size and usage. Our ROI calculator above estimates ~$0.03 per student interaction, with significant savings from reduced faculty workload. Contact us for a custom quote.' },
          ]).map((item, i) => {
            const isOpen = openFaq === i
            return (
              <div key={i}>
                {/* Screen: interactive accordion */}
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-3 text-left cursor-pointer print:hidden"
                >
                  <span className="text-sm font-medium text-gray-800 pr-4">{item.q}</span>
                  <ChevronDown className={`size-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 print:hidden ${
                    isOpen ? 'max-h-40 pb-3' : 'max-h-0'
                  }`}
                >
                  <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                </div>
                {/* Print: always expanded */}
                <div className="hidden print:block py-2">
                  <p className="text-sm font-medium text-gray-800">{item.q}</p>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1">{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Email Capture — hidden in shared mode */}
      {!isShared && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:hidden">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">Get this summary in your inbox</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            We&apos;ll send a formatted copy of this session summary to your email.
          </p>

          {emailStatus === 'sent' ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle2 className="size-5 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-green-700">Summary sent! Check your inbox.</p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!email.trim() || emailStatus === 'sending') return
                setEmailStatus('sending')
                setEmailError('')
                try {
                  const res = await fetch('/api/evaluate/send-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: email.trim(),
                      timeSpent: elapsed || (startTime ? formatDuration(startTime) : 'Unknown'),
                      stepsCompleted: completedCount,
                      totalSteps: steps.length,
                      metrics,
                      sessionLog: sessionLog.length > 0 ? sessionLog : undefined,
                      ...(npsSubmitted && npsScore !== null ? { nps: { score: npsScore, ...(npsComment.trim() ? { comment: npsComment.trim() } : {}) } } : {}),
                      roi: { students: roiStudents, faculty: roiFaculty },
                      ...(wishlist.length > 0 ? { wishlist } : {}),
                    }),
                  })
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    throw new Error(data.error || 'Failed to send email')
                  }
                  setEmailStatus('sent')
                } catch (err) {
                  setEmailStatus('error')
                  setEmailError(err instanceof Error ? err.message : 'Something went wrong')
                }
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="email"
                required
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-uk-blue"
              />
              <button
                type="submit"
                disabled={emailStatus === 'sending'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-uk-blue px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#002880] disabled:opacity-60 cursor-pointer"
              >
                {emailStatus === 'sending' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {emailStatus === 'sending' ? 'Sending...' : 'Send Summary'}
              </button>
            </form>
          )}

          {emailStatus === 'error' && emailError && (
            <p className="text-sm text-red-600 mt-2">{emailError}</p>
          )}
        </div>
      )}

      {/* Share This Summary — hidden in shared mode */}
      {!isShared && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:hidden">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">Share This Summary</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Generate a link to share this evaluation summary with colleagues — no login required.
          </p>
          <button
            onClick={handleCopyShareLink}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow transition cursor-pointer ${
              linkCopied
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-uk-blue text-white hover:bg-[#002880]'
            }`}
          >
            {linkCopied ? (
              <>
                <CheckCircle2 className="size-4" />
                Link copied!
              </>
            ) : (
              <>
                <Link2 className="size-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
      )}

      {/* Follow-Up Scheduler — hidden in shared mode */}
      {!isShared && (
        <div id="schedule" className="bg-white rounded-2xl border-2 border-gray-200 p-6 print:hidden">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="size-5 text-uk-blue" />
            <h2 className="font-extrabold text-gray-900">Schedule a Follow-Up</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Request a conversation with the CATS-AI team about bringing the University of Kentucky platform to your institution.
          </p>

          {followUpStatus === 'sent' ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle2 className="size-5 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-green-700">Request sent! We&apos;ll be in touch.</p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (followUpStatus === 'sending') return
                setFollowUpStatus('sending')
                setFollowUpError('')
                try {
                  const res = await fetch('/api/evaluate/schedule-followup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: followUpName.trim(),
                      email: followUpEmail.trim(),
                      date: followUpDate,
                      ...(followUpMessage.trim() ? { message: followUpMessage.trim() } : {}),
                    }),
                  })
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    throw new Error(data.error || 'Failed to send request')
                  }
                  setFollowUpStatus('sent')
                } catch (err) {
                  setFollowUpStatus('error')
                  setFollowUpError(err instanceof Error ? err.message : 'Something went wrong')
                }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={followUpName}
                    onChange={(e) => setFollowUpName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-uk-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={followUpEmail}
                    onChange={(e) => setFollowUpEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-uk-blue"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-uk-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  placeholder="Tell us about your institution's needs"
                  rows={2}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-uk-blue resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={followUpStatus === 'sending'}
                className="inline-flex items-center gap-2 rounded-xl bg-uk-blue px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#002880] disabled:opacity-60 cursor-pointer"
              >
                {followUpStatus === 'sending' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {followUpStatus === 'sending' ? 'Sending...' : 'Request Follow-Up'}
              </button>
            </form>
          )}

          {followUpStatus === 'error' && followUpError && (
            <p className="text-sm text-red-600 mt-2">{followUpError}</p>
          )}
        </div>
      )}

      {/* Contact Card — hidden in shared mode */}
      {!isShared && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden print:border print:shadow-none">
          <div className="h-2 bg-uk-blue" />
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="size-12 rounded-full bg-uk-blue flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-extrabold">CA</span>
              </div>
              <div>
                <h2 className="font-extrabold text-gray-900">CATS-AI Team</h2>
                <p className="text-xs text-gray-500">Center for the Advancement of Teaching &amp; Scholarship</p>
                <p className="text-xs text-gray-500">University of Kentucky</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="size-3.5 text-gray-400 shrink-0" />
                <a href="mailto:cats-ai@uky.edu" className="hover:text-uk-blue transition">cats-ai@uky.edu</a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="size-3.5 text-gray-400 shrink-0" />
                <span>Gatton Student Center, Suite 220</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <a
                href="https://cats-ai.uky.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-uk-blue hover:text-uk-blue transition"
              >
                <ExternalLink className="size-3" />
                Visit Website
              </a>
              <a
                href="mailto:cats-ai@uky.edu"
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-uk-blue hover:text-uk-blue transition"
              >
                <Mail className="size-3" />
                Email Us
              </a>
              <a
                href="#schedule"
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-uk-blue hover:text-uk-blue transition"
              >
                <CalendarDays className="size-3" />
                Request Demo
              </a>
            </div>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        {isShared ? (
          <Link
            href="/evaluate"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-uk-blue px-6 py-3.5 text-sm font-bold text-white shadow transition hover:bg-[#002880]"
          >
            <ArrowRight className="size-4" />
            Start Your Own Evaluation
          </Link>
        ) : (
          <a
            href="#schedule"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-uk-blue px-6 py-3.5 text-sm font-bold text-white shadow transition hover:bg-[#002880]"
          >
            <CalendarDays className="size-4" />
            Schedule a Follow-Up
          </a>
        )}
        <button
          onClick={() => window.print()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-uk-blue hover:text-uk-blue cursor-pointer"
        >
          <Download className="size-4" />
          Download PDF
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-uk-blue hover:text-uk-blue cursor-pointer"
        >
          <Printer className="size-4" />
          Print Summary
        </button>
      </div>

      {/* Print footer */}
      <div className="hidden print:block border-t border-gray-200 pt-4 mt-8">
        <p className="text-xs text-gray-400">
          Generated {new Date().toLocaleDateString()} — University of Kentucky — CATS-AI
          {startTime && ` — Session started ${new Date(startTime).toLocaleString()}`}
        </p>
      </div>
    </div>
  )
}
