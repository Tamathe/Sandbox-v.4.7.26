'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../lib/auth-context'
import type {
  MatcherPhase,
  MatcherInterviewState,
  MatcherPreflight,
  ChatMessage,
  ClinicalTrial,
  TrialMatch,
  PatientProfile,
} from '../lib/clinical-trial-matcher/types'

const INITIAL_STATE: MatcherInterviewState = {
  phase: 'intake',
  patient: {},
}

export function useClinicalTrialMatcher() {
  const { currentUser } = useAuth()
  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }

  // Preflight
  const [preflight, setPreflight] = useState<MatcherPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Interview state
  const [phase, setPhase] = useState<MatcherPhase>('intake')
  const [interviewState, setInterviewState] = useState<MatcherInterviewState>(INITIAL_STATE)

  // Results
  const [searchResults, setSearchResults] = useState<ClinicalTrial[]>([])
  const [matches, setMatches] = useState<TrialMatch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isMatching, setIsMatching] = useState(false)

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgId = useRef(0)
  const nextId = () => String(++msgId.current)

  // ─── Preflight ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/clinical-trial-matcher/preflight', { headers: { 'x-demo-user-email': currentUser.email } })
      .then(r => r.ok ? r.json() : null)
      .then((data: MatcherPreflight | null) => {
        if (data) {
          setPreflight(data)
          const firstName = data.user.name.split(' ')[0]
          setMessages([{
            id: nextId(),
            role: 'assistant',
            content: `Hi ${firstName}! I'm Sandy, and I'll help you find matching clinical trials on ClinicalTrials.gov.\n\nI can search across all actively recruiting trials and score them against your patient's profile. To get started, tell me about the patient — what's the **primary condition or diagnosis**?`,
          }])
          setChips(['Lung cancer', 'Breast cancer', 'Type 2 diabetes', 'Upload clinical notes'])
        }
      })
      .catch(() => {})
      .finally(() => setIsPreflightLoading(false))
  }, [currentUser.email]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Stream helper ───────────────────────────────────────────────────────────

  const streamFetch = useCallback(
    async (url: string, body: unknown, onChunk: (text: string) => void): Promise<string> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
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
    [currentUser.email], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ─── Extract chips & phase from response ─────────────────────────────────────

  const extractChips = (text: string): string[] => {
    const match = text.match(/<!--CHIPS:\[(.*?)\]-->/)
    if (!match) return []
    try { return JSON.parse(`[${match[1]}]`) } catch { return [] }
  }

  const extractPhase = (text: string): MatcherPhase | null => {
    const match = text.match(/<!--PHASE:([\w-]+)-->/)
    return match ? (match[1] as MatcherPhase) : null
  }

  const stripMarkers = (text: string): string =>
    text.replace(/<!--CHIPS:\[.*?\]-->/g, '').replace(/<!--PHASE:[\w-]+-->/g, '').trim()

  // ─── Search & Match pipeline ─────────────────────────────────────────────────

  const runSearch = useCallback(async (patient: Partial<PatientProfile>) => {
    if (!patient.condition) return

    setIsSearching(true)
    setPhase('searching')

    try {
      const res = await fetch('/api/clinical-trial-matcher/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          condition: patient.condition,
          intervention: patient.priorTreatments?.join(', ') || undefined,
          age: patient.age,
          sex: patient.sex,
        }),
      })

      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      const trials: ClinicalTrial[] = data.trials ?? []
      setSearchResults(trials)

      if (!trials.length) {
        setMessages(prev => [...prev, {
          id: nextId(),
          role: 'assistant',
          content: `I searched ClinicalTrials.gov but didn't find any recruiting trials matching "${patient.condition}". Try broadening the condition or adjusting the criteria.`,
        }])
        setChips(['Try a different condition', 'Start over'])
        setPhase('intake')
        setIsSearching(false)
        return
      }

      // Now score them
      setIsSearching(false)
      setIsMatching(true)
      setPhase('matching')

      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: `Found **${trials.length} trials** on ClinicalTrials.gov. Now scoring eligibility against the patient profile...`,
      }])

      const matchRes = await fetch('/api/clinical-trial-matcher/match', {
        method: 'POST',
        headers,
        body: JSON.stringify({ trials, patient }),
      })

      if (!matchRes.ok) throw new Error('Matching failed')

      const matchData = await matchRes.json()
      const scored: TrialMatch[] = matchData.matches ?? []
      setMatches(scored)

      const newState: MatcherInterviewState = {
        phase: 'results',
        patient: patient as PatientProfile,
        searchResults: trials,
        matches: scored,
      }
      setInterviewState(newState)
      setPhase('results')
      setIsMatching(false)

      // Get Sandy to narrate results
      const sandyMsgId = nextId()
      setMessages(prev => [...prev, { id: sandyMsgId, role: 'assistant', content: '' }])
      setIsSandyTyping(true)

      const fullText = await streamFetch(
        '/api/clinical-trial-matcher/interview',
        {
          messages: [{ role: 'user', content: 'Present the results.' }],
          preflight,
          interviewState: newState,
        },
        (chunk) => {
          setMessages(prev =>
            prev.map(m => m.id === sandyMsgId ? { ...m, content: m.content + chunk } : m),
          )
        },
      )

      setMessages(prev =>
        prev.map(m => m.id === sandyMsgId ? { ...m, content: stripMarkers(fullText) } : m),
      )
      setChips(extractChips(fullText))
      setIsSandyTyping(false)
    } catch (err) {
      console.error('Search/match error:', err)
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: 'Something went wrong during the search. Please try again.',
      }])
      setChips(['Try again', 'Start over'])
      setIsSearching(false)
      setIsMatching(false)
      setPhase('intake')
    }
  }, [preflight, headers, streamFetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!preflight || isSandyTyping) return

    // Add user message
    setMessages(prev => [...prev, { id: nextId(), role: 'user', content: text }])

    // Handle special actions
    const lowerText = text.toLowerCase()

    if (lowerText === 'start new search' || lowerText === 'start over') {
      startOver()
      return
    }

    if (lowerText === 'search for trials' || lowerText === 'search for matching trials') {
      // Trigger search with current patient data
      await runSearch(interviewState.patient)
      return
    }

    if (lowerText === 'refine search') {
      setPhase('intake')
      setInterviewState(prev => ({ ...prev, phase: 'intake' }))
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: 'Sure! What would you like to change about the patient criteria?',
      }])
      setChips(['Change condition', 'Add biomarkers', 'Change age/sex'])
      return
    }

    // Check if user is selecting a trial to deep-dive
    const nctMatch = text.match(/NCT\d+/i)
    if (nctMatch && phase === 'results') {
      const nctId = nctMatch[0].toUpperCase()
      const newState = { ...interviewState, phase: 'deep-dive' as MatcherPhase, selectedTrialId: nctId }
      setInterviewState(newState)
      setPhase('deep-dive')
    }

    if (lowerText.includes('top match') || lowerText.includes('tell me more about the top')) {
      const topMatch = matches[0]
      if (topMatch) {
        const newState = { ...interviewState, phase: 'deep-dive' as MatcherPhase, selectedTrialId: topMatch.trial.nctId }
        setInterviewState(newState)
        setPhase('deep-dive')
      }
    }

    // Stream Sandy's response
    const sandyMsgId = nextId()
    setMessages(prev => [...prev, { id: sandyMsgId, role: 'assistant', content: '' }])
    setIsSandyTyping(true)
    setChips([])

    try {
      const chatHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }))
      chatHistory.push({ role: 'user', content: text })

      const currentState = phase === 'deep-dive' || lowerText.includes('top match')
        ? { ...interviewState, phase: 'deep-dive' as MatcherPhase, selectedTrialId: interviewState.selectedTrialId ?? matches[0]?.trial.nctId }
        : interviewState

      const fullText = await streamFetch(
        '/api/clinical-trial-matcher/interview',
        { messages: chatHistory, preflight, interviewState: currentState },
        (chunk) => {
          setMessages(prev =>
            prev.map(m => m.id === sandyMsgId ? { ...m, content: m.content + chunk } : m),
          )
        },
      )

      setMessages(prev =>
        prev.map(m => m.id === sandyMsgId ? { ...m, content: stripMarkers(fullText) } : m),
      )

      const newChips = extractChips(fullText)
      if (newChips.length) setChips(newChips)

      const newPhase = extractPhase(fullText)
      if (newPhase) {
        setPhase(newPhase)
        setInterviewState(prev => ({ ...prev, phase: newPhase }))
      }

      // If Sandy's response indicates we should search, extract patient data
      if (phase === 'intake' && (lowerText.includes('search') || newChips.includes('Search for trials'))) {
        // Try to parse patient details from conversation
        updatePatientFromConversation(text)
      } else if (phase === 'intake') {
        // Accumulate patient info from user messages
        updatePatientFromConversation(text)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev =>
          prev.map(m => m.id === sandyMsgId ? { ...m, content: 'Sorry, I had trouble responding. Please try again.' } : m),
        )
      }
    } finally {
      setIsSandyTyping(false)
    }
  }, [preflight, isSandyTyping, phase, interviewState, messages, matches, streamFetch, runSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Patient data accumulation ───────────────────────────────────────────────

  const updatePatientFromConversation = useCallback((text: string) => {
    setInterviewState(prev => {
      const patient = { ...prev.patient }

      // Condition detection (simple heuristics — Sandy handles the real extraction)
      const conditionPatterns = [
        /(?:diagnosed with|has|condition is|primary diagnosis[:\s]*)([\w\s-]+(?:cancer|diabetes|arthritis|disease|syndrome|disorder|leukemia|lymphoma|melanoma|carcinoma))/i,
        /^([\w\s-]+(?:cancer|diabetes|arthritis|disease|syndrome|disorder|leukemia|lymphoma|melanoma|carcinoma))$/i,
      ]
      for (const pattern of conditionPatterns) {
        const match = text.match(pattern)
        if (match) { patient.condition = match[1].trim(); break }
      }

      // Direct chip selections
      if (['lung cancer', 'breast cancer', 'type 2 diabetes'].includes(text.toLowerCase())) {
        patient.condition = text
      }

      // Age
      const ageMatch = text.match(/(\d{1,3})\s*(?:years? old|yo|y\/o)/i) ?? text.match(/age[:\s]*(\d{1,3})/i)
      if (ageMatch) patient.age = parseInt(ageMatch[1])

      // Sex
      if (/\b(male|man)\b/i.test(text) && !/female/i.test(text)) patient.sex = 'MALE'
      if (/\b(female|woman)\b/i.test(text)) patient.sex = 'FEMALE'

      // Stage
      const stageMatch = text.match(/stage\s*([\w]+)/i)
      if (stageMatch) patient.stage = `Stage ${stageMatch[1]}`

      // ECOG
      const ecogMatch = text.match(/ecog\s*(?:status)?[:\s]*(\d)/i)
      if (ecogMatch) patient.ecogStatus = parseInt(ecogMatch[1])

      return { ...prev, patient }
    })
  }, [])

  // ─── Chip select ─────────────────────────────────────────────────────────────

  const selectChip = useCallback((chip: string) => {
    sendMessage(chip)
  }, [sendMessage])

  // ─── Start over ──────────────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setPhase('intake')
    setInterviewState(INITIAL_STATE)
    setSearchResults([])
    setMatches([])
    setIsSandyTyping(false)

    if (preflight) {
      const firstName = preflight.user.name.split(' ')[0]
      setMessages([{
        id: nextId(),
        role: 'assistant',
        content: `Fresh start! What condition or diagnosis would you like to search for, ${firstName}?`,
      }])
      setChips(['Lung cancer', 'Breast cancer', 'Type 2 diabetes', 'Upload clinical notes'])
    }
  }, [preflight])

  // ─── Step count for indicator ────────────────────────────────────────────────

  const phaseSteps: MatcherPhase[] = ['intake', 'searching', 'matching', 'results', 'deep-dive']
  const currentStep = Math.max(0, phaseSteps.indexOf(phase))

  return {
    // Preflight
    preflight,
    isPreflightLoading,
    // Interview
    phase,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    sendMessage,
    selectChip,
    startOver,
    // Results
    searchResults,
    matches,
    isSearching,
    isMatching,
    // Progress
    stepCount: phaseSteps.length,
    currentStep,
  }
}
