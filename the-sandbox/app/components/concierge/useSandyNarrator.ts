import { useState, useRef, useCallback, useEffect } from 'react'
import type { Message } from './concierge-utils'

const NARRATOR_ACT_KEY = 'uky-narrator-act'
const VISITED_ACTS_KEY = 'uky-narrator-visited-acts'
const NARRATOR_GREETED_KEY = 'uky-narrator-greeted'

const ACT_TRANSITION_MESSAGES: Record<number, { text: string; raw: string }> = {
  1: {
    text: 'This is where the magic starts. Type any topic and watch the AI build a tool.',
    raw: 'This is where the magic starts. Type any topic and watch the AI build a tool.\n<!--ACTION:{"type":"navigate","href":"/builder","label":"Open the Builder"}-->',
  },
  2: {
    text: 'Now imagine scaling that across an entire semester. This is the Course Map.',
    raw: 'Now imagine scaling that across an entire semester. This is the Course Map.\n<!--ACTION:{"type":"navigate","href":"/courses","label":"Explore Course Map"}-->',
  },
  3: {
    text: "This is the student's world. Everything you just built — they see it here.",
    raw: 'This is the student\'s world. Everything you just built — they see it here.\n<!--ACTION:{"type":"switch-user","email":"tiana.the.student@uky.edu","label":"Switch to Student View"}-->',
  },
  4: {
    text: "Here's where it all comes together — real data from every interaction.",
    raw: 'Here\'s where it all comes together — real data from every interaction.\n<!--ACTION:{"type":"switch-user","email":"heath.price@uky.edu","label":"Switch Back to Admin"}-->',
  },
  5: {
    text: "And this is just a taste of what's been built on the platform.",
    raw: 'And this is just a taste of what\'s been built on the platform.\n<!--ACTION:{"type":"navigate","href":"/hub?tab=tools","label":"Browse All Tools"}-->',
  },
}

function inferAct(path: string): number {
  if (path.startsWith('/build') || path.startsWith('/builder')) return 1
  if (path.startsWith('/courses')) return 2
  if (path.startsWith('/tools/') || path === '/' || path.startsWith('/constellation') || path.startsWith('/advisor') || path.startsWith('/exam-forge') || path.startsWith('/teach-back')) return 3
  if (path.startsWith('/analytics') || path.startsWith('/admin')) return 4
  if (path.startsWith('/hub') || path.startsWith('/playground') || path.startsWith('/sandcastle') || path.startsWith('/bounties')) return 5
  return 0
}

interface UseSandyNarratorOptions {
  evaluatorMode: boolean
  pathname: string
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setRawMessages: React.Dispatch<React.SetStateAction<Map<string, string>>>
  setOpen: (open: boolean) => void
  setMobileOpen: (open: boolean) => void
  setCompact: (compact: boolean) => void
  setPanelMode: (mode: 'sandy' | 'messages') => void
}

export function useSandyNarrator({
  evaluatorMode,
  pathname,
  setMessages,
  setRawMessages,
  setOpen,
  setMobileOpen,
  setCompact,
  setPanelMode,
}: UseSandyNarratorOptions) {
  const [narratorAct, setNarratorAct] = useState<number>(() => {
    if (!evaluatorMode) return 0
    if (typeof window === 'undefined') return 0
    try {
      const stored = localStorage.getItem(NARRATOR_ACT_KEY)
      return stored ? parseInt(stored, 10) : 0
    } catch { return 0 }
  })

  const [visitedActs, setVisitedActs] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem(VISITED_ACTS_KEY)
      return stored ? new Set(JSON.parse(stored) as number[]) : new Set()
    } catch { return new Set() }
  })

  const previousActRef = useRef<number>(narratorAct)

  const markActVisited = useCallback((act: number) => {
    setVisitedActs(prev => {
      if (prev.has(act)) return prev
      const next = new Set(prev)
      next.add(act)
      try { localStorage.setItem(VISITED_ACTS_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  // Update act when pathname changes in evaluator mode
  useEffect(() => {
    if (!evaluatorMode) return
    const inferred = inferAct(pathname)
    if (inferred > 0) {
      setNarratorAct(inferred)
      try { localStorage.setItem(NARRATOR_ACT_KEY, String(inferred)) } catch {}
    }
  }, [pathname, evaluatorMode])

  // Act-transition detection: inject synthetic narrator message when act changes
  useEffect(() => {
    if (!evaluatorMode) return
    if (narratorAct === 0) return
    const prevAct = previousActRef.current
    previousActRef.current = narratorAct

    markActVisited(narratorAct)

    if (prevAct === narratorAct) return
    const seenKey = `uky-narrator-act-${narratorAct}-seen`
    try {
      if (sessionStorage.getItem(seenKey)) return
      sessionStorage.setItem(seenKey, '1')
    } catch { return }

    const transition = ACT_TRANSITION_MESSAGES[narratorAct]
    if (!transition) return

    const msgId = `narrator-act-${narratorAct}-${Date.now()}`
    const syntheticMsg: Message = {
      id: msgId,
      role: 'assistant',
      content: transition.text,
    }
    setMessages(prev => [...prev, syntheticMsg])
    setRawMessages(prev => new Map(prev).set(msgId, transition.raw))

    setOpen(true)
    setMobileOpen(true)
    setPanelMode('sandy')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluatorMode, narratorAct, markActVisited])

  // Narrator greeting on first evaluator visit
  useEffect(() => {
    if (!evaluatorMode) return
    try {
      if (sessionStorage.getItem(NARRATOR_GREETED_KEY)) return
      sessionStorage.setItem(NARRATOR_GREETED_KEY, '1')
    } catch { return }

    setOpen(true)
    setMobileOpen(true)
    setCompact(false)
    setPanelMode('sandy')

    const greetingMsg: Message = {
      id: `narrator-greeting-${Date.now()}`,
      role: 'assistant',
      content: 'Welcome — this is the AI platform that lets any faculty member build learning tools in minutes, no code required. Ready to see it in action?',
    }
    setMessages([greetingMsg])
    setRawMessages(new Map([[greetingMsg.id, greetingMsg.content + '\n<!--ACTION:{"type":"navigate","href":"/build","label":"Build Your First AI Tool"}-->']]))
  }, [evaluatorMode, setMessages, setRawMessages, setOpen, setMobileOpen, setCompact, setPanelMode])

  return { narratorAct, visitedActs }
}
