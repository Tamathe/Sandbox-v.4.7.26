'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, BarChart3, Brain, Briefcase,
  Compass, FileText, GraduationCap, Shield, Sparkles, Wand2,
} from 'lucide-react'

// ─── Cookie helpers ──────────────────────────────────────────────────────────

function getLandingCookie(): 'student' | 'faculty' | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(^| )sandbox-landing-role=([^;]+)/)
  const val = match ? decodeURIComponent(match[2]) : null
  return val === 'student' || val === 'faculty' ? val : null
}

function setLandingCookie(value: string) {
  const expires = new Date(Date.now() + 30 * 864e5).toUTCString()
  document.cookie = `sandbox-landing-role=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

// ─── Landing shell (shared nav + footer) ─────────────────────────────────────

function LandingShell({ onEnter, children }: { onEnter: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl overflow-hidden bg-white border border-gray-100">
            <Image src="/uk-wildcat-mark.webp" alt="University of Kentucky" width={40} height={40} className="object-contain w-full h-full" />
          </div>
          <div>
            <div className="font-bold text-uk-blue text-lg leading-tight">University of Kentucky</div>
          </div>
        </div>
        <button type="button" onClick={onEnter} className="px-4 py-2 text-sm font-semibold text-white bg-uk-blue rounded-lg hover:bg-[#002878] transition-colors">
          Sign In
        </button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {children}
      </main>
      <footer className="border-t border-gray-100 px-6 py-4 flex items-center justify-between text-xs text-gray-400">
        <span>© 2026 University of Kentucky</span>
        <span className="text-uk-blue font-medium">Built by CATS-AI</span>
      </footer>
    </div>
  )
}

// ─── Role-Aware Landing (fork → faculty or student view) ─────────────────────

type LandingRole = 'student' | 'faculty' | null

function getInitialRole(): LandingRole {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const paramRole = params.get('role')
  if (paramRole === 'faculty' || paramRole === 'student') {
    setLandingCookie(paramRole)
    return paramRole
  }
  return getLandingCookie()
}

export default function RoleAwareLanding({ onEnter }: { onEnter: () => void }) {
  const [role, setRole] = useState<LandingRole>(getInitialRole)

  const pickRole = (r: 'student' | 'faculty') => {
    setLandingCookie(r)
    setRole(r)
  }

  // ── Fork screen ──────────────────────────────────────────────────────────
  if (!role) {
    return (
      <LandingShell onEnter={onEnter}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-xs font-semibold text-uk-blue mb-6">
            <Sparkles className="size-3.5" />
            University of Kentucky
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Welcome
          </h1>
          <p className="text-lg text-gray-500 mb-12">Tell us about yourself so we can show you what matters most.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            <button
              onClick={() => pickRole('student')}
              className="group border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-uk-blue hover:shadow-lg transition-all"
            >
              <div className="size-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-100 transition-colors">
                <GraduationCap className="size-7 text-green-600" />
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">I&apos;m a Student</h2>
              <p className="text-sm text-gray-500">Practice, study, track progress</p>
            </button>

            <button
              onClick={() => pickRole('faculty')}
              className="group border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-uk-blue hover:shadow-lg transition-all"
            >
              <div className="size-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                <Briefcase className="size-7 text-uk-blue" />
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">I&apos;m Faculty or Staff</h2>
              <p className="text-sm text-gray-500">Build tools, set policies, analyze</p>
            </button>
          </div>
        </div>
      </LandingShell>
    )
  }

  // ── Faculty landing ──────────────────────────────────────────────────────
  if (role === 'faculty') {
    return (
      <LandingShell onEnter={onEnter}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-xs font-semibold text-uk-blue mb-6">
            <Sparkles className="size-3.5" />
            For Faculty &amp; Staff
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Your AI course policy,<br />
            <span className="text-uk-blue">written in 10 minutes.</span>
          </h1>

          <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
            Define your AI stance, generate a syllabus-ready policy, and scan assignments for AI vulnerability — all in one sitting.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-left">
            {[
              { icon: Compass, color: 'bg-blue-100 text-uk-blue', title: 'Discover your AI stance', body: 'Answer a few questions and get a clear position — from "no AI" to "AI required" — tailored to your discipline.' },
              { icon: FileText, color: 'bg-amber-100 text-amber-700', title: 'Generate a course policy', body: 'Turn your stance into a syllabus-ready AI policy in minutes, not hours. Edit, refine, and export.' },
              { icon: Shield, color: 'bg-red-100 text-red-700', title: 'Scan your assignments', body: 'Paste an assignment prompt and see exactly how vulnerable it is to AI completion — with redesign suggestions.' },
            ].map((card) => {
              const Icon = card.icon
              return (
                <div key={card.title} className="border rounded-2xl shadow-sm p-5 hover:shadow-md transition-all">
                  <div className={`size-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 mb-1.5">{card.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{card.body}</p>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href="/onboard?intent=ai-literacy" className="inline-flex items-center gap-2 rounded-2xl bg-uk-blue px-8 py-4 text-base font-bold text-white hover:bg-[#002580] transition-colors shadow-lg">
              Get Started <ArrowRight className="size-4" />
            </Link>
            <button type="button" onClick={onEnter} className="text-sm font-semibold text-gray-500 hover:text-uk-blue transition-colors">
              Already have an account? Sign in →
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">Join 200+ UK faculty</p>
          <button type="button" onClick={() => pickRole('student')} className="text-sm text-uk-blue hover:text-[#002580] font-medium transition-colors">
            Actually, I&apos;m a student →
          </button>
        </div>
      </LandingShell>
    )
  }

  // ── Student landing ──────────────────────────────────────────────────────
  return (
    <LandingShell onEnter={onEnter}>
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-xs font-semibold text-green-700 mb-6">
          <Sparkles className="size-3.5" />
          For Students
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Learn faster.<br />
          <span className="text-uk-blue">Build smarter.</span>
        </h1>

        <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
          AI-powered study tools built by your professors, matched to your exact courses and assignments.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-left">
          {[
            { icon: BarChart3, color: 'bg-green-100 text-green-700', title: 'Track how you\'re improving', body: 'Every practice session builds your skill profile — see what you\'ve mastered and where to focus next.' },
            { icon: Wand2, color: 'bg-violet-100 text-violet-700', title: 'Build study tools in minutes', body: 'Describe what you want to practice and it turns into a live AI experience — no code needed.' },
            { icon: Brain, color: 'bg-blue-100 text-uk-blue', title: 'AI tutors for every course', body: 'Your professors build custom AI tools matched to your syllabus — quizzes, simulations, debate partners, and more.' },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="border rounded-2xl shadow-sm p-5 hover:shadow-md transition-all">
                <div className={`size-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                  <Icon className="size-4" />
                </div>
                <h3 className="font-extrabold text-gray-900 mb-1.5">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.body}</p>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link href="/onboard" className="inline-flex items-center gap-2 rounded-2xl bg-uk-blue px-8 py-4 text-base font-bold text-white hover:bg-[#002580] transition-colors shadow-lg">
            Get Started <ArrowRight className="size-4" />
          </Link>
          <button type="button" onClick={onEnter} className="text-sm font-semibold text-gray-500 hover:text-uk-blue transition-colors">
            Already have an account? Sign in →
          </button>
        </div>

        <button type="button" onClick={() => pickRole('faculty')} className="text-sm text-uk-blue hover:text-[#002580] font-medium transition-colors">
          Actually, I&apos;m faculty or staff →
        </button>
      </div>
    </LandingShell>
  )
}
