# University of Kentucky — Architecture Overview

**AI-Powered Campus Operating System | University of Kentucky**

---

## System Topology

```
                            ┌──────────────────────────────┐
                            │         70,000 USERS          │
                            │  Students  Faculty  Staff     │
                            └──────────────┬───────────────┘
                                           │
                            ┌──────────────▼───────────────┐
                            │     VERCEL EDGE NETWORK       │
                            │     (CDN + Edge Functions)    │
                            └──────────────┬───────────────┘
                                           │
┌──────────────────────────────────────────▼──────────────────────────────────────────┐
│                              NEXT.JS 16 APPLICATION                                 │
│                                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │  AUTH LAYER  │──▶│ 95 API ROUTE │──▶│ 380+ SERVICE │──▶│  PRISMA ORM v7       │  │
│  │  JWT + RBAC  │   │  DIRECTORIES │   │    FILES     │   │  274 Data Models     │  │
│  │  6 Guards    │   │  ~736 Files  │   │  Domain Logic│   │  pgvector Embeddings │  │
│  └─────────────┘   └──────────────┘   └──────────────┘   └──────────────────────┘  │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │                        39 PAGE ROUTES + 44 COMPONENT MODULES                    ││
│  │                                                                                 ││
│  │  LEARNING        WORK             COMMUNITY        ADMINISTRATION               ││
│  │  ─────────       ──────           ──────────       ──────────────               ││
│  │  Study Buddy     Course Builder   Messaging        Admin Dashboard              ││
│  │  (7 modes)       Syllabus Arch.   Live Rooms (4)   Registrar (7)               ││
│  │  Exam Forge      Playground       Campus Life      Compliance                   ││
│  │  Debate Arena    Research Hub     UKNow News       Staff Ops (15)              ││
│  │  Office Hours    Portfolio        Brackets         Analytics                    ││
│  │  Lecture Debrief Innovation Lab   Crisis Comms     Degree Audit                ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────┐
│                            SANDY — UNIVERSAL AI AGENT                              │
│                                                                                    │
│  ┌──────────┐  ┌──────────────────────────────────────────────────────────────────┐│
│  │ Agent    │  │                    10 TOOL MODULES (59 TOOLS)                    ││
│  │ Loop     │  │                                                                  ││
│  │          │  │  Academic (10)  Communication (9)  Calendar (6)  Campus (9)      ││
│  │ Streaming│  │  Sandy Core (5) Analytics (4)      Content (6)   Faculty (5)     ││
│  │ SSE      │  │  Tasks (3)      Documents (2)                                    ││
│  └──────────┘  └──────────────────────────────────────────────────────────────────┘│
│                                                                                    │
│  Claude Haiku 4.5 (real-time chat) ──── Claude Sonnet 4.6 (complex analysis)      │
│  Page-aware context ──── Role-adaptive prompts ──── Tool_use native execution     │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                       │
│                                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │   AI SERVICES    │  │    DATA LAYER    │  │  INTEGRATIONS   │                    │
│  │                  │  │                  │  │                  │                    │
│  │ Anthropic Claude │  │ Neon PostgreSQL  │  │ Canvas LMS       │                    │
│  │ (Haiku + Sonnet) │  │ + pgvector       │  │ Banner SIS       │                    │
│  │                  │  │                  │  │                  │                    │
│  │ OpenAI Embeddings│  │ Upstash Redis    │  │ Resend Email     │                    │
│  │ (text-embed-3)   │  │ (rate limit +    │  │                  │                    │
│  │                  │  │  pub/sub)        │  │ Azure Blob       │                    │
│  │ Azure Speech TTS │  │                  │  │ Storage + CDN    │                    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Request Pipeline

```
User Browser
    │
    ▼
proxy.ts ─── JWT cookie verification (sandbox-session, 7-day, httpOnly)
    │
    ▼
Route Handler ─── Auth guard (requireRequestUser / requireAdmin / requireEducator / etc.)
    │                  │
    │                  └── 60-second LRU cache (500 entries)
    ▼
Service Layer ─── Business logic + AI integration
    │                  │
    │                  ├── Rate limiting: 6 tiers (Upstash Redis)
    │                  │     CHAT: 60/min │ GENERATE: 10/min │ AUDIO: 20/min
    │                  │     API: 120/min │ AUTH: 5/min      │ 3x for faculty
    │                  │
    │                  └── AI calls: Claude tool_use + RAG retrieval
    ▼
Prisma ORM ─── PostgreSQL (Neon, pooled connections)
    │
    ▼
Response ─── JSON (REST) or SSE (streaming chat)
```

---

## Role-Based Access Control

| Role | Population | Access Scope |
|------|-----------|-------------|
| **STUDENT** | ~60,000 | Own data, enrolled courses, learning tools, messaging |
| **EDUCATOR** | ~5,000 | Own courses + enrolled students, course builder, grading |
| **STAFF** | ~4,000 | Operations: policies, communications, committees, briefings |
| **REGISTRAR** | ~50 | Student 360, degree audit, petitions, enrollment, compliance |
| **ADMIN** | ~10 | Full platform access, user management, system configuration |

Every API route calls an auth guard before any database access. No exceptions.

---

## Real-Time Features

| Feature | Technology | Endpoint |
|---------|-----------|----------|
| Sandy Chat | SSE (Server-Sent Events) | `/api/chat`, `/api/concierge` |
| Live Rooms (4 types) | Redis Streams + EventEmitter | `/api/live-rooms/stream` |
| Sandcastle Drawing | WebSocket (JWT-secured) | External WS server |
| Collaborative Editing | Upstash Redis Pub/Sub | `/api/collab` |

---

## Scheduled Operations (11 Cron Jobs)

| Schedule | Job | Purpose |
|----------|-----|---------|
| Every 2 min | Sandcastle timeout | Close stale Q&A sessions |
| Daily 2 AM | Effectiveness rollup | Aggregate learning analytics |
| Daily 3 AM | Curriculum audit | Flag curriculum gaps |
| Daily 5 AM | Consent expiry | Check consent version compliance |
| Daily 6 AM | UKNow ingest | Pull campus news via RSS |
| Daily 7 AM | UKNow digest | Email news summary to subscribers |
| Daily 7 AM | Compliance notifications | Daily compliance digest |
| Weekly Mon 7 AM | Review expiry | Close stale peer reviews |
| Weekly Mon 8 AM | FERPA reminder | Remind staff of training obligations |
| Weekly Mon 1 PM | Brackets digest | Community bracket standings |
| Weekly Fri 12 PM | Book recommender | Reading suggestions digest |

All cron endpoints protected by `CRON_SECRET` (timing-safe comparison).

---

## Data Architecture

- **274 Prisma models** across 12 domains (Users, Courses, Tools, Learning, Chat, Sandy AI, Live Rooms, Analytics, Admin/Compliance, Registrar, Content, Specialized)
- **pgvector** extension for semantic search (1536-dim OpenAI embeddings)
- **RAG pipeline**: Document upload → PDF extraction → chunking → embedding → vector store → cosine similarity retrieval
- **Keyword fallback**: If embeddings unavailable, falls back to PostgreSQL `ILIKE` search

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS | v4 |
| Database | PostgreSQL (Neon) + pgvector | — |
| ORM | Prisma (PrismaPg adapter) | 7.4.2 |
| AI (Chat) | Anthropic Claude | Haiku 4.5 + Sonnet 4.6 |
| AI (Embeddings) | OpenAI | text-embedding-3-small |
| Rate Limiting | Upstash Redis | Sliding window |
| Email | Resend | 6.9.3 |
| Hosting | Vercel | Auto-deploy from master |
| CI/CD | GitHub Actions | TSC + ESLint + Vitest |

---

## Azure Migration Path (Pre-Planned)

Provider abstraction layers are built. Most migrations are config swaps:

| Current | Azure Target | Effort |
|---------|-------------|--------|
| OpenAI Embeddings | Azure OpenAI Service | Env var change |
| Neon PostgreSQL | Azure PostgreSQL Flexible | Connection string swap |
| Upstash Redis | Azure Cache for Redis | Connection string swap |
| Azure Blob Storage | Same | Already done |
| Vercel | Azure Container Apps | 2-3 weeks |
| Demo Auth | Entra ID (Azure AD) SSO | 2-3 weeks |

UK has an existing Azure tenant with Enterprise Agreement. Landing zone is in place.
