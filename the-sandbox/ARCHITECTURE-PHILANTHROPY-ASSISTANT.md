# Architecture: AXO Philanthropy Assistant (Sandbox Integration)

> Rewrite of the standalone Chaelyn Philanthropy Express app as a first-class Sandbox feature.
> Pattern: Sandy Interview Mode (split-panel) + multi-step wizard with on-demand content generation.

---

## Status: Complete (5/5 Phases — 2026-03-29)

---

## Origin

Standalone Express + vanilla JS app at `c:\AA Code\Chaelyn Philanthropy\`.
5 API endpoints, ~1200-line frontend, localStorage persistence.
Currently deployed at `chaelyn-philanthropy.vercel.app` and listed as a PORTFOLIO app in the Hub.

---

## Goal

Convert to a native Sandbox page with:
- Sandy-guided interview replacing the static form
- Shared auth (no separate login)
- Persistent campaigns in Prisma (not localStorage)
- Sandy agent tools (start campaign from any page)
- Hub swim lane placement
- Consistent Tailwind UI matching platform design system

---

## Architecture Overview

```
User clicks "Philanthropy Assistant" in Hub
        |
        v
/philanthropy-assistant (page.tsx)
        |
        +-- usePhilanthropyAssistant.ts (hook, state machine)
        |       |
        |       +-- GET /api/philanthropy/preflight
        |       |       -> user profile, past campaigns, org defaults
        |       |
        |       +-- POST /api/philanthropy/generate-businesses (streaming)
        |       |       -> 10 businesses with coordinates, contact info
        |       |
        |       +-- POST /api/philanthropy/generate-script
        |       |       -> single phone script (Haiku, fast)
        |       |
        |       +-- POST /api/philanthropy/generate-email
        |       |       -> { subject, body }
        |       |
        |       +-- POST /api/philanthropy/generate-followup
        |       |       -> { subject, body }
        |       |
        |       +-- POST /api/philanthropy/save
        |               -> persist campaign to PhilanthropyCampaign model
        |
        +-- Left panel (lg:col-span-7): Wizard UI
        |       Phase 1: CampaignForm (org, donation types, philanthropy, event, city)
        |       Phase 2: BusinessResults (cards, map, selection, CSV export)
        |       Phase 3: OutreachMaterials (accordion per business, tabbed scripts/emails)
        |
        +-- Right panel (lg:col-span-5): SandyInterviewPanel
                Sandy guides through form, suggests businesses, coaches on outreach
```

---

## Phases (5 sprints)

### Phase 1: Page + Form + Business Generation

**Create:**
- `app/philanthropy-assistant/page.tsx` — client component, split-panel layout
- `app/hooks/usePhilanthropyAssistant.ts` — state machine hook
- `app/lib/philanthropy/types.ts` — shared types
- `app/lib/philanthropy/business-service.ts` — business generation prompt + streaming
- `app/lib/philanthropy/preflight.ts` — user context aggregation
- `app/api/philanthropy/preflight/route.ts`
- `app/api/philanthropy/generate-businesses/route.ts` (streaming)
- `app/components/philanthropy/CampaignForm.tsx` — org, donation types, philanthropy, event, city
- `app/components/philanthropy/BusinessCard.tsx` — business result card with likeliness badge
- `app/components/philanthropy/BusinessResults.tsx` — grid + selection + map toggle

**State machine phases:**
```
setup -> generating -> results -> outreach
  ^                                  |
  +------ (Start Over) -------------+
```

**Form fields (carried from original):**
| Field | Type | Required | Default |
|-------|------|----------|---------|
| organization | text | yes | user's org or empty |
| donationType | multi-select | yes | [] |
| philanthropy | textarea | yes | '' |
| eventName | text | no | '' |
| eventDate | date | no | null |
| desiredItems | multi-select | if Silent Auction | [] |
| city | text | yes | 'Lexington, KY' |

**Donation type options:** Event Sponsorships, Silent Auction Items, Scholarships, In-Kind Donations, Other

**Business generation:**
- Model: Sonnet (same as original — accuracy matters for business recommendations)
- max_tokens: 3072
- Returns 10 businesses with: name, type, categories, mission, communityImpact, donationPotential, location, lat/lng, phone, email, website, likeliness
- Stream response with progress markers for loading UI

### Phase 2: Outreach Materials (Scripts, Emails, Follow-ups)

**Create:**
- `app/lib/philanthropy/outreach-service.ts` — script/email/followup prompts
- `app/api/philanthropy/generate-script/route.ts`
- `app/api/philanthropy/generate-email/route.ts`
- `app/api/philanthropy/generate-followup/route.ts`
- `app/components/philanthropy/OutreachAccordion.tsx` — per-business expandable panel
- `app/components/philanthropy/OutreachTabs.tsx` — Phone Script | Email | Follow-Up tabs
- `app/components/philanthropy/ContactStatusBadge.tsx` — status dropdown per business

**Content generation (on-demand, not batch):**
| Type | Model | max_tokens | Latency |
|------|-------|------------|---------|
| Phone script | Haiku | 1024 | ~2s |
| Email | Sonnet | 1024 | ~5s |
| Follow-up | Sonnet | 512 | ~3s |

Scripts use Haiku for speed (original app's design — scripts are simpler, need fast turnaround when generating for 5 businesses in parallel).

**Actions per outreach item:**
- Copy to clipboard
- Open in email client (mailto: link for emails)
- Regenerate
- Contact status tracking (Not Contacted / Called / Emailed / Waiting / Got Donation / Declined)

### Phase 3: Persistence + Sandy Interview Mode

**Schema addition:**
```prisma
model PhilanthropyCampaign {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id])

  organization       String
  philanthropy       String
  city               String
  donationType       String[]
  eventName          String?
  eventDate          DateTime?
  desiredItems       String[]

  businesses         Json     // AI-generated business list (10 items)
  selectedBusinesses Json     // User's picks (up to 5)
  scripts            Json     // { "Business Name": "script text" }
  emails             Json     // { "Business Name": { subject, body } }
  followups          Json     // { "Business Name": { subject, body } }
  contactStatus      Json     // { "Business Name": "called"|"emailed"|... }

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([userId])
}
```

**Create:**
- `app/api/philanthropy/save/route.ts` — POST to persist campaign
- `app/api/philanthropy/campaigns/route.ts` — GET past campaigns
- `app/lib/philanthropy/interview-service.ts` — Sandy interview prompts (phase-aware)
- `app/api/philanthropy/interview/route.ts` — streaming Sandy chat

**Sandy interview flow:**
Sandy replaces the static form with a conversational intake:
1. "What organization are you with?" (auto-fills if known from profile)
2. "What kind of donations are you looking for?" (chip suggestions)
3. "Tell me about your philanthropy mission" (free text)
4. "Any specific event coming up?" (optional)
5. "What city should I search?" (default: Lexington)

Sandy uses `<!--CHIPS:[...]-->` for quick-reply suggestions and `<!--PHASE:generating-->` to trigger business search.

After results load, Sandy shifts to coaching mode:
- "I found 10 businesses. The top 3 matches are..."
- "Want me to generate a phone script for [business]?"
- "Here's a tip: mention their community involvement first"

### Phase 4: Sandy Agent Tools + Hub Integration

**Create:**
- `app/lib/agent/tools/philanthropy-tools.ts` — 3 Sandy tools

**Sandy tools:**
| Tool | Description | Roles |
|------|-------------|-------|
| `start_philanthropy_campaign` | Navigate to Philanthropy Assistant, optionally pre-fill org/city | ALL |
| `get_campaign_history` | List past campaigns with contact status summary | ALL |
| `get_outreach_tip` | Quick philanthropy coaching tip (no navigation) | ALL |

**Hub placement:**
- Add to `hub-config.ts` swim lanes — visible in "Community & Outreach" or a new "Greek Life" lane
- Tool card: Heart icon, rose gradient
- Also remains in "Built by Wildcats" section (upgraded from PORTFOLIO to native)

**Remove old PORTFOLIO entry:**
- Update `seed-portfolio-apps.ts` to remove the external URL version
- Or keep it as a redirect to the new native route

### Phase 5: Map + Export + Polish

**Create:**
- `app/components/philanthropy/BusinessMap.tsx` — Leaflet map (dynamic import, ssr: false)
- `app/components/philanthropy/ExportCSV.tsx` — CSV download of business list

**Map features (carried from original):**
- Circle markers colored by likeliness (green=High, gold=Medium, red=Low)
- Click marker to select business
- Fit bounds to show all 10

**Export:**
- CSV with columns: Name, Type, Mission, Donation Potential, Location, Phone, Email, Website, Likeliness, Contact Status
- Print/Save PDF button for outreach materials

**Polish:**
- Loading animation with rotating messages (16 messages from original)
- Mobile responsive (single column, tab toggle for Sandy panel)
- PageHeader component with standard Pattern A header
- Empty state for first-time users

---

## File Inventory

### New files (24)

```
app/philanthropy-assistant/
  page.tsx                              # Client page component

app/hooks/
  usePhilanthropyAssistant.ts           # State machine hook

app/lib/philanthropy/
  types.ts                              # Shared types
  preflight.ts                          # User context aggregation
  business-service.ts                   # Business generation (Sonnet)
  outreach-service.ts                   # Script/email/followup generation
  interview-service.ts                  # Sandy interview prompts

app/api/philanthropy/
  preflight/route.ts                    # GET preflight data
  generate-businesses/route.ts          # POST streaming business generation
  generate-script/route.ts              # POST phone script (Haiku)
  generate-email/route.ts               # POST email generation
  generate-followup/route.ts            # POST follow-up generation
  interview/route.ts                    # POST Sandy chat streaming
  save/route.ts                         # POST persist campaign
  campaigns/route.ts                    # GET past campaigns

app/components/philanthropy/
  CampaignForm.tsx                      # Form fields (org, types, mission, event, city)
  BusinessCard.tsx                      # Single business result card
  BusinessResults.tsx                   # Grid + selection + filter/sort
  BusinessMap.tsx                       # Leaflet map (dynamic import)
  OutreachAccordion.tsx                 # Per-business expandable panel
  OutreachTabs.tsx                      # Phone | Email | Follow-Up tabs
  ContactStatusBadge.tsx                # Status dropdown
  ExportCSV.tsx                         # CSV download button

app/lib/agent/tools/
  philanthropy-tools.ts                 # 3 Sandy agent tools
```

### Modified files (6)

```
prisma/schema.prisma                    # Add PhilanthropyCampaign model
app/lib/agent/tool-registry.ts          # Register philanthropy tools
app/hub/hub-config.ts                   # Add to swim lane
prisma/seed-portfolio-apps.ts           # Update/remove old PORTFOLIO entry
prisma/seed.ts                          # Update/remove old PORTFOLIO entry
app/lib/concierge-service.ts            # Add page context for /philanthropy-assistant
```

---

## Prompts (carried from original, adapted)

All 4 generation prompts are preserved verbatim from `server.js` — they work well and produce consistent JSON output. The only changes:
1. Wrap in service functions with proper TypeScript signatures
2. Add user context from preflight (Sandy can reference user's profile/courses)
3. Sandy interview mode adds a conversational layer on top, but the underlying generation prompts stay the same

---

## Models Used

| Endpoint | Model | Why |
|----------|-------|-----|
| Business generation | Sonnet | Accuracy for business recommendations + structured JSON |
| Phone scripts | Haiku | Speed — generating 5 scripts in parallel needs fast turnaround |
| Emails | Sonnet | Quality — formal business communication |
| Follow-ups | Sonnet | Quality — needs to reference prior outreach naturally |
| Sandy interview | Haiku | Conversational flow, low latency |

---

## Migration Path

1. Phase 1-2 can ship as a standalone page (no Sandy interview yet, just the form wizard)
2. Phase 3 adds Sandy + persistence — the tool becomes "elevated"
3. Phase 4 makes it discoverable from anywhere via Sandy
4. Phase 5 adds the map and export polish

Each phase is independently deployable. Phase 1-2 alone is a functional replacement for the standalone app.

---

## What's NOT Changing

- The 4 AI prompts (business generation, scripts, emails, follow-ups) — proven and effective
- The 5-business selection cap — good UX constraint
- The on-demand generation pattern (generate script/email only when user clicks) — avoids wasted API calls
- The likeliness scoring system (High/Medium/Low) — simple and useful
- Contact status tracking — essential for campaign management

---

## Risk & Dependencies

| Risk | Mitigation |
|------|-----------|
| Leaflet SSR crash | Dynamic import with `ssr: false` (same as campus-map) |
| Business JSON parse failure | `cleanJSON()` utility + retry button |
| Haiku parallel script generation | `Promise.allSettled` — partial success OK |
| Schema migration | Single model, no relations beyond User — low risk |
| ANTHROPIC_API_KEY cost | Haiku for scripts keeps cost low; Sonnet only for businesses + emails |
