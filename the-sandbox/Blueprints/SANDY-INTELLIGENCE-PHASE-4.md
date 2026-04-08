# Sandy Intelligence Upgrade — Phase 4: User-Facing Transparency

**Status:** IN PROGRESS
**Phase:** 4 of 4
**Goal:** Show users what context Sandy is using — which sections were injected, token budget usage, and user preferences applied. Builds trust through transparency.

---

## Overview

| Feature | Problem | Fix |
|---|---|---|
| **Trace collection** | No visibility into what data Sandy has access to per conversation | Collect trace metadata during prompt assembly: sections injected, token count, preferences, data sources |
| **Trace delivery** | No mechanism to communicate trace data to the client | `x-sandy-trace` response header (JSON), following existing `x-avatar-meta` / `x-sandy-trust` pattern |
| **Trace UI** | Users have no way to see what Sandy knows about them | Collapsible "What Sandy Knows" panel in ConciergePanel with section list, token meter, and preferences badge |

**No schema changes. One new component. Pure transparency layer.**

---

## Build Order

```
Step 1: Trace utility (collects metadata during route assembly)
  └── app/lib/sandy-trace.ts

Step 2: Wire trace collection into concierge route
  └── app/api/concierge/route.ts — collect sections, set x-sandy-trace header

Step 3: Client reads trace header
  └── app/components/concierge/SandyAmbientContext.tsx — parse header, expose via state

Step 4: Trace UI component
  └── app/components/concierge/SandyTracePanel.tsx — collapsible panel

Step 5: Wire into ConciergePanel
  └── app/components/ConciergePanel.tsx — render trace panel

Step 6: Type check
  └── npx tsc --noEmit
```

---

## Success Criteria

| Feature | Test | Expected |
|---|---|---|
| Trace header | Check response headers in DevTools | `x-sandy-trace` contains JSON with sections array |
| Trace panel | Click "What Sandy Knows" toggle | Panel shows section list, token count, preferences |
| Transparency | Set tone to "formal" in settings | Trace panel shows "Tone: Formal" under preferences |
