# Blueprint: Department Storefronts

> Transform the Hub from a curated showcase (~50 tools in 9 hardcoded swim lanes) into a scalable marketplace where every university unit owns and manages its own storefront — designed for 1,000+ tools.

## The Problem

| Current State | Why It Breaks at Scale |
|---|---|
| 9 swim lanes hardcoded in `hub-config.ts` | Every new tool requires a code change |
| Free-form `Tool.category` strings ("Law", "STEM") | No hierarchy, no ownership, no self-service |
| No organizational unit concept | CELT, Engineering, Student Affairs can't own their corner |
| Flat discovery (one search bar, one grid) | Users drown at 100+ tools, let alone 1,000 |
| Static `ROLE_LANE_ORDER` per role | Can't personalize beyond 4 role buckets |

## The Model

### Mental Model: App Store for a University

```
Hub Homepage
├── Personalized Recommendations (role + history + affiliation)
├── Featured Storefronts (CELT, Engineering, Student Affairs, ...)
│   └── Each storefront = branded page with collections
│       ├── Collection: "Course Design" → [tool, tool, tool]
│       ├── Collection: "Assessment"    → [tool, tool, tool]
│       └── Collection: "TA Training"   → [tool, tool, tool]
├── Platform Collections (evolved swim lanes — "AI Simulates", "Productivity", etc.)
└── Full Catalog (search + faceted filtering)
```

### URL Structure

```
/hub                              → personalized homepage with storefront cards
/hub/browse                       → full catalog with faceted search/filter
/hub/s/celt                       → CELT storefront
/hub/s/celt/course-design         → specific collection within CELT
/hub/s/engineering                → College of Engineering storefront
/hub/s/student-affairs            → Student Affairs storefront
```

The `/hub/s/` prefix keeps storefronts namespaced cleanly and avoids collisions with other hub routes (`/hub/browse`, future `/hub/favorites`, etc.).

---

## Schema Changes

### New Models

```prisma
// ─── Department Storefronts ──────────────────────────────────────────────────

model Department {
  id              String                 @id @default(cuid())
  name            String                 // "Center for the Enhancement of Learning & Teaching"
  shortName       String                 // "CELT"
  slug            String                 @unique  // "celt"
  description     String?                // Shown on storefront page
  logoUrl         String?                // Department logo/crest
  bannerUrl       String?                // Storefront hero banner
  themeColor      String?                // Hex color for branding accent (default: #0033A0)
  websiteUrl      String?                // Link to official department website
  contactEmail    String?                // Department contact email

  visibility      DepartmentVisibility   @default(PUBLIC)
  featured        Boolean                @default(false)  // Pinned to hub homepage
  displayOrder    Int                    @default(0)       // Sort order on hub homepage

  collections     ToolCollection[]
  members         DepartmentMember[]
  followers       DepartmentFollower[]

  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  @@index([slug])
  @@index([featured, displayOrder])
  @@index([visibility])
}

enum DepartmentVisibility {
  PUBLIC          // Anyone can see
  INTERNAL        // Only authenticated users
  ROLE_RESTRICTED // Only specific roles (controlled via DepartmentMember viewer entries)
}

model DepartmentMember {
  id              String              @id @default(cuid())
  departmentId    String
  department      Department          @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  userId          String
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  role            DepartmentMemberRole @default(VIEWER)
  createdAt       DateTime            @default(now())

  @@unique([departmentId, userId])
  @@index([userId])
  @@index([departmentId, role])
}

enum DepartmentMemberRole {
  OWNER           // Full control: edit storefront, manage members, manage collections
  EDITOR          // Manage collections and tools within them
  VIEWER          // Can see ROLE_RESTRICTED departments (everyone can see PUBLIC)
}

model DepartmentFollower {
  id              String     @id @default(cuid())
  departmentId    String
  department      Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  userId          String
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt       DateTime   @default(now())

  @@unique([departmentId, userId])
  @@index([userId])
}

model ToolCollection {
  id              String              @id @default(cuid())
  name            String              // "Course Design Tools"
  slug            String              // "course-design"
  description     String?
  icon            String?             // Lucide icon name (e.g., "BookOpen")
  gradient        String?             // Tailwind gradient classes
  emoji           String?

  departmentId    String?             // null = platform-level collection (evolved swim lane)
  department      Department?         @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  visibility      CollectionVisibility @default(INHERIT)
  displayOrder    Int                 @default(0)
  pinned          Boolean             @default(false)  // Pinned to top of storefront

  tools           CollectionTool[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@unique([departmentId, slug])
  @@index([departmentId, displayOrder])
}

enum CollectionVisibility {
  INHERIT         // Use parent department's visibility
  PUBLIC          // Override: anyone can see
  INTERNAL        // Override: authenticated only
  HIDDEN          // Draft — only department editors can see
}

model CollectionTool {
  id              String         @id @default(cuid())
  collectionId    String
  collection      ToolCollection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  toolId          String
  tool            Tool           @relation(fields: [toolId], references: [id], onDelete: Cascade)
  displayOrder    Int            @default(0)
  pinned          Boolean        @default(false)  // Featured within collection
  addedAt         DateTime       @default(now())

  @@unique([collectionId, toolId])
  @@index([collectionId, displayOrder])
  @@index([toolId])
}
```

### Changes to Existing Models

```prisma
// Add to Tool model:
model Tool {
  // ... existing fields ...
  collectionEntries  CollectionTool[]     // Tool can appear in multiple collections
}

// Add to User model:
model User {
  // ... existing fields ...
  departmentMemberships  DepartmentMember[]
  departmentFollows      DepartmentFollower[]
}
```

### What We're NOT Changing

- `Tool.category` stays — it's used for ToolsBrowser filtering and is orthogonal to collections
- `Tool.approvalStatus` stays — a tool must still be APPROVED before it appears in any storefront
- Swim lanes in `hub-config.ts` stay temporarily — they become the seed data for platform-level ToolCollections in the migration sprint

---

## Implementation Plan

### Sprint 1: Schema + CRUD API (foundation)

**Goal:** Department and ToolCollection models exist, CRUD routes work, admin can create storefronts.

**Tasks:**

1. **Schema migration**
   - Add `Department`, `DepartmentMember`, `DepartmentFollower`, `ToolCollection`, `CollectionTool` models
   - Add `collectionEntries` relation to `Tool`
   - Add `departmentMemberships` and `departmentFollows` relations to `User`
   - Run `prisma migrate dev --name add-department-storefronts`

2. **Service layer:** `app/lib/department-service.ts`
   - `createDepartment(data, creatorId)` — creates department + adds creator as OWNER
   - `updateDepartment(id, data, userId)` — requires OWNER
   - `getDepartment(slug)` — public read with collections + tool counts
   - `listDepartments(options)` — paginated, filterable by visibility/featured
   - `addMember(departmentId, userId, role)` — requires OWNER
   - `removeMember(departmentId, userId)` — requires OWNER
   - `followDepartment(departmentId, userId)` / `unfollowDepartment()`

3. **Service layer:** `app/lib/collection-service.ts`
   - `createCollection(departmentId, data, userId)` — requires EDITOR+
   - `updateCollection(id, data, userId)`
   - `deleteCollection(id, userId)`
   - `addToolToCollection(collectionId, toolId, userId)` — requires EDITOR+
   - `removeToolFromCollection(collectionId, toolId, userId)`
   - `reorderTools(collectionId, toolIds[], userId)` — set displayOrder

4. **API routes** (thin handlers following existing pattern):
   ```
   app/api/departments/
   ├── route.ts                    GET (list) + POST (create, admin only)
   └── [slug]/
       ├── route.ts                GET (read) + PATCH (update)
       ├── members/
       │   └── route.ts            GET + POST + DELETE
       ├── followers/
       │   └── route.ts            POST (follow) + DELETE (unfollow)
       └── collections/
           ├── route.ts            GET (list) + POST (create)
           └── [collectionSlug]/
               ├── route.ts        GET + PATCH + DELETE
               └── tools/
                   └── route.ts    GET + POST + DELETE + PATCH (reorder)
   ```

5. **Auth guard:** `requireDepartmentEditor(req, departmentId)` — checks DepartmentMember role >= EDITOR

6. **Seed script:** `scripts/seed-departments.ts`
   - Create ~8 starter departments: CELT, College of Engineering, College of Arts & Sciences, Student Affairs, College of Medicine, College of Law, Graduate School, Athletics
   - Assign existing tools to collections within each department
   - Assign demo users as department owners (heath = CELT owner, katie = Engineering editor, etc.)

### Sprint 2: Storefront Page + Hub Redesign (the visible shift)

**Goal:** Users can browse department storefronts; hub homepage shows department cards alongside swim lanes.

**Tasks:**

1. **Storefront page:** `app/hub/s/[slug]/page.tsx`
   - Fetches department by slug with collections + tools
   - Branded header: department logo, banner, name, description, follow button, member count
   - Collection rows (like swim lanes but data-driven) — each renders a horizontal row of ShowcaseCards
   - "All tools" section at bottom (every tool across all collections, deduplicated)
   - Sandy context: department info injected into concierge page context

2. **Collection page:** `app/hub/s/[slug]/[collectionSlug]/page.tsx`
   - Full grid view of tools in a specific collection
   - Breadcrumb: Hub → Department → Collection
   - Sort/filter within collection

3. **Hub homepage redesign:** update `app/hub/page.tsx`
   - Keep HeroBanner (unchanged)
   - **New section: "Your Storefronts"** — departments the user follows or is a member of (horizontal cards)
   - **New section: "Featured Storefronts"** — departments where `featured=true`, sorted by `displayOrder`
   - Keep swim lanes (now labeled "Platform Collections" visually, still from `hub-config.ts` — migration later)
   - Keep "Built by Wildcats" section
   - Keep "Browse all tools" toggle
   - Add department filter to ToolsBrowser

4. **Department card component:** `app/components/hub/DepartmentCard.tsx`
   - Logo, short name, description snippet, tool count, collection count
   - Click → navigates to `/hub/s/[slug]`

5. **Browse page:** `app/hub/browse/page.tsx`
   - Enhanced ToolsBrowser with faceted filtering:
     - Department (multi-select)
     - Collection (filtered by selected department)
     - Existing: category, toolType, sort, search
   - URL state via searchParams for shareable filtered views

### Sprint 3: Department Admin UI (self-service)

**Goal:** Department owners and editors can manage their storefront without touching code.

**Tasks:**

1. **Department settings page:** `app/hub/s/[slug]/settings/page.tsx`
   - Edit name, description, logo, banner, theme color, website, contact email
   - Visibility toggle
   - Member management: invite by email, change roles, remove
   - Only visible to OWNER

2. **Collection manager:** `app/hub/s/[slug]/settings/collections/page.tsx`
   - Create/edit/delete/reorder collections
   - Drag-and-drop reorder (or up/down arrows)
   - Per-collection: add tools (search existing catalog), remove tools, reorder tools, pin tools

3. **Tool picker modal:** `app/components/hub/ToolPickerModal.tsx`
   - Search the full tool catalog (reuses `/api/tools` endpoint)
   - Shows which collections each tool is already in
   - Bulk add to collection

4. **Department analytics:** `app/hub/s/[slug]/settings/analytics/page.tsx`
   - Total sessions across department tools
   - Top tools by usage
   - Tool count by collection
   - Follower growth (simple count, not time series yet)

### Sprint 4: Sandy Integration + Migration (intelligence layer)

**Goal:** Sandy understands departments; existing swim lanes migrated to collections.

**Tasks:**

1. **Sandy concierge integration**
   - `concierge-service.ts`: when user asks "find me a tool for X", search across department collections
   - New Sandy tool: `search_department_tools(query, department?)` in `campus-tools.ts`
   - Department context in system prompt when user is on a storefront page
   - "What tools does CELT offer?" → direct answer from department data

2. **Migrate swim lanes to platform collections**
   - Create a "Platform" pseudo-department (or use `departmentId: null` for platform-level collections)
   - Map each swim lane → ToolCollection with `departmentId: null`
   - Migrate `hub-config.ts` tools → CollectionTool entries
   - Hub homepage reads from DB instead of static config
   - Delete `hub-config.ts` (or keep as fallback during transition)

3. **Role-based personalization upgrade**
   - `ROLE_LANE_ORDER` replaced by: user's department memberships → followed departments → featured departments → platform collections
   - User's college (from `User.college`) auto-surfaces matching department storefront

4. **Notification hooks**
   - When a new tool is added to a department → notify followers
   - When a collection is updated → optional digest (weekly)

### Sprint 5: Scale Features (1,000+ tools)

**Goal:** The system works well at scale.

**Tasks:**

1. **Search improvements**
   - Full-text search across tool name + description + department name + collection name
   - Typeahead/autocomplete in hub search bar
   - Recent searches + popular searches

2. **Recommendation engine**
   - Factor in: user's department, role, session history, followed departments, college
   - "Because you used X, try Y" on hub homepage
   - "Popular in CELT this week" section on storefront

3. **Tool request workflow**
   - Department editors can submit tool requests (already have `ToolRequest` model)
   - Sandy can route: "I need a rubric generator" → suggests existing tool OR creates request for CELT

4. **Department discovery**
   - `/hub/departments` page — browse all departments
   - Category tags on departments (Academic, Administrative, Student Services, Research)
   - "Suggested for you" based on user profile

---

## Data Migration Strategy

### Phase 1: Seed Departments (Sprint 1)

Map existing concepts to departments:

| Department | Slug | Seed From |
|---|---|---|
| CELT | `celt` | New — faculty development tools |
| College of Medicine | `medicine` | Tools with category "Medicine" + medical sims |
| College of Law | `law` | Tools with category "Law" + legal sims |
| College of Engineering | `engineering` | STEM tools + circuit/physics sims |
| Student Affairs | `student-affairs` | Campus life + wellness tools |
| Graduate School | `graduate-school` | Research hub + thesis tools |
| Office of the Registrar | `registrar` | Registrar command center tools |
| University Communications | `communications` | Crisis comms tools |
| Innovation & Commercialization | `innovation` | Innovation lab tools |
| Athletics | `athletics` | The Bracket, sports-related |

### Phase 2: Map Tools to Collections (Sprint 1 seed)

Current swim lanes map naturally:

| Swim Lane | → Department | → Collection |
|---|---|---|
| `ai-teaches` | Platform | "AI Teaching Tools" |
| `ai-simulates` | Platform | "AI Simulations" |
| `live-interactive` | Platform | "Live & Interactive" |
| `crisis-comms` | Communications | "Crisis Response" |
| `faculty-intelligence` | CELT | "Faculty Intelligence" |
| `campus-life` | Student Affairs | "Campus Life" |
| `productivity` | Platform | "Productivity" |
| `staff-tools` | Platform | "Staff & Operations" |
| `innovation` | Innovation | "Innovation & IP" |
| `wellness` | Student Affairs | "Wellness" |

### Phase 3: Remove Static Config (Sprint 4)

Once all swim lane data is in the DB, `hub-config.ts` becomes dead code and gets deleted.

---

## Example: CELT Storefront

After Sprint 2, visiting `/hub/s/celt` would show:

```
┌─────────────────────────────────────────────────────┐
│  [CELT Logo]  Center for the Enhancement of         │
│               Learning & Teaching                   │
│                                                     │
│  Supporting teaching excellence at UK               │
│  [Follow] [12 tools] [4 collections]                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📐 Course Design                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│  │Syllab│ │Exam  │ │Prereq│ │Bloom │               │
│  │Archi │ │Forge │ │Unpack│ │Align │               │
│  └──────┘ └──────┘ └──────┘ └──────┘               │
│                                                     │
│  📊 Assessment & Feedback                           │
│  ┌──────┐ ┌──────┐ ┌──────┐                        │
│  │Grade │ │Rubric│ │Peer  │                         │
│  │Analy │ │Build │ │Revie │                         │
│  └──────┘ └──────┘ └──────┘                        │
│                                                     │
│  🎓 TA Training                                     │
│  ┌──────┐ ┌──────┐                                  │
│  │Teach │ │Offic │                                  │
│  │Back  │ │Hours │                                  │
│  └──────┘ └──────┘                                  │
│                                                     │
│  📝 Post-Lecture                                    │
│  ┌──────┐ ┌──────┐                                  │
│  │Lectu │ │Surve │                                  │
│  │Debri │ │Analy │                                  │
│  └──────┘ └──────┘                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

A department editor at CELT could:
- Add new tools to any collection via the settings UI
- Reorder collections and tools within them
- Create new collections (e.g., "Inclusive Teaching")
- Invite other CELT staff as editors
- See usage analytics for their storefront

---

## Key Design Decisions

### 1. Tools can live in multiple collections/departments
A tool like "Exam Forge" might appear in CELT's "Assessment" collection AND the platform's "AI Teaching Tools" collection. The `CollectionTool` junction table makes this cheap.

### 2. Platform collections replace swim lanes
Collections with `departmentId: null` are platform-level — curated by admins, not owned by any department. This is the evolutionary path for existing swim lanes.

### 3. Departments don't own tools — they curate them
A tool's `creatorId` stays with whoever built it. Departments just organize references via `CollectionTool`. This means:
- Same tool catalog, different lenses
- No ownership conflicts
- A tool can be removed from a storefront without deleting the tool

### 4. Visibility cascades
Department visibility → Collection visibility (unless overridden). A HIDDEN collection in a PUBLIC department is only visible to editors — useful for staging new collections before launch.

### 5. Admin creates departments, owners manage them
Only ADMIN users can create new departments (prevents sprawl). Once created, the department OWNER handles everything else: collections, members, branding.

---

## What This Enables Long-Term

- **1,000+ tools**: Every department manages their own slice — no central bottleneck
- **Self-service**: CELT, Engineering, etc. don't need dev support to add/organize tools
- **Department identity**: Each unit has a branded presence within the Sandbox
- **Cross-pollination**: A tool built by an Engineering professor can appear in CELT's storefront too
- **Sandy routing**: "I need help with teaching" → surfaces CELT tools; "I need a simulation" → surfaces platform collections
- **Metrics per unit**: Each department sees how their tools perform
- **Governance**: Approval flow unchanged — tools must still be APPROVED to appear anywhere
- **External partnerships**: A vendor or partner (e.g., Turnitin, Coursera) could eventually get their own storefront
