# Vibe Tools: Simple Problems, Delightful Solutions
**Pattern:** Join code → shared structure → scoring/outcome → leaderboard → Monday email

Each tool below follows the same build pattern as the NCAA bracket picker:
~5 API routes, ~3 pages, 1 data model, 1 pure scoring/logic function.
No complex AI required unless noted. Buildable in a weekend.

---

## 1. Coffee Roulette
**The problem:** Large departments, law school cohorts, and new student groups want organic connections but nobody initiates. Every week the same 5 people talk to the same 5 people.

**The fix:** Create a pool → invite with code → every Monday the system randomly pairs two people and emails them: *"You and Devon Carter have a coffee chat this week. 15 minutes. You go first."*

**What makes it vibe:**
- Zero commitment to join, 15 minutes is nothing
- System tracks who's met who and never repeats a pair
- Email includes one conversation starter pulled from both profiles
- Admin can see a "connection graph" — who in the org has never spoken to each other

**Build notes:**
- Models: `CoffeePool`, `CoffeeMember`, `CoffeePairing`
- Monday cron: Hungarian algorithm (optimal matching) or random shuffle with anti-repeat constraint
- AI add-on: generate a personalized icebreaker from the two users' bios/interests
- Fits perfectly on `/tools/coffee-roulette`

---

## 2. Prediction Market (Sand-Powered)
**The problem:** People argue constantly about things that will resolve with a clear answer. "UK beats Tennessee." "We ship the feature by Friday." "This hire quits within 6 months."

**The fix:** Anyone creates a question with a resolution date and outcome options. Participants bet Sand credits. Market closes on the date, winner splits the pot.

**What makes it vibe:**
- Already has a currency (Sand) — this IS the use case Sand was built for
- Creates genuine stakes without real money
- Leaderboard of best predictors over time = reputation system
- Questions are searchable/browseable — creates a living record of the group's predictions

**Build notes:**
- Models: `PredictionMarket`, `MarketOutcome`, `MarketBet`
- Resolution: creator marks the outcome → system pays out proportionally to Sand wallets
- AI add-on: suggest calibration score per user ("You're 73% accurate on sports, 41% on politics")
- Email: digest of markets closing this week + your open positions

---

## 3. Survivor Pool (Direct Bracket Extension)
**The problem:** NFL survivor pools run September through January. Same friend group as the bracket, same annual ritual, currently happens in a spreadsheet or a paid sports site.

**The fix:** Create pool → share code → each week pick ONE team to win. Can't use a team twice. If they lose, you're out. Last person standing wins.

**What makes it vibe:**
- Brutal and simple — one pick, high stakes, instant elimination
- Social graph: see everyone's pick before the game (or after — configurable)
- Elimination feed: "Devon got knocked out in Week 7 when the Bears lost to the Lions"
- Thursday night / Monday night games extend the tension across the whole week

**Build notes:**
- Models: `SurvivorPool`, `SurvivorEntry`, `SurvivorWeeklyPick`, `SurvivorGame`
- Backend: admin enters weekly results → system marks eliminations → recomputes standings
- Reuses nearly identical pattern to BracketPool/BracketEntry
- Email: Monday picks reminder + list of who's still alive

---

## 4. Meeting Bingo
**The problem:** Long meetings, conferences, and all-hands events. Everyone's bored. Nobody says anything but everyone's thinking the same thing.

**The fix:** Creator generates a custom bingo card with words/phrases ("circle back," "bandwidth," "synergy," "let's take this offline"). Participants join with a code, get a randomized card, tap squares during the meeting. First to bingo gets bragging rights.

**What makes it vibe:**
- Takes 20 seconds to set up
- Cards are randomized so everyone has a different layout (no cheating)
- "BINGO" alert is silent (a discreet confetti animation, not a klaxon)
- Creator can pre-load a word bank or use AI to generate them from a topic
- Hall of fame: who's gotten the most bingos this semester

**Build notes:**
- Models: `BingoGame`, `BingoCard`, `BingoMark`
- Logic: shuffle word bank → assign random 5×5 grid per participant → mark in real-time via PATCH
- AI add-on: "Generate bingo words for a university budget committee meeting"
- No scoring needed — just detection of 5-in-a-row (pure client-side logic)

---

## 5. Secret Santa Organizer
**The problem:** Every department, lab group, and friend circle does this every December. It currently happens in 47 reply-all emails, a random website with ads, or someone manually drawing names from a hat.

**The fix:** Create pool → set budget → invite with code → everyone optionally fills out a short wishlist → system randomly assigns and sends each person an encrypted "you got: [name]" email with that person's wishlist.

**What makes it vibe:**
- Zero reveal until the party — assignments are encrypted in the DB, even admin can't see who got who
- Wishlist is optional but the AI can help: "I like coffee, hiking, and sci-fi" → "Here are 5 specific gift ideas under $30"
- Countdown banner: "12 days until the party"
- Post-party reveal: everyone can see who gave what

**Build notes:**
- Models: `SecretSantaPool`, `SecretSantaParticipant`, `SecretSantaAssignment`
- Assignment: random shuffle with constraint (can't get yourself), stored encrypted with Node crypto
- AI add-on: gift suggestion generator from free-text wishlist
- Email: "You're Secret Santa for [name]. Here's their wishlist: ..."

---

## 6. Weekly Trivia League
**The problem:** Faculty want to reinforce course material between classes without assigning more homework. Students want to compete. Both want something that takes 5 minutes, not 50.

**The fix:** Faculty creates a league for a course → 10 questions go live Monday morning → students have until Friday to submit → scores post Friday night → leaderboard resets each week → season standings accumulate.

**What makes it vibe:**
- Questions can be faculty-written OR AI-generated from course materials (uploaded syllabus, readings)
- Weekly reset keeps it fresh — bad week doesn't kill your season
- Season standings = soft extra credit motivation without official grade pressure
- "Hardest question of the week" in the email: see how the whole class did on Q7

**Build notes:**
- Models: `TriviaLeague`, `TriviaWeek`, `TriviaQuestion`, `TriviaSubmission`
- Faculty creates questions manually OR hits "Generate 10 questions from my syllabus" (Claude Haiku)
- Scoring: 1 point per correct answer, tiebreak by submission time
- Email Friday: your score + class average + correct answers revealed
- Connects to the existing gamification layer (XP for correct answers)

---

## 7. Pitch Competition Scorer
**The problem:** Hackathons, case competitions, startup demos, and capstone presentations all need judges to score teams against a rubric. Currently done in Google Sheets, which is a disaster for averaging and tie-breaking.

**The fix:** Organizer creates a competition → uploads rubric dimensions → shares a judge code and a participant code → judges score each team on each dimension after their pitch → system averages scores, handles ties, and posts a live leaderboard visible to the audience.

**What makes it vibe:**
- Audience can watch scores update in real-time on a projector view
- Judges score independently — no anchoring to each other's numbers
- AI add-on: after scores are in, generate a one-paragraph feedback summary per team from all judge notes
- PDF export of full results for the record (accreditation evidence)

**Build notes:**
- Models: `PitchCompetition`, `PitchTeam`, `JudgeScore`, `RubricDimension`
- "Projector mode" — `/tools/pitch-competition/[id]/live` — read-only leaderboard for big screen
- AI add-on: aggregate judge free-text notes → generate feedback per team
- Connects to CourseRubric model (already planned in CLAUDE.md)

---

## 8. Fantasy Paper Trading (Course Tool)
**The problem:** Finance and economics courses want students to experience investing without real money. Existing platforms (Investopedia Simulator, MarketWatch) are clunky, ad-heavy, and not tied to coursework.

**The fix:** Faculty creates a league with a start date and end date (semester). Everyone starts with $10,000 paper dollars. Students buy/sell using real Yahoo Finance prices fetched via free API. Weekly leaderboard. Monday digest shows your portfolio performance.

**What makes it vibe:**
- Real prices, fake money — the stakes feel real
- Faculty can add "event challenges": "React to this week's Fed announcement — what do you buy/sell?"
- Leaderboard with percentage gain/loss (not just dollar amount — levels the playing field)
- End-of-semester winner gets Sand credits or a real grade bonus

**Build notes:**
- Models: `TradingLeague`, `Portfolio`, `Trade`, `Holding`
- Price data: Yahoo Finance unofficial API (free, no key needed) or Alpha Vantage free tier
- Portfolio value computed on-demand (current price × shares held)
- Weekly snapshot stored so you can chart portfolio growth over time
- Email Monday: your return % this week + leaderboard rank

---

## 9. Rate My Syllabus
**The problem:** Faculty spend hours writing syllabi that students never read and that often score poorly on clarity, workload balance, and student-friendliness. No feedback mechanism exists until end-of-semester evaluations.

**The fix:** Faculty pastes or uploads their syllabus → AI scores it on 6 dimensions (clarity, workload balance, accessibility, engagement, policy clarity, learning objective alignment) → returns a 1-page report with specific suggested rewrites for the lowest-scoring sections.

**What makes it vibe:**
- Instant, anonymous, no committee involved
- Specific: not "improve clarity" but "Week 3 says 'readings TBD' — students report this as a major stressor; here's a placeholder that works"
- Compare against anonymized benchmark: "Your workload score is in the 40th percentile for 3-credit courses"
- One-click: "Rewrite this section for me" → generates a drop-in replacement

**Build notes:**
- No new data model needed — single-turn AI call with structured output
- Claude Sonnet with a detailed rubric-based system prompt
- Output: JSON with scores + string feedback per dimension → rendered as a score card
- Optional: save results to user profile for semester-over-semester comparison
- Lives at `/tools/rate-my-syllabus`

---

## Priority Order

| Tool | Effort | Delight | Unique to Sandbox |
|---|---|---|---|
| Prediction Market | Low | Very High | ✅ (Sand currency is perfect fit) |
| Coffee Roulette | Low | High | ✅ (profile-aware icebreakers) |
| Survivor Pool | Very Low | High | ✅ (reuses bracket code directly) |
| Weekly Trivia League | Medium | High | ✅ (AI question gen from syllabus) |
| Meeting Bingo | Very Low | High | ❌ (anyone could build this) |
| Pitch Competition Scorer | Medium | Medium | ✅ (rubric + accreditation angle) |
| Rate My Syllabus | Low | High | ✅ (directly serves faculty) |
| Secret Santa | Low | Medium | ❌ (seasonal, generic) |
| Fantasy Paper Trading | Medium | Medium | ✅ (course tool angle) |

**Build next:** Prediction Market (Sand already exists, this is the killer use case for it) + Survivor Pool (reuse 80% of bracket code, ships in a day).
