# Blueprint: LTI 1.3 Bridge
### Feature: Canvas-native launch path for Sandbox tools, assignments, and AI workflows
### Scope: LTI 1.3 Core, OIDC login, Deep Linking, Names and Roles, Assignment and Grade Services
### Status: Ready for implementation

---

## 1. Context and Goal

This is the Trojan Horse.

The Sandbox should become usable inside Canvas before it tries to replace Canvas. The first implementation target is Canvas as the LMS platform, but the architecture should stay standards-aligned enough to support other LTI 1.3 platforms later.

The product goal is:

1. An instructor can place a Sandbox experience into Canvas with Deep Linking.
2. A student can launch that experience from Canvas without separate sign-in friction.
3. Sandbox receives course, assignment, role, and roster context from Canvas.
4. Sandbox can send grades back to Canvas when a workflow calls for it.
5. The highest-value workflows ship through the LTI surface, not as native-only destinations.

This blueprint is the implementation path for:

- Sandbox tool launches inside Canvas
- Sandy / My TA launches in course or assignment context
- future AI grading loop launches and grade passback
- future syllabus-generated activities placed back into Canvas modules

---

## 2. V1 Scope

### Must ship in V1

- LTI 1.3 OIDC login initiation
- LTI 1.3 resource link launch validation
- instructor and student role mapping
- Canvas Deep Linking so instructors can place a Sandbox item into a module
- Names and Roles Provisioning Service (NRPS) roster sync
- Assignment and Grade Services (AGS) score passback
- persistent linkage between Canvas course context, Canvas resource link, and Sandbox objects
- course-scoped launch context available to the launched Sandbox workflow
- audit trail for launches and grade passback

### Canvas-first V1 workflows

- launch a Sandbox tool from Canvas
- launch Sandy / My TA in a Canvas-linked course context
- deep-link a Sandbox activity into a Canvas module
- send a final score back to Canvas for a linked assignment

### Explicit non-goals for V1

- dynamic registration
- full Canvas course import
- syncing Canvas files or discussions
- full native Sandbox gradebook
- SIS integration
- LMS-agnostic admin polish
- replacing the existing mock auth system everywhere in the app

---

## 3. Standards To Support

Implement these LTI Advantage capabilities:

- LTI 1.3 Core
- OIDC Third-Party Initiated Login
- Deep Linking 2.0
- Names and Roles Provisioning Service
- Assignment and Grade Services

Canvas-specific note:

- Build and verify against Canvas first.
- Keep naming and data modeling generic enough that Blackboard, Moodle, or D2L are not blocked later.

---

## 4. Product Flows

### Flow A: Instructor deep-links a Sandbox activity into Canvas

1. Instructor clicks `External Tool` in Canvas.
2. Canvas initiates LTI login to Sandbox.
3. Sandbox validates the launch and detects `DeepLinkingRequest`.
4. Sandbox shows a picker UI with supported launchable items:
   - existing tool
   - Sandy / My TA course assistant
   - future grading loop activity
5. Instructor selects an item.
6. Sandbox signs and returns the Deep Linking response JWT.
7. Canvas creates the module item or assignment.
8. Sandbox stores a persistent `LtiAssignmentLink`.

### Flow B: Student launches a linked activity from Canvas

1. Student clicks the Canvas module item or assignment.
2. Canvas initiates OIDC login and sends an LTI launch.
3. Sandbox validates the launch, upserts local identity, loads course and assignment context, and issues a local LTI session.
4. Sandbox redirects the user into the correct internal route.
5. The launched workflow can read:
   - Canvas course context
   - Canvas assignment/resource link context
   - course-scoped role
   - roster snapshot if already synced
   - grade passback availability

### Flow C: Grade passback

1. Sandbox workflow finishes or faculty finalizes an outcome.
2. Sandbox looks up the `LtiAssignmentLink` and AGS endpoint data.
3. Sandbox fetches an AGS access token with the right scope.
4. Sandbox POSTs the score to Canvas.
5. Sandbox stores the result and response metadata in an audit record.

---

## 5. Architecture Boundary

Treat LTI as a platform capability, not a one-off route.

Create a dedicated `app/lib/lti/*` service layer for:

- OIDC state and nonce generation
- launch JWT validation
- Deep Linking response signing
- platform access token retrieval
- role mapping
- course and assignment linkage
- roster sync
- grade passback
- launch session bridging into the current app auth model

The rest of the app should consume a normalized launch context object, not raw LTI claims.

---

## 6. New Project Structure

All new code lives inside `the-sandbox/`.

```text
the-sandbox/
├── app/
│   ├── api/
│   │   └── lti/
│   │       ├── jwks/route.ts
│   │       ├── login/route.ts
│   │       ├── launch/route.ts
│   │       ├── session/
│   │       │   └── me/route.ts
│   │       ├── platforms/route.ts
│   │       ├── platforms/[id]/route.ts
│   │       ├── contexts/[contextLinkId]/roster/sync/route.ts
│   │       ├── assignments/[assignmentLinkId]/score/route.ts
│   │       └── deep-link/respond/route.ts
│   ├── admin/
│   │   └── integrations/
│   │       └── lti/page.tsx
│   ├── lti/
│   │   ├── deep-link/page.tsx
│   │   └── error/page.tsx
│   └── components/
│       └── lti/
│           ├── LtiPlatformForm.tsx
│           ├── LtiDeploymentList.tsx
│           ├── DeepLinkPicker.tsx
│           └── LtiLaunchBanner.tsx
├── app/lib/
│   └── lti/
│       ├── claims.ts
│       ├── config.ts
│       ├── deep-link.ts
│       ├── jwks.ts
│       ├── launch-session.ts
│       ├── oauth.ts
│       ├── platform-tokens.ts
│       ├── roles.ts
│       ├── state-store.ts
│       └── validation.ts
└── prisma/
    └── schema.prisma
```

### New dependency

```bash
npm install jose
```

---

## 7. Environment Variables

Add:

```bash
NEXT_PUBLIC_APP_URL="https://your-public-sandbox-url"
LTI_SESSION_SECRET="replace-with-long-random-secret"
LTI_KEY_ID="sandbox-lti-key-1"
LTI_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."
```

Notes:

- `NEXT_PUBLIC_APP_URL` already exists locally and must point at a real public URL for LTI testing.
- For local Canvas testing, use a public tunnel and point `NEXT_PUBLIC_APP_URL` at that tunnel URL.
- Canvas platform registration values should live in the database, not env vars.

---

## 8. Data Model

Add these models to `prisma/schema.prisma`.

```prisma
model LtiPlatform {
  id             String           @id @default(cuid())
  name           String
  issuer         String
  clientId       String
  authLoginUrl   String
  authTokenUrl   String
  jwksUrl        String
  isActive       Boolean          @default(true)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  deployments    LtiDeployment[]
  userIdentities LtiUserIdentity[]
  launchEvents   LtiLaunchEvent[]

  @@unique([issuer, clientId])
}

model LtiDeployment {
  id             String           @id @default(cuid())
  platformId     String
  platform       LtiPlatform      @relation(fields: [platformId], references: [id], onDelete: Cascade)
  deploymentId   String
  label          String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  contextLinks   LtiContextLink[]
  assignmentLinks LtiAssignmentLink[]
  launchEvents   LtiLaunchEvent[]

  @@unique([platformId, deploymentId])
}

model LtiOidcState {
  id                String        @id @default(cuid())
  state             String        @unique
  nonce             String        @unique
  platformId        String
  deploymentDbId    String?
  targetLinkUri     String
  loginHint         String
  ltiMessageHint    String?
  launchType        String
  deepLinkReturnUrl String?
  payload           Json?
  expiresAt         DateTime
  consumedAt        DateTime?
  createdAt         DateTime      @default(now())

  @@index([expiresAt])
}

model LtiUserIdentity {
  id             String          @id @default(cuid())
  platformId     String
  platform       LtiPlatform     @relation(fields: [platformId], references: [id], onDelete: Cascade)
  userId         String
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject        String
  email          String?
  displayName    String?
  lastRoles      String[]
  lastLoginAt    DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([platformId, subject])
  @@index([userId])
}

model LtiContextLink {
  id              String              @id @default(cuid())
  deploymentDbId  String
  deployment      LtiDeployment       @relation(fields: [deploymentDbId], references: [id], onDelete: Cascade)
  courseId        String?
  course          Course?             @relation(fields: [courseId], references: [id], onDelete: SetNull)
  ltiContextId    String
  contextLabel    String?
  contextTitle    String?
  contextType     String?
  nrpsUrl         String?
  lineItemsUrl    String?
  lastRosterSyncAt DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  rosterMembers   LtiRosterMembership[]
  assignmentLinks LtiAssignmentLink[]
  launchEvents    LtiLaunchEvent[]

  @@unique([deploymentDbId, ltiContextId])
  @@index([courseId])
}

model LtiAssignmentLink {
  id              String          @id @default(cuid())
  deploymentDbId  String
  deployment      LtiDeployment   @relation(fields: [deploymentDbId], references: [id], onDelete: Cascade)
  contextLinkId   String?
  contextLink     LtiContextLink? @relation(fields: [contextLinkId], references: [id], onDelete: SetNull)
  toolId          String?
  tool            Tool?           @relation(fields: [toolId], references: [id], onDelete: SetNull)
  courseId        String?
  course          Course?         @relation(fields: [courseId], references: [id], onDelete: SetNull)
  resourceLinkId  String
  title           String?
  sandboxPath     String
  lineItemUrl     String?
  lineItemsUrl    String?
  maxScore        Float?
  gradingMode     String          @default("manual")
  passbackEnabled Boolean         @default(false)
  customParams    Json?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  launchEvents    LtiLaunchEvent[]

  @@unique([deploymentDbId, resourceLinkId])
  @@index([toolId])
  @@index([courseId])
}

model LtiRosterMembership {
  id             String         @id @default(cuid())
  contextLinkId  String
  contextLink    LtiContextLink @relation(fields: [contextLinkId], references: [id], onDelete: Cascade)
  ltiUserId      String
  localUserId    String?
  localUser      User?          @relation(fields: [localUserId], references: [id], onDelete: SetNull)
  email          String?
  displayName    String?
  roles          String[]
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([contextLinkId, ltiUserId])
  @@index([localUserId])
}

model LtiLaunchEvent {
  id               String             @id @default(cuid())
  platformId       String
  platform         LtiPlatform        @relation(fields: [platformId], references: [id], onDelete: Cascade)
  deploymentDbId   String
  deployment       LtiDeployment      @relation(fields: [deploymentDbId], references: [id], onDelete: Cascade)
  userIdentityId   String?
  userIdentity     LtiUserIdentity?   @relation(fields: [userIdentityId], references: [id], onDelete: SetNull)
  contextLinkId    String?
  contextLink      LtiContextLink?    @relation(fields: [contextLinkId], references: [id], onDelete: SetNull)
  assignmentLinkId String?
  assignmentLink   LtiAssignmentLink? @relation(fields: [assignmentLinkId], references: [id], onDelete: SetNull)
  toolSessionId    String?
  toolSession      ToolSession?       @relation(fields: [toolSessionId], references: [id], onDelete: SetNull)
  messageType      String
  rawRoles         String[]
  rawClaims        Json
  createdAt        DateTime           @default(now())

  @@index([createdAt])
}
```

### Add relations to existing models

```prisma
// User
ltiIdentities      LtiUserIdentity[]
ltiRosterEntries   LtiRosterMembership[]

// Course
ltiContextLinks    LtiContextLink[]
ltiAssignmentLinks LtiAssignmentLink[]

// Tool
ltiAssignmentLinks LtiAssignmentLink[]

// ToolSession
ltiLaunchEvents    LtiLaunchEvent[]
```

---

## 9. Role Mapping and Permission Model

### Global app role mapping

Do not grant global `ADMIN` based on Canvas role claims.

Map launches like this:

- Canvas student roles -> local `STUDENT`
- Canvas instructor, TA, designer, observer, admin-like roles -> local `EDUCATOR`
- keep raw LTI roles separately for course-scoped permission checks

### Course-scoped permissions

Store raw LTI roles on:

- `LtiUserIdentity.lastRoles`
- `LtiRosterMembership.roles`
- `LtiLaunchEvent.rawRoles`

Use course-scoped roles, not global app role, for:

- who can deep-link content
- who can sync roster
- who can finalize grades
- who can see linked assignment admin actions

---

## 10. Auth Bridge Into The Existing App

The current app mostly uses `x-demo-user-email` and client-side auth context. Do not refactor the whole platform in this blueprint.

Instead:

1. Successful LTI launch creates a signed `sandbox_lti_session` HttpOnly cookie.
2. Add `GET /api/lti/session/me` to resolve that cookie into:
   - local user
   - LTI course context
   - LTI assignment context
   - course-scoped role flags
3. Update `AuthProvider` to hydrate from `/api/lti/session/me` when present, then fall back to demo user behavior.
4. LTI-launched workflows should use the resolved LTI session for server-side authorization and context.

This is the minimum bridge that gets us into Canvas without breaking the rest of the app.

---

## 11. Route Specifications

### `GET /api/lti/jwks`

- Public route.
- Returns the public JWKS derived from `LTI_PRIVATE_KEY_PEM` and `LTI_KEY_ID`.
- Used by Canvas to validate Deep Linking responses and service token assertions.

### `GET /api/lti/login`

- Accepts the OIDC login initiation request from Canvas.
- Validates required params:
  - `iss`
  - `login_hint`
  - `target_link_uri`
  - `client_id`
- Looks up `LtiPlatform` and optional `LtiDeployment`.
- Creates one-time `LtiOidcState`.
- Redirects to Canvas auth login URL with signed state and nonce.

### `POST /api/lti/launch`

- Accepts `id_token` from Canvas.
- Validates JWT signature against Canvas JWKS.
- Validates:
  - issuer
  - audience/client ID
  - nonce
  - exp/iat
  - deployment claim
- Branches on `message_type`:
  - `LtiResourceLinkRequest`
  - `LtiDeepLinkingRequest`
- Upserts local identity and stores launch audit.
- Creates local LTI session cookie.
- Redirects:
  - resource launch -> internal Sandbox route
  - deep link launch -> `/lti/deep-link`

### `POST /api/lti/deep-link/respond`

- Instructor-only action.
- Accepts selected Sandbox item from the deep link picker.
- Upserts `LtiAssignmentLink`.
- Signs and returns the Deep Linking response form back to Canvas.

### `POST /api/lti/contexts/[contextLinkId]/roster/sync`

- Instructor/TA/designer only.
- Uses NRPS URL from stored context link or latest launch claims.
- Requests membership data from Canvas.
- Upserts `LtiRosterMembership` records.
- Links to local `User` by email when possible.
- Does not force-create full local users for people who have never launched.

### `POST /api/lti/assignments/[assignmentLinkId]/score`

- Faculty- or system-triggered route.
- Accepts:

```ts
{
  userId: string
  scoreGiven: number
  scoreMaximum: number
  comment?: string
  activityProgress?: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed'
  gradingProgress?: 'Pending' | 'PendingManual' | 'FullyGraded'
}
```

- Fetches AGS service token with needed scopes.
- Sends score to Canvas using the stored line item URL.
- Writes success/failure to launch or grading audit trail.

### `GET /api/lti/session/me`

- Resolves current LTI cookie into normalized session data for the frontend.

---

## 12. Launch Routing Rules

Normalize launches into a single object:

```ts
type NormalizedLtiLaunch = {
  platformId: string
  deploymentDbId: string
  userId: string
  contextLinkId?: string
  assignmentLinkId?: string
  messageType: 'LtiResourceLinkRequest' | 'LtiDeepLinkingRequest'
  isInstructorLike: boolean
  isStudentLike: boolean
  toolId?: string
  courseId?: string
  sandboxPath: string
}
```

Routing rules:

- if `assignmentLinkId` exists, use its `sandboxPath`
- else if custom launch params specify Sandy / My TA, route there
- else if a linked tool exists, route to `/tools/[id]`
- else send the user to `/lti/error` with a recoverable message

---

## 13. Deep Linking UI

Build a simple first-release picker at `/lti/deep-link`:

- section 1: launch an existing published Sandbox tool
- section 2: launch Sandy / My TA for the current linked course
- section 3: placeholder card for future AI grading loop

Each selection must produce:

- title
- target internal launch path
- optional custom params
- passback enabled yes/no

Do not build a giant authoring UI in this blueprint.

---

## 14. AGS Behavior

### V1 grading rule

Only pass back scores that have been finalized by the workflow or a faculty-controlled action.

Do not pass back:

- raw AI draft feedback
- intermediate rubric suggestions
- provisional scores students have not finalized

This keeps the grading story aligned with the broader product rule:
AI can assist, faculty retains authority.

---

## 15. Security and Trust Requirements

Must enforce:

- one-time use `state` and `nonce`
- short-lived OIDC state records with expiry
- JWKS caching for Canvas key lookup
- signed local LTI session cookie
- no role escalation to global admin
- audit record for every launch and score passback
- clear error page for invalid launch, expired state, bad deployment, and missing linkage

For production readiness:

- cookie must be `HttpOnly`, `Secure`, and `SameSite=None`
- do not put user identity in query params
- do not trust raw role strings without issuer and audience validation

---

## 16. What Not To Build In This Blueprint

- dynamic registration
- LMS-wide settings sync
- full assignment authoring inside Canvas
- native Sandbox gradebook
- submission attempt and rubric data model for the grading loop
- cross-LMS abstraction polish before Canvas works end to end

Those belong in follow-on blueprints.

---

## 17. Implementation Order

1. Add Prisma models and migration.
2. Add `jose` and the LTI config helpers.
3. Implement JWKS route.
4. Implement platform and deployment admin storage.
5. Implement OIDC state store and login initiation.
6. Implement launch validation and normalized launch context.
7. Implement LTI session cookie plus `/api/lti/session/me`.
8. Implement resource launch routing into existing Sandbox pages.
9. Implement Deep Linking picker and response route.
10. Implement NRPS roster sync.
11. Implement AGS score passback helper and route.
12. Add launch audit visibility in the admin surface.

---

## 18. Verification Checklist

Codex should verify these behaviors:

1. Canvas can reach `GET /api/lti/jwks` and see the expected key ID.
2. OIDC login initiation creates a one-time state record and redirects correctly.
3. A valid `LtiResourceLinkRequest` launch creates or reuses a local user identity and lands the user in the right Sandbox route.
4. The launched page can read course and assignment context from `/api/lti/session/me`.
5. A valid `LtiDeepLinkingRequest` launch lets an instructor pick a Sandbox item and return it to Canvas.
6. A deep-linked item launches successfully for a student from Canvas without separate sign-in.
7. NRPS sync stores roster members for a linked course context.
8. AGS score passback succeeds for a linked assignment and the score appears in Canvas.
9. Invalid nonce, expired state, wrong audience, or unknown deployment are rejected cleanly.
10. No LTI role claim can silently turn a user into global `ADMIN`.

---

## 19. Follow-On Blueprints This Unlocks

Once this ships, the next documents should build on it:

1. `Blueprints/ai-grading-loop.md`
2. `Blueprints/syllabus-to-course-generator.md`
3. `Blueprints/early-warning-system.md`
4. `Blueprints/accreditation-portfolio.md`

The rule is simple:
if a workflow is central to the adoption wedge, it must be launchable through this LTI bridge.
