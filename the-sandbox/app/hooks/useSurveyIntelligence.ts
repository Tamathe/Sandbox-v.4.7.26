'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { SurveyIntelligencePreflight } from '../lib/staff/survey-intelligence-preflight'
import { extractChips, extractPhase, type SurveyInterviewState } from '../lib/staff/survey-intelligence-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

export type SurveyPhase = 'setup' | 'template' | 'vault-review' | 'generation' | 'refinement'

const PHASE_INDEX: Record<SurveyPhase, number> = {
  setup: 0,
  template: 1,
  'vault-review': 2,
  generation: 3,
  refinement: 4,
}

const INITIAL_STATE: SurveyInterviewState = {
  phase: 'setup',
  activeQuestionId: null,
  activeQuestionNumber: null,
  lastSearchSummary: null,
}

export interface SurveyProject {
  id: string
  title: string
  surveyOrg: string | null
  status: string
  templateKey: string | null
  dueDate: string | null
  notes: string | null
  questions: SurveyQuestionSummary[]
}

export interface SurveyQuestionSummary {
  id: string
  questionNumber: number
  questionText: string
  category: string
  wordLimit: number | null
  writingTips: string | null
  draftResponse: string | null
  draftVersion: number
  status: string
  evidenceTable: unknown
  gapAnalysis: unknown
}

export function useSurveyIntelligence(projectId: string) {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<SurveyIntelligencePreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Project data
  const [project, setProject] = useState<SurveyProject | null>(null)

  // Phase
  const [phase, setPhase] = useState<SurveyPhase>('setup')

  // Active question
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)

  // Generation output (streaming)
  const [generationOutput, setGenerationOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Sandy interview
  const [interviewState, setInterviewState] = useState<SurveyInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Preflight + Project load ─────────────────────────────────────────────

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/survey-intelligence/projects/${projectId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const data = await res.json()
      setProject(data.project)
    } catch {
      // ignore
    }
  }, [projectId, currentUser.email])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [preflightRes] = await Promise.all([
          fetch('/api/staff/survey-intelligence/preflight', {
            headers: { 'x-demo-user-email': currentUser.email },
          }),
        ])
        if (!preflightRes.ok) throw new Error('Preflight failed')
        const pData: SurveyIntelligencePreflight = await preflightRes.json()
        if (!cancelled) {
          setPreflight(pData)
          setIsPreflightLoading(false)
        }
      } catch {
        if (!cancelled) setIsPreflightLoading(false)
      }
    }
    void load()
    void loadProject()
    return () => { cancelled = true }
  }, [currentUser.email, loadProject])

  // Set initial Sandy message when preflight + project are loaded
  useEffect(() => {
    if (!preflight || !project || messages.length > 0) return
    const firstName = preflight.user.name.split(' ')[0]
    const questionStats = {
      pending: project.questions.filter((q) => q.status === 'pending').length,
      drafted: project.questions.filter((q) => q.status === 'drafted' || q.status === 'refined').length,
      approved: project.questions.filter((q) => q.status === 'approved').length,
    }

    let greeting: string
    if (questionStats.drafted > 0 || questionStats.approved > 0) {
      greeting = `Welcome back, ${firstName}! Your "${project.title}" project has ${project.questions.length} questions — ${questionStats.drafted} drafted, ${questionStats.approved} approved, ${questionStats.pending} still pending. What would you like to work on?`
      setPhase('generation')
      setChips(['Generate next pending question', 'Review drafted responses', 'Upload more evidence', 'Export approved responses'])
    } else if (project.questions.length > 0) {
      greeting = `Hey ${firstName}! Your "${project.title}" survey has ${project.questions.length} questions loaded. Let's check your evidence vault before we start drafting.`
      setPhase('vault-review')
      setChips(['Search existing evidence', 'Upload a document', 'Start drafting', 'What categories am I missing?'])
    } else {
      greeting = `Welcome, ${firstName}! Let's get your survey project set up. Add some questions to get started.`
      setPhase('setup')
      setChips(['Add questions manually', 'I need help choosing questions'])
    }

    setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting }])
    setInterviewState((prev) => ({ ...prev, phase }))
  }, [preflight, project, messages.length, nextMsgId, phase])

  // ── Stream helper ──────────────────────────────────────────────────────

  const streamFetch = useCallback(
    async (url: string, body: unknown, onChunk: (text: string) => void): Promise<string> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
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

  // ── Generate draft for a question ──────────────────────────────────────

  const generateDraft = useCallback(
    async (questionId: string) => {
      if (!project) return

      const question = project.questions.find((q) => q.id === questionId)
      if (!question) return

      setActiveQuestionId(questionId)
      setPhase('generation')
      setIsGenerating(true)
      setGenerationOutput('')
      setInterviewState((prev) => ({
        ...prev,
        phase: 'generation',
        activeQuestionId: questionId,
        activeQuestionNumber: question.questionNumber,
      }))

      try {
        const fullText = await streamFetch(
          `/api/staff/survey-intelligence/projects/${projectId}/questions/${questionId}/generate`,
          {},
          (chunk) => setGenerationOutput((prev) => prev + chunk),
        )

        // Reload project to get updated question
        await loadProject()

        // Sandy comment
        const firstName = preflight?.user.name.split(' ')[0] ?? ''
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            role: 'assistant',
            content: `Done! I've drafted a response for Q${question.questionNumber}. Check the left panel to review the draft, evidence table, and any gaps I found. ${fullText.includes('No significant gaps') ? 'Evidence looks solid!' : 'There are some gaps — you might want to upload more documents.'}`,
          },
        ])
        setChips(['Generate next question', 'Revise this draft', 'Show evidence table', 'Mark approved'])
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), role: 'assistant', content: 'Something went wrong during generation. Try again?' },
        ])
        setChips(['Try again', 'Skip this question'])
      } finally {
        setIsGenerating(false)
      }
    },
    [project, projectId, streamFetch, loadProject, preflight, nextMsgId],
  )

  // ── Refine draft ───────────────────────────────────────────────────────

  const refineDraft = useCallback(
    async (questionId: string, instruction: string) => {
      if (!project) return

      const question = project.questions.find((q) => q.id === questionId)
      if (!question?.draftResponse) return

      setActiveQuestionId(questionId)
      setPhase('refinement')
      setIsGenerating(true)
      setGenerationOutput('')

      try {
        await streamFetch(
          `/api/staff/survey-intelligence/projects/${projectId}/questions/${questionId}/refine`,
          { instruction, currentDraft: question.draftResponse },
          (chunk) => setGenerationOutput((prev) => prev + chunk),
        )
        await loadProject()

        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), role: 'assistant', content: `Draft revised. Take a look at the updated response on the left.` },
        ])
        setChips(['Make more specific', 'Shorten to word limit', 'Mark approved', 'Next question'])
      } catch {
        // Keep what streamed
      } finally {
        setIsGenerating(false)
      }
    },
    [project, projectId, streamFetch, loadProject, nextMsgId],
  )

  // ── Approve question ───────────────────────────────────────────────────

  const approveQuestion = useCallback(
    async (questionId: string) => {
      try {
        await fetch(`/api/staff/survey-intelligence/projects/${projectId}/questions/${questionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify({ status: 'approved' }),
        })
        await loadProject()
        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), role: 'assistant', content: 'Locked in! Ready for the next question?' },
        ])
        setChips(['Generate next question', 'Review all drafts', 'Export approved responses'])
      } catch {
        // ignore
      }
    },
    [projectId, currentUser.email, loadProject, nextMsgId],
  )

  // ── Send message to Sandy ─────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!preflight || !project || isSandyTyping) return

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setChips([])
      setIsSandyTyping(true)

      // Build project context for Sandy
      const questionsStatus = {
        pending: project.questions.filter((q) => q.status === 'pending').length,
        drafted: project.questions.filter((q) => q.status === 'drafted' || q.status === 'refined').length,
        approved: project.questions.filter((q) => q.status === 'approved').length,
      }

      try {
        const assistantId = nextMsgId()
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        const fullResponse = await streamFetch(
          `/api/staff/survey-intelligence/projects/${projectId}/interview`,
          {
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            preflight,
            interviewState,
            projectContext: {
              title: project.title,
              surveyOrg: project.surveyOrg,
              questionCount: project.questions.length,
              vaultDocCount: preflight.vaultDocCount,
              questionsStatus,
            },
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
          const validPhase = newPhase as SurveyPhase
          if (PHASE_INDEX[validPhase] !== undefined) {
            setPhase(validPhase)
          }
          setInterviewState((prev) => ({ ...prev, phase: validPhase }))
        }
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, project, isSandyTyping, messages, projectId, interviewState, nextMsgId, streamFetch],
  )

  const selectChip = useCallback(
    (chip: string) => {
      void sendMessage(chip)
    },
    [sendMessage],
  )

  // ── Start over ─────────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setPhase('setup')
    setActiveQuestionId(null)
    setGenerationOutput('')
    setIsGenerating(false)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
  }, [])

  return {
    preflight,
    isPreflightLoading,
    project,
    phase,
    currentStep: PHASE_INDEX[phase] ?? 0,
    activeQuestionId,
    generationOutput,
    isGenerating,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    generateDraft,
    refineDraft,
    approveQuestion,
    sendMessage,
    selectChip,
    startOver,
    loadProject,
  }
}
