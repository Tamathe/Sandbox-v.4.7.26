'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type {
  CommandCenterPhase,
  AssessmentResult,
  IncidentStatus,
  InitiateRequest,
  SerializedIncident,
  SerializedDocument,
} from '../lib/crisis-comms/command-center/types'

const API = '/api/crisis-comms/command-center'

interface CommandCenterState {
  phase: CommandCenterPhase
  incident: SerializedIncident | null
  assessment: AssessmentResult | null
  activeDocumentId: string | null
  loading: boolean
  error: string | null
  pastIncidents: SerializedIncident[]
}

const INITIAL_STATE: CommandCenterState = {
  phase: 'initiation',
  incident: null,
  assessment: null,
  activeDocumentId: null,
  loading: false,
  error: null,
  pastIncidents: [],
}

/** Derive phase from an incident's status */
function phaseFromStatus(status: string): CommandCenterPhase {
  switch (status) {
    case 'INITIATED':
    case 'ASSESSING':
      return 'assessment'
    case 'DRAFTING':
    case 'ACTIVE':
    case 'CONTAINED':
      return 'workspace'
    case 'CLOSED':
      return 'archived'
    default:
      return 'initiation'
  }
}

export function useCommandCenter() {
  const { currentUser } = useAuth()
  const [state, setState] = useState<CommandCenterState>(INITIAL_STATE)

  const headers = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-demo-user-email': currentUser.email,
    }),
    [currentUser.email],
  )

  // ── API helpers ───────────────────────────────────────────────────────────

  const apiFetch = useCallback(
    async <T>(path: string, options?: RequestInit): Promise<T> => {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { ...headers(), ...options?.headers },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      return res.json() as Promise<T>
    },
    [headers],
  )

  // ── Actions ───────────────────────────────────────────────────────────────

  const initiate = useCallback(
    async (input: InitiateRequest) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const data = await apiFetch<{ incident: SerializedIncident; assessment: AssessmentResult }>(
          '/initiate',
          { method: 'POST', body: JSON.stringify(input) },
        )
        setState((s) => ({
          ...s,
          phase: 'assessment',
          incident: data.incident,
          assessment: data.assessment,
          loading: false,
        }))
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message, loading: false }))
      }
    },
    [apiFetch],
  )

  const editAssessment = useCallback((updated: AssessmentResult) => {
    setState((s) => ({ ...s, assessment: updated }))
  }, [])

  const confirmAssessment = useCallback(async () => {
    if (!state.incident || !state.assessment) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const incident = await apiFetch<SerializedIncident>(
        `/${state.incident!.id}/confirm`,
        { method: 'POST', body: JSON.stringify({ assessment: state.assessment }) },
      )
      const firstDocId = incident.documents?.[0]?.id ?? null
      setState((s) => ({
        ...s,
        phase: 'workspace',
        incident,
        activeDocumentId: firstDocId,
        loading: false,
      }))
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, loading: false }))
    }
  }, [apiFetch, state.incident, state.assessment])

  const selectDocument = useCallback((documentId: string) => {
    setState((s) => ({ ...s, activeDocumentId: documentId }))
  }, [])

  const updateDocument = useCallback(
    async (content: string) => {
      if (!state.activeDocumentId) return
      setState((s) => ({ ...s, error: null }))
      // Optimistic update
      setState((s) => {
        if (!s.incident?.documents) return s
        const docs = s.incident.documents.map((d) =>
          d.id === s.activeDocumentId ? { ...d, content } : d,
        )
        return { ...s, incident: { ...s.incident, documents: docs } }
      })
      try {
        const doc = await apiFetch<SerializedDocument>(
          `/documents/${state.activeDocumentId}`,
          { method: 'PATCH', body: JSON.stringify({ content }) },
        )
        // Reconcile with server response
        setState((s) => {
          if (!s.incident?.documents) return s
          const docs = s.incident.documents.map((d) => (d.id === doc.id ? doc : d))
          return { ...s, incident: { ...s.incident, documents: docs } }
        })
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message }))
      }
    },
    [apiFetch, state.activeDocumentId],
  )

  const aiEdit = useCallback(
    async (instruction: string) => {
      if (!state.activeDocumentId) return
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const doc = await apiFetch<SerializedDocument>(
          `/documents/${state.activeDocumentId}/ai-edit`,
          { method: 'POST', body: JSON.stringify({ instruction }) },
        )
        setState((s) => {
          if (!s.incident?.documents) return { ...s, loading: false }
          const docs = s.incident.documents.map((d) => (d.id === doc.id ? doc : d))
          return { ...s, incident: { ...s.incident, documents: docs }, loading: false }
        })
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message, loading: false }))
      }
    },
    [apiFetch, state.activeDocumentId],
  )

  const updateStatus = useCallback(
    async (status: IncidentStatus) => {
      if (!state.incident) return
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const incident = await apiFetch<SerializedIncident>(
          `/${state.incident!.id}/status`,
          { method: 'PATCH', body: JSON.stringify({ status }) },
        )
        setState((s) => ({
          ...s,
          incident,
          phase: phaseFromStatus(status),
          loading: false,
        }))
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message, loading: false }))
      }
    },
    [apiFetch, state.incident],
  )

  const joinRoom = useCallback(
    async (roomCode: string) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const incident = await apiFetch<SerializedIncident>('/join', {
          method: 'POST',
          body: JSON.stringify({ roomCode }),
        })
        const firstDocId = incident.documents?.[0]?.id ?? null
        setState((s) => ({
          ...s,
          incident,
          assessment: incident.assessment ? JSON.parse(incident.assessment) : null,
          phase: phaseFromStatus(incident.status),
          activeDocumentId: firstDocId,
          loading: false,
        }))
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message, loading: false }))
      }
    },
    [apiFetch],
  )

  const loadPastIncidents = useCallback(async () => {
    try {
      const incidents = await apiFetch<SerializedIncident[]>('/my-incidents')
      setState((s) => ({ ...s, pastIncidents: incidents }))
    } catch {
      // Silent — past incidents are non-critical
    }
  }, [apiFetch])

  const resumeIncident = useCallback(
    async (incidentId: string) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const incident = await apiFetch<SerializedIncident>(`/${incidentId}`)
        const firstDocId = incident.documents?.[0]?.id ?? null
        setState((s) => ({
          ...s,
          incident,
          assessment: incident.assessment ? JSON.parse(incident.assessment) : null,
          phase: phaseFromStatus(incident.status),
          activeDocumentId: firstDocId,
          loading: false,
        }))
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message, loading: false }))
      }
    },
    [apiFetch],
  )

  const refreshIncident = useCallback(async () => {
    if (!state.incident) return
    try {
      const incident = await apiFetch<SerializedIncident>(`/${state.incident.id}`)
      setState((s) => ({ ...s, incident }))
    } catch {
      // Silent refresh failure
    }
  }, [apiFetch, state.incident])

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
  }, [])

  const resetToInitiation = useCallback(() => {
    setState(s => ({ ...INITIAL_STATE, pastIncidents: s.pastIncidents }))
    void loadPastIncidents()
  }, [loadPastIncidents])

  // Load past incidents on mount
  useEffect(() => {
    void loadPastIncidents()
  }, [loadPastIncidents])

  // ── Active document derived state ─────────────────────────────────────────

  const activeDocument = state.incident?.documents?.find((d) => d.id === state.activeDocumentId) ?? null

  return {
    ...state,
    activeDocument,
    initiate,
    editAssessment,
    confirmAssessment,
    selectDocument,
    updateDocument,
    aiEdit,
    updateStatus,
    joinRoom,
    loadPastIncidents,
    resumeIncident,
    refreshIncident,
    resetToInitiation,
    clearError,
  }
}
