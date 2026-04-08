'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, Compass, Hammer, Sparkles, Send, Brain, Shield, Database, BookMarked, Building2, MessageSquare, Target, FileText } from 'lucide-react'
import Image from 'next/image'
import { useAuth, DEMO_USERS, DemoUser } from '../lib/auth-context'
import { getUIMode, IS_PROFESSIONAL } from '../lib/ui-mode'

interface NavLink {
  href: string
  label: string
  always?: boolean
  roles?: string[]
}

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

export default function Header() {
  const { currentUser, setCurrentUser } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [userSand, setUserSand] = useState<number | null>(null)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [pendingChallengeCount, setPendingChallengeCount] = useState(0)
  const uiMode = getUIMode(currentUser.role)
  const isProfessionalUI = IS_PROFESSIONAL(uiMode)
  const sandLabel = currentUser.role === 'EDUCATOR' ? 'Credits' : 'Sand'

  useEffect(() => {
    fetch(`/api/xp?email=${encodeURIComponent(currentUser.email)}`)
      .then(r => r.json())
      .then(d => {
        if (d.sandBalance !== undefined) setUserSand(d.sandBalance)
      })
      .catch(() => {})
  }, [currentUser.email])

  useEffect(() => {
    let cancelled = false

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/messages/unread-count', {
          headers: {
            'x-demo-user-email': currentUser.email,
          },
        })

        if (!response.ok) return

        const data = await response.json()
        if (!cancelled && data.count !== undefined) {
          setUnreadMessageCount(data.count)
        }
      } catch {}
    }

    void fetchUnreadCount()
    const intervalId = window.setInterval(() => {
      void fetchUnreadCount()
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [currentUser.email])

  useEffect(() => {
    if (currentUser.role !== 'STUDENT') {
      setPendingChallengeCount(0)
      return
    }

    let cancelled = false

    const fetchChallenges = async () => {
      try {
        const response = await fetch('/api/challenges', {
          headers: {
            'x-demo-user-email': currentUser.email,
          },
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setPendingChallengeCount(Array.isArray(data.pending) ? data.pending.length : 0)
        }
      } catch {}
    }

    void fetchChallenges()
    const intervalId = window.setInterval(() => {
      void fetchChallenges()
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [currentUser.email, currentUser.role])

  const NAV_ITEMS: NavLink[] = [
    { href: '/', label: 'Home', always: true },
    { href: '/courses', label: 'Courses', always: true },
    { href: '/tools', label: 'Tools', always: true },
    { href: '/build', label: 'Build', always: true },
    { href: '/sandcastle', label: 'Live', always: true },
  ]

  const quickLinks = [
    { href: '/library', label: 'My Library', icon: BookMarked, roles: ['STUDENT'] },
    { href: '/builder', label: 'Open Builder', icon: Sparkles, always: true },
    { href: '/bounties', label: 'Bounties', icon: Hammer, always: true },
    { href: '/datasets', label: 'Datasets', icon: Database, always: true },
    { href: '/publish', label: 'Publish Tool', icon: Send, roles: ['EDUCATOR', 'ADMIN'] },
    { href: '/analytics/student', label: 'My Progress', icon: Compass, roles: ['STUDENT'] },
    { href: '/analytics/faculty', label: 'Analytics', icon: Compass, roles: ['EDUCATOR', 'ADMIN'] },
    { href: '/portfolio', label: 'My Portfolio', icon: FileText, always: true },
    { href: '/avatar', label: 'My Avatar', icon: Brain, roles: ['EDUCATOR', 'ADMIN'] },
    { href: '/service-bot', label: 'Service Bots', icon: Building2, roles: ['ADMIN'] },
    { href: '/admin', label: 'Admin Panel', icon: Shield, roles: ['ADMIN'] },
  ]

  const canSeeLink = (link: NavLink) => link.always || link.roles?.includes(currentUser.role)
  const visibleItems = NAV_ITEMS.filter(canSeeLink)
  const visibleQuickLinks = quickLinks.filter(
    (link) => link.always || (link.roles && link.roles.includes(currentUser.role))
  )

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const handleUserSwitch = (user: DemoUser) => {
    setCurrentUser(user)
    setUserDropdownOpen(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/"
              className="flex-shrink-0 rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] focus-visible:ring-offset-2"
              aria-label="Go to home"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white">
                <Image src="/cats-ai-logo-v2.png" alt="CATS-AI" width={192} height={192} className="object-contain w-full h-full" />
              </div>
            </Link>
            <Link href="/" className="flex flex-col">
              <div className="font-bold text-[#0033A0] text-xl leading-tight">The Sandbox</div>
              <div className="hidden text-[11px] text-gray-500 leading-tight font-medium tracking-widest uppercase sm:block">
                CATS-AI | UK
              </div>
              <div className="block sm:hidden text-[10px] text-gray-400 font-medium">
                {currentUser.role} VIEW
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setUserDropdownOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-[#0033A0] text-white'
                    : 'text-gray-600 hover:text-[#0033A0] hover:bg-blue-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {currentUser.role === 'STUDENT' && (
              <Link
                href="/library"
                className={`relative inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/library')
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="relative inline-flex">
                  <Target className="h-4 w-4" />
                  {pendingChallengeCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingChallengeCount}
                    </span>
                  )}
                </span>
                <span>Library</span>
              </Link>
            )}

            <Link
              href="/messages"
              className={`relative inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive('/messages')
                  ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="relative inline-flex">
                <MessageSquare className="h-4 w-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </span>
              <span>Messages</span>
            </Link>

            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm"
              >
                <div className="w-7 h-7 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800 text-xs leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{currentUser.role}</div>
                </div>
                {userSand !== null && (
                  <div className={`ml-1 rounded-full border px-2.5 py-1 ${
                    isProfessionalUI
                      ? 'border-slate-200 bg-slate-100'
                      : 'border-amber-200 bg-amber-100'
                  }`}>
                    <span className={`text-[10px] font-semibold ${
                      isProfessionalUI ? 'text-slate-600' : 'text-amber-700'
                    }`}>
                      {isProfessionalUI
                        ? `Balance: ${userSand.toLocaleString()} ${sandLabel}`
                        : `${userSand.toLocaleString()} ${sandLabel}`}
                    </span>
                  </div>
                )}
                <span className="hidden sm:inline-flex items-center text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">
                  Demo
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 ml-1" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Switch Demo User
                    </div>
                    {DEMO_USERS.map((user) => (
                      <button
                        key={user.email}
                        onClick={() => handleUserSwitch(user)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                          currentUser.email === user.email ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-800 text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${roleBadgeColors[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Quick Access
                    </div>
                    <div className="px-2 pb-2 space-y-1">
                      {visibleQuickLinks.map((link) => {
                        const Icon = link.icon
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setUserDropdownOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                              isActive(link.href)
                                ? 'bg-blue-50 text-[#0033A0]'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">{link.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-[#0033A0] text-white'
                    : 'text-gray-600 hover:text-[#0033A0] hover:bg-blue-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            {currentUser.role === 'STUDENT' && (
              <Link
                href="/library"
                onClick={() => setMobileOpen(false)}
                className={`mb-2 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive('/library')
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                    <Target className="h-4 w-4" />
                    {pendingChallengeCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {pendingChallengeCount}
                      </span>
                    )}
                  </span>
                  <span>Library</span>
                </span>
              </Link>
            )}

            <Link
              href="/messages"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive('/messages')
                  ? 'bg-blue-50 text-[#0033A0]'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                  <MessageSquare className="h-4 w-4" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </span>
                <span>Messages</span>
              </span>
            </Link>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Switch Demo User
            </div>
            <div className="space-y-1">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  onClick={() => {
                    handleUserSwitch(user)
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                    currentUser.email === user.email ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-800 text-sm">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role}</div>
                  </div>
                  {currentUser.email === user.email && (
                    <div className="w-2 h-2 rounded-full bg-[#0033A0]" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Quick Access
            </div>
            <div className="space-y-1">
              {visibleQuickLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(link.href)
                        ? 'bg-blue-50 text-[#0033A0]'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
