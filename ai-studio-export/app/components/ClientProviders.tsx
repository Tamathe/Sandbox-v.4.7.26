'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '../lib/auth-context'
import { PresenceProvider } from '../lib/presence-context'
import { AudioPlayerProvider } from '../hooks/useAudioPlayer'
import Header from './Header'
import ConciergePanel from './ConciergePanel'
import PresenceWidget from './PresenceWidget'
import CallOverlay from './CallOverlay'
import AudioPlayerBar from './AudioPlayerBar'
import PlatformAnnouncementBanner from './PlatformAnnouncementBanner'
import SuspendedAccountScreen from './SuspendedAccountScreen'

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { accountSuspended, suspensionReason } = useAuth()
  const isPlaygroundRoute = pathname.startsWith('/playground')

  if (accountSuspended) {
    return (
      <>
        <AudioPlayerBar />
        <SuspendedAccountScreen reason={suspensionReason} />
      </>
    )
  }

  return (
    <>
      <PlatformAnnouncementBanner />
      {isPlaygroundRoute ? null : <Header />}
      <main className={isPlaygroundRoute ? 'pb-20' : 'pb-20 lg:pr-80'}>{children}</main>
      {isPlaygroundRoute ? null : <ConciergePanel />}
      {isPlaygroundRoute ? null : <PresenceWidget />}
      <AudioPlayerBar />
      <CallOverlay />
    </>
  )
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <PresenceProvider>
          <AppShell>{children}</AppShell>
        </PresenceProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  )
}
