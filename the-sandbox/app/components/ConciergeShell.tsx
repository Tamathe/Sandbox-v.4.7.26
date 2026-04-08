'use client';

import ConciergePanel from './ConciergePanel';
import { SandyAmbientProvider } from './concierge/SandyAmbientContext';

export default function ConciergeShell(props: React.ComponentProps<typeof ConciergePanel>) {
  return (
    <SandyAmbientProvider>
      <ConciergePanel {...props} />
    </SandyAmbientProvider>
  );
}
