'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, BarChart3, Wand2, ArrowRight, X } from 'lucide-react'

interface OnboardingModalProps {
  userName: string
  role: 'ADMIN' | 'EDUCATOR' | 'STUDENT' | 'REGISTRAR' | 'STAFF'
  onDismiss: () => void
}

const ROLE_CTA: Record<string, { href: string; label: string }> = {
  EDUCATOR:  { href: '/build',   label: 'Build your first tool →' },
  STUDENT:   { href: '/tools',   label: 'Browse learning tools →' },
  ADMIN:     { href: '/admin',   label: 'Open Admin Panel →' },
  REGISTRAR: { href: '/registrar', label: 'Open Registrar →' },
}

const EDUCATOR_STEPS = ['Describe', 'Preview', 'Publish']
const STUDENT_STEPS  = ['Browse', 'Learn', 'Track']

export default function OnboardingModal({ userName, role, onDismiss }: OnboardingModalProps) {
  const [slide, setSlide] = useState(0)
  const router = useRouter()
  const firstName = userName.split(' ')[0]
  const steps = role === 'STUDENT' ? STUDENT_STEPS : EDUCATOR_STEPS
  const cta = ROLE_CTA[role] ?? ROLE_CTA['STUDENT']

  function handleGetStarted() {
    onDismiss()
    router.push(cta.href)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Skip link */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Skip"
        >
          <X className="size-4" />
        </button>

        {/* Slide dots + count */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? 'w-6 bg-[#0033A0]' : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">{slide + 1} of 3</span>
        </div>

        {/* Slide 1 — Welcome */}
        {slide === 0 && (
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0033A0]">
              Welcome
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-gray-900">
              Welcome, {firstName}.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {role === 'STUDENT'
                ? 'Your professors build AI tools tailored to your course materials — quizzes, simulations, debate partners, and more. Use them to practice, learn, and track your progress.'
                : role === 'EDUCATOR'
                ? 'Build AI learning tools for your students, connect them to your courses, and measure what works — all from one place.'
                : 'Manage the platform, approve tools, and see institution-wide learning analytics at a glance.'}
            </p>
          </div>
        )}

        {/* Slide 2 — How it works */}
        {slide === 1 && (
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-6">How it works</h2>
            <div className="space-y-4">
              {steps.map((step, i) => {
                const icons = [Brain, Wand2, BarChart3]
                const Icon = icons[i]
                return (
                  <div key={step} className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0033A0]/10">
                      <Icon className="size-5 text-[#0033A0]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Step {i + 1}</p>
                      <p className="font-semibold text-gray-900">{step}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Slide 3 — First step CTA */}
        {slide === 2 && (
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-3">Your first step</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {role === 'STUDENT'
                ? 'Browse tools your professors built — or build your own in minutes. No coding required.'
                : role === 'EDUCATOR'
                ? 'Head to the Build Hub to describe your first AI tool. It takes less than 5 minutes.'
                : 'Start in the Admin Panel to review pending tools and see platform-wide stats.'}
            </p>
            {role === 'STUDENT' ? (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { onDismiss(); router.push('/tools') }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                >
                  Browse learning tools
                  <ArrowRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { onDismiss(); router.push('/builder') }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0033A0] py-3 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-50"
                >
                  Build something new
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGetStarted}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
              >
                {cta.label}
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        {slide < 2 && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setSlide((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002580] transition-colors"
            >
              Next
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
