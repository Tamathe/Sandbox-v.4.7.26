---
id: 04-agents
title: Agents — When the Model Stops Talking and Starts Doing
order: 4
estimatedMinutes: 25
learningOutcomes:
  - Define an agent as a model running in a perceive-plan-act-observe loop with access to tools.
  - Explain why agents are qualitatively harder than chat assistants and what specifically breaks first.
  - State the compounding-error problem and why it sets a hard ceiling on naive long-horizon agents.
concepts:
  - agent
  - tool-use
  - agent-loop
  - compounding-error
  - long-horizon-task
---

## Reading

For its first three years of public life — roughly 2020 to 2023 — the dominant interface to a frontier language model was a chat box. You typed a question. The model produced text. You read it. The transaction was complete. Whatever the model could "do" was bounded by what it could express in words inside that single response.

In late 2023 and through 2024, that interface started to shift in a way that most people outside the field underestimated. Models stopped just producing text and started producing *actions*. Not in some metaphorical sense. Literally: the same function we described in Lesson 2 (token in, token out, repeat) was given a new ability — to emit specially-formatted tokens that the surrounding system would interpret as commands. *Read this file. Run this code. Search the web. Click this button. Send this email.* The model would produce the command, the system would execute it, the result would get appended to the model's context, and the model would continue with the new information available. The same loop, but now the model could *touch the world*. When you wrap that loop in some structure — a goal, a memory, a set of tools — you have an **agent**.

The mechanical anatomy of a modern agent is roughly this: a model, a set of tools (functions it can call), a context window holding the conversation and any results from tool calls, and a control loop that keeps invoking the model until it decides it's done. Each cycle of the loop looks like *perceive (read the current context), plan (decide what to do next), act (call a tool or produce a final answer), observe (read the result of the tool call)*. Then the cycle repeats until the model says "I'm done." This pattern has names — ReAct, function calling, tool use, agent loops — and the names matter less than the structure.

What changed when this happened is bigger than the engineering. **A chat assistant cannot accomplish any task you cannot describe and check in a single response. An agent can.** An agent can read a 200-page document, summarize the relevant sections, run analysis on the data inside, write a report, file it to the right system, and notify you when it's done — all from a single instruction. Or it can debug a piece of code by reading the error, running tests, modifying files, running the tests again, and iterating until they pass. Or it can navigate a website, fill in forms, extract data, and put it somewhere. The space of things a model can usefully do expanded by orders of magnitude the moment the loop closed around it. Claude Code, Cursor, Devin, AutoGPT, OpenAI's operator, the entire wave of "AI software engineer" products — all of them are this same architectural pattern, varying only in which tools they expose and how they wrap the loop.

So agents are powerful. Now the bad news.

**Agents are about a hundred times harder to make reliable than chat assistants, and the difficulty is structural.** Here is the core problem. When a chat assistant makes a mistake, you read the response and either correct it or move on. The mistake costs nothing. When an agent makes a mistake, the mistake gets fed back into its own context as if it were ground truth, and the next step is taken on the basis of the incorrect previous step. Errors compound. A 95% reliable single-step model becomes a 60% reliable ten-step agent. A 99% reliable single-step model becomes a 90% reliable ten-step agent. The math is not optional. If you want an agent to reliably complete a 50-step task, every step has to be vastly more reliable than humans currently know how to make any single step.

This is the **compounding-error problem**, and it is the single most important practical constraint on agent design in 2026. Almost all of the engineering work that makes a useful agent useful is some form of fighting this math. Let the model generate multiple plans and pick the best one. Let it back up and retry when something fails. Run a separate critic model that watches for mistakes. Constrain the tool surface so fewer wrong moves are possible. Force the agent to write down its plan first and check each step against the plan. Make the human re-approve every irreversible action. None of these tricks make the math go away; they just push the failure horizon further out by some amount, at the cost of latency, money, and human attention. Anyone selling you a "fully autonomous agent" that runs without human checkpoints for more than a handful of steps in 2026 is either wrong about how it works or wrong about how reliably it works.

Now the steel-man, because the picture is genuinely improving and the dismissive case is also wrong. The reliability of frontier models on multi-step coding tasks went from ~10% on standard benchmarks like SWE-bench in 2023 to 60–70% in 2025 and, on the latest reasoning models, north of 80% in early 2026. That is not a curve flattening. That is a curve climbing fast enough that plenty of tasks which were "obviously impossible for an agent" eighteen months ago are now routine. The history of "AI cannot do X" claims is the history of those claims being quietly dropped one by one. The honest position on agents is: the mechanism for their failures is well-understood, the math sets real ceilings, *and* every generation of model is making the ceilings less binding faster than the most aggressive predictions from two years ago. Both halves matter. Ignoring either half is how you end up writing a confident essay that ages badly in six months.

The other thing worth saying is that the *useful* agents in 2026 are mostly not the autonomous ones. They are the *cooperative* ones — tools where a human stays in the loop, the agent does the tedious parts, and the human checkpoints the irreversible parts. Claude Code is an agent. Cursor is an agent. The "deep research" features in frontier products are agents. They are useful in proportion to how well they integrate the human as a participant, not in proportion to how completely they replace one. The fully-autonomous-agent vision has been the explicitly marketed product for three years and has shipped less working stuff than the cooperative-agent vision shipped quietly underneath it. That is worth noticing, because it tells you which architectural pattern is actually doing the work.

## Concrete example

Try this experiment if you have access to any decent agent. Give it a task with about ten steps, each of which is individually trivial — for instance: "find me the three most-starred Python projects on GitHub created in 2025, clone them locally, run their test suites, and tell me which one has the highest test coverage." This is a task that any individual step is trivially within the model's capabilities. The interesting question is what happens at the joins. You will probably watch it succeed at most steps, then fail at one (the API rate-limited it, or one project doesn't have tests, or the test command is non-standard), and then either recover — taking three or four attempts — or get stuck. If you give the same task to a model with no tool access, it can't even attempt it. If you give it to a model from 2023, it falls over within the first few steps. If you give it to a 2026 frontier reasoning model with a good agent harness, it usually completes the task, slowly, with maybe one or two human nudges. The capability progression is real. The reliability is exactly where the math says it should be.

## Uncomfortable question

The two strongest claims in the agent debate, both made by serious people, are: (1) "agents that can autonomously do a full day's work for a knowledge worker are 18 months away," and (2) "compounding errors make naive autonomous agents structurally impossible past short horizons, forever." One of these turns out to be correct. They cannot both be. Which one are you betting on, and what is the *specific evidence* — not the vibe, the evidence — that would make you switch sides? If you can't articulate the evidence, you don't have a position; you have an aesthetic preference, and aesthetic preferences are a poor substitute for actually tracking what's happening.
