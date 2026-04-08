'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Compass, FileText, PenTool, ClipboardCheck, BookOpen,
  Heart, MessageCircle, BarChart3, Upload, Users,
  Eye, AlertTriangle, Check,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import PageHeader from '../../components/PageHeader'
import QuickStartWizard from '../../components/ai-literacy/QuickStartWizard'
import { useModuleProgress, type ModuleStatus } from '../../hooks/useModuleProgress'
import ProgressiveProfileCard from '../../components/ai-literacy/ProgressiveProfileCard'
import GoldenPathProgress from '../../components/ai-literacy/GoldenPathProgress'
import StudentLiteracyHub from '../../components/ai-literacy/StudentLiteracyHub'
import StudentLiteracyOnboarding from '../../components/ai-literacy/StudentLiteracyOnboarding'
import LoadingSpinner from '../../components/LoadingSpinner'

interface ModuleCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  color: string
  badge?: string
  status?: ModuleStatus
}

function ModuleCard({ href, icon, title, description, color, badge, status }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="block p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="relative">
          <div className={`size-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
            {icon}
          </div>
          {status === 'completed' && (
            <div className="absolute -top-1 -right-1 size-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="size-3 text-white" />
            </div>
          )}
          {status === 'in-progress' && (
            <div className="absolute -top-1 -right-1 size-5 rounded-full bg-amber-500 flex items-center justify-center">
              <div className="size-2 bg-white rounded-full" />
            </div>
          )}
        </div>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
    </Link>
  )
}

export default function AILiteracyHubPage() {
  const { currentUser } = useAuth()
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'
  const isAdmin = currentUser.role === 'ADMIN'
  const { progress } = useModuleProgress(currentUser.email)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [quickStartLoading, setQuickStartLoading] = useState(true)

  // Stance welcome state
  const [stanceName, setStanceName] = useState<string | null>(null)
  const [stanceLoaded, setStanceLoaded] = useState(false)

  // Student onboarding state
  const [studentOnboarded, setStudentOnboarded] = useState<boolean | null>(null)
  const studentOnboardingChecked = useRef(false)

  // Student profile state (for hub)
  const [studentProfileData, setStudentProfileData] = useState<{
    materialized: boolean
    profile?: {
      practicalSkill: number; communication: number; skepticism: number
      judgment: number; readiness: number; modulesCompleted: number
    } | null
    readinessBand?: { label: string; key: string }
  } | null>(null)

  // Progressive profile state
  const [profileData, setProfileData] = useState<{
    materialized: boolean
    profile?: {
      comfort: number; pedagogyAlignment: number; curiosity: number
      ethicalAwareness: number; currentUsage: number; readiness: number
      modulesCompleted: number; lastScoredAt: string | null
    } | null
    modulesCompleted?: number
    readinessBand?: { label: string; key: string }
  } | null>(null)
  const profileFetched = useRef(false)

  // Check student onboarding status
  useEffect(() => {
    if (isEducator || studentOnboardingChecked.current) return
    studentOnboardingChecked.current = true
    const controller = new AbortController()
    apiFetch<{ completed?: boolean }>(currentUser.email, '/api/ai-literacy/student/onboarding', {
      signal: controller.signal,
    })
      .then((data) => {
        setStudentOnboarded(data?.completed ?? false)
        if (data?.completed) {
          // Also fetch student profile
          apiFetch<typeof studentProfileData>(currentUser.email, '/api/ai-literacy/student/profile', {
            signal: controller.signal,
          })
            .then((pData) => { if (pData) setStudentProfileData(pData) })
            .catch((err) => { if (err instanceof Error && err.name === 'AbortError') return })
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setStudentOnboarded(false)
      })
    return () => controller.abort()
  }, [isEducator, currentUser.email])

  // Fetch all educator/profile data sequentially to avoid overwhelming connections in dev
  useEffect(() => {
    if (profileFetched.current) return
    const controller = new AbortController()
    const opts = { signal: controller.signal }
    async function loadAll() {
      // 1. Quick-start (educator only)
      if (isEducator) {
        try {
          const data = await apiFetch<{ quickStartCompleted?: boolean; hasStance?: boolean }>(currentUser.email, '/api/ai-literacy/quick-start', opts)
          if (!data.quickStartCompleted && !data.hasStance) {
            setShowQuickStart(true)
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
        }
      }
      setQuickStartLoading(false)

      // 2. Profile
      try {
        const data = await apiFetch<typeof profileData>(currentUser.email, '/api/ai-literacy/profile', opts)
        if (data) setProfileData(data)
        profileFetched.current = true
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }

      // 3. Stance
      try {
        const data = await apiFetch<{ stance?: string }>(currentUser.email, '/api/ai-literacy/stance', opts)
        if (data?.stance) setStanceName(data.stance)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
      setStanceLoaded(true)
    }
    void loadAll()
    return () => controller.abort()
  }, [isEducator, currentUser.email])

  const STANCE_LABELS: Record<string, string> = {
    PROHIBIT: 'Prohibit', CAUTIOUS: 'Cautious', GUIDED: 'Guided', INTEGRATE: 'Integrate', REQUIRE: 'Require',
  }

  const handleQuickStartComplete = useCallback(() => {
    setShowQuickStart(false)
  }, [])

  const handleQuickStartSkip = useCallback(async () => {
    // Mark as skipped so it doesn't show again
    await apiFetch(currentUser.email, '/api/ai-literacy/quick-start', {
      method: 'POST',
      body: JSON.stringify({ step: 0, completed: true }),
    }).catch(() => {})
    setShowQuickStart(false)
  }, [currentUser.email])

  if (quickStartLoading) {
    return (
      <>
        <PageHeader
          title="AI Literacy & Training"
          subtitle="Tools and training for every stance — from prohibition to required use"
        />
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="AI Literacy & Training"
        subtitle="Tools and training for every stance — from prohibition to required use"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Golden Path progress indicator */}
        <GoldenPathProgress />

        {/* Quick Start for first-time educators */}
        {isEducator && showQuickStart && (
          <QuickStartWizard
            onComplete={handleQuickStartComplete}
            onSkip={handleQuickStartSkip}
          />
        )}

        {/* Stance-aware welcome text */}
        {stanceLoaded && (
          <p className="text-sm text-muted-foreground mb-4">
            {stanceName ? (
              <>Your stance: <Link href="/ai-literacy/stance" className="font-medium underline underline-offset-2 hover:text-gray-900">{STANCE_LABELS[stanceName] ?? stanceName}</Link>. Your modules are ordered to match.</>
            ) : (
              <>Take the <Link href="/ai-literacy/stance" className="font-medium underline underline-offset-2 hover:text-gray-900">Stance Navigator</Link> to personalize your experience.</>
            )}
          </p>
        )}

        {/* Progressive AI Profile card (materialized only) */}
        {profileData?.materialized && profileData.profile && profileData.readinessBand && (
          <ProgressiveProfileCard profile={profileData.profile} readinessBand={profileData.readinessBand} />
        )}
        {/* Inline profile hint (not yet materialized) */}
        {profileData && !profileData.materialized && profileData.modulesCompleted != null && (
          <p className="text-xs text-gray-500 mb-4">
            Complete {2 - (profileData.modulesCompleted ?? 0)} more module{(2 - (profileData.modulesCompleted ?? 0)) !== 1 ? 's' : ''} to unlock your AI Profile.
          </p>
        )}

        {/* Educator module grid */}
        {isEducator && !showQuickStart && (
          <div className="space-y-6">
            {/* Your Workflow */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Workflow</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ModuleCard
                  href="/ai-literacy/stance"
                  icon={<Compass className="size-5 text-blue-600" />}
                  title="Stance Navigator"
                  description="Find where you stand on AI. 5-minute guided reflection."
                  color="bg-blue-50"
                  status={progress['stance']}
                />
                <ModuleCard
                  href="/ai-literacy/policy"
                  icon={<FileText className="size-5 text-amber-600" />}
                  title="Policy Builder"
                  description="Generate an AI policy for your courses in minutes."
                  color="bg-amber-50"
                  status={progress['policy']}
                />
                <ModuleCard
                  href="/ai-literacy/assignments"
                  icon={<PenTool className="size-5 text-red-600" />}
                  title="Assignment Redesign"
                  description="Scan assignments for AI vulnerability. Get redesign suggestions."
                  color="bg-red-50"
                />
                <ModuleCard
                  href="/ai-literacy/syllabus-drop"
                  icon={<Upload className="size-5 text-purple-600" />}
                  title="Syllabus Drop"
                  description="Drop your syllabus to bulk-scan assignments and generate a policy."
                  color="bg-purple-50"
                />
              </div>
            </div>

            {/* Practice & Learn */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Practice & Learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ModuleCard
                  href="/ai-literacy/process"
                  icon={<ClipboardCheck className="size-5 text-green-600" />}
                  title="Process Assessment"
                  description="Make the learning journey visible with checkpoint templates."
                  color="bg-green-50"
                />
                <ModuleCard
                  href="/ai-literacy/prompt-lab"
                  icon={<Eye className="size-5 text-blue-600" />}
                  title="Prompt Lab"
                  description="Master prompt engineering — 5 levels from clarity to evaluation, with AI scoring."
                  color="bg-blue-50"
                  status={progress['prompt-lab']}
                />
                <ModuleCard
                  href="/ai-literacy/output-eval"
                  icon={<AlertTriangle className="size-5 text-red-600" />}
                  title="Output Evaluator"
                  description="Spot AI errors — highlight hallucinations, bias, and unsupported claims across 3 tiers."
                  color="bg-red-50"
                  status={progress['output-eval']}
                />
                <ModuleCard
                  href="/ai-literacy/pedagogy"
                  icon={<BookOpen className="size-5 text-indigo-600" />}
                  title="Pedagogy Hub"
                  description="Browse case studies and peer examples from UK faculty."
                  color="bg-indigo-50"
                />
                <ModuleCard
                  href="/ai-literacy/discipline"
                  icon={<Heart className="size-5 text-pink-600" />}
                  title="Discipline Identity"
                  description="Articulate what your field values and how AI fits."
                  color="bg-pink-50"
                />
                <ModuleCard
                  href="/ai-literacy/advising"
                  icon={<MessageCircle className="size-5 text-teal-600" />}
                  title="Advising Framework"
                  description="Practice advising conversations with Sandy roleplay."
                  color="bg-teal-50"
                />
              </div>
            </div>

            {/* Admin */}
            {isAdmin && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Admin</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ModuleCard
                    href="/ai-literacy/pulse"
                    icon={<BarChart3 className="size-5 text-emerald-600" />}
                    title="Campus Pulse"
                    description="Institution-wide AI readiness metrics, stance drift, and department breakdown."
                    color="bg-emerald-50"
                    badge="Admin"
                  />
                  <ModuleCard
                    href="/ai-literacy/cohort"
                    icon={<Users className="size-5 text-slate-600" />}
                    title="Cohort Rollout"
                    description="Track adoption by college. Plan structured onboarding campaigns."
                    color="bg-slate-50"
                    badge="Admin"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Student view */}
        {!isEducator && studentOnboarded === null && (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        )}
        {!isEducator && studentOnboarded === false && (
          <StudentLiteracyOnboarding
            onComplete={() => {
              setStudentOnboarded(true)
              // Fetch profile after onboarding
              apiFetch<typeof studentProfileData>(currentUser.email, '/api/ai-literacy/student/profile')
                .then((pData) => { if (pData) setStudentProfileData(pData) })
                .catch(() => {})
            }}
          />
        )}
        {!isEducator && studentOnboarded === true && (
          <StudentLiteracyHub currentUser={currentUser} profileData={studentProfileData} />
        )}
      </div>
    </>
  )
}
