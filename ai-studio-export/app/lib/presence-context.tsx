'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './auth-context'

export type SandboxMode = 'learn' | 'build' | 'live' | 'explore' | null

export function getModeFromPath(pathname: string): SandboxMode {
  if (
    pathname.startsWith('/courses') ||
    pathname.startsWith('/tools') ||
    pathname.startsWith('/analytics')
  )
    return 'learn'
  if (
    pathname.startsWith('/builder') ||
    pathname.startsWith('/publish') ||
    pathname.startsWith('/build') ||
    pathname.startsWith('/bounties') ||
    pathname.startsWith('/datasets') ||
    pathname.startsWith('/avatar') ||
    pathname.startsWith('/admin')
  )
    return 'build'
  if (pathname.startsWith('/sandcastle')) return 'live'
  if (pathname === '/') return 'explore'
  return null
}

export type OnlineUser = {
  email: string
  name: string
  lastSeen: number
  mode: SandboxMode
}

export type CallState = 'idle' | 'calling' | 'incoming' | 'active'

type BcMessage =
  | { type: 'heartbeat'; email: string; name: string; ts: number; mode: SandboxMode }
  | { type: 'call-request'; from: string; fromName: string; to: string }
  | { type: 'call-answer'; from: string; to: string }
  | { type: 'call-decline'; from: string; to: string }
  | { type: 'call-hangup'; from: string; to: string }
  | { type: 'webrtc-offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'webrtc-answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'webrtc-ice'; from: string; to: string; candidate: RTCIceCandidateInit }

type PresenceContextType = {
  onlineUsers: OnlineUser[]
  contacts: string[]
  callState: CallState
  callPeer: { email: string; name: string } | null
  micError: boolean
  currentMode: SandboxMode
  addContact: (email: string) => void
  removeContact: (email: string) => void
  callUser: (email: string, name: string) => void
  answerCall: () => void
  declineCall: () => void
  hangUp: () => void
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: [],
  contacts: [],
  callState: 'idle',
  callPeer: null,
  micError: false,
  currentMode: null,
  addContact: () => {},
  removeContact: () => {},
  callUser: () => {},
  answerCall: () => {},
  declineCall: () => {},
  hangUp: () => {},
})

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const pathname = usePathname()
  const currentMode = getModeFromPath(pathname)

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [contacts, setContacts] = useState<string[]>([])
  const [callState, setCallState] = useState<CallState>('idle')
  const [callPeer, setCallPeer] = useState<{ email: string; name: string } | null>(null)
  const [micError, setMicError] = useState(false)

  // Refs — safe to read inside async callbacks
  const channelRef = useRef<BroadcastChannel | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const callPeerRef = useRef<{ email: string; name: string } | null>(null)
  const currentEmailRef = useRef(currentUser.email)
  const currentNameRef = useRef(currentUser.name)
  const currentModeRef = useRef<SandboxMode>(currentMode)

  useEffect(() => {
    currentEmailRef.current = currentUser.email
    currentNameRef.current = currentUser.name
  }, [currentUser.email, currentUser.name])

  useEffect(() => {
    currentModeRef.current = currentMode
  }, [currentMode])

  useEffect(() => {
    callPeerRef.current = callPeer
  }, [callPeer])

  // Load contacts from localStorage when user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`sandbox-contacts-${currentUser.email}`)
      setContacts(stored ? JSON.parse(stored) : [])
    } catch {
      setContacts([])
    }
  }, [currentUser.email])

  const addContact = useCallback((email: string) => {
    setContacts((prev) => {
      if (prev.includes(email)) return prev
      const next = [...prev, email]
      try {
        localStorage.setItem(
          `sandbox-contacts-${currentEmailRef.current}`,
          JSON.stringify(next)
        )
      } catch {}
      return next
    })
  }, [])

  const removeContact = useCallback((email: string) => {
    setContacts((prev) => {
      const next = prev.filter((e) => e !== email)
      try {
        localStorage.setItem(
          `sandbox-contacts-${currentEmailRef.current}`,
          JSON.stringify(next)
        )
      } catch {}
      return next
    })
  }, [])

  // ── WebRTC helpers ───────────────────────────────────────────────

  const createPC = useCallback((targetEmail: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.postMessage({
          type: 'webrtc-ice',
          from: currentEmailRef.current,
          to: targetEmail,
          candidate: e.candidate.toJSON(),
        } satisfies BcMessage)
      }
    }

    pc.ontrack = (e) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0]
      }
    }

    return pc
  }, [])

  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
    setCallState('idle')
    setCallPeer(null)
    setMicError(false)
  }, [])

  const initiateWebRTC = useCallback(
    async (targetEmail: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream
        const pc = createPC(targetEmail)
        pcRef.current = pc
        stream.getTracks().forEach((t) => pc.addTrack(t, stream))
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        channelRef.current?.postMessage({
          type: 'webrtc-offer',
          from: currentEmailRef.current,
          to: targetEmail,
          sdp: offer,
        } satisfies BcMessage)
      } catch {
        setMicError(true)
      }
    },
    [createPC]
  )

  const handleOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit, fromEmail: string) => {
      setCallState('active')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream
        const pc = createPC(fromEmail)
        pcRef.current = pc
        stream.getTracks().forEach((t) => pc.addTrack(t, stream))
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        channelRef.current?.postMessage({
          type: 'webrtc-answer',
          from: currentEmailRef.current,
          to: fromEmail,
          sdp: answer,
        } satisfies BcMessage)
      } catch {
        setMicError(true)
      }
    },
    [createPC]
  )

  // ── BroadcastChannel setup ───────────────────────────────────────

  const handleMessageRef = useRef<((msg: BcMessage) => void) | null>(null)

  handleMessageRef.current = (msg: BcMessage) => {
    if (msg.type === 'heartbeat') {
      if (msg.email === currentEmailRef.current) return
      setOnlineUsers((prev) => {
        const idx = prev.findIndex((u) => u.email === msg.email)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], lastSeen: msg.ts, mode: msg.mode }
          return next
        }
        return [...prev, { email: msg.email, name: msg.name, lastSeen: msg.ts, mode: msg.mode }]
      })
      return
    }

    if ('to' in msg && msg.to !== currentEmailRef.current) return

    // Silently drop incoming calls when in Learn mode
    if (msg.type === 'call-request') {
      if (currentModeRef.current === 'learn') {
        // Decline automatically — user is in focus mode
        channelRef.current?.postMessage({
          type: 'call-decline',
          from: currentEmailRef.current,
          to: msg.from,
        } satisfies BcMessage)
        return
      }
      setCallState('incoming')
      setCallPeer({ email: msg.from, name: msg.fromName })
    }

    if (msg.type === 'call-answer') {
      setCallState('active')
      initiateWebRTC(msg.from)
    }

    if (msg.type === 'call-decline') {
      cleanupCall()
    }

    if (msg.type === 'call-hangup') {
      cleanupCall()
    }

    if (msg.type === 'webrtc-offer') {
      handleOffer(msg.sdp, msg.from)
    }

    if (msg.type === 'webrtc-answer') {
      if (pcRef.current) {
        pcRef.current
          .setRemoteDescription(new RTCSessionDescription(msg.sdp))
          .catch(console.error)
      }
    }

    if (msg.type === 'webrtc-ice') {
      if (pcRef.current) {
        pcRef.current
          .addIceCandidate(new RTCIceCandidate(msg.candidate))
          .catch(() => {})
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    remoteAudioRef.current = new Audio()
    remoteAudioRef.current.autoplay = true

    let channel: BroadcastChannel
    try {
      channel = new BroadcastChannel('sandbox-presence')
    } catch {
      return
    }
    channelRef.current = channel

    channel.onmessage = (e: MessageEvent<BcMessage>) => {
      handleMessageRef.current?.(e.data)
    }

    const sendHeartbeat = () => {
      channel.postMessage({
        type: 'heartbeat',
        email: currentEmailRef.current,
        name: currentNameRef.current,
        ts: Date.now(),
        mode: currentModeRef.current,
      } satisfies BcMessage)
    }

    sendHeartbeat()
    const heartbeatTimer = setInterval(sendHeartbeat, 20_000)
    const presenceTimer = setInterval(() => {
      fetch('/api/presence', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentEmailRef.current,
        },
        body: JSON.stringify({ lastPath: window.location.pathname }),
      }).catch(() => {})
    }, 60_000)
    const pruneTimer = setInterval(() => {
      setOnlineUsers((prev) => prev.filter((u) => Date.now() - u.lastSeen < 90_000))
    }, 10_000)

    return () => {
      channel.close()
      clearInterval(heartbeatTimer)
      clearInterval(presenceTimer)
      clearInterval(pruneTimer)
    }
  }, [])

  // Re-broadcast when user or mode changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    channelRef.current?.postMessage({
      type: 'heartbeat',
      email: currentUser.email,
      name: currentUser.name,
      ts: Date.now(),
      mode: currentMode,
    } satisfies BcMessage)
    setOnlineUsers((prev) => prev.filter((u) => u.email !== currentUser.email))
  }, [currentUser.email, currentUser.name, currentMode])

  useEffect(() => {
    fetch('/api/presence', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ lastPath: pathname }),
    }).catch(() => {})
  }, [pathname, currentUser.email])

  useEffect(() => {
    fetch('/api/presence', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data.users)) return
        setOnlineUsers((prev) => {
          const updated = [...prev]
          for (const u of data.users) {
            const mode = getModeFromPath(u.lastPath ?? '')
            const lastSeen = new Date(u.lastSeenAt).getTime()
            const idx = updated.findIndex((x) => x.email === u.email)
            if (idx >= 0) {
              if (lastSeen > updated[idx].lastSeen) {
                updated[idx] = { ...updated[idx], lastSeen, mode }
              }
            } else {
              updated.push({ email: u.email, name: u.name, lastSeen, mode })
            }
          }
          return updated
        })
      })
      .catch(() => {})
  }, [currentUser.email])

  // ── Public API ───────────────────────────────────────────────────

  const callUser = useCallback((email: string, name: string) => {
    setCallState('calling')
    setCallPeer({ email, name })
    channelRef.current?.postMessage({
      type: 'call-request',
      from: currentEmailRef.current,
      fromName: currentNameRef.current,
      to: email,
    } satisfies BcMessage)
  }, [])

  const answerCall = useCallback(() => {
    const peer = callPeerRef.current
    if (!peer) return
    channelRef.current?.postMessage({
      type: 'call-answer',
      from: currentEmailRef.current,
      to: peer.email,
    } satisfies BcMessage)
    setCallState('active')
  }, [])

  const declineCall = useCallback(() => {
    const peer = callPeerRef.current
    if (!peer) return
    channelRef.current?.postMessage({
      type: 'call-decline',
      from: currentEmailRef.current,
      to: peer.email,
    } satisfies BcMessage)
    setCallState('idle')
    setCallPeer(null)
  }, [])

  const hangUp = useCallback(() => {
    const peer = callPeerRef.current
    if (peer) {
      channelRef.current?.postMessage({
        type: 'call-hangup',
        from: currentEmailRef.current,
        to: peer.email,
      } satisfies BcMessage)
    }
    cleanupCall()
  }, [cleanupCall])

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        contacts,
        callState,
        callPeer,
        micError,
        currentMode,
        addContact,
        removeContact,
        callUser,
        answerCall,
        declineCall,
        hangUp,
      }}
    >
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  return useContext(PresenceContext)
}
