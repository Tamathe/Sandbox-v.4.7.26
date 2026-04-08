'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { WellnessHubPreflight } from '../lib/wellness-hub-preflight'
import {
  extractChips,
  extractPhase,
  type WellnessToolSlug,
  type WellnessInterviewState,
} from '../lib/wellness-hub-elevation-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: WellnessInterviewState = {
  phase: 'greeting',
  mood: null,
  energy: null,
  exercise: null,
  notes: null,
  completedHabits: [],
  sleepQuality: null,
  hoursSlept: null,
  bedtime: null,
  wakeTime: null,
  symptoms: [],
  severity: null,
  triggers: [],
}

const TOOL_GREETINGS: Record<WellnessToolSlug, (pf: WellnessHubPreflight) => { message: string; chips: string[] }> = {
  mindfulness: (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    if (pf.todayEntry) {
      return {
        message: `Hey ${firstName}! You already checked in today. Want to update anything or check your trends?`,
        chips: ['Check my trends', 'Update today\'s entry', 'Analyze my patterns'],
      }
    }
    if (pf.yesterdayEntry) {
      const yData = pf.yesterdayEntry.data as Record<string, unknown>
      const yMood = yData.mood ? ` Yesterday you were feeling ${Number(yData.mood) >= 7 ? 'good' : Number(yData.mood) <= 4 ? 'a bit rough' : 'okay'}.` : ''
      return {
        message: `Hey ${firstName}!${yMood} How are you feeling today?`,
        chips: ['😞 Rough', '😕 Meh', '😐 Okay', '🙂 Good', '😊 Great'],
      }
    }
    return {
      message: `Hey ${firstName}! Welcome to your daily check-in. I'll ask a few quick questions — takes about 30 seconds. How are you feeling today?`,
      chips: ['😞 Rough', '😕 Meh', '😐 Okay', '🙂 Good', '😊 Great'],
    }
  },

  habits: (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    if (pf.todayEntry) {
      return {
        message: `Hey ${firstName}! You already checked in today. Want to update or check your patterns?`,
        chips: ['Update today', 'Show my patterns', 'Edit my habit list'],
      }
    }
    const lastData = pf.recentEntries[0]?.data as Record<string, unknown> | undefined
    const habits = (lastData?.habits as { name: string }[] | undefined)?.map((h) => h.name) ?? ['Exercise', 'Read 30 min', 'Drink 8 glasses water', 'Review notes', 'Meditate']
    const streakNote = pf.streak >= 3 ? ` ${pf.streak}-day streak! 🔥` : ''
    return {
      message: `Hey ${firstName}!${streakNote} What did you get done today?`,
      chips: [...habits.slice(0, 4), 'All of them! ✨'],
    }
  },

  sleep: (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    if (pf.todayEntry) {
      return {
        message: `Morning ${firstName}! You already logged your sleep today. Want to update or check patterns?`,
        chips: ['Update today', 'Show my sleep patterns', 'How does sleep affect my mood?'],
      }
    }
    return {
      message: `Morning ${firstName}! How'd you sleep last night?`,
      chips: ['😫 Terrible', '😴 Poor', '😐 Okay', '😊 Good', '🌟 Amazing'],
    }
  },

  journal: (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    if (pf.todayEntry) {
      return {
        message: `Hey ${firstName}! You already logged today. Want to update or check your symptom patterns?`,
        chips: ['Update today', 'Show my patterns', 'What triggers my symptoms most?'],
      }
    }
    return {
      message: `Hey ${firstName}! Anything bothering you today?`,
      chips: ['Yes, I have symptoms', 'No symptoms today! ✨'],
    }
  },
}

export function useWellnessHubTool(toolSlug: WellnessToolSlug) {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<WellnessHubPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Output (AI insight)
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Interview
  const [interviewState, setInterviewState] = useState<WellnessInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  // Entry saved flag
  const [entrySaved, setEntrySaved] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Stream helper ──────────────────────────────────────────────────────

  const streamFetch = useCallback(
    async (url: string, body: unknown, onChunk: (text: string) => void): Promise<string> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`Request failed: ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        onChunk(chunk)
      }

      return full
    },
    [currentUser.email],
  )

  // ── Preflight ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/wellness-hub/${toolSlug}/preflight`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: WellnessHubPreflight = await res.json()
        if (!cancelled) {
          setPreflight(data)
          setIsPreflightLoading(false)
        }
      } catch {
        if (!cancelled) setIsPreflightLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser.email, toolSlug])

  // ── Sandy greeting ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!preflight || messages.length > 0) return

    const greeting = TOOL_GREETINGS[toolSlug](preflight)
    setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting.message }])
    setChips(greeting.chips)
    setInterviewState((prev) => ({ ...prev, phase: 'interviewing' }))
  }, [preflight, messages.length, toolSlug, nextMsgId])

  // ── Save entry to DB ───────────────────────────────────────────────────

  const saveEntry = useCallback(
    async (state: WellnessInterviewState) => {
      try {
        let data: Record<string, unknown> = {}

        switch (toolSlug) {
          case 'mindfulness':
            data = { mood: state.mood, energy: state.energy, exercise: state.exercise, notes: state.notes }
            break
          case 'habits':
            data = {
              habits: (preflight?.recentEntries[0]?.data as Record<string, unknown> | undefined)?.habits
                ?? [
                  { name: 'Exercise', completed: false },
                  { name: 'Read 30 min', completed: false },
                  { name: 'Drink 8 glasses water', completed: false },
                  { name: 'Review notes', completed: false },
                  { name: 'Meditate', completed: false },
                ],
              notes: state.notes,
            }
            // Mark completed habits
            if (Array.isArray(data.habits)) {
              data.habits = (data.habits as { name: string; completed: boolean }[]).map((h) => ({
                ...h,
                completed: state.completedHabits.includes(h.name),
              }))
            }
            break
          case 'sleep':
            data = {
              hoursSlept: state.hoursSlept,
              quality: state.sleepQuality,
              bedtime: state.bedtime,
              wakeTime: state.wakeTime,
              notes: state.notes,
            }
            break
          case 'journal':
            data = {
              symptoms: state.symptoms,
              severity: state.severity,
              triggers: state.triggers,
              notes: state.notes,
            }
            break
        }

        await fetch('/api/wellness-hub/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({ toolSlug, data }),
        })

        setEntrySaved(true)
      } catch {
        // Non-fatal
      }
    },
    [toolSlug, currentUser.email, preflight],
  )

  // ── Send message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!preflight || isSandyTyping) return

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setChips([])
      setIsSandyTyping(true)

      try {
        const assistantId = nextMsgId()
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        const fullResponse = await streamFetch(
          `/api/wellness-hub/${toolSlug}/interview`,
          {
            toolSlug,
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            preflight,
            interviewState,
          },
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            )
          },
        )

        const newChips = extractChips(fullResponse)
        const newPhase = extractPhase(fullResponse)

        if (newChips.length > 0) setChips(newChips)
        if (newPhase) {
          setInterviewState((prev) => ({ ...prev, phase: newPhase }))

          if (newPhase === 'generate' || newPhase === 'complete') {
            // Save entry first, then generate insight
            await saveEntry(interviewState)
            void triggerGeneration()
          }
        }
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, messages, interviewState, toolSlug, nextMsgId, streamFetch, saveEntry],
  )

  const selectChip = useCallback(
    (chip: string) => {
      // Parse emoji chips into interview state updates
      const updated = { ...interviewState }

      // Mindfulness mood parsing
      if (chip.includes('Rough')) updated.mood = 2
      else if (chip.includes('Meh')) updated.mood = 4
      else if (chip === '😐 Okay') updated.mood = 5
      else if (chip.includes('Good') && !chip.includes('no notes')) updated.mood = 7
      else if (chip.includes('Great')) updated.mood = 9

      // Energy parsing
      if (chip.includes('Running on empty')) updated.energy = 2
      else if (chip.includes('Getting by')) updated.energy = 5
      else if (chip.includes('Solid energy')) updated.energy = 7
      else if (chip.includes('Fully charged')) updated.energy = 9

      // Exercise parsing
      if (['None', 'Light walk', 'Moderate workout', 'Intense workout'].includes(chip)) updated.exercise = chip

      // Sleep quality parsing
      if (chip.includes('Terrible')) updated.sleepQuality = 'Poor'
      else if (chip === '😴 Poor') updated.sleepQuality = 'Poor'
      else if (chip === '😐 Okay' && toolSlug === 'sleep') updated.sleepQuality = 'Fair'
      else if (chip === '😊 Good' && toolSlug === 'sleep') updated.sleepQuality = 'Good'
      else if (chip.includes('Amazing')) updated.sleepQuality = 'Great'

      // Sleep hours parsing
      if (chip === '< 5 hours') updated.hoursSlept = 4.5
      else if (chip === '5-6 hours') updated.hoursSlept = 5.5
      else if (chip === '6-7 hours') updated.hoursSlept = 6.5
      else if (chip === '7-8 hours') updated.hoursSlept = 7.5
      else if (chip === '8+ hours') updated.hoursSlept = 8.5

      // Bedtime/wake parsing
      if (chip.startsWith('Before 10')) updated.bedtime = '~9:30pm'
      else if (chip.includes('10-11')) updated.bedtime = '~10:30pm'
      else if (chip.includes('11pm-12')) updated.bedtime = '~11:30pm'
      else if (chip.includes('midnight-1')) updated.bedtime = '~12:30am'
      else if (chip === 'After 1am') updated.bedtime = '~1:30am'

      if (chip.startsWith('Before 6')) updated.wakeTime = '~5:30am'
      else if (chip.includes('6-7am')) updated.wakeTime = '~6:30am'
      else if (chip.includes('7-8am')) updated.wakeTime = '~7:30am'
      else if (chip.includes('8-9am')) updated.wakeTime = '~8:30am'
      else if (chip === 'After 9am') updated.wakeTime = '~9:30am'

      // Journal symptoms parsing
      const symptomOptions = ['Headache', 'Fatigue', 'Anxiety', 'Nausea', 'Back pain', 'Insomnia', 'Brain fog']
      if (symptomOptions.includes(chip)) {
        updated.symptoms = [...updated.symptoms, chip]
      }

      // Severity parsing
      if (chip.includes('Barely there')) updated.severity = 2
      else if (chip.includes('Noticeable')) updated.severity = 4
      else if (chip.includes('Uncomfortable')) updated.severity = 6
      else if (chip.includes('Bad') && chip.includes('😰')) updated.severity = 8
      else if (chip.includes('Severe')) updated.severity = 10

      // Trigger parsing
      const triggerOptions = ['Stress', 'Poor sleep', 'Skipped meal', 'Screen time', 'Weather', 'Caffeine']
      if (triggerOptions.includes(chip)) {
        updated.triggers = [...updated.triggers, chip]
      }

      // Habit completion parsing
      if (chip === 'All of them! ✨') {
        const lastData = preflight?.recentEntries[0]?.data as Record<string, unknown> | undefined
        const allHabits = (lastData?.habits as { name: string }[] | undefined)?.map((h) => h.name) ?? ['Exercise', 'Read 30 min', 'Drink 8 glasses water', 'Review notes', 'Meditate']
        updated.completedHabits = allHabits
      } else if (chip === 'None today') {
        updated.completedHabits = []
      } else {
        const lastData = preflight?.recentEntries[0]?.data as Record<string, unknown> | undefined
        const habitNames = (lastData?.habits as { name: string }[] | undefined)?.map((h) => h.name) ?? []
        if (habitNames.includes(chip)) {
          updated.completedHabits = [...updated.completedHabits, chip]
        }
      }

      // Notes from chips
      if (chip === 'Skip' || chip.includes('no notes') || chip.includes('Feeling good')) {
        updated.notes = null
      } else if (chip.includes('Stressed') || chip.includes('stress')) {
        updated.notes = chip
      }

      // "No symptoms" fast path
      if (chip === 'No symptoms today! ✨') {
        updated.symptoms = []
        updated.severity = 0
        updated.triggers = []
      }

      setInterviewState(updated)
      void sendMessage(chip)
    },
    [interviewState, sendMessage, toolSlug, preflight],
  )

  // ── Generate insight ───────────────────────────────────────────────────

  const triggerGeneration = useCallback(
    async () => {
      if (!preflight) return
      setIsGenerating(true)
      setOutput('')

      try {
        await streamFetch(
          `/api/wellness-hub/${toolSlug}/generate`,
          {
            toolSlug,
            mode: 'instant-draft',
            preflight,
            interviewState,
          },
          (chunk) => setOutput((prev) => prev + chunk),
        )
      } catch {
        // Keep what streamed
      } finally {
        setIsGenerating(false)
      }
    },
    [preflight, interviewState, toolSlug, streamFetch],
  )

  // ── Start over ─────────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setOutput('')
    setIsGenerating(false)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setIsSandyTyping(false)
    setEntrySaved(false)

    if (preflight) {
      const greeting = TOOL_GREETINGS[toolSlug](preflight)
      setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting.message }])
      setChips(greeting.chips)
      setInterviewState((prev) => ({ ...prev, phase: 'interviewing' }))
    }
  }, [preflight, toolSlug, nextMsgId])

  return {
    preflight,
    isPreflightLoading,
    output,
    isGenerating,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    entrySaved,
    sendMessage,
    selectChip,
    triggerGeneration,
    startOver,
  }
}
