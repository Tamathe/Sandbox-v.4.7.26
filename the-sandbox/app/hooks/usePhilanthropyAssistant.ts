'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../lib/auth-context'
import type { ChatMessage } from '../lib/types'
import type {
  PhilanthropyPhase,
  Business,
  CampaignFormData,
  PhilanthropyPreflight,
  ContactStatus,
  OutreachTab,
  EmailContent,
} from '../lib/philanthropy/types'
import { LOADING_MESSAGES } from '../lib/philanthropy/types'

const MAX_SELECTED = 5

const INITIAL_FORM: CampaignFormData = {
  organization: '',
  donationType: [],
  otherDonationType: '',
  philanthropy: '',
  eventName: '',
  eventDate: '',
  desiredItems: [],
  otherItems: '',
  city: 'Lexington, KY',
}

export function usePhilanthropyAssistant() {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<PhilanthropyPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Phase
  const [phase, setPhase] = useState<PhilanthropyPhase>('form')

  // Form
  const [form, setForm] = useState<CampaignFormData>(INITIAL_FORM)

  // Business results
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinesses, setSelectedBusinesses] = useState<Business[]>([])

  // Outreach materials
  const [scripts, setScripts] = useState<Record<string, string>>({})
  const [emails, setEmails] = useState<Record<string, EmailContent>>({})
  const [followups, setFollowups] = useState<Record<string, EmailContent>>({})
  const [contactStatus, setContactStatus] = useState<Record<string, ContactStatus>>({})
  const [activeTabs, setActiveTabs] = useState<Record<string, OutreachTab>>({})
  const [openAccordion, setOpenAccordion] = useState<number | null>(0)

  // Loading state
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0])
  const [generatingContent, setGeneratingContent] = useState<string | null>(null) // business name being generated
  const [error, setError] = useState<string | null>(null)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Preflight fetch
  useEffect(() => {
    if (!currentUser?.email) return
    async function load() {
      try {
        const res = await fetch('/api/philanthropy/preflight', {
          headers: { 'x-demo-user-email': currentUser!.email },
        })
        if (res.ok) {
          const data = await res.json()
          setPreflight(data)
        }
      } catch {
        // preflight is optional — proceed without it
      } finally {
        setIsPreflightLoading(false)
      }
    }
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- currentUser object reference changes on every render
  }, [currentUser?.email])

  // Rotating loading messages
  useEffect(() => {
    if (phase !== 'generating') {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
      return
    }
    let idx = 0
    loadingIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length
      setLoadingMessage(LOADING_MESSAGES[idx])
    }, 2500)
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
    }
  }, [phase])

  // Form update
  const updateForm = useCallback((update: Partial<CampaignFormData>) => {
    setForm((prev) => ({ ...prev, ...update }))
  }, [])

  // Validate + submit form → generate businesses
  const submitForm = useCallback(async () => {
    if (!form.organization.trim()) {
      setError('Please enter your organization name.')
      return
    }
    if (form.donationType.length === 0) {
      setError('Please select at least one donation type.')
      return
    }
    if (!form.philanthropy.trim()) {
      setError('Please describe your philanthropy focus.')
      return
    }
    if (!form.city.trim()) {
      setError('Please enter your city.')
      return
    }

    setError(null)
    setPhase('generating')
    setIsGenerating(true)
    setLoadingMessage(LOADING_MESSAGES[0])

    // Resolve "Other" donation type
    const resolvedTypes = form.donationType.map((t) =>
      t === 'Other' && form.otherDonationType.trim() ? form.otherDonationType.trim() : t,
    )

    try {
      const res = await fetch('/api/philanthropy/generate-businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser?.email || '',
        },
        body: JSON.stringify({ ...form, donationType: resolvedTypes }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate businesses')
      }

      const data = await res.json()
      setBusinesses(data.businesses)
      setSelectedBusinesses([])
      setPhase('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('form')
    } finally {
      setIsGenerating(false)
    }
  }, [form, currentUser?.email])

  // Toggle business selection
  const toggleBusiness = useCallback(
    (biz: Business) => {
      setSelectedBusinesses((prev) => {
        const exists = prev.some((b) => b.name === biz.name)
        if (exists) return prev.filter((b) => b.name !== biz.name)
        if (prev.length >= MAX_SELECTED) return prev
        return [...prev, biz]
      })
    },
    [],
  )

  // Phase navigation
  const goToForm = useCallback(() => {
    setPhase('form')
    setError(null)
  }, [])

  const goToResults = useCallback(() => {
    setPhase('results')
  }, [])

  const goToOutreach = useCallback(() => {
    setPhase('outreach')
    setOpenAccordion(0)
  }, [])

  const startOver = useCallback(() => {
    setForm(INITIAL_FORM)
    setBusinesses([])
    setSelectedBusinesses([])
    setScripts({})
    setEmails({})
    setFollowups({})
    setContactStatus({})
    setActiveTabs({})
    setOpenAccordion(null)
    setError(null)
    setPhase('form')
  }, [])

  // Outreach helpers
  const updateContactStatus = useCallback((bizName: string, status: ContactStatus) => {
    setContactStatus((prev) => ({ ...prev, [bizName]: status }))
  }, [])

  const switchTab = useCallback((bizName: string, tab: OutreachTab) => {
    setActiveTabs((prev) => ({ ...prev, [bizName]: tab }))
  }, [])

  const toggleAccordion = useCallback((idx: number) => {
    setOpenAccordion((prev) => (prev === idx ? null : idx))
  }, [])

  // Generate content (script, email, followup)
  const generateOutreachContent = useCallback(
    async (biz: Business, type: OutreachTab) => {
      setGeneratingContent(biz.name)
      setError(null)

      const resolvedTypes = form.donationType.map((t) =>
        t === 'Other' && form.otherDonationType.trim() ? form.otherDonationType.trim() : t,
      )

      const commonBody = {
        organization: form.organization,
        donationType: resolvedTypes,
        philanthropy: form.philanthropy,
        eventName: form.eventName,
        eventDate: form.eventDate,
        desiredItems: form.desiredItems,
        city: form.city,
        business: biz,
      }

      const endpoints: Record<OutreachTab, string> = {
        phone: '/api/philanthropy/generate-script',
        email: '/api/philanthropy/generate-email',
        followup: '/api/philanthropy/generate-followup',
      }

      try {
        const res = await fetch(endpoints[type], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser?.email || '',
          },
          body: JSON.stringify(commonBody),
        })

        if (!res.ok) {
          throw new Error('Failed to generate content')
        }

        const data = await res.json()

        if (type === 'phone') {
          setScripts((prev) => ({ ...prev, [biz.name]: data.script }))
        } else if (type === 'email') {
          setEmails((prev) => ({ ...prev, [biz.name]: data }))
        } else {
          setFollowups((prev) => ({ ...prev, [biz.name]: data }))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate content')
      } finally {
        setGeneratingContent(null)
      }
    },
    [form, currentUser?.email],
  )

  // ── Sandy Interview Chat ──────────────────────────────────────────────────

  const [sandyMessages, setSandyMessages] = useState<ChatMessage[]>([])
  const [sandyChips, setSandyChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)
  const msgIdRef = useRef(0)
  const nextMsgId = () => `msg-${++msgIdRef.current}`

  // Extract chips from Sandy's streamed response
  function extractChips(text: string): string[] {
    const match = text.match(/<!--CHIPS:\[(.*?)\]-->/)
    if (!match) return []
    try { return JSON.parse(`[${match[1]}]`) } catch { return [] }
  }

  // Extract phase transition markers
  function extractPhase(text: string): PhilanthropyPhase | null {
    const match = text.match(/<!--PHASE:([\w-]+)-->/)
    return match ? (match[1] as PhilanthropyPhase) : null
  }

  // Strip markers from visible text
  function stripMarkers(text: string): string {
    return text
      .replace(/<!--CHIPS:\[.*?\]-->/g, '')
      .replace(/<!--PHASE:[\w-]+-->/g, '')
      .trim()
  }

  // Initial Sandy greeting
  useEffect(() => {
    if (!preflight || sandyMessages.length > 0) return
    const greeting = preflight.pastCampaignCount > 0
      ? `Welcome back! You've run ${preflight.pastCampaignCount} campaign${preflight.pastCampaignCount > 1 ? 's' : ''} before — nice. Ready to start another one? What organization is this for?`
      : `Hey ${preflight.user.name.split(' ')[0]}! I'm Sandy, and I'm here to help you run a philanthropy outreach campaign. Let's start — what's your organization name?`
    setSandyMessages([{ id: nextMsgId(), role: 'assistant', content: greeting }])
  }, [preflight, sandyMessages.length])

  const sendSandyMessage = useCallback(async (text: string) => {
    if (!preflight || isSandyTyping) return

    const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
    const allMessages = [...sandyMessages, userMsg]
    setSandyMessages(allMessages)
    setIsSandyTyping(true)
    setSandyChips([])

    const assistantId = nextMsgId()
    setSandyMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/philanthropy/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser?.email || '',
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            preflight,
            phase,
            form,
            businessCount: businesses.length,
            selectedCount: selectedBusinesses.length,
          },
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = new TextDecoder().decode(value)
        full += chunk
        const visible = stripMarkers(full)
        setSandyMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: visible } : m)
        )
      }

      // Parse markers from full response
      const chips = extractChips(full)
      if (chips.length) setSandyChips(chips)

      const newPhase = extractPhase(full)
      if (newPhase === 'generating') {
        // Sandy confirmed the form — trigger business generation
        void submitForm()
      }
    } catch {
      setSandyMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: 'Sorry, I had trouble responding. Try again?' }
          : m)
      )
    } finally {
      setIsSandyTyping(false)
    }
  }, [preflight, isSandyTyping, sandyMessages, currentUser?.email, phase, form, businesses.length, selectedBusinesses.length, submitForm])

  const selectSandyChip = useCallback((chip: string) => {
    setSandyChips([])
    void sendSandyMessage(chip)
  }, [sendSandyMessage])

  const resetSandy = useCallback(() => {
    setSandyMessages([])
    setSandyChips([])
    msgIdRef.current = 0
  }, [])

  // Save campaign to DB
  const saveCampaign = useCallback(async () => {
    if (!currentUser?.email || businesses.length === 0) return

    try {
      await fetch('/api/philanthropy/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          ...form,
          businesses,
          selectedBusinesses,
          scripts,
          emails,
          followups,
          contactStatus,
        }),
      })
    } catch {
      // silent — save is best-effort
    }
  }, [currentUser?.email, form, businesses, selectedBusinesses, scripts, emails, followups, contactStatus])

  // Auto-save when entering outreach phase
  useEffect(() => {
    if (phase === 'outreach' && selectedBusinesses.length > 0) {
      void saveCampaign()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return {
    // Preflight
    preflight,
    isPreflightLoading,

    // Phase
    phase,

    // Form
    form,
    updateForm,
    submitForm,

    // Business results
    businesses,
    selectedBusinesses,
    toggleBusiness,

    // Outreach
    scripts,
    emails,
    followups,
    contactStatus,
    activeTabs,
    openAccordion,
    updateContactStatus,
    switchTab,
    toggleAccordion,
    generateOutreachContent,
    generatingContent,

    // Loading / error
    isGenerating,
    loadingMessage,
    error,
    setError,

    // Sandy interview
    sandyMessages,
    sandyChips,
    isSandyTyping,
    sendSandyMessage,
    selectSandyChip,
    resetSandy,

    // Persistence
    saveCampaign,

    // Navigation
    goToForm,
    goToResults,
    goToOutreach,
    startOver,
  }
}
