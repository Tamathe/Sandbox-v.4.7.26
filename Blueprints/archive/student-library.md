# Student Library Feature — Implementation Blueprint

**Project:** The Sandbox — AI-powered educational tool marketplace (University of Kentucky)
**Feature:** My Library
**Target:** Codex implementation agent
**Date:** 2026-03-15

---

## 1. Context

The Sandbox follows the Steam model for educational tools:

- **Marketplace** (`/tools`) = the store. Browse, discover, and preview tools.
- **Library** (`/library`) = your games shelf. Tools you've saved and want to reuse.
- **Launch** (`/tools/[id]?launch=true`) = pressing Play. Opens the AI chatbot immediately.

Students currently browse tools and can favorite them, but there's no persistent "I own this" concept. This feature adds that layer:

1. Any tool card on the marketplace can be opened in a **quick-launch modal** (no page nav required).
2. From the modal, students click **Get** to save the tool to their library — an explicit acquisition action.
3. The **library page** shows saved tools with one-click launch buttons, plus a session history section for tools they've tried but haven't saved.
4. The **home page** shows a Quick Launch strip of recently-used library tools, so students can jump straight back into their work.

This is intentionally separate from Favorites (which is a social signal). Library = personal workspace.

---

## 2. Schema Change

### 2a. Add `LibraryEntry` model to `prisma/schema.prisma`

Add this model at the end of the schema file:

```prisma
model LibraryEntry {
  id      String   @id @default(cuid())
  userId  String
  toolId  String
  addedAt DateTime @default(now())
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tool    Tool     @relation(fields: [toolId], references: [id], onDelete: Cascade)

  @@unique([userId, toolId])
  @@index([userId])
}
```

### 2b. Add relation fields to `User` model

In the `User` model, add:

```prisma
libraryEntries LibraryEntry[]
```

### 2c. Add relation fields to `Tool` model

In the `Tool` model, add:

```prisma
libraryEntries LibraryEntry[]
```

### 2d. Run migration

```bash
npx prisma migrate dev --name add-library-entries
```

---

## 3. Type Changes (`app/lib/types.ts`)

Add the following interface to the existing types file:

```typescript
export interface LibraryEntryWithTool {
  id: string
  toolId: string
  addedAt: string
  tool: ToolWithDetails & {
    _mySessionCount: number
    _lastSessionAt: string | null
  }
}
```

---

## 4. New API Routes

### 4a. `app/api/library/route.ts` — GET + POST + DELETE

Create this file:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '../../lib/prisma'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ library: [], history: [] })

  const prisma = getPrismaClient()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ library: [], history: [] })

  const userId = user.id

  // Fetch library entries with full tool data
  const rawEntries = await prisma.libraryEntry.findMany({
    where: { userId },
    include: {
      tool: {
        include: {
          creator: true,
          _count: {
            select: {
              upvotes: true,
              favorites: true,
              comments: true,
              sessions: true,
            },
          },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  // Enrich each entry with the user's own session count and last session date
  const library = await Promise.all(
    rawEntries.map(async entry => {
      const sessions = await prisma.toolSession.findMany({
        where: { toolId: entry.toolId, userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      return {
        id: entry.id,
        toolId: entry.toolId,
        addedAt: entry.addedAt.toISOString(),
        tool: entry.tool,
        sessionCount: sessions.length,
        lastSessionAt: sessions[0]?.createdAt.toISOString() ?? null,
      }
    })
  )

  // Library tool IDs for exclusion
  const libraryToolIds = new Set(rawEntries.map(e => e.toolId))

  // Fetch all sessions for this user, with tool data
  const allSessions = await prisma.toolSession.findMany({
    where: { userId },
    include: {
      tool: {
        include: {
          creator: true,
          _count: {
            select: {
              upvotes: true,
              favorites: true,
              comments: true,
              sessions: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Deduplicate by toolId, exclude tools already in library
  const seenToolIds = new Set<string>()
  const historyMap: Record<string, { tool: typeof allSessions[0]['tool']; sessionCount: number; lastSessionAt: string }> = {}

  for (const session of allSessions) {
    if (libraryToolIds.has(session.toolId)) continue
    if (!historyMap[session.toolId]) {
      historyMap[session.toolId] = {
        tool: session.tool,
        sessionCount: 0,
        lastSessionAt: session.createdAt.toISOString(),
      }
    }
    historyMap[session.toolId].sessionCount++
    seenToolIds.add(session.toolId)
  }

  const history = Object.entries(historyMap).map(([toolId, data]) => ({
    toolId,
    tool: data.tool,
    sessionCount: data.sessionCount,
    lastSessionAt: data.lastSessionAt,
  }))

  return NextResponse.json({ library, history })
}

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ ok: false }, { status: 401 })

  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { toolId } = await req.json()
  if (!toolId) return NextResponse.json({ ok: false }, { status: 400 })

  await prisma.libraryEntry.upsert({
    where: { userId_toolId: { userId: user.id, toolId } },
    create: { userId: user.id, toolId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ ok: false }, { status: 401 })

  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const toolId = req.nextUrl.searchParams.get('toolId')
  if (!toolId) return NextResponse.json({ ok: false }, { status: 400 })

  await prisma.libraryEntry.deleteMany({
    where: { userId: user.id, toolId },
  })

  return NextResponse.json({ ok: true })
}
```

### 4b. `app/api/library/ids/route.ts` — GET only (lightweight)

Create this file. It returns only the tool IDs in the user's library, used by pages to efficiently check membership without fetching full data:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ libraryIds: [] })

  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ libraryIds: [] })

  const entries = await prisma.libraryEntry.findMany({
    where: { userId: user.id },
    select: { toolId: true },
  })

  return NextResponse.json({ libraryIds: entries.map(e => e.toolId) })
}
```

---

## 5. ToolCard Changes (`app/components/ToolCard.tsx`)

### 5a. Update the props interface

Replace the existing `ToolCardProps` interface with:

```typescript
interface ToolCardProps {
  tool: ToolWithDetails
  signals?: { label: string; color: string }[]
  inLibrary?: boolean
  onToggleLibrary?: (toolId: string, add: boolean) => void
  onOpenModal?: (tool: ToolWithDetails) => void  // if provided, click opens modal instead of navigating
}
```

### 5b. Update function signature

```typescript
export default function ToolCard({ tool, signals, inLibrary, onToggleLibrary, onOpenModal }: ToolCardProps) {
```

### 5c. Update (or add) the `openTool` click handler

Replace any existing click-to-navigate logic with:

```typescript
const openTool = () => {
  if (onOpenModal) {
    onOpenModal(tool)
  } else {
    router.push(`/tools/${tool.id}`)
  }
}
```

Apply `onClick={openTool}` to the card's main clickable area (wherever the card currently navigates to the tool detail page).

### 5d. Add library toggle button to the thumbnail

Inside the thumbnail `<div>` (which should already have `relative` positioning), add this button **after** the signals badges. Place it at the **bottom-right** corner of the thumbnail:

```tsx
{onToggleLibrary && (
  <button
    onClick={e => {
      e.stopPropagation()
      onToggleLibrary(tool.id, !inLibrary)
    }}
    title={inLibrary ? 'Remove from library' : 'Add to library'}
    className={`absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm ${
      inLibrary
        ? 'bg-[#0033A0] text-white hover:bg-red-500'
        : 'bg-white/90 text-gray-600 hover:bg-[#0033A0] hover:text-white'
    }`}
  >
    {inLibrary ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
  </button>
)}
```

### 5e. Add missing lucide-react imports

Add `Check` and `Plus` to the existing lucide-react import line:

```typescript
import { Check, Plus, /* ...existing imports... */ } from 'lucide-react'
```

---

## 6. New Component — `app/components/ToolLaunchModal.tsx`

Create this file in full:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { X, Play, Plus, Check, ExternalLink, ArrowUpRight } from 'lucide-react'
import { ToolWithDetails } from '../lib/types'

// Shared display maps — keep in sync with ToolCard (or extract to app/lib/tool-display.ts)
const categoryThumbnailBg: Record<string, string> = {
  Law: 'bg-indigo-600',
  History: 'bg-amber-600',
  STEM: 'bg-emerald-600',
  Medicine: 'bg-red-600',
  Business: 'bg-blue-600',
  Arts: 'bg-purple-600',
  University: 'bg-sky-600',
  General: 'bg-gray-500',
}

const categoryColors: Record<string, string> = {
  Law: 'bg-indigo-100 text-indigo-700',
  History: 'bg-amber-100 text-amber-700',
  STEM: 'bg-emerald-100 text-emerald-700',
  Medicine: 'bg-red-100 text-red-700',
  Business: 'bg-blue-100 text-blue-700',
  Arts: 'bg-purple-100 text-purple-700',
  University: 'bg-sky-100 text-sky-700',
  General: 'bg-gray-100 text-gray-700',
}

const difficultyColors: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
}

const categoryIcons: Record<string, string> = {
  Law: '⚖️',
  History: '📜',
  STEM: '🔬',
  Medicine: '🏥',
  Business: '💼',
  Arts: '🎨',
  University: '🎓',
  General: '🛠️',
}

interface ToolLaunchModalProps {
  tool: ToolWithDetails
  inLibrary: boolean
  onClose: () => void
  onToggleLibrary: (toolId: string, add: boolean) => void
}

export default function ToolLaunchModal({
  tool,
  inLibrary,
  onClose,
  onToggleLibrary,
}: ToolLaunchModalProps) {
  const router = useRouter()

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleLaunch = () => {
    if (tool.toolType === 'EXTERNAL' && tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer')
      onClose()
    } else {
      router.push(`/tools/${tool.id}?launch=true`)
    }
  }

  const bgClass = categoryThumbnailBg[tool.category] || 'bg-gray-500'
  const icon = categoryIcons[tool.category] || '🛠️'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Thumbnail header */}
          <div className={`relative h-40 ${bgClass} flex items-center justify-center`}>
            {tool.thumbnailUrl ? (
              <Image
                src={tool.thumbnailUrl}
                alt={tool.name}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-4xl" aria-hidden="true">
                {icon}
              </span>
            )}
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Category + difficulty badges */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  categoryColors[tool.category] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {tool.category}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  difficultyColors[tool.difficultyLevel] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {tool.difficultyLevel}
              </span>
            </div>

            {/* Name */}
            <h2 className="text-lg font-extrabold text-gray-900 mb-2">{tool.name}</h2>

            {/* Description */}
            <p className="text-sm text-gray-500 leading-relaxed mb-5 line-clamp-3">
              {tool.shortDescription}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleLaunch}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0033A0] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors"
              >
                {tool.toolType === 'EXTERNAL' ? (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Open Tool
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Launch
                  </>
                )}
              </button>
              <button
                onClick={() => onToggleLibrary(tool.id, !inLibrary)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
                  inLibrary
                    ? 'bg-[#0033A0]/10 text-[#0033A0] border-[#0033A0]/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-[#0033A0]/5 hover:text-[#0033A0] hover:border-[#0033A0]/30'
                }`}
              >
                {inLibrary ? (
                  <>
                    <Check className="w-4 h-4" />
                    In Library
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Get
                  </>
                )}
              </button>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
              <Link
                href={`/profile/${tool.creator.id}`}
                onClick={onClose}
                className="flex items-center gap-1.5 hover:text-[#0033A0] transition-colors"
              >
                <div className="w-4 h-4 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-[9px] font-semibold">
                  {tool.creator.name.charAt(0)}
                </div>
                {tool.creator.name}
              </Link>
              <span>{tool._count.sessions ?? 0} sessions</span>
              <Link
                href={`/tools/${tool.id}`}
                onClick={onClose}
                className="flex items-center gap-0.5 hover:text-[#0033A0] transition-colors"
              >
                View details <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

**Note on shared maps:** The `categoryThumbnailBg`, `categoryColors`, `categoryIcons`, and `difficultyColors` maps appear in this file, `ToolCard.tsx`, and `app/library/page.tsx`. If you prefer to avoid duplication, extract them to `app/lib/tool-display.ts` and import from there in all three files. Either approach is acceptable; just be consistent.

---

## 7. Tool Detail Page Changes (`app/tools/[id]/page.tsx`)

### 7a. Add `useSearchParams` import and hook

Ensure the following are imported at the top of the file:

```typescript
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
```

Inside the page component, add:

```typescript
const searchParams = useSearchParams()
```

### 7b. Add auto-open effect

Add this `useEffect` after the existing data-fetch effects (it depends on `tool` being loaded):

```typescript
useEffect(() => {
  if (
    searchParams.get('launch') === 'true' &&
    tool &&
    tool.toolType !== 'EXTERNAL'
  ) {
    setShowChatbot(true)
    setTimeout(() => {
      document
        .getElementById('chatbot-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }
}, [searchParams, tool])
```

### 7c. Add `id` attribute to chatbot section wrapper

Find the `<div>` that wraps the chatbot toggle button and the chatbot interface area. Add `id="chatbot-section"` to it:

```tsx
<div id="chatbot-section" className="...existing classes...">
  {/* chatbot toggle and interface */}
</div>
```

### 7d. Wrap with Suspense if needed

`useSearchParams()` requires a Suspense boundary in Next.js App Router. If the page component is not already wrapped, wrap the default export:

```typescript
// At the bottom of the file, replace:
export default function ToolDetailPage() { ... }

// With:
function ToolDetailPageInner() { /* ...full component body... */ }

export default function ToolDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ToolDetailPageInner />
    </Suspense>
  )
}
```

Move all existing page logic into `ToolDetailPageInner`.

---

## 8. Tools Page Changes (`app/tools/page.tsx`)

### 8a. Add imports

At the top of the file, add:

```typescript
import { useCallback } from 'react'
import ToolLaunchModal from '../components/ToolLaunchModal'
```

### 8b. Add library state and handlers inside `ToolsPage()`

Add these near the top of the component, after the existing state declarations:

```typescript
const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set())
const [modalTool, setModalTool] = useState<ToolWithDetails | null>(null)

// Fetch user's library IDs once on mount
useEffect(() => {
  fetch('/api/library/ids', {
    headers: { 'x-demo-user-email': currentUser.email },
  })
    .then(r => r.json())
    .then(d => setLibraryIds(new Set(d.libraryIds ?? [])))
    .catch(() => {})
}, [currentUser.email])

const handleToggleLibrary = useCallback(
  async (toolId: string, add: boolean) => {
    // Optimistic update
    setLibraryIds(prev => {
      const next = new Set(prev)
      if (add) next.add(toolId)
      else next.delete(toolId)
      return next
    })
    // Persist to API
    if (add) {
      await fetch('/api/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ toolId }),
      })
    } else {
      await fetch(`/api/library?toolId=${toolId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
    }
  },
  [currentUser.email]
)
```

### 8c. Update every `<ToolCard>` render

Find every place `<ToolCard ... />` is rendered (both the smart recommendation sections and the browse-all grid). Replace the minimal props version with the full props version:

**Before:**
```tsx
<ToolCard key={tool.id} tool={tool} signals={getSignals(tool)} />
```

**After:**
```tsx
<ToolCard
  key={tool.id}
  tool={tool}
  signals={getSignals(tool)}
  inLibrary={libraryIds.has(tool.id)}
  onToggleLibrary={handleToggleLibrary}
  onOpenModal={setModalTool}
/>
```

Apply this pattern to **all** `<ToolCard>` renders in the file.

### 8d. Add modal render at end of return JSX

Just before the final closing `</div>` of the component's return statement, add:

```tsx
{modalTool && (
  <ToolLaunchModal
    tool={modalTool}
    inLibrary={libraryIds.has(modalTool.id)}
    onClose={() => setModalTool(null)}
    onToggleLibrary={handleToggleLibrary}
  />
)}
```

---

## 9. New Page — `app/library/page.tsx`

Create this file in full:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Plus, ExternalLink, BookMarked, Clock, X } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { ToolWithDetails } from '../lib/types'
import { formatDistanceToNow } from 'date-fns'

const categoryThumbnailBg: Record<string, string> = {
  Law: 'bg-indigo-600',
  History: 'bg-amber-600',
  STEM: 'bg-emerald-600',
  Medicine: 'bg-red-600',
  Business: 'bg-blue-600',
  Arts: 'bg-purple-600',
  University: 'bg-sky-600',
  General: 'bg-gray-500',
}

interface LibraryEntry {
  id: string
  toolId: string
  addedAt: string
  tool: ToolWithDetails
  sessionCount: number
  lastSessionAt: string | null
}

interface HistoryEntry {
  toolId: string
  tool: ToolWithDetails
  sessionCount: number
  lastSessionAt: string | null
}

export default function LibraryPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [library, setLibrary] = useState<LibraryEntry[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'recent' | 'used' | 'added'>('recent')
  const [historyVisible, setHistoryVisible] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/library', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then(d => {
        setLibrary(d.library ?? [])
        setHistory(d.history ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser.email])

  const addToLibrary = async (toolId: string) => {
    await fetch('/api/library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ toolId }),
    })
    // Refetch to move entry from history to library
    const res = await fetch('/api/library', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    const d = await res.json()
    setLibrary(d.library ?? [])
    setHistory(d.history ?? [])
  }

  const removeFromLibrary = async (toolId: string) => {
    // Optimistic removal
    setLibrary(prev => prev.filter(e => e.toolId !== toolId))
    await fetch(`/api/library?toolId=${toolId}`, {
      method: 'DELETE',
      headers: { 'x-demo-user-email': currentUser.email },
    })
  }

  const handleLaunch = (tool: ToolWithDetails) => {
    if (tool.toolType === 'EXTERNAL' && tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      router.push(`/tools/${tool.id}?launch=true`)
    }
  }

  const sortedLibrary = [...library].sort((a, b) => {
    if (sort === 'recent') {
      const aDate = a.lastSessionAt ?? a.addedAt
      const bDate = b.lastSessionAt ?? b.addedAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    }
    if (sort === 'used') return b.sessionCount - a.sessionCount
    if (sort === 'added') {
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    }
    return 0
  })

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">My Library</h1>
              <p className="text-gray-500 text-sm mt-1">
                Your saved tools — ready to launch anytime.
              </p>
            </div>
            <Link
              href="/tools"
              className="text-xs font-semibold text-[#0033A0] hover:underline"
            >
              Browse more tools →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* ── MY LIBRARY ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-[#0033A0]" />
              <h2 className="text-base font-extrabold text-gray-900">Saved Tools</h2>
              {!loading && (
                <span className="text-xs text-gray-400">({library.length})</span>
              )}
            </div>
            {library.length > 0 && (
              <select
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border-0 outline-none cursor-pointer"
              >
                <option value="recent">Last Played</option>
                <option value="used">Most Used</option>
                <option value="added">Recently Added</option>
              </select>
            )}
          </div>

          {loading ? (
            // Skeleton grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
                >
                  <div className="h-32 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : library.length === 0 ? (
            // Empty state
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <BookMarked className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-600 mb-1">
                Your library is empty
              </h3>
              <p className="text-sm text-gray-400 mb-5">
                Browse tools and click + to save the ones worth keeping.
              </p>
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#002580] transition-colors"
              >
                Browse Tools
              </Link>
            </div>
          ) : (
            // Library grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sortedLibrary.map(entry => {
                const bgClass =
                  categoryThumbnailBg[entry.tool.category] || 'bg-gray-500'
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {/* Thumbnail */}
                    <div
                      className={`relative h-32 ${bgClass} flex items-center justify-center`}
                    >
                      {entry.tool.thumbnailUrl ? (
                        <Image
                          src={entry.tool.thumbnailUrl}
                          alt={entry.tool.name}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                      {/* Remove button — reveal on hover */}
                      <button
                        onClick={() => removeFromLibrary(entry.toolId)}
                        title="Remove from library"
                        className="absolute top-2 right-2 w-6 h-6 bg-black/40 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Card body */}
                    <div className="p-4">
                      <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
                        {entry.tool.name}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        {entry.sessionCount > 0
                          ? `${entry.sessionCount} session${entry.sessionCount !== 1 ? 's' : ''} · Last used ${formatDistanceToNow(
                              new Date(entry.lastSessionAt!),
                              { addSuffix: true }
                            )}`
                          : 'Never launched'}
                      </p>
                      <button
                        onClick={() => handleLaunch(entry.tool)}
                        className="w-full flex items-center justify-center gap-2 bg-[#0033A0] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#002580] transition-colors"
                      >
                        {entry.tool.toolType === 'EXTERNAL' ? (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Launch
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── SESSION HISTORY ── */}
        {!loading && history.length > 0 && (
          <section>
            <button
              onClick={() => setHistoryVisible(!historyVisible)}
              className="flex items-center gap-2 mb-4"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-extrabold text-gray-900">Session History</h2>
              <span className="text-xs text-gray-400">
                ({history.length} tool{history.length !== 1 ? 's' : ''} tried)
              </span>
              <span className="text-xs text-[#0033A0] font-medium ml-1">
                {historyVisible ? 'Hide' : 'Show'}
              </span>
            </button>

            {historyVisible && (
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {history.map(entry => {
                  const bgClass =
                    categoryThumbnailBg[entry.tool.category] || 'bg-gray-500'
                  return (
                    <div
                      key={entry.toolId}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      {/* Mini thumbnail color swatch */}
                      <div
                        className={`w-10 h-10 rounded-lg ${bgClass} flex-shrink-0`}
                      />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {entry.tool.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {entry.tool.category} ·{' '}
                          {entry.sessionCount} session
                          {entry.sessionCount !== 1 ? 's' : ''} ·{' '}
                          {entry.lastSessionAt
                            ? formatDistanceToNow(
                                new Date(entry.lastSessionAt),
                                { addSuffix: true }
                              )
                            : ''}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleLaunch(entry.tool)}
                          className="text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Launch
                        </button>
                        <button
                          onClick={() => addToLibrary(entry.toolId)}
                          className="text-xs font-semibold text-[#0033A0] border border-[#0033A0]/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add to Library
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
```

---

## 10. Home Page Quick Launch Strip (`app/page.tsx`)

### 10a. Add state and fetch for library entries

Inside the student view section of the home page component, add this state near the other `useEffect` data fetches:

```typescript
const [libraryEntries, setLibraryEntries] = useState<any[]>([])

useEffect(() => {
  if (currentUser.role !== 'STUDENT') return
  fetch('/api/library', {
    headers: { 'x-demo-user-email': currentUser.email },
  })
    .then(r => r.json())
    .then(d => setLibraryEntries(d.library ?? []))
    .catch(() => {})
}, [currentUser.email, currentUser.role])
```

### 10b. Add `categoryThumbnailBg` map

Define or import the shared `categoryThumbnailBg` map (same as in ToolCard and library page):

```typescript
const categoryThumbnailBg: Record<string, string> = {
  Law: 'bg-indigo-600',
  History: 'bg-amber-600',
  STEM: 'bg-emerald-600',
  Medicine: 'bg-red-600',
  Business: 'bg-blue-600',
  Arts: 'bg-purple-600',
  University: 'bg-sky-600',
  General: 'bg-gray-500',
}
```

If `router` from `useRouter()` is not already present in the home page component, add it:

```typescript
const router = useRouter()
```

Ensure `Link` is imported from `'next/link'` if not already.

### 10c. Insert the Quick Launch strip JSX

In the student view's return JSX, insert this block **after the profile card** and **before the Learning Vitals grid**:

```tsx
{/* Quick Launch strip — only shown when student has library tools */}
{libraryEntries.length > 0 && (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-extrabold text-gray-900">Quick Launch</h2>
      <Link
        href="/library"
        className="text-xs text-[#0033A0] font-semibold hover:underline"
      >
        My Library →
      </Link>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {libraryEntries.slice(0, 4).map((entry: any) => {
        const bgClass =
          categoryThumbnailBg[entry.tool.category] || 'bg-gray-500'
        return (
          <button
            key={entry.toolId}
            onClick={() => {
              if (
                entry.tool.toolType === 'EXTERNAL' &&
                entry.tool.externalUrl
              ) {
                window.open(
                  entry.tool.externalUrl,
                  '_blank',
                  'noopener,noreferrer'
                )
              } else {
                router.push(`/tools/${entry.tool.id}?launch=true`)
              }
            }}
            className="group flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-[#0033A0]/30 hover:shadow-sm transition-all text-left"
          >
            <div className={`w-9 h-9 rounded-lg ${bgClass} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#0033A0] transition-colors">
                {entry.tool.name}
              </p>
              <p className="text-[10px] text-gray-400">
                {entry.sessionCount > 0
                  ? `${entry.sessionCount} sessions`
                  : 'Not yet launched'}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  </div>
)}
```

---

## 11. Navigation — Add Library Link

Add a link to `/library` in the main navigation so students can reach the page. In `app/components/Navigation.tsx` (or wherever the nav links are defined), add a "Library" link that is only visible to `STUDENT` role users:

```tsx
{currentUser.role === 'STUDENT' && (
  <Link
    href="/library"
    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === '/library'
        ? 'bg-[#0033A0] text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <BookMarked className="w-4 h-4" />
    Library
  </Link>
)}
```

Import `BookMarked` from `lucide-react` if not already imported.

---

## 12. Files Modified / Created

| Action | File | Change |
|--------|------|--------|
| SCHEMA | `prisma/schema.prisma` | Add `LibraryEntry` model; add `libraryEntries` relation to `User` and `Tool` |
| CREATE | `app/api/library/route.ts` | GET (library + history), POST (add), DELETE (remove) |
| CREATE | `app/api/library/ids/route.ts` | GET — returns `{ libraryIds: string[] }` |
| CREATE | `app/components/ToolLaunchModal.tsx` | Quick-launch modal overlay |
| CREATE | `app/library/page.tsx` | My Library page (saved tools grid + session history list) |
| MODIFY | `app/components/ToolCard.tsx` | Add `inLibrary`, `onToggleLibrary`, `onOpenModal` props; add library toggle button to thumbnail |
| MODIFY | `app/tools/[id]/page.tsx` | Auto-open chatbot on `?launch=true`; add `id="chatbot-section"` |
| MODIFY | `app/tools/page.tsx` | `libraryIds` state, `handleToggleLibrary`, `modalTool` state, pass props to all `<ToolCard>` renders, render `<ToolLaunchModal>` |
| MODIFY | `app/page.tsx` | Quick Launch strip in student view |
| MODIFY | `app/lib/types.ts` | Add `LibraryEntryWithTool` interface |
| MODIFY | `app/components/Navigation.tsx` | Add Library link for STUDENT role |

---

## 13. Verification Checklist

### As maya.johnson@uky.edu (STUDENT)

**Tool Card & Modal:**
- [ ] Browse `/tools` — click any tool card body — modal opens without page navigation
- [ ] Modal shows: tool name, description, category badge, difficulty badge, creator avatar + name, session count
- [ ] Pressing Escape closes the modal
- [ ] Clicking the backdrop closes the modal
- [ ] "View details" link in modal footer navigates to tool detail page
- [ ] "Launch" button in modal navigates to `/tools/[id]?launch=true`
- [ ] Chatbot section auto-opens and scrolls into view on the detail page when `?launch=true` is present
- [ ] "Get" button in modal changes to "In Library" (check icon) after click
- [ ] The `+` icon on the tool card thumbnail toggles independently of the modal
- [ ] `+` button does NOT open the modal (stopPropagation works)
- [ ] After adding via modal, `+` icon on the card behind the modal reflects the new state

**Library Page (`/library`):**
- [ ] Page is reachable from nav (Library link visible only to STUDENT)
- [ ] Saved tools appear in a grid with thumbnail, name, session count, last used date
- [ ] "Launch" button on each card → `/tools/[id]?launch=true`
- [ ] Sort controls ("Last Played", "Most Used", "Recently Added") re-order the grid
- [ ] Remove button (X) appears on thumbnail hover — clicking removes the card immediately (optimistic)
- [ ] Empty state shown when library is empty with "Browse Tools" CTA
- [ ] Session History section shows tools with sessions but not in library
- [ ] "Add to Library" on a history row moves it to the library grid (refetch)
- [ ] History section can be collapsed/expanded with the Hide/Show toggle
- [ ] Skeleton loading state shown while fetching

**Home Page Quick Launch:**
- [ ] Quick Launch strip appears when student has library entries
- [ ] Shows up to 4 cards in a 2-column grid
- [ ] "My Library →" link navigates to `/library`
- [ ] Clicking a quick launch card → `/tools/[id]?launch=true` → chatbot opens

**External tools (any tool with `toolType === 'EXTERNAL'`):**
- [ ] Modal "Open Tool" button opens `externalUrl` in a new tab and closes the modal
- [ ] Library card "Open" button opens URL in new tab
- [ ] Quick launch card click opens URL in new tab
- [ ] Detail page is NOT navigated to for external tools (no `?launch=true` routing)

**State consistency:**
- [ ] Adding to library on `/tools` is reflected on `/library` after navigating there
- [ ] Removing from `/library` does not break the `/tools` page (cards still shown, just no longer in library)
- [ ] `libraryIds` Set on `/tools` page updates optimistically — `+` icon toggles without waiting for API
