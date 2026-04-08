# Crisis Comms Prototypes

## Why These Two

The March 17-24, 2026 email thread and Dani Jaffe's "AI Crisis Comms Bootcamp Recap" deck point to two concrete opportunities for the hub:

1. A spokesperson training experience where the user is questioned by an AI reporter during a crisis.
2. A reputational-risk analysis tool that helps distinguish real community concern from coordinated or inorganic amplification.

The deck gives us useful framing:

- AI is already being used for social monitoring, crisis strategy, template generation, and spokesperson practice.
- AI-generated or AI-amplified crises can spread very quickly.
- Fast response matters. The deck cites peak online distribution in 37 minutes and improved containment when organizations respond within 30 minutes.
- Crisis teams need to decide when to engage and when to ignore "voices vs. noise."
- Coordination across channels matters more than a single-channel response.

## Product Decision

These should not be built as generic chatbots.

They should be built as guided crisis workflows with very different jobs:

### 1. Crisis Spokesperson Trainer

Purpose:
Train a communications lead, dean, or spokesperson to answer hard questions under pressure without speculating, escalating, or losing message discipline.

Prototype format:
Text-first simulation in the existing tool runtime.

Why this is the right first step:

- The current hub already supports strong role-play tools.
- It gets the pedagogical core right immediately: pressure, repetition, escalation, and feedback.
- It avoids pretending we already have reliable live video/avatar infrastructure.

Core interaction:

- User selects or describes a crisis scenario.
- AI acts as a reporter and asks short, escalating questions.
- User answers in-role as the spokesperson.
- When the user asks for feedback, the tool switches into debrief mode and scores:
  - clarity
  - empathy
  - speculation avoidance
  - bridge-back to key message
  - actionability

Recommended starter scenarios:

- campus lockdown / active aggressor
- severe weather closure
- data breach
- student injury or death
- controversial allegation spreading online

Future version:

- voice mode
- avatar or face-to-face video layer
- document-backed knowledge base with UK crisis plans, templates, and approved language
- reporter personas by channel: local TV, student newspaper, parent Facebook group, national outlet

### 2. Reputation Pulse

Purpose:
Help communicators decide whether an online flare-up is an authentic concern, a mixed event, or likely coordinated amplification.

Prototype format:
Analyst-style tool in the existing tool runtime, driven by pasted posts, headlines, and trend summaries.

Why this is the right first step:

- The email thread explicitly leaves data-source questions open.
- A first prototype should be useful before we have platform APIs, ingestion pipelines, or bot-detection models.
- Crisis teams often already work from screenshots, exports, media summaries, or copied posts during the first hour.

Core interaction:

- User pastes a batch of social posts, headlines, or a short situation summary.
- Tool returns a structured crisis brief with:
  - overall sentiment
  - dominant narratives
  - likely authentic concern vs. inorganic coordination signals
  - confidence level
  - spread risk
  - recommended response posture
  - additional data needed before escalating

Important design rule:

This tool must never claim certainty that accounts are bots or that a campaign is fake.
It should use risk language such as:

- low coordination risk
- moderate coordination risk
- high coordination risk
- insufficient evidence

Future version:

- ingestion from X/Twitter, Reddit, TikTok, Instagram comments, Facebook, news, and forums
- spike detection over time
- account clustering
- bot-likelihood heuristics
- share-of-voice tracking
- escalation alerts to a crisis comms inbox or dashboard

## MVP Boundaries

### What the prototype should do now

- Be clickable from the hub.
- Feel tailored to crisis communications rather than generic prompting.
- Teach decision-making and response discipline.
- Make unknowns explicit instead of faking production-grade detection.

### What the prototype should not pretend to do yet

- live social listening
- definitive bot identification
- authenticated platform access
- real-time avatar video conversations
- authoritative UK policy or factual statements without a connected knowledge base

## Recommended Naming

- `Crisis Spokesperson Trainer`
- `Reputation Pulse`

## Suggested Hub Placement

Create a dedicated `Crisis Comms` swim lane visible to educators and admins.

Why:

- The use case is operational and professional, not student-first.
- It gives these tools a coherent home without burying them in general-purpose productivity or faculty lanes.

## Assumptions For This Prototype

- We are intentionally building a text-first spokesperson trainer before a video/avatar version.
- We are intentionally building a paste-in reputational triage analyst before live platform integrations.
- We are optimizing for a convincing prototype that can support stakeholder conversations this week.

## Build Status

### Reputation Pulse — BUILT (2026-03-25)

Full implementation in `ARCHITECTURE-REPUTATION-PULSE.md`. Demo mode with 3 synthetic scenarios (135 posts), AI-authorship detection, coordination analysis, calibration training exercise, spread timeline, filterable post feed with per-post badges. Page at `/crisis-comms/reputation-pulse`.

### Crisis Spokesperson Trainer — Not Yet Built

Next steps:
1. Add scenario presets and scoring rubrics.
2. Decide whether avatar/voice belongs in phase 2 or phase 3.
3. Decide data sources for a true monitoring version of Reputation Pulse.
