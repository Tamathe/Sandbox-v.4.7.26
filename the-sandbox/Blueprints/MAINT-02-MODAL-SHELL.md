# Blueprint: Modal Shell Component

> **Sprint Scope:** Extract the repeated modal scaffolding from 19+ components into a single `<ModalShell>` wrapper.
> **Estimated Size:** Medium (1 prompt, ~30 min)
> **Origin:** Duplication Audit, 2026-03-28

---

## Context

Every modal in the codebase independently implements the same outer chrome: fixed overlay, centered white card, header with icon + title + X close button, body slot. The only variations are z-index, max-width, backdrop opacity, and border radius — all easily parameterized.

### Current State (repeated in every file)

```tsx
<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-[#0033A0]" />
        <h3 className="text-lg font-extrabold text-gray-900">Title</h3>
      </div>
      <button onClick={onClose}><X className="size-4 text-gray-400" /></button>
    </div>
    {/* body content */}
  </div>
</div>
```

**Files affected (19+):**
- `AudioConfigModal.tsx`
- `OnboardingModal.tsx`
- `PortfolioAddItemModal.tsx`
- `ToolRequestModal.tsx`
- `CollabJoinModal.tsx`
- `CanvasImportModal.tsx`
- `LinkToolModal.tsx`
- `DocumentPreviewModal.tsx`
- `UploadModal.tsx`
- `MicroReviewModal.tsx`
- `ExamConfigModal.tsx`
- `BatchConfirmModal.tsx`
- `staff/DelegateModal.tsx`
- `staff/survey-intelligence/ProjectCreateModal.tsx`
- `messages/ComposeModal.tsx`
- `messages/GroupSettingsModal.tsx`
- `playground/ExportModal.tsx`
- `playground/DelegatesModal.tsx`
- `course-map/ConflictResolutionDialog.tsx`
- `course-map/MergeBranchDialog.tsx`

---

## Implementation

### Step 1: Create `ModalShell` component

**New file:** `app/components/ui/ModalShell.tsx`

```tsx
'use client'

import { X } from 'lucide-react'
import { type ReactNode, type ElementType, useEffect } from 'react'

interface ModalShellProps {
  title: string
  icon?: ElementType
  onClose: () => void
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'  // default: 'lg'
  zIndex?: number  // default: 60
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

export function ModalShell({
  title, icon: Icon, onClose, children,
  maxWidth = 'lg', zIndex = 60,
}: ModalShellProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      style={{ zIndex }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidthMap[maxWidth]} overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="size-5 text-[#0033A0]" />}
            <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="size-4 text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

### Step 2: Migrate all 19+ modals

Each modal's outer shell gets replaced. Example before/after:

**Before (AudioConfigModal.tsx):**
```tsx
<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-[#0033A0]" />
        <h3 className="text-lg font-extrabold text-gray-900">Audio Settings</h3>
      </div>
      <button onClick={onClose}><X className="size-4 text-gray-400" /></button>
    </div>
    {/* body */}
  </div>
</div>
```

**After:**
```tsx
<ModalShell title="Audio Settings" icon={Settings} onClose={onClose}>
  {/* body — unchanged */}
</ModalShell>
```

### Step 3: Handle edge cases

- Modals with non-standard z-index: pass `zIndex={70}` prop
- Modals with non-standard max-width: pass `maxWidth="xl"` etc.
- Modals with `rounded-[32px]` instead of `rounded-2xl`: standardize to `rounded-2xl` (the dominant pattern)
- Modals with custom backdrop opacity (`bg-black/30`, `bg-slate-950/55`): standardize to `bg-black/40` (the dominant pattern)

### Step 4: Verify

- `npx tsc --noEmit` — no type errors
- Visually spot-check 3-4 modals to confirm layout matches

---

## Risk

**Low.** Visual-only change. The modal body content is untouched. The only risk is a modal with unique chrome that doesn't fit the pattern — in that case, keep it standalone.

## Acceptance Criteria

- [ ] `app/components/ui/ModalShell.tsx` exists
- [ ] All 19+ modals use `<ModalShell>` instead of inline scaffolding
- [ ] No modal file contains the inline `fixed inset-0` + header + X button pattern
- [ ] Escape key closes all modals
- [ ] Clicking backdrop closes all modals
- [ ] TypeScript compiles clean
