'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Search, Home, PartyPopper, Compass, PenTool, Check } from 'lucide-react'

// ─── Stance display helpers ──────────────────────────────────────────────────

const STANCE_LABELS: Record<string, string> = {
  PROHIBIT: 'Prohibit AI',
  CAUTIOUS: 'Cautious',
  GUIDED: 'Guided Use',
  INTEGRATE: 'Integrate AI',
  REQUIRE: 'Require AI',
}

const STANCE_COLORS: Record<string, string> = {
  PROHIBIT: 'bg-red-100 text-red-700',
  CAUTIOUS: 'bg-amber-100 text-amber-700',
  GUIDED: 'bg-blue-100 text-blue-700',
  INTEGRATE: 'bg-indigo-100 text-indigo-700',
  REQUIRE: 'bg-green-100 text-green-700',
}

// ─── CSS-only confetti ───────────────────────────────────────────────────────

// Seeded pseudo-random for deterministic confetti layout
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

const CONFETTI_COLORS = ['#0033A0', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899']

function buildConfettiPieces() {
  const rand = seededRandom(42)
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: rand() * 100,
    delay: rand() * 3,
    duration: 3 + rand() * 4,
    swayDuration: 2 + rand() * 3,
    size: 6 + rand() * 8,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    isCircle: i % 3 === 0,
  }))
}

function Confetti() {
  const pieces = useMemo(() => buildConfettiPieces(), [])
  const [visible, setVisible] = useState(true)

  // Remove confetti DOM after longest animation completes (max ~7s fall + 3s delay = 10s)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes confetti-sway {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(15px); }
          75% { transform: translateX(-15px); }
        }
        .confetti-piece {
          position: absolute;
          top: -20px;
          animation: confetti-fall linear forwards, confetti-sway ease-in-out;
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: p.isCircle ? `${p.size}px` : `${p.size * 2.5}px`,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animationDuration: `${p.duration}s, ${p.swayDuration}s`,
            animationDelay: `${p.delay}s, ${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Summary card ────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: typeof Compass
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 p-4 border rounded-2xl shadow-sm bg-white">
      <div className={`size-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
      <Check className="size-4 text-green-500 ml-auto" />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OnboardCompletePage() {
  const searchParams = useSearchParams()
  const stance = searchParams.get('stance')
  const policyName = searchParams.get('policyName')
  const scanCount = searchParams.get('scanCount')

  // Update golden-path stepper to reflect what was actually completed
  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('golden-path-progress') || '{}')
      if (stance) existing.stance = true
      if (policyName) existing.policy = true
      if (scanCount && Number(scanCount) > 0) existing.scan = true
      localStorage.setItem('golden-path-progress', JSON.stringify(existing))
    } catch {}
  }, [stance, policyName, scanCount])

  const stanceLabel = stance ? (STANCE_LABELS[stance] ?? stance.replace(/_/g, ' ')) : null
  const stanceColor = stance ? (STANCE_COLORS[stance] ?? 'bg-gray-100 text-gray-700') : null

  const hasPolicy = !!policyName
  const hasScan = !!scanCount && Number(scanCount) > 0
  const isFullCompletion = !!stance && (hasPolicy || hasScan)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Confetti />

      <div className="max-w-lg w-full text-center relative z-10">
        {/* Hero */}
        <div className="size-20 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="size-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          {isFullCompletion ? 'You\u2019re all set!' : 'Great start!'}
        </h1>
        <p className="text-gray-500 mb-8">
          {isFullCompletion
            ? 'Your AI literacy foundation is in place. Here\u2019s what you accomplished:'
            : 'Here\u2019s what you\u2019ve done so far \u2014 you can pick up where you left off anytime.'}
        </p>

        {/* Summary cards */}
        <div className="space-y-3 mb-10 text-left">
          {stanceLabel && stanceColor && (
            <SummaryCard
              icon={Compass}
              label="Your AI stance"
              value={stanceLabel}
              color={stanceColor}
            />
          )}
          {policyName && (
            <SummaryCard
              icon={FileText}
              label="Course policy"
              value={policyName}
              color="bg-amber-50 text-amber-600"
            />
          )}
          {!policyName && stance && (
            <SummaryCard
              icon={FileText}
              label="Course policy"
              value="Generated"
              color="bg-amber-50 text-amber-600"
            />
          )}
          {scanCount && Number(scanCount) > 0 && (
            <SummaryCard
              icon={PenTool}
              label="Assignments scanned"
              value={`${scanCount} assignment${Number(scanCount) !== 1 ? 's' : ''}`}
              color="bg-red-50 text-red-600"
            />
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          {!isFullCompletion && (
            <Link
              href="/ai-literacy"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0033A0] text-white rounded-lg font-semibold hover:bg-[#002880] transition-colors"
            >
              <Compass className="size-4" />
              Continue setup
            </Link>
          )}
          {hasPolicy && (
            <Link
              href="/ai-literacy/policy"
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                isFullCompletion
                  ? 'bg-[#0033A0] text-white hover:bg-[#002880]'
                  : 'border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="size-4" />
              View your policy
            </Link>
          )}
          <Link
            href="/ai-literacy/assignments"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Search className="size-4" />
            {hasScan ? 'Scan another assignment' : 'Scan an assignment'}
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Home className="size-4" />
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
