---
moduleId: 04-machines-arrive
type: study-group
format: shared-stress-test
durationMinutes: 60
---

# Module 4 — Study Group: The Shared Stress Test

## Format

Groups of three. Same task, three different frontier models, run side by side. Then together you compare what you saw and write a short joint reading of where the models converge, where they diverge, and which divergences are interesting versus accidental.

## The task

Each group picks **one task from a domain at least one group member knows well**. The task must:

- Take an experienced human about 30–60 minutes to do.
- Have a verifiable end state (was the answer correct, did the code run, was the data extracted).
- Be specific enough that "kind of working" can be told from "actually working."

Examples that work:
- "Find the three most-cited recent papers on [specific niche topic] and summarize the main disagreements between them."
- "Convert this CSV of sales data into a clean weekly report with the top five anomalies highlighted."
- "Write a working implementation of [specific small algorithm] in a language none of you usually use, and verify it on three test cases."
- "Translate this paragraph from [language A] into [language B] and have a fluent speaker in the group rate the result."
- "Diagnose what's wrong with this short broken code snippet and propose a fix."

Examples that **don't work** for this exercise:
- "Write a poem." (Not verifiable.)
- "Explain quantum mechanics." (Too open-ended.)
- "Tell me a joke." (You will learn nothing.)

## Structure (60 minutes total)

1. **Pick the task and the three models (5 min)** — Together. Each group member will run the task on a different frontier model. Pick three you can actually access. (E.g., Claude Sonnet 4.6, GPT-5, Gemini 2.5 Pro. Use whatever combination is available to your group.) Agree on the *exact* prompt you'll all use. Write it down.

2. **Run the task (20 min)** — In silence, each member runs the task on their assigned model. No collaboration, no peeking at each other's results, no helping the model along beyond the agreed-on prompt. If the model fails, let it fail. If you have to nudge it to keep going, write down exactly what you nudged.

3. **Compare results (15 min)** — Lay all three results side by side. For each one, score it on:
   - Did it complete the task end-to-end?
   - Where did it break, if it did?
   - What did it confidently get wrong?
   - What did it surprise you by getting right?

4. **Identify the interesting divergences (10 min)** — Where the three models gave meaningfully different answers, ask: *was this difference about capability, about training data, about the system prompt, about randomness, or about something else?* Most differences are less interesting than they look. The few that aren't are where the real learning is.

5. **Write the joint reading (10 min)** — One paragraph, 4–6 sentences, posted to the discussion thread tagged `#study-group-mod4`. Answer: *what did this stress test actually tell us about the current state of frontier models, and what would we have to test next to confirm or refute that reading?*

## Rules

- The person whose domain expertise covers the task is the **judge**, not a co-runner. They evaluate the outputs but do not produce them.
- No retrying with a different prompt. The whole point of the exercise is to see what these models do with a single fixed instruction, not to optimize against them.
- If one model produces something stunning, do not declare it "the best model." Ask whether the same prompt would have produced the same result yesterday, last month, or on a slightly different day. The variance is real and you have to control for it.
- If all three fail, that is also a result. Write the joint reading as if "they all failed" were a finding rather than a problem.

## Why this format

Almost everyone in 2026 forms their views about AI from anecdotes — one impressive interaction, one embarrassing failure, one viral screenshot. The shared stress test forces you to see three models on the same task in the same hour, with a verifiable end state and a domain expert in the room to call out what the models got wrong that you wouldn't have noticed yourself. It is the closest thing this course offers to actual evaluation work, and it is the single best inoculation against the vibes-based discourse that dominates this field. After you have done one of these honestly, you will read AI coverage differently for the rest of your life. The cost is one hour. The return is permanent.
