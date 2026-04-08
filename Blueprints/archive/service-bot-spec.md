# Technical Specification: University Service Bot Builder
**Project:** The Sandbox (CATS-AI / University of Kentucky)
**Files:** `app/service-bot/page.tsx`, `app/lib/service-bot-prompt.ts`, `prisma/schema.prisma`, `app/api/tools/route.ts`, `app/components/ToolCard.tsx`, `app/components/Header.tsx`

---

## 1. Feature Overview

The **Service Bot Builder** is a 3-step wizard for university **Administrators** to deploy official departmental AI assistants — Financial Aid, Registrar, Parking, IT Help Desk, etc. These bots appear in the Marketplace with a "UK Official" shield badge and are auto-approved without needing admin review.

This is distinct from the Avatar builder (`app/avatar/page.tsx`), which is for educators cloning their teaching style:

| | Avatar (Teaching Assistant) | Service Bot (Dept. Support) |
|---|---|---|
| **Created by** | Educators | Admins only |
| **Goal** | Pedagogical support, Socratic method | Policy accuracy, process guidance |
| **Persona** | "Prof. Smith" (warm/scholarly) | "Financial Aid Bot" (informational/regulatory) |
| **Knowledge base** | Course materials, lectures | Official policy documents, handbooks |
| **Approval** | Community/Pending | Auto-approved (ADMIN creator) |
| **Marketplace badge** | Green "Verified" checkmark | Blue "UK Official" shield |
| **Access** | Educators + Admins | Admins only |

---

## 2. Data Model Changes (`prisma/schema.prisma`)

> **NOTE:** `isOfficialService` and `serviceProtocol` are already added to the `/api/tools` route.
> The schema fields just need to be migrated.

Add to the `Tool` model after the `approvalStatus` line:

```prisma
isOfficialService Boolean  @default(false)
serviceProtocol   String?  // 'informational' | 'regulatory' | 'transactional'
```

Add an index after the existing `@@index` entries on Tool:

```prisma
@@index([isOfficialService])
```

Also add an optional escalation email field (injected into system prompt, not stored in metadata):

```prisma
escalationEmail   String?
```

Then run:
```bash
npx prisma migrate dev --name add-service-bot-fields
```

> **Do NOT use a `metadata Json?` field.** Typed fields are queryable, filterable, and type-safe.
> The `metadata` pattern makes future API filtering unnecessarily complex.

---

## 3. API Updates (`app/api/tools/route.ts`)

The route already destructures and stores `isOfficialService` and `serviceProtocol`, and
auto-approves when `isOfficialService === true && user.role === 'ADMIN'`.

Add `escalationEmail` to the destructuring block and the `prisma.tool.create` data:

```typescript
// In destructuring:
escalationEmail,

// In prisma.tool.create data:
escalationEmail: escalationEmail || null,
```

---

## 4. Prompt Builder (`app/lib/service-bot-prompt.ts`)

Create this file. It is a pure function with no React dependencies — mirrors the pattern
recommended for `avatar/page.tsx`.

```typescript
export type ServiceProtocol = 'informational' | 'regulatory' | 'transactional'

export interface ServiceBotDoc {
  name: string
  content: string
}

interface ServiceBotConfig {
  serviceName: string
  department: string
  protocol: ServiceProtocol
  focusAreas: string
  escalationEmail: string
  docs: ServiceBotDoc[]
}

const PROTOCOL_INSTRUCTIONS: Record<ServiceProtocol, string> = {
  informational:
    'You provide general information and answer common questions. ' +
    'You do not give advice, make eligibility decisions, or process requests. ' +
    'Always direct students to the official office for anything requiring action.',
  regulatory:
    'You explain university policies and regulations accurately. ' +
    'You MUST NOT interpret rules for individual circumstances or tell students what they qualify for. ' +
    'If asked about a specific case, say: "I cannot determine that for your situation — please contact us directly." ' +
    'Cite the relevant policy section when possible.',
  transactional:
    'You guide students through processes step by step. ' +
    'You do not submit, approve, or process anything on their behalf. ' +
    'Clearly state what the student must do themselves and exactly where they need to go.',
}

// 120K char budget — lower than avatar (policy docs are dense, shorter context needed)
const KNOWLEDGE_CHAR_BUDGET = 120_000

function buildKnowledgeSection(docs: ServiceBotDoc[]): string {
  if (docs.length === 0) return ''

  let remainingBudget = KNOWLEDGE_CHAR_BUDGET
  const sections = docs.map(d => {
    if (remainingBudget <= 0) {
      return `### ${d.name}\n[Omitted — context budget exceeded. Remove larger documents to include this one.]`
    }
    const limit = Math.min(d.content.length, remainingBudget)
    const cutPoint = d.content.lastIndexOf('\n\n', limit) > 0
      ? d.content.lastIndexOf('\n\n', limit)
      : limit
    remainingBudget -= cutPoint
    return `### ${d.name}\n${d.content.slice(0, cutPoint)}`
  })

  return (
    `\n\n## Official Policy Documents\n` +
    `Answer questions using ONLY the documents below. ` +
    `If the answer is not in these documents, say: "I don't have that specific information — ` +
    `please contact the office directly for an accurate answer."\n\n` +
    sections.join('\n\n')
  )
}

export function buildServiceBotSystemPrompt(config: ServiceBotConfig): string {
  const { serviceName, department, protocol, focusAreas, escalationEmail, docs } = config

  const escalationLine = escalationEmail
    ? `\nIf you cannot resolve the student's question, direct them to: ${escalationEmail}`
    : ''

  return `You are the official AI assistant for ${serviceName}${department ? `, ${department}` : ''} at the University of Kentucky.

${PROTOCOL_INSTRUCTIONS[protocol]}

CRITICAL SAFETY RULE: If a student shares personally identifiable information such as a Social Security Number, student ID, financial account number, or other sensitive data, immediately tell them: "Please don't share that information here. This is a general information assistant — contact our office directly for account-specific help." Do not store, repeat, or process any PII.
${escalationLine}
You are friendly, professional, and accurate. Never speculate or make up policy details. When in doubt, direct the student to the official office.

${focusAreas ? `This assistant is focused on: ${focusAreas}\n` : ''}You represent an official University of Kentucky service. Maintain a professional and helpful tone at all times.${buildKnowledgeSection(docs)}`
}
```

---

## 5. Component (`app/service-bot/page.tsx`)

### Access control
ADMIN-only. Educators do not create service bots — this is a university deployment tool.
Use the same early-return pattern as `app/avatar/page.tsx`:

```tsx
if (currentUser.role !== 'ADMIN') {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Administrators only</h2>
      <p className="text-gray-500">Service bot creation is restricted to university administrators.</p>
    </div>
  )
}
```

### State
```typescript
const [step, setStep] = useState<1 | 2 | 3>(1)
const [docs, setDocs] = useState<UploadedDoc[]>([])
const [pasteText, setPasteText] = useState('')
const [serviceName, setServiceName] = useState('')
const [department, setDepartment] = useState('')
const [protocol, setProtocol] = useState<ServiceProtocol>('informational')
const [focusAreas, setFocusAreas] = useState('')
const [escalationEmail, setEscalationEmail] = useState('')
const [piiCertified, setPiiCertified] = useState(false)
const [creating, setCreating] = useState(false)
const [error, setError] = useState('')
const [dragOver, setDragOver] = useState(false)
const [processingFiles, setProcessingFiles] = useState(false)
```

### File upload
Copy the `handleFiles` function directly from `app/avatar/page.tsx` — it already has:
- Deduplication check via `existingNames` Set
- `crypto.randomUUID()` for IDs
- 500KB per-file limit (do NOT change to 1MB — keep consistent with avatar)
- Batch error collection

### Paste text
Use the controlled textarea + "Add" button pattern (same as the updated avatar page):
- `value={pasteText}` + `onChange`
- Button commits to docs state and clears the textarea
- Do NOT use the old `onBlur` pattern

### Protocol options
```typescript
const PROTOCOL_OPTIONS: { id: ServiceProtocol; label: string; desc: string; icon: React.ElementType }[] = [
  {
    id: 'informational',
    label: 'Informational',
    desc: 'Answers general questions. No advice or decisions. e.g. "What are your office hours?"',
    icon: FileText,
  },
  {
    id: 'regulatory',
    label: 'Regulatory',
    desc: 'Explains policies and eligibility rules. Always defers individual cases to staff. e.g. Financial Aid, Housing',
    icon: Scale,
  },
  {
    id: 'transactional',
    label: 'Transactional',
    desc: 'Guides students through multi-step processes. e.g. Parking permit, course withdrawal, ID card',
    icon: FileCheck,
  },
]
```

> Do NOT include temperature values (0.1, 0.3, 0.5) — the Claude chat API in this project
> does not expose a temperature parameter. These are conceptual only and would break the build.

### Step 2 configuration fields
- Service Name (required)
- Department / Division (optional)
- Escalation Email (optional) — plain `<input type="email">`, injected into system prompt
- Focus Areas (optional textarea)
- Protocol selector (radio-style cards, same pattern as teaching style in avatar)

### Step 3 review + PII certification
The PII certification checkbox must be checked before the "Deploy" button becomes active.
Disabled state: `disabled={creating || !piiCertified || !serviceName.trim()}`

The certification label:
> "I certify that the uploaded documents do not contain personally identifiable information (PII),
> FERPA-protected student records, or confidential university data. I understand this bot will
> be publicly accessible to all UK students."

### handleCreate payload
```typescript
const payload = {
  name: `${serviceName} — Virtual Assistant`,
  shortDescription: `Official AI assistant for ${serviceName}${department ? `, ${department}` : ''} at UK`,
  fullDescription: `An official University of Kentucky service bot for ${serviceName}. ` +
    `Helps students navigate ${protocol} information and processes 24/7. ` +
    `All responses are grounded in official university policy documents.`,
  category: 'University Service',   // matches existing categoryColors in ToolCard.tsx
  difficultyLevel: 'Introductory',
  toolType: 'CHATBOT',
  systemPrompt: buildServiceBotSystemPrompt({ serviceName, department, protocol, focusAreas, escalationEmail, docs }),
  welcomeMessage: `Hi! I'm the ${serviceName} virtual assistant at UK. How can I help you today?`,
  starterQuestions: [
    'What are your office hours and how can I contact you?',
    'What documents or steps do I need to get started?',
    'Where can I find more information about this topic?',
  ],
  intendedAudience: 'All University of Kentucky students and staff',
  learningObjectives: [
    'Get accurate information about university services',
    'Navigate university processes with confidence',
    'Find the right contact and resources quickly',
  ],
  published: true,
  isOfficialService: true,
  serviceProtocol: protocol,
  escalationEmail: escalationEmail || null,
}
```

### API response handling
The `/api/tools` POST returns the tool **directly** (not wrapped in `{ tool }`).
Use `data.id`, NOT `data.tool.id`:

```typescript
const data = await res.json()
if (!data?.id) throw new Error('Service bot was created but could not be opened.')
router.push(`/tools/${data.id}`)
```

---

## 6. ToolCard Updates (`app/components/ToolCard.tsx`)

Add the "UK Official" shield badge. Find the existing APPROVED verified badge (emerald
`CheckCircle`). Add this BEFORE it:

```tsx
{tool.isOfficialService && (
  <div className="flex items-center gap-1 bg-[#0033A0] text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm">
    <ShieldCheck className="w-3 h-3" />
    UK Official
  </div>
)}
```

Add `ShieldCheck` to the lucide-react import.

Update `ToolWithDetails` in `app/lib/types.ts` — add:
```typescript
isOfficialService?: boolean
serviceProtocol?: string | null
escalationEmail?: string | null
```

> Use `tool.isOfficialService` directly. Do NOT use `tool.metadata?.isOfficial` —
> there is no `metadata` field in the schema.

---

## 7. Navigation (`app/components/Header.tsx`)

Add a "Service Bots" quick link for admins in the `quickLinks` array:

```typescript
{ href: '/service-bot', label: 'Service Bots', icon: Building2, roles: ['ADMIN'] },
```

Add `Building2` to the lucide-react import if not already present.

---

## 8. Implementation Checklist for Codex

- [ ] **Prisma**: Add `isOfficialService`, `serviceProtocol`, `escalationEmail` fields + index + migrate
- [ ] **API** (`app/api/tools/route.ts`): Add `escalationEmail` to destructuring + create data (isOfficialService and serviceProtocol already done)
- [ ] **Prompt builder**: Create `app/lib/service-bot-prompt.ts` with `buildServiceBotSystemPrompt()`
- [ ] **Page**: Create `app/service-bot/page.tsx` — 3-step wizard, ADMIN-only
- [ ] **ToolCard**: Add UK Official shield badge using `tool.isOfficialService`
- [ ] **Types**: Add `isOfficialService`, `serviceProtocol`, `escalationEmail` to `ToolWithDetails`
- [ ] **Header**: Add Service Bots quick link for ADMIN role
- [ ] **Build**: Run `npm run build` — fix any TypeScript errors

---

## 9. What NOT to change

- `app/avatar/page.tsx` — do not modify
- `app/build/page.tsx` — do not modify
- `CLAUDE.md` — do not modify
- Any existing API routes other than `app/api/tools/route.ts`
- The existing nav items in `Header.tsx` (only add to quickLinks)
