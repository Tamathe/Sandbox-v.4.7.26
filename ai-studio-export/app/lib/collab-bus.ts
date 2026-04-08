import { EventEmitter } from 'events'

import type { CollabSSEEvent } from './collab-types'

const collabBus = new EventEmitter()
collabBus.setMaxListeners(500)

function channelForSession(sessionId: string) {
  return `collab-session:${sessionId}`
}

export function publishToCollabSession(sessionId: string, event: CollabSSEEvent) {
  collabBus.emit(channelForSession(sessionId), event)
}

export function subscribeToCollabSession(
  sessionId: string,
  handler: (event: CollabSSEEvent) => void
) {
  const channel = channelForSession(sessionId)
  collabBus.on(channel, handler)

  return () => {
    collabBus.off(channel, handler)
  }
}
