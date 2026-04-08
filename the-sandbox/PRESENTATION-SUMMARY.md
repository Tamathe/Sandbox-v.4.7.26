# University of Kentucky — What We've Built vs. What We Need

**Presentation to University Leadership & Deloitte**

---

## What We've Built

### Platform Scale
- **274 data models** — full university data architecture
- **95 API route groups** (~736 individual endpoints)
- **380+ service files** — modular business logic
- **44 component modules** across 39 page routes
- **11 scheduled jobs** (compliance, analytics, news ingestion)

### AI Intelligence Layer
- **Sandy** — universal AI agent with **59 tools** across **10 modules**
- Claude Haiku (real-time chat) + Claude Sonnet (complex analysis)
- **73 AI-powered services** — tutoring, analysis, summarization, triage
- Page-aware context, role-adaptive prompts, native tool execution
- RAG pipeline with pgvector semantic search + keyword fallback

### Student Experience (11 features)
- **Study Buddy** — 7 modes (tutor, quiz, flashcards, Socratic, teach-back, debate, essay), spaced repetition, voice output, Pomodoro, metacognitive calibration
- **Live Rooms** — 4 types (challenge quiz, study pomodoro, watch party, teach-back circles)
- **Academic Pathfinder** — major exploration, what-if degree audits, credit transfer maps
- **Campus Navigator** — department storefronts, recommendations, search
- **Smart Study Nudges** — proactive exam prep prompts via Sandy
- Homepage with morning briefing, due dates, beacon alerts, campus life

### Educator Experience (8 features)
- **Course Builder** — AI-assisted syllabus design, competency mapping
- **Grading Pipeline** — AI pre-scoring + faculty review + release
- **18 Playground Templates** — interactive simulations from ACLS to Poetry
- **Tool Elevation** — 16 Sandy interview-mode tools across 4 collections
- Course health analytics, student engagement tracking

### Staff Experience (15 features)
- **Daily Briefing + Action Queue** — proactive morning intelligence
- **Policy Navigator** — 94 real UK policies from regs.uky.edu, RAG search
- **Communication tools** — announcements, committee minutes, email intelligence
- **10/10 Email Intelligence** — urgency scoring, thread summarization, tone matching, follow-up tracking

### Registrar Command Center (7 features)
- Graduation clearance pipeline (6-stage Kanban)
- Enrollment command center, Student 360 drawer
- Compliance calendar (14 federal/state deadlines)
- Academic standing processor, holds management
- Petition workflow with audit trail

### Community & Campus
- Discord-style messaging with threads and group channels
- UKNow campus news intelligence (50 articles, 8 sections, AI analysis)
- Crisis Comms / Reputation Pulse (AI-powered social monitoring)
- Community Pulse (active rooms, trending topics)

### Compliance Infrastructure
- FERPA training module with quiz and reminders
- 3-tier consent tracking (TOS, data, FERPA) with version management
- Compliance delegation, exceptions, audit logs
- Data classification and access review models
- Role-based access control with 9 auth guard functions

---

## What We Need for 70,000 Users

### Already Done or In Progress
| Item | Status |
|------|--------|
| Feature set | Complete — 83 feature areas |
| Auth guards on every route | Complete — enforced by CLAUDE.md |
| Rate limiting (6 tiers) | Complete — Upstash Redis |
| FERPA consent framework | Complete — 3-tier consent + audit logs |
| Azure migration design | Complete — 8-sprint roadmap, abstraction layers built |
| Sentry error tracking | Integrated |
| Demo mode production gate | Implemented — disabled unless NEXT_PUBLIC_DEMO_MODE=true |

### Engineering Work Remaining (~6-8 Weeks)
| Item | Effort | Owner |
|------|--------|-------|
| SSO via Entra ID (Azure AD) | 2-3 weeks | Engineering + UK IT |
| Azure infrastructure cutover | 2-3 weeks | Engineering + UK IT |
| Load testing (k6) | 1-2 weeks | Engineering |
| Database connection pool scaling | 1 week | Engineering |
| Data retention cron enforcement | 1 week | Engineering |
| E2E test suite (Playwright) | 2 weeks | Engineering |

### Where a Partner Adds Value
| Item | Why External Help | Est. Cost |
|------|-------------------|-----------|
| **FERPA compliance audit** | Legal interpretation, not code | $80-150K |
| **Institutional deployment strategy** | Pilot design, stakeholder navigation, faculty adoption | $50-100K |
| **Security validation / pen test** | Independent verification, leadership confidence | $30-50K |
| **Entra ID federation** | UK IT coordination, SAML metadata | Included in SSO work |
| **Data residency validation** | FERPA proof that PII stays in Azure tenant | Part of compliance |

### Not Needed
| Item | Why |
|------|-----|
| Architecture redesign | Modular, well-organized, scales on current stack |
| Cloud landing zone | UK already has Azure tenant + infrastructure |
| Technology replacement | Vercel + Neon handle 70K users; Azure path designed |
| CI/CD transformation | GitHub Actions pipeline exists, just needs expansion |

---

## Key Numbers for the Room

| Metric | Value |
|--------|-------|
| Total features | 83 distinct modules |
| AI-powered services | 73 |
| Sandy agent tools | 59 across 10 modules |
| Data models | 274 |
| API endpoints | ~736 |
| Real UK policies indexed | 94 |
| Campus news articles | 50+ |
| Playground templates | 18 |
| Elevated tools | 16 |
| Live Room types | 4 |
| Study modes | 7 |
| Scheduled jobs | 11 |
| Auth guard functions | 9 |
| Rate limit tiers | 6 |
| Demo users | 4 (ADMIN, EDUCATOR, STUDENT, STAFF) |
| External service integrations | 13 |

---

## Azure Migration Path

**Most migrations are config swaps** behind provider abstraction layers:

| Component | Current → Azure | Effort |
|-----------|----------------|--------|
| Embeddings | OpenAI → Azure OpenAI | Env var change |
| File storage | Azure Blob | Already done |
| TTS | OpenAI → Azure Speech | Partial build exists |
| Database | Neon → Azure PostgreSQL | Connection string + data migration |
| Cache | Upstash → Azure Cache for Redis | Connection string swap |
| Auth | Demo headers → Entra ID SSO | 2-3 weeks (Sprint 1) |
| Hosting | Vercel → Azure Container Apps | 2-3 weeks (Sprint 8) |

**UK already has Azure tenant with Enterprise Agreement. Landing zone is in place.**

---

## Patent Status

Utility patent filing in progress (provisional strategy). Architecture emphasizes interdependencies and signal paths for claims. Key differentiators:
- Universal AI agent with 59 domain-specific tools operating across a unified campus graph
- Proactive intelligence (morning briefings, study nudges, urgency scoring) without user prompting
- Learning observer with real-time adaptation (7 behaviors) + metacognitive calibration
- Live collaborative experiences (4 room types) hosted by AI within messaging
