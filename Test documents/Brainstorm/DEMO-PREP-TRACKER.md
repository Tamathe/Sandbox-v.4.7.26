# Deloitte Demo Prep — Learning Tracker
**Target date:** April 1, 2026
**Goal:** Be able to confidently answer any technical question about how The Sandbox is built, runs, and is secured.

---

## How to use this document
- Rate yourself on each topic: `[ ]` = haven't studied, `[~]` = shaky, `[x]` = I can explain this cold
- Each topic has the **short answer** (what to say out loud) and **deep detail** (if they push)
- Practice saying the short answers out loud — not reading, *saying*
- Flag anything you want to drill with Claude using `[?]`

---

## 1. THE BIG PICTURE

### [ ] "What is this?"
**Say this:** "It's an AI-powered operating system for the university. Instead of logging into 10 different systems — Canvas, Outlook, the registrar, parking, advising — everything is in one place with an AI assistant that knows who you are and what you need."

**Key phrase to land:** "Operating system, not another tool."

### [ ] "Why did you build it?"
**Say this:** "We went to DC and saw what Copilot Studio and Foundry can do. But our faculty and students aren't going to learn those platforms. We needed something where a professor with zero AI experience can build and deploy an AI-powered learning tool in 10 minutes — and share it with the whole university."

### [ ] "How is this different from Canvas?"
**Say this:** "Canvas is a content bucket with a gradebook. This is an intelligence layer. It doesn't just store your syllabus — it reads it, understands your learning objectives, and recommends AI tools for each module. It drafts your emails, flags urgent items, tracks student engagement patterns. Canvas holds files. This does work."

**If they push:** "Long term, this replaces Canvas. Short term, we coexist — we have LTI integration points so tools built here can launch from inside Canvas with single sign-on and grade passback."

---

## 2. TECH STACK

### [ ] "What's it built with?"
**Say this:** "Next.js 16, React 19, TypeScript, Tailwind CSS. PostgreSQL database managed through Prisma. Deployed on Vercel. AI powered by Claude Sonnet 4.6 from Anthropic."

**Practice saying this naturally, not like a list.**

### [ ] "Why these choices?"
**Say this:** "Next.js gives us server-side rendering, API routes, and streaming responses in one framework. Prisma gives us type-safe database access. Vercel gives us zero-config deployment with auto-scaling. Claude gives us the best reasoning model for educational contexts."

### [ ] "Why not Microsoft stack?"
**Say this:** "I was building on my own dime without Azure access. The architecture is portable — we can move to Azure App Service and swap the AI calls to Azure-hosted models. Eric Debord confirmed this is straightforward. The codebase is framework-agnostic at the AI layer."

---

## 3. AUTHENTICATION & SECURITY

### [ ] "How do users log in?"
**Say this:** "Custom JWT authentication. Email and password, passwords hashed with bcrypt at cost factor 12. Session stored in an httpOnly secure cookie with a 7-day expiration. Every API request validates the token before doing anything."

**Key terms to know:**
- **JWT** = JSON Web Token. A signed token that proves who you are without hitting the database every time.
- **bcrypt** = Industry-standard password hashing. Cost factor 12 means it takes ~250ms to hash — fast enough for login, too slow for brute force.
- **httpOnly** = JavaScript can't read the cookie. Prevents XSS attacks from stealing sessions.
- **SameSite=Lax** = The cookie only sends on same-site requests. Prevents CSRF attacks.

### [ ] "What about role-based access?"
**Say this:** "Five roles — Admin, Educator, Student, Staff, Registrar. Every API route starts with an authorization check. A student can never see educator data, even if they hit the API directly. Data isolation is enforced at the database query level, not just the UI."

### [ ] "Rate limiting?"
**Say this:** "Redis-backed distributed rate limiting through Upstash. Multi-tier — login gets 5 attempts per minute, AI chat gets 60 requests per minute, tool generation gets 10 per minute. Educators and admins get 3x headroom. If someone hammers the API, they get a 429 response."

### [ ] "FERPA compliance?"
**Say this:** "We have consent tracking per category, sensitive session flags that exclude data from analytics, compliance audit logs, FERPA incident reporting, and automated compliance notifications. The system was designed with FERPA in mind from day one — it's not bolted on."

### [ ] "What are the security gaps?" (They WILL ask this)
**Be honest:** "Three things on the roadmap. First, we need Content Security Policy headers — standard hardening for production. Second, uploaded PDFs get extracted to text and fed into the AI context without prompt injection detection — that's a known gap. Third, the demo mode flag must be off in production or it allows auth bypass. All three are planned for the Azure migration."

**Why honesty wins here:** If you pretend there are no gaps, they won't trust anything else you said. If you name the gaps yourself, it shows maturity.

---

## 4. THE AI ARCHITECTURE

### [ ] "How does Sandy work?"
**Say this:** "Sandy is a persistent AI panel that's context-aware. It knows who you are — your role, your courses, your learner profile. It knows where you are — all 212 pages have context descriptions. It knows what time it is. And it has 38 tools across 9 modules — email drafting, policy lookup, scheduling, study recommendations, content generation."

**If they ask about tools:** "Sandy uses Claude's native function calling. When you ask 'what's my schedule,' Sandy doesn't pattern-match keywords — it selects the right tool from a registry, calls it with parameters, and weaves the result into its response. It's the same architecture that powers ChatGPT plugins, but purpose-built for university workflows."

### [ ] "What model are you using?"
**Say this:** "Claude Sonnet 4.6 from Anthropic for all reasoning tasks. OpenAI only for text-to-speech. Azure OpenAI for embeddings and semantic search."

### [ ] "How do you prevent hallucinations?"
**Say this:** "Every AI call gets a system prompt with ~4,000 tokens of real context — the user's actual course data, actual learning objectives, actual policies. The AI isn't guessing, it's working from ground truth. For tools like the Policy Navigator, we ingested 94 real UK administrative regulations. The AI cites specific policies, not invented ones."

### [ ] "How much does the AI cost to run?"
**Know this number:** Anthropic charges per token. Sonnet 4.6 is roughly $3 per million input tokens, $15 per million output tokens. A typical Sandy conversation (4K context + 1K response) costs about $0.03. At scale, the rate limiting keeps costs predictable.

---

## 5. THE DATABASE

### [ ] "Where does the data live?"
**Say this:** "PostgreSQL on Neon — serverless Postgres with automatic connection pooling and SSL encryption in transit. Managed through Prisma ORM with about 292 models. Everything from users and courses to compliance audit logs and AI execution traces."

### [ ] "How does it scale?"
**Say this:** "Neon auto-scales connections. Prisma uses connection pooling through driver adapters. For 70,000 users, we'd add a caching layer for high-read data like the Hub and course listings, and move AI calls behind a job queue. The Azure migration gives us enterprise SLAs and dedicated compute."

---

## 6. DEPLOYMENT & OPERATIONS

### [ ] "How do you deploy?"
**Say this:** "Push to master on GitHub, Vercel auto-deploys. Build step generates the Prisma client and compiles the Next.js app. We have 11 scheduled cron jobs for things like compliance notifications, effectiveness rollups, and news ingestion. Sentry handles error tracking with source maps."

### [ ] "What about monitoring?"
**Say this:** "Sentry for error tracking, Vercel Analytics for performance, and custom admin dashboards. The admin control tower shows platform-wide usage metrics, pending approvals, moderation queues, and compliance status. Every Sandy interaction is logged with user, role, page context, and tool calls."

---

## 7. AZURE MIGRATION PATH

### [ ] "How do you move this to Azure?"
**Say this:** "Eric Debord walked me through it. The Next.js app deploys as an Azure App Service. Database moves to Azure Database for PostgreSQL — we swap the connection string in Prisma. AI calls point to Azure-hosted Claude models instead of direct Anthropic API. File storage is already on Azure Blob. The architecture was designed to be portable."

### [ ] "What about Microsoft Graph?"
**Say this:** "That's the next integration. Graph API gives us programmatic access to Outlook email, calendar, Teams chats, and meeting data. We've already built the email intelligence features — urgency scoring, thread summarization, draft replies. Right now they use mock data. Graph API makes them real. Eric is finding out the API access path."

---

## 8. THE DEMO FLOW

### [ ] Suggested demo order (practice this sequence):
1. **Start as educator (Katie)** — show the faculty homepage, email intelligence, tasks
2. **Create a tool** — "Mock trial with OJ Simpson, cross-examination" — show the guided builder
3. **Show course management** — upload syllabus, auto-parsed policies and schedule, suggest tools
4. **Playground** — "Chemistry molecule visualizer" — show code generation
5. **Switch to student (Tiana)** — show the student homepage, study tools, Sandy
6. **Ask Sandy something** — "My student has ADHD and needs help" — show university resource awareness
7. **Show the Hub** — how tools are shared across the university
8. **Show admin (Heath)** — compliance dashboard, moderation, analytics
9. **End with the vision** — "This is one login. One place. Everything the university does."

---

## DRILL TOPICS — Flag with [?] and we'll practice

```
[?] Topic I want to drill:
```

---

## CONFIDENCE LOG

| Date | Topic drilled | Before (1-5) | After (1-5) | Notes |
|------|--------------|---------------|--------------|-------|
|      |              |               |              |       |
|      |              |               |              |       |
|      |              |               |              |       |

---

## QUESTIONS I DON'T KNOW THE ANSWER TO YET

Write them here as they come up. We'll work through them together.

1.
2.
3.

