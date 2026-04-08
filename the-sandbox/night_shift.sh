#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

BUILD_CMD="npm run lint && npx tsc --noEmit && npm run build"

echo "Starting UX Agent..."
claude -p "Review the React components in /components and /app. Standardize the UI styling using Tailwind CSS v4 utility classes. Strictly avoid using @apply. Replace any hardcoded pixel values with Tailwind equivalents. After modifying a file, run '$BUILD_CMD'. If the build fails or throws a TS error, immediately revert your changes to that file. Stop execution after processing 15 files and document what you changed in ux_changelog.md." -y --dangerously-skip-permissions

echo "Starting Content Agent..."
claude -p "You are improving the clarity and LLM-readability of system prompts in this Next.js codebase. Your ONLY job is to rewrite string literals that are system prompts — do NOT touch TypeScript types, interfaces, Zod schemas, Prisma models, function signatures, or logic of any kind.

Work through these files IN ORDER, rewriting prompt strings to use active voice, precise role framing, and unambiguous instructions for the LLMs that consume them:

1. app/lib/chat-service.ts — Rewrite STUDY_BUDDY_MODES (tutor/quiz/socratic/expert_Q&A) and SCAFFOLD_GUARDRAIL string constants
2. app/lib/builder-service.ts — Rewrite the BUILDER_SYSTEM constant (the large string starting around line 58)
3. app/lib/concierge-service.ts — Rewrite PAGE_DESCRIPTIONS values and the buildSystemPrompt() template string
4. app/lib/service-bot-prompt.ts — Rewrite the service bot template strings (informational/regulatory/transactional protocol blocks)
5. app/lib/campus-navigator.ts — Rewrite the systemPrompt field strings inside the CAMPUS_TOOLS array (Course Planner, Degree Audit, Advisor Q&A, Scholarship Finder)
6. app/lib/research-hub.ts — Rewrite the systemPrompt field strings inside the RESEARCH_TOOLS array (Literature Search, Citation Helper, Methodology Reviewer, Grant Writing)
7. app/lib/assignment-builder.ts — Rewrite the rubric generation prompt string inside buildRubricPrompt() / generateAndSaveRubric()
8. app/lib/sandcastle/insight-service.ts — Rewrite the INSIGHT_SYSTEM_PROMPT constant
9. prisma/tool-catalog.ts — Rewrite the systemPrompt string fields for each tool entry (welcome messages are optional bonus targets)

After editing ALL files, run '$BUILD_CMD'. If the build fails, revert ONLY the last file you changed and retry. Do not change any other code to fix a build error. Document every file you changed and what you rewrote in content_changelog.md." -y --dangerously-skip-permissions

echo "Starting Debug Agent..."
claude -p "Run '$BUILD_CMD'. If it fails, identify the root cause of the TypeScript or linting errors, write a patch, and retry the build. Repeat this until the build succeeds with 0 errors. If the build succeeds on the first try, analyze the Next.js build output for any performance warnings or deprecation notices and resolve them. Limit yourself to 10 fix attempts." -y --dangerously-skip-permissions

echo "Night shift complete. Check the changelogs."
