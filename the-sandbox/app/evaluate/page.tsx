'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Compass } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { startTour } from '../components/EvaluatorTour'

export default function EvaluatePage() {
  const router = useRouter()
  const { setEvaluatorMode } = useAuth()

  function handleCTA() {
    setEvaluatorMode(true)
    try {
      sessionStorage.setItem('uky-evaluator-start-time', new Date().toISOString())
    } catch {}
    router.push('/build?evaluator=true')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0033A0] via-blue-700 to-sky-600 px-6 text-white">
      {/* Logo */}
      <div className="animate-[fadeIn_0.6s_ease-out_both]">
        <Image
          src="/uk-wildcat-mark.webp"
          alt="University of Kentucky"
          width={120}
          height={120}
          className="mx-auto mb-8"
          priority
        />
      </div>

      {/* Heading */}
      <h1
        className="text-5xl font-extrabold tracking-tight mb-3 animate-[fadeIn_0.6s_ease-out_0.3s_both]"
      >
        THE SANDBOX
      </h1>

      {/* Subheading */}
      <p
        className="text-xl text-white/80 mb-10 animate-[fadeIn_0.6s_ease-out_0.6s_both]"
      >
        The AI-powered university of the future
      </p>

      {/* Value prop */}
      <div className="text-center text-lg leading-relaxed max-w-lg mb-12 space-y-2 animate-[fadeIn_0.6s_ease-out_0.9s_both]">
        <p>Faculty describe a learning experience in plain language.</p>
        <p>The platform builds it in minutes. No code. No IT ticket.</p>
        <p className="font-semibold">One upload turns an entire course into an AI-powered system.</p>
      </div>

      {/* CTAs */}
      <div className="w-full max-w-md space-y-3 animate-[fadeIn_0.6s_ease-out_1.2s_both]">
        <button
          onClick={handleCTA}
          className="w-full rounded-2xl bg-white px-8 py-4 text-lg font-bold text-[#0033A0] shadow-lg transition hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] cursor-pointer"
        >
          Start the Experience &rarr;
        </button>
        <button
          onClick={() => {
            setEvaluatorMode(true)
            try {
              sessionStorage.setItem('uky-evaluator-start-time', new Date().toISOString())
            } catch {}
            startTour()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white/90 transition hover:border-white/60 hover:text-white cursor-pointer"
        >
          <Compass className="size-4" />
          Take a Tour
        </button>
      </div>

      {/* Footer */}
      <p className="mt-16 text-sm text-white/50 animate-[fadeIn_0.6s_ease-out_1.5s_both]">
        University of Kentucky &middot; CATS-AI
      </p>
    </div>
  )
}
