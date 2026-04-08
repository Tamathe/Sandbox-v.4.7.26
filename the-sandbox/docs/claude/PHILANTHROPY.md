# AXO Philanthropy Assistant Reference Doc

> **Claude Code reference document** extracted from the project's `CLAUDE.md`.
> Read this file when working on the philanthropy assistant, campaign workflows, business search, or outreach generation features.

---

## AXO Philanthropy Assistant (5/5 Phases, 2026-03-29)

Rewrite of standalone Chaelyn Philanthropy Express app as a native Sandbox feature. Sandy-guided multi-step wizard that finds local businesses and generates personalized outreach materials. Architecture doc: `ARCHITECTURE-PHILANTHROPY-ASSISTANT.md`.

**Origin**: Standalone app at `c:\AA Code\Chaelyn Philanthropy\` -- Express + vanilla JS, 5 endpoints. All prompts carried verbatim into Sandbox services.

---

## Page & Layout

- **Page**: `app/philanthropy-assistant/page.tsx` -- split-panel layout (wizard left 7 cols, Sandy right 5 cols), mobile tab toggle
- **Hook**: `app/hooks/usePhilanthropyAssistant.ts` -- phase state machine (form --> generating --> results --> outreach), Sandy interview chat with streaming + marker extraction, auto-save on outreach entry

---

## Services (4 in `app/lib/philanthropy/`)

| File | Purpose |
|---|---|
| `types.ts` | Shared TypeScript interfaces |
| `preflight.ts` | Pre-load user profile + past campaigns |
| `business-service.ts` | Sonnet-powered search -- returns 10 businesses with coordinates |
| `outreach-service.ts` | Script via Haiku, email + follow-up via Sonnet |
| `interview-service.ts` | Sandy phase-aware prompts with `<!--CHIPS:[...]-->` + `<!--PHASE:name-->` markers |

---

## Schema

`PhilanthropyCampaign` model -- fields: org, philanthropy, city, donationType[], businesses/selectedBusinesses/scripts/emails/followups/contactStatus as Json

---

## API (8 routes under `/api/philanthropy/`)

| Route | Method | Purpose |
|---|---|---|
| `preflight` | GET | Load user context + past campaigns |
| `generate-businesses` | POST | Sonnet generates 10 matching businesses |
| `generate-script` | POST | Haiku generates phone script |
| `generate-email` | POST | Sonnet generates outreach email |
| `generate-followup` | POST | Sonnet generates follow-up message |
| `interview` | POST | Streaming Haiku Sandy interview |
| `save` | POST | Persist campaign to DB |
| `campaigns` | GET | List past campaigns |

---

## Components (6 in `app/components/philanthropy/`)

| Component | Purpose |
|---|---|
| `CampaignForm` | Donation types, mission, event, city inputs |
| `BusinessCard` | Likeliness badge, contact links, verify button |
| `BusinessResults` | Grid + filter/sort + CSV export + map toggle |
| `BusinessMap` | Leaflet map (dynamic import), likeliness-colored markers |
| `OutreachPanel` | Accordion per business, tabbed scripts/emails/follow-ups, contact status |
| `LoadingScreen` | Exponential progress bar + elapsed timer + rotating messages |

---

## Sandy Agent Tools (3 in `philanthropy-tools.ts`)

| Tool | Purpose |
|---|---|
| `start_philanthropy_campaign` | Navigate + pre-fill campaign form |
| `get_campaign_history` | Past campaigns with contact status summary |
| `get_outreach_tip` | 5 coaching topics: cold-call, email, follow-up, objections, general |

---

## Hub & Navigation

- **Hub**: "Greek Life & Outreach" swim lane in `hub-config.ts`
- **Sandy page starters**: In `concierge-utils.ts`
- **Page context**: In `concierge-service.ts`
