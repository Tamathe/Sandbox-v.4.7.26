# Reputation Pulse Demo Snapshot

`Reputation Pulse` now supports a bounded X API capture flow for a University of Kentucky demo snapshot.

## What it does

- Pulls a recent-search snapshot from X for the previous 7 days.
- Splits capture into two query lanes:
  - `owned` posts from official UK handles
  - `public` conversation matching UKY-related query terms
- Stores the result locally at `data/demo/reputation-pulse-uky-snapshot.json`
- Renders the stored snapshot at `/reputation-pulse` through an authenticated app endpoint

## Required environment

Add these values before running the capture:

- `X_API_BEARER_TOKEN`
- `X_REPUTATION_PULSE_OFFICIAL_HANDLES`
- `X_REPUTATION_PULSE_PUBLIC_TERMS`

Optional controls:

- `X_REPUTATION_PULSE_MAX_POSTS`
- `X_REPUTATION_PULSE_LOOKBACK_DAYS`
- `X_REPUTATION_PULSE_END_TIME`

## Run it

From `the-sandbox`:

```bash
npm run capture:reputation-pulse
```

## Default query bundle

Owned query:

```text
(from:universityofky) lang:en -is:retweet
```

Public query:

```text
("University of Kentucky" OR UKY OR #UKY OR #UniversityOfKentucky OR @universityofky) lang:en -is:retweet -from:universityofky
```

## Demo guidance

- Keep this as an internal demo snapshot, not a public data dump.
- Re-run the capture shortly before a live demo if you want fresh data.
- Revalidate post availability before showing examples outside the product team.
- The JSON snapshot is ignored by git on purpose so raw captured posts are not accidentally committed.

## Pricing note

X public docs describe the API as pay-per-use and credit-based, but exact per-endpoint dollar rates are shown in the X Developer Console rather than on the public pricing page.
