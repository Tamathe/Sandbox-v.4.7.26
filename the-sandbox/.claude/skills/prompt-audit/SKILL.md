---
name: prompt-audit
description: Audit all AI system prompts for staleness, duplication, conflicting personas, excessive length, and missing prompts. Monthly.
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# AI Prompt & System Message Audit

Find every string or template literal sent to an AI API (Anthropic, OpenAI) as a system message, user prompt, or tool description. **Report only — don't change prompts.**

## What to Search

Check all files that:
- Import from `@anthropic-ai/sdk` or `openai`
- Call Anthropic's `messages.create` or `messages.stream`
- Call OpenAI's `chat.completions.create` or `embeddings.create`
- Define tool descriptions for Sandy agent tools

## For Each Prompt Found, Report

1. **File and line** — where the prompt is defined
2. **Purpose** — what feature it supports (chat, analysis, generation, scoring, etc.)
3. **Model used** — Haiku (`claude-haiku-4-5-20251001`), Sonnet (`claude-sonnet-4-6`), or OpenAI
4. **Approximate length** — rough token count
5. **Staleness check** — does it reference features, models, pages, or data structures that no longer exist? (Check against CLAUDE.md "Do Not Rebuild" section)

## Also Flag

- **Duplicated instructions** across multiple prompts (e.g., "You are Sandy" repeated in many places — should be shared constant)
- **Conflicting persona definitions** — Sandy described differently in different prompts (canonical: friendly, UK-branded, no purple/violet, no Brain icon)
- **Hardcoded data** that should be dynamic
- **Excessively long** system prompts that could be simplified
- **Missing prompts** — AI-powered features without a system prompt

## Output

Table: `File | Purpose | Model | ~Tokens | Issues Found`

## Key Sandy Persona Rules
- Single character across all surfaces, switches "classes" by context
- Header: "Sandy" + context subtitle
- No purple/violet, no Brain icon, no custom personas, no "Online" pulsing dots
- See CLAUDE.md "Sandy — Unified AI Persona" section