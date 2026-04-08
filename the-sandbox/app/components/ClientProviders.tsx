'use client'

import { AuthProvider } from '../lib/auth-context'
import { PresenceProvider } from '../lib/presence-context'
import Header from './Header'
import ConciergePanel from './ConciergePanel'
import PresenceWidget from './PresenceWidget'
import CallOverlay from './CallOverlay'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PresenceProvider>
        <Header />
        <main className="lg:pr-80">{children}</main>
        <ConciergePanel />
        <PresenceWidget />
        <CallOverlay />
      </PresenceProvider>
    </AuthProvider>
  )
}
