'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Phone, Star, Users, X, UserPlus, BookOpen, Hammer, Gamepad2, Compass, Flame, ArrowRight } from 'lucide-react'
import { usePresence, SandboxMode } from '../lib/presence-context'
import { useAuth, DEMO_USERS } from '../lib/auth-context'
import { SANDCASTLE_EXPERIENCES } from '../lib/sandcastle'

const TRENDING_SLUGS = ['the-bracket', 'solve-the-murder', 'uk-trivia', 'book-club']
const trendingExperiences = SANDCASTLE_EXPERIENCES.filter(
  (e) => TRENDING_SLUGS.includes(e.slug) && e.status === 'live'
)

// ── Mode helpers ─────────────────────────────────────────────────

const MODE_CONFIG: Record<
  NonNullable<SandboxMode>,
  { label: string; dotClass: string; icon: React.ReactNode }
> = {
  learn: {
    label: 'Learning',
    dotClass: 'bg-red-500',
    icon: <BookOpen className="w-3 h-3" />,
  },
  build: {
    label: 'Building',
    dotClass: 'bg-purple-500',
    icon: <Hammer className="w-3 h-3" />,
  },
  live: {
    label: 'Live',
    dotClass: 'bg-green-500',
    icon: <Gamepad2 className="w-3 h-3" />,
  },
  explore: {
    label: 'Exploring',
    dotClass: 'bg-blue-400',
    icon: <Compass className="w-3 h-3" />,
  },
}

function ModeDot({ mode }: { mode: SandboxMode }) {
  if (!mode) return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white flex-shrink-0" />
  const cfg = MODE_CONFIG[mode]
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full border-2 border-white flex-shrink-0 ${cfg.dotClass}`}
      title={cfg.label}
    />
  )
}

function ModeTag({ mode }: { mode: SandboxMode }) {
  if (!mode) return <span className="text-[10px] text-gray-400">Away</span>
  const cfg = MODE_CONFIG[mode]
  return (
    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${
      mode === 'learn' ? 'text-red-500' :
      mode === 'build' ? 'text-purple-500' :
      mode === 'live' ? 'text-green-500' :
      'text-blue-500'
    }`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className={`rounded-full bg-[#0033A0] flex items-center justify-center text-white font-semibold flex-shrink-0 ${
        size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
      }`}
    >
      {initials}
    </div>
  )
}

export default function PresenceWidget() {
  const { currentUser } = useAuth()
  const {
    onlineUsers,
    contacts,
    callState,
    currentMode,
    callUser,
    addContact,
    removeContact,
  } = usePresence()

  const [open, setOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addError, setAddError] = useState('')

  // Hidden entirely while in Learn mode
  if (currentMode === 'learn') return null

  const allKnownUsers: Array<{ email: string; name: string }> = DEMO_USERS.filter(
    (u) => u.email !== currentUser.email
  )
  const knownEmails = new Set(allKnownUsers.map((u) => u.email))
  onlineUsers.forEach((u) => {
    if (!knownEmails.has(u.email)) allKnownUsers.push({ email: u.email, name: u.name })
  })

  const getOnlineUser = (email: string) =>
    onlineUsers.find((u) => u.email === email && Date.now() - u.lastSeen < 90_000)

  const isOnline = (email: string) => !!getOnlineUser(email)
  const isContact = (email: string) => contacts.includes(email)
  const isBusy = callState !== 'idle'

  // Count online users not in Learn mode (available to contact)
  const availableOnline = onlineUsers.filter(
    (u) => Date.now() - u.lastSeen < 90_000 && u.mode !== 'learn'
  )

  const handleAddContact = () => {
    setAddError('')
    const trimmed = addEmail.trim().toLowerCase()
    if (!trimmed) return
    if (trimmed === currentUser.email) { setAddError("That's you."); return }
    addContact(trimmed)
    setAddEmail('')
    setShowAddForm(false)
  }

  const renderUser = (user: { email: string; name: string }) => {
    const online = getOnlineUser(user.email)
    const mode = online?.mode ?? null
    const isLearning = mode === 'learn'
    const canCall = !!online && !isLearning && !isBusy
    const starred = isContact(user.email)

    return (
      <div
        key={user.email}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="relative flex-shrink-0">
          <UserAvatar name={user.name} />
          <span className="absolute -bottom-0.5 -right-0.5">
            <ModeDot mode={online ? mode : null} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{user.name}</div>
          {online ? (
            <ModeTag mode={mode} />
          ) : (
            <span className="text-[10px] text-gray-400">Offline</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {canCall && (
            <button
              onClick={() => callUser(user.email, user.name)}
              className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
              title={`Call ${user.name}`}
            >
              <Phone className="w-3.5 h-3.5 text-white" />
            </button>
          )}
          {isLearning && (
            <span
              className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center"
              title="In Learn mode — unavailable"
            >
              <BookOpen className="w-3.5 h-3.5 text-red-400" />
            </span>
          )}
          <button
            onClick={() => (starred ? removeContact(user.email) : addContact(user.email))}
            className={`w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors ${
              starred ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'
            }`}
            title={starred ? 'Remove from contacts' : 'Add to contacts'}
          >
            <Star className={`w-3.5 h-3.5 ${starred ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-4 z-50 flex flex-col items-start gap-2">
      {/* Expanded panel */}
      {open && (
        <div className="w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #0033A0 0%, #1a4db5 100%)' }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">Sandbox Live</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="px-4 py-2 flex flex-wrap gap-x-3 gap-y-1 border-b border-gray-100 bg-gray-50">
            {(Object.entries(MODE_CONFIG) as [NonNullable<SandboxMode>, typeof MODE_CONFIG[NonNullable<SandboxMode>]][]).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                {cfg.label}
              </span>
            ))}
          </div>

          {/* Happening Now */}
          <div className="border-b border-gray-100">
            <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Happening Now</span>
            </div>
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              {trendingExperiences.map((exp) => {
                const playersInLive = onlineUsers.filter(
                  (u) => u.mode === 'live' && Date.now() - u.lastSeen < 90_000
                ).length
                return (
                  <Link
                    key={exp.slug}
                    href={`/sandcastle/${exp.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-orange-50 transition-colors group"
                  >
                    {exp.image ? (
                      <Image src={exp.image} alt={exp.title} width={32} height={23} className="rounded flex-shrink-0" />
                    ) : (
                      <span className="text-xl flex-shrink-0 w-8 text-center">{exp.emoji}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate group-hover:text-orange-700 transition-colors">
                        {exp.title}
                      </div>
                      {playersInLive > 0 ? (
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {playersInLive} playing now
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-400">{exp.tagline}</div>
                      )}
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-orange-500 flex-shrink-0 transition-colors" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User list */}
          <div className="max-h-72 overflow-y-auto">
            {allKnownUsers.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Open in another tab and<br />switch users to see presence
              </div>
            ) : (
              <>
                {/* Contacts first */}
                {contacts.length > 0 && allKnownUsers.some((u) => isContact(u.email)) && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                      Contacts
                    </div>
                    {allKnownUsers.filter((u) => isContact(u.email)).map(renderUser)}
                  </>
                )}

                {/* Everyone else */}
                {allKnownUsers.some((u) => !isContact(u.email)) && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                      {contacts.length > 0 ? 'Others' : 'People'}
                    </div>
                    {allKnownUsers.filter((u) => !isContact(u.email)).map(renderUser)}
                  </>
                )}
              </>
            )}
          </div>

          {/* Add contact */}
          {showAddForm ? (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
                autoFocus
              />
              {addError && <p className="text-red-500 text-xs">{addError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddContact}
                  className="flex-1 text-xs font-semibold bg-[#0033A0] text-white rounded-lg py-2 hover:bg-blue-800 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddEmail(''); setAddError('') }}
                  className="flex-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg py-2 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-[#0033A0] transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add contact by email
              </button>
            </div>
          )}

          {/* Your status footer */}
          <div className="px-4 py-2.5 flex items-center gap-2 border-t border-gray-100 bg-gray-50">
            <div className="relative flex-shrink-0">
              <UserAvatar name={currentUser.name} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5">
                <ModeDot mode={currentMode} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-gray-700 truncate">{currentUser.name}</div>
              <ModeTag mode={currentMode} />
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: isBusy ? '#16a34a' : 'linear-gradient(135deg, #0033A0 0%, #1a4db5 100%)' }}
        title="Sandbox Live — see who's online"
      >
        <Users className="w-5 h-5 text-white" />
        {availableOnline.length > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
            {availableOnline.length}
          </span>
        )}
        {availableOnline.length > 0 && !isBusy && !open && (
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" />
        )}
      </button>
    </div>
  )
}
