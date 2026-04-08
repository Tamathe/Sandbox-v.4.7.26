'use client';

import CallOverlay from './CallOverlay';
import { PresenceProvider } from '../lib/presence-context';

export default function PresenceFeatures() {
  return (
    <PresenceProvider>
      <CallOverlay />
    </PresenceProvider>
  );
}
