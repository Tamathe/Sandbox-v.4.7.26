/**
 * Presence & Mode Logic
 * 
 * Maps application paths to User Modes (Learn, Live, Build) and handles
 * contactability rules.
 */

export type UserMode = 'LEARN' | 'LIVE' | 'BUILD' | 'AVAILABLE' | 'OFFLINE'

export interface PresenceState {
  mode: UserMode
  color: string
  label: string
  isContactable: boolean
}

export const MODE_CONFIG: Record<UserMode, Omit<PresenceState, 'mode'>> = {
  LEARN: {
    color: 'bg-red-500',
    label: 'Learning Mode',
    isContactable: false, // "When they are in red, they cannot be contacted"
  },
  LIVE: {
    color: 'bg-green-500',
    label: 'Sandbox Live',
    isContactable: true,
  },
  BUILD: {
    color: 'bg-blue-500',
    label: 'Build Mode',
    isContactable: true,
  },
  AVAILABLE: {
    color: 'bg-green-500',
    label: 'Online',
    isContactable: true,
  },
  OFFLINE: {
    color: 'bg-gray-300',
    label: 'Offline',
    isContactable: false,
  }
}

export function getPresenceFromPath(path: string | null): UserMode {
  if (!path) return 'AVAILABLE'

  // Red: Learn Mode (Focus)
  if (path.startsWith('/courses') || path.startsWith('/tools') || path.startsWith('/library')) {
    return 'LEARN'
  }

  // Green: Live Mode (Social)
  if (path.startsWith('/sandcastle')) {
    return 'LIVE'
  }

  // Blue: Build Mode (Creative)
  if (path.startsWith('/build') || path.startsWith('/builder') || path.startsWith('/publish') || path.startsWith('/avatar') || path.startsWith('/service-bot')) {
    return 'BUILD'
  }

  // Default fallback
  return 'AVAILABLE'
}

/**
 * Determines if the CURRENT user (viewer) is allowed to see their contact list.
 * "Contacts are not available in learn mode so students can focus."
 */
export function canViewerSeeContacts(viewerPath: string | null): boolean {
  const mode = getPresenceFromPath(viewerPath)
  return mode !== 'LEARN'
}