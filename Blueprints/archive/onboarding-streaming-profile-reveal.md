# Streaming Profile Reveal — Real-Time Onboarding UX

## Overview

Rather than showing a spinner and then revealing a completed profile, the streaming reveal makes the intelligence of the system *visible* in real time. The user watches their profile populate field by field as each data source resolves. This is purposeful theater — it communicates that the platform is doing real work on their behalf from the very first moment.

---

## The Experience

```
Setting up your profile...

✓  Found: Heath Price
✓  Faculty • College of Engineering
⟳  Searching courses...
✓  Found: TEK-100, TEK-201
⟳  Reading your faculty bio...
✓  Interests identified: Entrepreneurship, AI in Education
·  Checking ORCID...
✓  Done
```

Each step reveals as it resolves. The final state transitions directly into the profile confirmation card — no separate page load.

---

## Architecture: Server-Sent Events

The enrichment endpoint uses **Server-Sent Events (SSE)** to stream progress events to the client.

### Why SSE over WebSockets

- Enrichment is unidirectional (server → client only)
- SSE is natively supported in Next.js App Router via `ReadableStream`
- No additional infrastructure required
- Reconnects automatically on drop

---

## SSE Event Schema

Each event has a `type` and a `payload`.

```typescript
type EnrichmentEvent =
  | { type: "step"; step: string; status: "pending" | "success" | "skip" }
  | { type: "field"; field: string; value: string; source: string }
  | { type: "courses"; courses: CourseResult[] }
  | { type: "interests"; interests: InterestTag[] }
  | { type: "complete"; confidence: "high" | "medium" | "low"; profile: EnrichedProfile }
  | { type: "error"; message: string }
```

### Example event stream

```
data: {"type":"step","step":"Identifying heath.price@uky.edu","status":"success"}

data: {"type":"step","step":"Searching UK faculty directory","status":"success"}

data: {"type":"field","field":"name","value":"Heath Price","source":"uk-directory"}

data: {"type":"field","field":"title","value":"Associate Professor","source":"uk-directory"}

data: {"type":"field","field":"department","value":"TEK","source":"uk-directory"}

data: {"type":"step","step":"Finding your courses","status":"success"}

data: {"type":"courses","courses":[{"code":"TEK-100","name":"Intro to Entrepreneurship"}]}

data: {"type":"step","step":"Reading faculty bio","status":"success"}

data: {"type":"interests","interests":[{"tag":"Entrepreneurship Education"},{"tag":"AI in Education"}]}

data: {"type":"complete","confidence":"high","profile":{...}}
```

---

## Server Implementation

### `GET /api/onboarding/enrich-stream?email=...`

```typescript
// app/api/onboarding/enrich-stream/route.ts

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email");

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: EnrichmentEvent) => {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      };

      try {
        // Step 1: parse name
        send({ type: "step", step: `Identifying ${email}`, status: "success" });
        const name = parseNameFromEmail(email);
        send({ type: "field", field: "name", value: name, source: "email-parse" });

        // Step 2: directory lookup
        send({ type: "step", step: "Searching UK faculty directory", status: "pending" });
        const directoryResult = await queryUKDirectory(name);
        if (directoryResult) {
          send({ type: "step", step: "Searching UK faculty directory", status: "success" });
          send({ type: "field", field: "title", value: directoryResult.title, source: "uk-directory" });
          send({ type: "field", field: "department", value: directoryResult.department, source: "uk-directory" });
        } else {
          send({ type: "step", step: "Searching UK faculty directory", status: "skip" });
        }

        // Step 3: courses
        send({ type: "step", step: "Finding your courses", status: "pending" });
        const courses = await queryCourses(email, directoryResult);
        send({ type: "courses", courses });
        send({ type: "step", step: "Finding your courses", status: courses.length > 0 ? "success" : "skip" });

        // Step 4: interests from bio
        if (directoryResult?.bioUrl) {
          send({ type: "step", step: "Reading your faculty bio", status: "pending" });
          const interests = await extractInterestsFromBio(directoryResult.bioUrl);
          send({ type: "interests", interests });
          send({ type: "step", step: "Reading your faculty bio", status: "success" });
        }

        // Final
        const profile = buildProfile(name, directoryResult, courses);
        const confidence = scoreConfidence(profile);
        send({ type: "complete", confidence, profile });

      } catch (err) {
        send({ type: "error", message: "Enrichment failed — you can fill in your details manually." });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

---

## Client Implementation

### React Hook — `useEnrichmentStream`

```typescript
// app/hooks/useEnrichmentStream.ts

export function useEnrichmentStream(email: string | null) {
  const [steps, setSteps] = useState<StepState[]>([]);
  const [fields, setFields] = useState<Record<string, FieldState>>({});
  const [profile, setProfile] = useState<EnrichedProfile | null>(null);
  const [status, setStatus] = useState<"idle" | "streaming" | "complete" | "error">("idle");

  useEffect(() => {
    if (!email) return;
    setStatus("streaming");

    const es = new EventSource(`/api/onboarding/enrich-stream?email=${encodeURIComponent(email)}`);

    es.onmessage = (e) => {
      const event: EnrichmentEvent = JSON.parse(e.data);

      if (event.type === "step") {
        setSteps(prev => upsertStep(prev, event));
      } else if (event.type === "field") {
        setFields(prev => ({ ...prev, [event.field]: { value: event.value, source: event.source } }));
      } else if (event.type === "courses") {
        setFields(prev => ({ ...prev, courses: { value: event.courses, source: "catalog" } }));
      } else if (event.type === "interests") {
        setFields(prev => ({ ...prev, interests: { value: event.interests, source: "bio-extraction" } }));
      } else if (event.type === "complete") {
        setProfile(event.profile);
        setStatus("complete");
        es.close();
      } else if (event.type === "error") {
        setStatus("error");
        es.close();
      }
    };

    es.onerror = () => {
      setStatus("error");
      es.close();
    };

    return () => es.close();
  }, [email]);

  return { steps, fields, profile, status };
}
```

---

## Visual Design — Step List Component

```
┌─────────────────────────────────────────────────┐
│  Setting up your profile...                     │
│                                                 │
│  ✓  Found: Heath Price                          │  ← green checkmark, field animates in below
│  ✓  Faculty • College of Engineering            │
│  ⟳  Finding your courses...                    │  ← spinning indicator, yellow
│  ·  Reading faculty bio                         │  ← dim dot, not started yet
│  ·  Checking ORCID                              │
└─────────────────────────────────────────────────┘
```

**Animation details:**
- Each step fades in sequentially with a 150ms delay
- ✓ icon animates from `·` → `⟳` → `✓` as status changes
- Field values (name, title, etc.) appear below the relevant step with a slide-in animation
- When `complete` event fires, the step list collapses and the profile card expands beneath it

---

## Graceful Degradation

If SSE is not supported or the connection drops:
- Fall back to a single `POST /api/onboarding/enrich` call (non-streaming)
- Show a standard spinner
- Display the completed profile all at once

The UX is less impressive but functionally identical.

---

## Timing Targets

| Step | Target duration |
|---|---|
| Email parse + name | < 50ms |
| UK directory lookup | < 800ms |
| Course catalog search | < 600ms |
| Bio fetch + LLM extraction | < 1500ms |
| ORCID lookup | < 500ms |
| **Total** | **< 3.5 seconds** |

The streaming approach makes this feel fast even at 3.5 seconds because the user sees activity throughout.

---

## Related Documents

- `onboarding-magic-signup-core.md` — overall flow and pages
- `onboarding-llm-enrichment-engine.md` — what data is fetched and how
